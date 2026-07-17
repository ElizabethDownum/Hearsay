import { minuteOfDay, type Tick } from '../../core/time';
import type { Circle } from '../agents';
import { cloneSerializable } from '../hash';
import { assetFor, isTurnedAgainst, principalActor } from '../network/roster';
import type { Principal } from '../network/types';
import type { PreparedTick, NpcAutonomousIntent } from '../phases';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import { SOMEONE, type EntityId } from '../rumors/claim';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import { trustBetween } from '../world';
import { projectFieldReportHop } from './field-reports';
import { allocateMessageId, allocateVersionId, ensureDirectiveState, strictNextBeat } from './state';
import { perceivedScrutiny, recordScrutiny } from './scrutiny';
import { projectBrief, projectDirectiveReport, type ProjectionSpeaker } from './mutation';
import { evaluateReceivedBrief } from './evaluator';
import type {
  DirectiveAuthority, DirectiveDiscretion, MessageId, NetworkMessage, NetworkPayload,
  NetworkSpeech, SpokenNetworkPayload,
} from './types';

export type RelayDecision = 'forward' | 'hold' | 'drop' | 'betray-and-forward';

export function evaluateRelay(input: {
  relationshipToClaimedIssuer: number;
  authority: DirectiveAuthority;
  discretion: DirectiveDiscretion;
  bystanders: number;
  turnedAgainstMessagePrincipal: boolean;
  scrutiny: number;
}): RelayDecision {
  if (input.turnedAgainstMessagePrincipal && input.scrutiny < 0.35) return 'betray-and-forward';
  if (input.discretion === 'compartmented' && input.bystanders > 0) return 'hold';
  if (input.discretion === 'quiet' && input.bystanders > 2) return 'hold';
  if (input.relationshipToClaimedIssuer <= 0 && input.authority === 'request') return 'drop';
  return 'forward';
}

function validateRoute(world: WorldState, holder: EntityId, route: readonly EntityId[]): void {
  if (!world.npcs[holder]) throw new Error(`network: unknown holder '${holder}'`);
  if (route.length === 0) throw new Error('network: route must name at least one recipient');
  const seen = new Set<EntityId>();
  for (const id of route) {
    if (!world.npcs[id]) throw new Error(`network: unknown route actor '${id}'`);
    if (id === holder) throw new Error(`network: route contains self-hop '${id}'`);
    if (seen.has(id)) throw new Error(`network: duplicate route actor '${id}'`);
    seen.add(id);
  }
}

export function queueNetworkMessage(
  world: WorldState,
  principal: Principal,
  holder: EntityId,
  route: EntityId[],
  payload: NetworkPayload,
  availableAfter: Tick,
  expiresAt: Tick | null,
  cause: NetworkSpeech['cause'],
): MessageId {
  validateRoute(world, holder, route);
  if (expiresAt !== null && expiresAt < availableAfter) {
    throw new Error(`network: expiry ${expiresAt} precedes availability ${availableAfter}`);
  }
  const state = ensureDirectiveState(world);
  const id = allocateMessageId(state);
  state.messages.push({
    id,
    principal,
    createdAt: world.tick,
    origin: holder,
    holder,
    lastFrom: holder,
    route: [...route],
    nextHop: 0,
    availableAfter,
    payload: cloneSerializable(payload),
    deliveredAt: null,
    expiresAt,
    failedAt: null,
    processedRelayHops: [],
    cause: cloneSerializable(cause),
  });
  return id;
}

function currentRecipient(message: NetworkMessage): EntityId | null {
  return message.route[message.nextHop] ?? null;
}

function circleFor(
  circles: readonly Circle[], holder: EntityId, addressedTo: EntityId,
): Circle | null {
  return circles.find((circle) =>
    circle.members.includes(holder) && circle.members.includes(addressedTo)) ?? null;
}

function sourceDirectiveId(payload: NetworkPayload): string | null {
  switch (payload.kind) {
    case 'directive': return payload.version.directiveId;
    case 'directive-report': return payload.directiveId;
    case 'handler-brief': return payload.sourceDirectiveId;
    default: return null;
  }
}

function projectionSpeaker(world: WorldState, id: EntityId): ProjectionSpeaker {
  const npc = world.npcs[id]!;
  const knownFactions: ProjectionSpeaker['knownFactions'] = { [id]: npc.faction };
  for (const rival of npc.rivals) {
    const faction = world.npcs[rival]?.faction;
    if (faction !== undefined) knownFactions[rival] = faction;
  }
  return { id, faction: npc.faction, rivals: [...npc.rivals], knownFactions, traits: [...npc.traits] };
}

function messagePrincipalId(world: WorldState, message: NetworkMessage): EntityId {
  const actor = principalActor(world, message.principal);
  if (actor !== null) return actor;
  if ((message.payload.kind === 'directive' || message.payload.kind === 'handler-brief')
    && message.payload.version.claimedIssuer !== SOMEONE) return message.payload.version.claimedIssuer;
  return message.lastFrom;
}

function allocateProjectedVersionId(world: WorldState): string {
  const state = ensureDirectiveState(world);
  const used = new Set<string>();
  for (const record of state.records) {
    used.add(record.authored.id);
    if (record.received) used.add(record.received.version.id);
  }
  for (const carried of state.messages) {
    if (carried.payload.kind === 'directive' || carried.payload.kind === 'handler-brief') {
      used.add(carried.payload.version.id);
    }
  }
  let id = allocateVersionId(state);
  while (used.has(id)) id = allocateVersionId(state);
  return id;
}

function projectCarriedSpeech(
  world: WorldState, message: NetworkMessage, rules: Rules, mode: 'relay' | 'handler-report',
  scrutiny: number,
): boolean {
  const payload = message.payload;
  if (payload.kind === 'directive' || payload.kind === 'handler-brief') {
    const projected = projectBrief({ version: payload.version,
      speaker: projectionSpeaker(world, message.holder), lastFrom: message.lastFrom,
      audience: message.principal,
      turnedAgainstAudience: isTurnedAgainst(world, message.principal, message.holder),
      perceivedScrutiny: scrutiny, mode }, rules);
    if (projected.retell === 'withhold') return false;
    if (projected.changes.length > 0) {
      const previous = payload.version;
      payload.version = {
        id: allocateProjectedVersionId(world), parent: previous.id,
        directiveId: previous.directiveId, brief: projected.brief,
        claimedIssuer: projected.claimedIssuer, replyRoute: projected.replyRoute,
        changedBy: message.holder, changes: projected.changes,
      };
    }
  } else if (payload.kind === 'directive-report') {
    const projected = projectDirectiveReport({ report: payload.report,
      enemyAction: payload.enemyAction, factRefs: payload.factRefs,
      speaker: projectionSpeaker(world, message.holder),
      turnedAgainstAudience: isTurnedAgainst(world, message.principal, message.holder),
      perceivedScrutiny: scrutiny }, rules);
    payload.report = projected.report;
    payload.enemyAction = projected.enemyAction;
    payload.factRefs = projected.factRefs;
  }
  return true;
}

function projectPayload(
  world: WorldState,
  message: NetworkMessage,
  speaker: EntityId,
  addressedTo: EntityId,
  rules: Rules,
  projectSpeaker = true,
  atTick: Tick = world.tick,
): SpokenNetworkPayload {
  const onwardTo = message.route[message.nextHop + 1] ?? null;
  const payload = message.payload;
  switch (payload.kind) {
    case 'directive':
      return {
        kind: 'directive', directiveId: payload.version.directiveId,
        brief: cloneSerializable(payload.version.brief),
        claimedIssuer: payload.version.claimedIssuer,
        onwardTo, replyRoute: cloneSerializable(payload.version.replyRoute),
      };
    case 'directive-report':
      return {
        kind: 'directive-report', directiveId: payload.directiveId,
        report: cloneSerializable(payload.report), enemyAction: cloneSerializable(payload.enemyAction),
        factRefs: cloneSerializable(payload.factRefs), onwardTo,
      };
    case 'directive-response':
      return {
        kind: 'directive-response', directiveId: payload.directiveId,
        response: payload.response, report: cloneSerializable(payload.report), onwardTo,
      };
    case 'handler-brief':
      return {
        kind: 'handler-brief', brief: cloneSerializable(payload.version.brief),
        claimedIssuer: payload.version.claimedIssuer,
        onwardTo, replyRoute: cloneSerializable(payload.version.replyRoute),
      };
    case 'field-report': {
      const rendered = !projectSpeaker && payload.renderedItems !== null
        ? cloneSerializable(payload.renderedItems)
        : projectFieldReportHop(world, message, speaker, rules, atTick);
      payload.renderedItems = cloneSerializable(rendered);
      return {
        kind: 'field-report',
        items: rendered.map(({ observation, factRefs }) => ({
          observation: cloneSerializable(observation), factRefs: cloneSerializable(factRefs),
        })),
        onwardTo,
      };
    }
    case 'compartment-fact':
      return {
        kind: 'compartment-fact', asset: payload.asset,
        fact: cloneSerializable(payload.fact), onwardTo,
      };
    case 'sketch-tip': {
      return {
        kind: 'sketch-tip', asset: payload.asset,
        subject: payload.subject, detail: payload.detail, onwardTo,
      };
    }
    case 'invitation':
      return { ...cloneSerializable(payload), onwardTo };
    case 'invitation-response':
      return { ...cloneSerializable(payload), onwardTo };
    case 'recruitment-approach':
      return { ...cloneSerializable(payload), onwardTo };
    case 'recruitment-response':
      return { ...cloneSerializable(payload), onwardTo };
  }
}

/** Replace every representable carried content field with the words just projected. */
function replaceCarriedContent(message: NetworkMessage, spoken: SpokenNetworkPayload): void {
  const payload = message.payload;
  if (payload.kind !== spoken.kind) throw new Error(`network: projection kind mismatch ${payload.kind}/${spoken.kind}`);
  switch (payload.kind) {
    case 'directive': {
      if (spoken.kind !== 'directive') return;
      payload.version.brief = cloneSerializable(spoken.brief);
      payload.version.claimedIssuer = spoken.claimedIssuer;
      payload.version.replyRoute = cloneSerializable(spoken.replyRoute);
      return;
    }
    case 'directive-report': {
      if (spoken.kind !== 'directive-report') return;
      payload.report = cloneSerializable(spoken.report);
      payload.enemyAction = cloneSerializable(spoken.enemyAction);
      payload.factRefs = cloneSerializable(spoken.factRefs);
      return;
    }
    case 'directive-response': {
      if (spoken.kind !== 'directive-response') return;
      payload.response = spoken.response;
      payload.report = cloneSerializable(spoken.report);
      return;
    }
    case 'handler-brief': {
      if (spoken.kind !== 'handler-brief') return;
      payload.version.brief = cloneSerializable(spoken.brief);
      payload.version.claimedIssuer = spoken.claimedIssuer;
      payload.version.replyRoute = cloneSerializable(spoken.replyRoute);
      return;
    }
    case 'field-report': {
      if (spoken.kind !== 'field-report' || payload.renderedItems === null) return;
      if (spoken.items.length !== payload.renderedItems.length) {
        throw new Error(`network: field-report projection lost root association (${spoken.items.length}/${payload.renderedItems.length})`);
      }
      payload.renderedItems = spoken.items.map((item, index) => ({
        rootFingerprint: payload.renderedItems![index]!.rootFingerprint,
        observation: cloneSerializable(item.observation), factRefs: cloneSerializable(item.factRefs),
      }));
      return;
    }
    case 'compartment-fact': {
      if (spoken.kind !== 'compartment-fact') return;
      payload.asset = spoken.asset;
      payload.fact = cloneSerializable(spoken.fact);
      return;
    }
    case 'invitation': {
      if (spoken.kind !== 'invitation') return;
      Object.assign(payload, cloneSerializable({
        invitationId: spoken.invitationId, invitationKind: spoken.invitationKind,
        inviter: spoken.inviter, counterparty: spoken.counterparty, invitee: spoken.invitee,
        venue: spoken.venue, requested: spoken.requested,
      }));
      return;
    }
    case 'invitation-response': {
      if (spoken.kind !== 'invitation-response') return;
      payload.invitationId = spoken.invitationId;
      payload.response = spoken.response;
      return;
    }
    case 'recruitment-approach': {
      if (spoken.kind !== 'recruitment-approach') return;
      payload.approachId = spoken.approachId;
      payload.recruiter = spoken.recruiter;
      payload.target = spoken.target;
      return;
    }
    case 'recruitment-response': {
      if (spoken.kind !== 'recruitment-response') return;
      payload.approachId = spoken.approachId;
      payload.response = spoken.response;
      return;
    }
    case 'sketch-tip': {
      if (spoken.kind !== 'sketch-tip') return;
      // featureId remains association-only; every hop carries only the last spoken copy.
      payload.asset = spoken.asset;
      payload.subject = spoken.subject;
      payload.detail = spoken.detail;
      return;
    }
  }
}

function relayInputFor(
  world: WorldState, message: NetworkMessage, circle: Circle, addressedTo: EntityId, atTick: Tick,
): Parameters<typeof evaluateRelay>[0] {
  let authority: DirectiveAuthority = 'relationship';
  let discretion: DirectiveDiscretion = 'quiet';
  let named: EntityId = message.lastFrom;
  if (message.payload.kind === 'directive' || message.payload.kind === 'handler-brief') {
    authority = message.payload.version.brief.authority;
    discretion = message.payload.version.brief.discretion;
    named = message.payload.version.claimedIssuer === SOMEONE
      ? message.lastFrom : message.payload.version.claimedIssuer;
  } else if (message.payload.kind === 'recruitment-approach' || message.payload.kind === 'invitation') {
    authority = 'request';
    discretion = 'open';
  }
  return {
    relationshipToClaimedIssuer: trustBetween(world, message.holder, named),
    authority,
    discretion,
    bystanders: circle.members.filter((id) => id !== message.holder && id !== addressedTo).length,
    turnedAgainstMessagePrincipal: isTurnedAgainst(world, message.principal, message.holder),
    scrutiny: perceivedScrutiny(world, message.holder, messagePrincipalId(world, message), atTick),
  };
}

function queueBetrayalCopy(
  world: WorldState, message: NetworkMessage, t: Tick, heldVersion?: NetworkPayload & { kind: 'directive' },
): void {
  if (message.payload.kind !== 'directive') return;
  const payload = heldVersion ?? message.payload;
  const other: Principal = message.principal === 'player' ? 'enemy' : 'player';
  const handler = principalActor(world, other);
  if (handler === null || handler === message.holder) return;
  queueNetworkMessage(world, other, message.holder, [handler], {
    kind: 'handler-brief', sourceDirectiveId: payload.version.directiveId,
    version: cloneSerializable(payload.version),
  }, strictNextBeat(t), null, null);
}

function failExpired(world: WorldState, message: NetworkMessage, t: Tick): void {
  if (message.deliveredAt !== null || message.failedAt !== null
    || message.expiresAt === null || t <= message.expiresAt) return;
  message.failedAt = t;
  if (message.payload.kind !== 'directive') return;
  const payload = message.payload;
  const directive = world.network.directiveState?.records.find((candidate) =>
    candidate.id === payload.version.directiveId && candidate.received === null);
  if (directive) {
    directive.execution = {
      state: 'aborted', changedAt: t, dueAt: null, waiting: null,
    };
  }
}

function receiveFinal(
  world: WorldState, message: NetworkMessage, spoken: SpokenNetworkPayload, t: Tick, circle: Circle,
  rules: Rules,
): void {
  const state = ensureDirectiveState(world);
  switch (spoken.kind) {
    case 'directive': {
      if (message.payload.kind !== 'directive') throw new Error('network receipt: directive payload mismatch');
      const record = state.records.find((candidate) =>
        candidate.id === spoken.directiveId && candidate.principal === message.principal);
      if (!record) throw new Error(`network receipt: unknown directive '${spoken.directiveId}'`);
      if (record.recipient !== message.holder) {
        throw new Error(`network receipt: directive '${record.id}' reached '${message.holder}', expected '${record.recipient}'`);
      }
      if (record.received === null) {
        const lineage = message.payload.version;
        const scrutinyPrincipal = messagePrincipalId(world, message);
        if (spoken.brief.authority === 'compel') {
          recordScrutiny(world, message.holder, scrutinyPrincipal, 'authority-pressure', t);
        }
        if (spoken.claimedIssuer !== SOMEONE
          && spoken.brief.active.from <= t && t <= spoken.brief.active.until) {
          const alreadyActive = state.records.some((candidate) => candidate !== record
            && candidate.principal === message.principal && candidate.recipient === message.holder
            && candidate.received !== null
            && candidate.received.version.claimedIssuer === spoken.claimedIssuer
            && candidate.received.version.brief.active.from <= t
            && t <= candidate.received.version.brief.active.until);
          if (alreadyActive) recordScrutiny(
            world, message.holder, spoken.claimedIssuer, 'retasking', t,
          );
        }
        record.received = {
          tick: t,
          version: {
            id: lineage.id, parent: lineage.parent, directiveId: spoken.directiveId,
            brief: cloneSerializable(spoken.brief), claimedIssuer: spoken.claimedIssuer,
            replyRoute: cloneSerializable(spoken.replyRoute),
            changedBy: lineage.changedBy, changes: cloneSerializable(lineage.changes),
          },
          handoffFrom: message.lastFrom,
          messageId: message.id,
        };
        const npc = world.npcs[message.holder]!;
        const roster = assetFor(world, message.principal, message.holder);
        const knownFactions: Record<EntityId, typeof npc.faction> = { [npc.id]: npc.faction };
        for (const rival of npc.rivals) {
          const faction = world.npcs[rival]?.faction;
          if (faction !== undefined) knownFactions[rival] = faction;
        }
        record.decision = evaluateReceivedBrief({ directiveId: record.id,
          version: record.received.version, messagePrincipal: message.principal,
          handoffFrom: message.lastFrom,
          recipient: { id: npc.id, faction: npc.faction, rivals: [...npc.rivals], knownFactions,
            traits: [...npc.traits], mice: roster?.mice ?? null,
            relationshipToIssuer: spoken.claimedIssuer === SOMEONE ? 0
              : trustBetween(world, npc.id, spoken.claimedIssuer),
            strikes: roster?.strikes ?? 0,
            turned: isTurnedAgainst(world, message.principal, npc.id) },
          local: { tick: t, venue: circle.venue, circleMembers: [...circle.members].sort(),
            observations: { observer: npc.id, tick: t,
              observations: circle.members.filter((id) => id !== npc.id).sort().map((id) => ({
                kind: 'presence' as const, tick: t, venue: circle.venue, actor: id,
              })) } },
          perceivedScrutiny: perceivedScrutiny(world, npc.id, scrutinyPrincipal, t),
          stage: 'receipt' }, rules);
      }
      return;
    }
    case 'directive-report': {
      const record = state.records.find((candidate) =>
        candidate.id === spoken.directiveId && candidate.principal === message.principal
        && candidate.principalId === message.holder);
      if (!record) return;
      record.receivedReports.push({
        receivedAt: t, via: message.lastFrom, report: cloneSerializable(spoken.report),
      });
      return;
    }
    case 'field-report': {
      if (message.payload.kind !== 'field-report') throw new Error('network receipt: field-report payload mismatch');
      for (const id of message.payload.sourceObservationIds) {
        const held = state.heldObservations.find((candidate) => candidate.id === id);
        if (!held || held.queuedIn !== message.id) {
          throw new Error(`network receipt: malformed field-report source '${id}'`);
        }
        if (held.deliveredAt === null) held.deliveredAt = t;
      }
      return;
    }
    case 'compartment-fact': {
      if (message.payload.kind !== 'compartment-fact') {
        throw new Error('network receipt: compartment-fact payload mismatch');
      }
      const payload = message.payload;
      const asset = world.network.assets.find((candidate) => candidate.id === payload.asset);
      if (asset) asset.leakedThrough = Math.max(asset.leakedThrough ?? 0, payload.factIndex + 1);
      return;
    }
    case 'sketch-tip': {
      if (message.payload.kind !== 'sketch-tip') throw new Error('network receipt: sketch-tip payload mismatch');
      const payload = message.payload;
      const asset = world.network.enemyAssets.find((candidate) => candidate.id === payload.asset);
      const index = world.enemy.sketch.filter((feature) => feature.subject !== null)
        .findIndex((feature) => feature.id === payload.featureId);
      if (asset && index >= 0) asset.revealedThrough = Math.max(asset.revealedThrough ?? 0, index + 1);
      return;
    }
    case 'handler-brief':
    case 'directive-response':
    case 'invitation':
    case 'invitation-response':
    case 'recruitment-approach':
    case 'recruitment-response':
      return;
  }
}

function attemptHop(
  world: WorldState,
  message: NetworkMessage,
  circle: Circle,
  t: Tick,
  rules: Rules,
): NetworkSpeech | null {
  failExpired(world, message, t);
  const addressedTo = currentRecipient(message);
  if (addressedTo === null || message.deliveredAt !== null || message.failedAt !== null) return null;
  if (minuteOfDay(t) % CONVERSATION_BEAT !== 0 || t < message.availableAfter) return null;
  if (!circle.members.includes(message.holder) || !circle.members.includes(addressedTo)) return null;

  const isOriginSend = message.holder === message.origin && message.nextHop === 0;
  let decision: RelayDecision = 'forward';
  let relayInput: ReturnType<typeof relayInputFor> | null = null;
  if (!isOriginSend) {
    relayInput = relayInputFor(world, message, circle, addressedTo, t);
    decision = evaluateRelay(relayInput);
    if (message.payload.kind !== 'directive' && decision === 'betray-and-forward') decision = 'hold';
    if (decision === 'hold') return null;
    if (decision === 'drop') {
      message.failedAt = t;
      return null;
    }
  }

  const hop = message.nextHop;
  const alreadyProcessed = message.processedRelayHops.includes(hop);
  const betrayalCopy = !alreadyProcessed && decision === 'betray-and-forward'
    && message.payload.kind === 'directive' ? cloneSerializable(message.payload) : null;
  const scrutiny = relayInput?.scrutiny
    ?? perceivedScrutiny(world, message.holder, messagePrincipalId(world, message), t);
  const projectsBrief = message.payload.kind === 'handler-brief'
    || (message.payload.kind === 'directive' && !isOriginSend);
  const projectsReport = message.payload.kind === 'directive-report';
  if (!alreadyProcessed && (projectsBrief || projectsReport)) {
    const mode = message.payload.kind === 'handler-brief' ? 'handler-report' : 'relay';
    if (!projectCarriedSpeech(world, message, rules, mode, scrutiny)) return null;
  }
  if (betrayalCopy) queueBetrayalCopy(world, message, t, betrayalCopy);
  const spoken = projectPayload(world, message, message.holder, addressedTo, rules, !alreadyProcessed, t);
  replaceCarriedContent(message, spoken);
  if (!isOriginSend && !alreadyProcessed) {
    message.processedRelayHops.push(hop);
    message.processedRelayHops.sort((a, b) => a - b);
    if ((relayInput?.scrutiny ?? 0) >= 0.70) {
      message.availableAfter = t + CONVERSATION_BEAT;
      return null;
    }
  }

  const previousHolder = message.holder;
  message.lastFrom = previousHolder;
  message.holder = addressedTo;
  message.nextHop += 1;
  const final = message.nextHop >= message.route.length;
  if (final) message.deliveredAt = t;
  else message.availableAfter = t + CONVERSATION_BEAT;

  const speech: NetworkSpeech = {
    tick: t,
    venue: circle.venue,
    circleMembers: [...circle.members].sort(),
    speaker: previousHolder,
    addressedTo,
    messageId: message.id,
    spoken,
    cause: cloneSerializable(message.cause),
  };
  if (final) receiveFinal(world, message, spoken, t, circle, rules);
  return speech;
}

function expireAll(world: WorldState, t: Tick): void {
  for (const message of world.network.directiveState?.messages ?? []) failExpired(world, message, t);
}

export function deliverNetworkMessages(
  world: WorldState,
  frame: PreparedTick,
  rules: Rules,
  phase: 'player' | 'response',
): NetworkSpeech[] {
  expireAll(world, frame.tick);
  if (minuteOfDay(frame.tick) % CONVERSATION_BEAT !== 0) return [];
  const player = world.playerId;
  const messages = [...(world.network.directiveState?.messages ?? [])]
    .filter((message) => {
      if (message.createdAt !== frame.tick || message.cause?.kind !== 'player-action') return false;
      if (phase === 'player') return player !== null && message.holder === player;
      return message.holder !== player && (
        message.payload.kind === 'directive-response'
        || message.payload.kind === 'invitation-response'
        || message.payload.kind === 'recruitment-response'
        || message.payload.kind === 'directive-report'
      );
    })
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const speeches: NetworkSpeech[] = [];
  for (const message of messages) {
    const recipient = currentRecipient(message);
    if (recipient === null) continue;
    const circle = circleFor(frame.circles, message.holder, recipient);
    if (!circle) continue;
    const speech = attemptHop(world, message, circle, frame.tick, rules);
    if (speech) speeches.push(speech);
  }
  return speeches;
}

export function collectNetworkForwardIntents(
  world: WorldState,
  t: Tick,
  circles: readonly Circle[],
): NpcAutonomousIntent[] {
  if (minuteOfDay(t) % CONVERSATION_BEAT !== 0) return [];
  const player = world.playerId;
  const intents: NpcAutonomousIntent[] = [];
  for (const message of world.network.directiveState?.messages ?? []) {
    const recipient = currentRecipient(message);
    if (recipient === null || message.holder === player || message.deliveredAt !== null || message.failedAt !== null) continue;
    if (message.expiresAt !== null && t > message.expiresAt) continue;
    if (t < message.availableAfter || !circleFor(circles, message.holder, recipient)) continue;
    const numericId = Number(message.id.slice(1));
    if (!Number.isSafeInteger(numericId) || numericId < 0) {
      throw new Error(`network: malformed message id '${message.id}'`);
    }
    const ref = `${String(message.createdAt).padStart(10, '0')}:${String(numericId).padStart(10, '0')}`;
    intents.push({ kind: 'network-forward', actor: message.holder, ref, rank: 1 });
  }
  return intents.sort((a, b) => a.actor.localeCompare(b.actor) || a.ref.localeCompare(b.ref));
}

export function realizeNetworkForward(
  world: WorldState,
  messageId: MessageId,
  circle: Circle,
  t: Tick,
  rules: Rules,
): NetworkSpeech | null {
  const message = world.network.directiveState?.messages.find((candidate) => {
    if (candidate.id === messageId) return true; // direct helper calls use the public message id
    const numericId = Number(candidate.id.slice(1));
    const ref = `${String(candidate.createdAt).padStart(10, '0')}:${String(numericId).padStart(10, '0')}`;
    return ref === messageId;
  });
  if (!message) return null;
  return attemptHop(world, message, circle, t, rules);
}

export function networkSourceDirectiveId(message: NetworkMessage): string | null {
  return sourceDirectiveId(message.payload);
}
