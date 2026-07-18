import { dayOf, TICKS_PER_DAY, type Tick } from '../../core/time';
import { positionOf, type Circle } from '../agents';
import { cloneSerializable } from '../hash';
import { recordFact } from '../network/compartment';
import { assetFor, isTurnedAgainst, principalActor } from '../network/roster';
import type { NpcAutonomousIntent, NpcIntentRealization } from '../phases';
import type { ObservationFeed, Utterance } from '../perception';
import { mintClaim, SOMEONE, type EntityId, type VenueId } from '../rumors/claim';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { Rules } from '../rules';
import type { InquiryTask, Npc, WorldState } from '../types';
import { trustBetween } from '../world';
import { evaluateReceivedBrief, type ReceivedBriefInput } from './evaluator';
import { projectBrief } from './mutation';
import { queueDirectiveReport, buildDirectiveReport } from './reports';
import { perceivedScrutiny } from './scrutiny';
import { allocateNetworkMessage, strictNextBeat, validateNetworkRoute } from './state';
import type {
  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord, NetworkMessage,
} from './types';
import { applicationOf, correlationOf, type DirectiveApplication } from './types';
import { appendInvitation } from '../network/invitations';

const priorityRank = { urgent: 2, important: 4, routine: 6 } as const;

function knownFactions(world: WorldState, npc: Npc): Record<EntityId, Npc['faction']> {
  const result: Record<EntityId, Npc['faction']> = { [npc.id]: npc.faction };
  for (const rival of npc.rivals) {
    const faction = world.npcs[rival]?.faction;
    if (faction !== undefined) result[rival] = faction;
  }
  return result;
}

function localFeed(world: WorldState, actor: EntityId, tick: Tick, venue: VenueId): ObservationFeed {
  return {
    observer: actor,
    tick,
    observations: Object.values(world.npcs)
      .filter((npc) => npc.id !== actor && positionOf(world, npc, tick) === venue)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((npc) => ({ kind: 'presence' as const, tick, venue, actor: npc.id })),
  };
}

function evaluationInput(
  world: WorldState,
  record: DirectiveRecord,
  circle: Circle,
  tick: Tick,
  stage: 'receipt' | 'execution',
): ReceivedBriefInput {
  if (record.received === null) throw new Error(`directive '${record.id}': cannot evaluate before receipt`);
  const npc = world.npcs[record.recipient]!;
  const roster = assetFor(world, record.principal, record.recipient);
  const issuer = record.received.version.claimedIssuer;
  const scrutinyPrincipal = issuer === SOMEONE ? record.received.handoffFrom : issuer;
  return {
    directiveId: record.id,
    version: record.received.version,
    messagePrincipal: record.principal,
    handoffFrom: record.received.handoffFrom,
    recipient: {
      id: npc.id,
      faction: npc.faction,
      rivals: [...npc.rivals],
      knownFactions: knownFactions(world, npc),
      traits: [...npc.traits],
      mice: roster?.mice ?? null,
      relationshipToIssuer: issuer === SOMEONE ? 0 : trustBetween(world, npc.id, issuer),
      strikes: roster?.strikes ?? 0,
      turned: isTurnedAgainst(world, record.principal, npc.id),
    },
    local: {
      tick,
      venue: circle.venue,
      circleMembers: [...circle.members].sort(),
      observations: localFeed(world, npc.id, tick, circle.venue),
    },
    perceivedScrutiny: perceivedScrutiny(world, npc.id, scrutinyPrincipal, tick),
    stage,
  };
}

function refusalResult(record: DirectiveRecord, reason: string): DirectiveExecutionResult {
  return {
    outcome: 'refused', reason, evidence: [], source: record.recipient,
    uncertainty: 'medium', reportedClaim: null, factRefs: [],
  };
}

function abortRecord(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  tick: Tick,
  rules: Rules,
  reason: string,
  queueReport = true,
): void {
  record.execution = { state: 'aborted', changedAt: tick, dueAt: null, waiting: null };
  if (queueReport) queueDirectiveReport(world, record, profile, refusalResult(record, reason), rules, tick);
}

function scheduleDirectiveDue(world: WorldState, record: DirectiveRecord, due: Tick): void {
  const setupId = `directive-due:${record.id}:${due}`;
  const existing = world.scheduledSetup?.filter((setup) => setup.ref === record.id
    && setup.kind === 'directive-due') ?? [];
  if (existing.length > 0) {
    throw new Error(`directive '${record.id}': attempted to queue two directive-due setups`);
  }
  if (due <= world.tick) {
    throw new Error(`directive '${record.id}': due tick ${due} must be after ${world.tick}`);
  }
  const setup = {
    id: setupId, due, kind: 'directive-due', actor: record.recipient, ref: record.id, override: null,
  } as const;
  if (world.scheduledSetup) world.scheduledSetup.push(cloneSerializable(setup));
  else world.scheduledSetup = [cloneSerializable(setup)];
}

/**
 * A final recipient who secretly serves the other principal may report only the copy that actually
 * arrived. This allocates an independent evidence message; no later handler path consults the source
 * record again.
 */
function queueTurncoatHandlerCopy(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  tick: Tick,
): void {
  if (record.received === null
    || !isTurnedAgainst(world, record.principal, record.recipient)) return;
  const secretPrincipal = record.principal === 'player' ? 'enemy' : 'player';
  const handler = principalActor(world, secretPrincipal);
  if (handler === null || handler === record.recipient) return;

  let availableAfter = tick;
  const version = cloneSerializable(record.received.version);
  if (profile.candor === 'omissive') {
    version.brief.purpose = null;
    version.brief.guidance = version.brief.guidance.filter((row) => row.kind !== 'note');
  } else if (profile.candor === 'guarded') {
    if (profile.risk === 'avoidant') return;
    availableAfter = tick + TICKS_PER_DAY;
  } else if (profile.candor !== 'doctored') {
    return;
  }

  validateNetworkRoute(world, record.recipient, [handler]);
  allocateNetworkMessage(world, secretPrincipal, record.recipient, [handler], {
    kind: 'handler-brief', sourceDirectiveId: record.id, version,
  }, availableAfter, null, null);
}

/** Install the receipt decision and its one direct response/general refusal path. */
export function initializeDirectiveReceipt(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  message: NetworkMessage,
  tick: Tick,
  rules: Rules,
): void {
  record.decision = cloneSerializable(profile);
  const directPlayerReceipt = record.principal === 'player'
    && message.origin === record.principalId
    && message.route.length === 1
    && message.route[0] === record.recipient
    && message.cause?.kind === 'player-action'
    && message.cause.action === 'directive';

  if (profile.commitment === 'refuse') {
    record.execution = { state: 'aborted', changedAt: tick, dueAt: null, waiting: null };
  } else {
    const due = profile.timing.actAt;
    if (due === null) throw new Error(`directive '${record.id}': ${profile.commitment} has no actAt`);
    record.execution = {
      state: profile.commitment === 'defer' ? 'deferred' : 'pending',
      changedAt: tick, dueAt: null, waiting: null,
    };
    scheduleDirectiveDue(world, record, due);
  }

  queueTurncoatHandlerCopy(world, record, profile, tick);

  if (directPlayerReceipt) {
    let report = null;
    if (profile.commitment === 'refuse' && record.received!.version.brief.report !== 'none') {
      report = buildDirectiveReport(world, record, profile,
        refusalResult(record, 'the recipient refused the received brief'), rules).report;
    }
    validateNetworkRoute(world, record.recipient, [record.principalId]);
    allocateNetworkMessage(world, record.principal, record.recipient, [record.principalId], {
      kind: 'directive-response', directiveId: record.id,
      response: profile.commitment, report,
    }, tick, null, { kind: 'player-action', action: 'directive', tick });
  } else if (profile.commitment === 'refuse') {
    queueDirectiveReport(world, record, profile,
      refusalResult(record, 'the recipient refused the received brief'), rules, tick);
  }
}

/** Phase 1 handler: setup makes a received record eligible but performs no act. */
export function markDirectiveDue(world: WorldState, directiveId: string, tick: Tick): void {
  const record = world.network.directiveState?.records.find((candidate) => candidate.id === directiveId);
  if (!record || record.received === null || record.execution === null) {
    throw new Error(`directive-due: unknown received directive '${directiveId}'`);
  }
  if (record.execution.state === 'completed' || record.execution.state === 'aborted'
    || record.execution.state === 'awaiting-answer') return;
  record.execution.dueAt = tick;
  record.execution.changedAt = tick;
  const remaining = world.scheduledSetup?.filter((setup) => !(setup.kind === 'directive-due'
    && setup.ref === directiveId && setup.due === tick)) ?? [];
  if (remaining.length > 0) world.scheduledSetup = remaining;
  else delete world.scheduledSetup;
}

export function collectDirectiveActIntents(
  world: WorldState,
  tick: Tick,
  circles: readonly Circle[],
): NpcAutonomousIntent[] {
  const present = new Set(circles.flatMap((circle) => circle.members));
  return (world.network.directiveState?.records ?? [])
    .filter((record) => {
      if (record.received === null || record.execution === null
        || record.execution.state === 'completed' || record.execution.state === 'aborted'
        || !present.has(record.recipient)) return false;
      const correlation = correlationOf(record);
      const courier = correlation.kind === 'courier'
        ? world.network.pendingCouriers.find((run) => run.planId === correlation.planId) : undefined;
      if (courier) {
        return tick > courier.pickedUpAt && circles.some((circle) =>
          circle.members.includes(courier.asset) && circle.members.includes(courier.target));
      }
      return record.execution.dueAt !== null && record.execution.dueAt <= tick;
    })
    .map((record) => ({ kind: 'directive-act' as const, actor: record.recipient,
      ref: record.id, rank: priorityRank[record.received!.version.brief.priority] }))
    .sort((a, b) => a.actor.localeCompare(b.actor) || a.ref.localeCompare(b.ref));
}

function deferOrAbort(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  tick: Tick,
  rules: Rules,
  reason: string,
): void {
  const next = strictNextBeat(tick);
  if (next <= record.received!.version.brief.active.until) {
    record.execution = { state: 'deferred', changedAt: tick, dueAt: null, waiting: null };
    scheduleDirectiveDue(world, record, next);
  } else abortRecord(world, record, profile, tick, rules, reason);
}

function actorAt(world: WorldState, actor: EntityId, venue: VenueId, tick: Tick): boolean {
  const npc = world.npcs[actor];
  return npc !== undefined && positionOf(world, npc, tick) === venue;
}

function adaptivePerson(circle: Circle, recipient: EntityId): EntityId | null {
  return [...circle.members].filter((id) => id !== recipient).sort()[0] ?? null;
}

function opportunityFor(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  circle: Circle,
  tick: Tick,
): { method: DirectiveDecisionProfile['method']; adapted: boolean } | null {
  const method = profile.method;
  if (method.kind === 'hold') return null;
  if (method.kind === 'observe') {
    if (method.target.kind === 'person') {
      if (actorAt(world, method.target.id, circle.venue, tick)) return { method, adapted: false };
      if (profile.initiative === 'adaptive') {
        const id = adaptivePerson(circle, record.recipient);
        if (id !== null) return { method: { ...method, target: { kind: 'person', id } }, adapted: true };
      }
      return null;
    }
    if (method.target.kind === 'venue') {
      if (circle.venue === method.target.id) return { method, adapted: false };
      return profile.initiative === 'adaptive'
        ? { method: { ...method, target: { kind: 'venue', id: circle.venue } }, adapted: true }
        : null;
    }
    return null;
  }
  if (method.kind === 'ask') {
    if (method.target.kind !== 'story' || adaptivePerson(circle, record.recipient) === null) return null;
    return { method, adapted: false };
  }
  if (method.kind === 'tell') {
    if (method.audience.kind === 'person') {
      if (circle.members.includes(method.audience.id)) return { method, adapted: false };
      if (profile.initiative === 'adaptive') {
        const id = adaptivePerson(circle, record.recipient);
        if (id !== null) return { method: { ...method, audience: { kind: 'person', id } }, adapted: true };
      }
      return null;
    }
    return adaptivePerson(circle, record.recipient) === null ? null : { method, adapted: false };
  }
  return null;
}

function observeResult(
  record: DirectiveRecord,
  target: Extract<DirectiveDecisionProfile['method'], { kind: 'observe' }>['target'],
  circle: Circle,
  tick: Tick,
): DirectiveExecutionResult {
  const people = target.kind === 'person' ? [target.id] : [...circle.members]
    .filter((id) => id !== record.recipient).sort();
  return {
    outcome: target.kind === 'person' ? 'observed person' : 'observed venue',
    reason: 'the requested subject was present in the local frame',
    evidence: people.map((person) => ({ kind: 'observation' as const,
      text: `presence:${person}:${circle.venue}:${tick}` })),
    source: record.recipient, uncertainty: 'low', reportedClaim: null, factRefs: [],
  };
}

/** A dead-drop artifact is physically read at pickup; no synthetic transport hop is created. */
export function initializeArtifactReceipt(
  world: WorldState, record: DirectiveRecord, circle: Circle, tick: Tick, rules: Rules,
): void {
  if (record.received !== null) throw new Error(`directive '${record.id}': artifact already received`);
  record.received = {
    tick, version: cloneSerializable(record.authored),
    handoffFrom: record.principalId, messageId: `drop:${record.id}`,
  };
  const profile = evaluateReceivedBrief(evaluationInput(world, record, circle, tick, 'receipt'), rules);
  const synthetic: NetworkMessage = {
    id: `drop:${record.id}`, principal: record.principal, createdAt: tick,
    origin: record.recipient, holder: record.recipient, lastFrom: record.principalId,
    route: [record.recipient], nextHop: 1, availableAfter: tick,
    payload: { kind: 'directive', version: cloneSerializable(record.authored) },
    deliveredAt: tick, expiresAt: null, failedAt: null, processedRelayHops: [], cause: null,
  };
  initializeDirectiveReceipt(world, record, profile, synthetic, tick, rules);
  if (profile.commitment === 'refuse') {
    const correlation = correlationOf(record);
    if (correlation.kind === 'courier' && correlation.dropPayloadId !== null) {
      const payload = world.network.dropPayloads?.find((row) => row.id === correlation.dropPayloadId);
      if (payload && payload.failedAt === null) payload.failedAt = tick;
    }
  }
}

function interpretedApplication(
  world: WorldState, record: DirectiveRecord, circle: Circle, tick: Tick, rules: Rules,
): DirectiveApplication {
  const input = evaluationInput(world, record, circle, tick, 'execution');
  const projection = projectBrief({
    version: input.version, speaker: input.recipient, lastFrom: input.handoffFrom,
    audience: input.messagePrincipal, turnedAgainstAudience: input.recipient.turned,
    perceivedScrutiny: input.perceivedScrutiny, mode: 'private-interpretation',
  }, rules);
  return applicationOf(projection.brief);
}

function enemyActionFor(
  world: WorldState, record: DirectiveRecord, application: Exclude<DirectiveApplication,
    { kind: 'standard' | 'posting' | 'rendezvous' | 'courier' }>,
  kind: 'inquiry-started' | 'interrogation-asked' | 'watch-worked' | 'watch-cancelled',
  tick: Tick, venue: VenueId, workedDay: number | null,
) {
  const district = application.kind === 'enemy-watch' || application.kind === 'cancel-watch'
    ? application.district
    : world.enemy.map.venues.find((candidate) => candidate.id === venue)?.district ?? 'unknown';
  const about = application.kind === 'enemy-inquiry' || application.kind === 'enemy-interrogation'
    ? application.about : application.kind === 'enemy-watch' ? application.about : null;
  const subject = application.kind === 'enemy-interrogation' ? application.target
    : application.kind === 'enemy-watch' ? application.subject
      : application.kind === 'enemy-inquiry' && 'subject' in application.about
        ? application.about.subject : null;
  const scheduleStartDay = application.kind === 'enemy-watch' || application.kind === 'cancel-watch'
    ? application.startDay : application.kind === 'enemy-interrogation' ? application.day : dayOf(tick);
  return {
    kind, subject, about, district, scheduleStartDay, guard: record.recipient,
    venue, workedDay, occurredAt: tick,
  } as const;
}

function completeWithApplicationReport(
  world: WorldState, record: DirectiveRecord, profile: DirectiveDecisionProfile,
  tick: Tick, rules: Rules, outcome: string,
  enemyAction: DirectiveExecutionResult['enemyAction'] = null,
): void {
  record.execution = { state: 'completed', changedAt: tick, dueAt: null, waiting: null };
  queueDirectiveReport(world, record, profile, {
    outcome, reason: 'the received application found a lawful local opportunity', evidence: [],
    source: record.recipient, uncertainty: 'low', reportedClaim: null, factRefs: [], enemyAction,
  }, rules, tick);
}

function startApplication(
  world: WorldState, record: DirectiveRecord, profile: DirectiveDecisionProfile,
  application: DirectiveApplication, circle: Circle, tick: Tick, rules: Rules,
): boolean {
  const correlation = correlationOf(record);
  switch (application.kind) {
    case 'standard': return false;
    case 'posting': {
      const sourceRef = `posting:${record.recipient}`;
      const kept = (world.scheduleOverrides[record.recipient] ?? [])
        .filter((override) => override.sourceRef !== sourceRef);
      const informant = world.intel.informants.find((row) => row.id === record.recipient);
      if (application.venue === null) {
        if (kept.length > 0) world.scheduleOverrides[record.recipient] = kept;
        else delete world.scheduleOverrides[record.recipient];
        if (informant) informant.assignedVenue = null;
        completeWithApplicationReport(world, record, profile, tick, rules, 'posting removed');
        return true;
      }
      kept.push({
        fromDay: Math.max(dayOf(tick), dayOf(record.issuedAt) + 1),
        toDay: dayOf(record.received!.version.brief.active.until) + 1,
        from: 960, to: 1200, venue: application.venue,
        source: 'player', sourceRef,
      });
      world.scheduleOverrides[record.recipient] = kept;
      if (informant) informant.assignedVenue = application.venue;
      record.execution = { state: 'attempted', changedAt: tick, dueAt: null, waiting: null };
      return true;
    }
    case 'rendezvous': {
      const scheduledFrom = profile.timing.actAt ?? tick;
      const scheduledUntil = scheduledFrom + CONVERSATION_BEAT;
      const invitation = appendInvitation(world, {
        kind: 'rendezvous', principal: record.principal, inviter: record.principalId,
        counterparty: record.recipient, invitee: record.recipient, venue: application.venue,
        requested: { from: scheduledFrom, until: scheduledUntil },
        scheduled: { from: scheduledFrom, until: scheduledUntil }, status: 'accepted',
        offeredAt: record.received!.tick, respondedAt: tick, setupId: null,
        sourceDirectiveId: record.id, attendedAt: null, closedAt: null,
      });
      world.scheduleOverrides[record.recipient] = [{
        fromDay: dayOf(scheduledFrom), toDay: dayOf(scheduledUntil - 1) + 1,
        from: scheduledFrom % TICKS_PER_DAY, to: scheduledUntil % TICKS_PER_DAY,
        venue: application.venue, source: 'player', sourceRef: `rendezvous:${record.id}`,
      }, ...(world.scheduleOverrides[record.recipient] ?? [])];
      invitation.setupId = `rendezvous:${record.id}`;
      record.execution = { state: 'attempted', changedAt: tick, dueAt: null, waiting: null };
      return true;
    }
    case 'courier': {
      if (correlation.kind !== 'courier') throw new Error(`directive '${record.id}': courier lacks correlation`);
      if (!world.network.pendingCouriers.some((run) => run.planId === correlation.planId)) {
        const method = profile.method;
        if (method.kind !== 'tell') throw new Error(`directive '${record.id}': courier engagement is not tell`);
        const pickedUpAt = record.received!.tick;
        world.network.pendingCouriers.push({
          planId: correlation.planId, asset: record.recipient,
          spec: cloneSerializable(method.payload.claim), target: application.target,
          viaDrop: correlation.dropPayloadId === null ? null
            : world.network.dropPayloads?.find((row) => row.id === correlation.dropPayloadId)?.dropId ?? null,
          pickedUpAt, expiresAt: pickedUpAt + 3 * TICKS_PER_DAY,
        });
      }
      record.execution = { state: 'attempted', changedAt: tick, dueAt: null, waiting: null };
      return true;
    }
    case 'enemy-inquiry': {
      const tasks = world.inquiries[record.recipient] ?? (world.inquiries[record.recipient] = []);
      if (!tasks.some((task) => task.directiveId === record.id)) tasks.push({
        id: record.id, about: cloneSerializable(application.about), from: 'enemy',
        expiresDay: application.expiresDay + 1,
        expiresAt: record.received!.version.brief.active.until,
        asked: [], answersHeard: 0, directiveId: record.id,
      });
      completeWithApplicationReport(world, record, profile, tick, rules, 'inquiry started',
        enemyActionFor(world, record, application, 'inquiry-started', tick, circle.venue, null));
      return true;
    }
    case 'enemy-interrogation': {
      if (correlation.kind !== 'enemy-order') {
        throw new Error(`directive '${record.id}': enemy interrogation lacks order correlation`);
      }
      const tasks = world.inquiries[record.recipient] ?? (world.inquiries[record.recipient] = []);
      if (!tasks.some((task) => task.directiveId === record.id)) tasks.push({
        id: record.id, about: cloneSerializable(application.about), from: 'enemy',
        expiresDay: application.day + 2, expiresAt: record.received!.version.brief.active.until,
        asked: [], answersHeard: 0, directiveId: record.id, addressee: application.target,
      });
      const active = record.received!.version.brief.active;
      world.scheduleOverrides[record.recipient] = [
        ...(world.scheduleOverrides[record.recipient] ?? [])
          .filter((row) => row.sourceRef !== correlation.sourceRef),
        {
          fromDay: application.day, toDay: application.day + 1,
          from: active.from % TICKS_PER_DAY, to: (active.until + 1) % TICKS_PER_DAY,
          venue: application.venue, source: 'enemy', sourceRef: correlation.sourceRef,
        },
      ];
      record.execution = { state: 'attempted', changedAt: tick, dueAt: null, waiting: null };
      return true;
    }
    case 'enemy-watch': {
      const sourceRef = `order:watch:${application.district}:${record.recipient}`;
      world.scheduleOverrides[record.recipient] = [
        ...(world.scheduleOverrides[record.recipient] ?? []).filter((row) => row.sourceRef !== sourceRef),
        { fromDay: Math.max(application.startDay, dayOf(tick)), toDay: application.startDay + 8,
          from: 960, to: 1140, venue: application.post.venue,
          source: 'enemy', sourceRef },
      ];
      record.execution = { state: 'attempted', changedAt: tick, dueAt: null, waiting: null,
        workedDays: [] };
      return true;
    }
    case 'cancel-watch': {
      const sourceRef = `order:watch:${application.district}:${application.guard}`;
      const kept = (world.scheduleOverrides[application.guard] ?? []).filter((row) =>
        !(row.sourceRef === sourceRef && row.fromDay === application.startDay));
      if (kept.length > 0) world.scheduleOverrides[application.guard] = kept;
      else delete world.scheduleOverrides[application.guard];
      completeWithApplicationReport(world, record, profile, tick, rules, 'watch cancelled',
        enemyActionFor(world, record, application, 'watch-cancelled', tick, application.venue, null));
      return true;
    }
  }
}

/** Realize one already-selected directive intent. */
export function attemptDirective(
  world: WorldState,
  directiveId: string,
  circle: Circle,
  tick: Tick,
  rules: Rules,
): NpcIntentRealization {
  const empty: NpcIntentRealization = { askings: [], answers: [], tellings: [], extras: [] };
  const record = world.network.directiveState?.records.find((candidate) => candidate.id === directiveId);
  if (!record || record.received === null || record.execution === null) return empty;
  const correlation = correlationOf(record);
  if (correlation.kind === 'courier') {
    const run = world.network.pendingCouriers.find((candidate) => candidate.planId === correlation.planId);
    if (run && tick > run.pickedUpAt && tick < run.expiresAt
      && circle.members.includes(run.asset) && circle.members.includes(run.target)) {
      const family = `f${world.claimCounter}`;
      const claim = mintClaim(world, { ...run.spec, family, parent: null });
      world.claims[claim.id] = claim;
      const factIndex = recordFact(world, record.principal, run.asset,
        { kind: 'carried-story', ref: family });
      const profile = record.decision!;
      record.execution = { state: 'completed', changedAt: tick, dueAt: null, waiting: null };
      queueDirectiveReport(world, record, profile, {
        outcome: 'courier delivered',
        reason: 'the carrier and target physically shared a conversation circle',
        evidence: [], source: record.recipient, uncertainty: 'low', reportedClaim: null,
        factRefs: [{ asset: run.asset, factIndex }],
      }, rules, tick);
      world.network.pendingCouriers = world.network.pendingCouriers.filter((candidate) => candidate !== run);
      const dropPayload = correlation.dropPayloadId === null ? null
        : world.network.dropPayloads?.find((row) => row.id === correlation.dropPayloadId) ?? null;
      if (dropPayload) dropPayload.deliveredAt = tick;
      if (world.playerId !== null && circle.members.includes(world.playerId)) {
        const plan = world.intel.courierPlans?.find((row) => row.id === correlation.planId);
        if (plan) plan.acknowledgedAt = tick;
      }
      const telling: Utterance = {
        tick, venue: circle.venue, circleMembers: [...circle.members].sort(),
        speaker: run.asset, addressedTo: run.target, claim, mode: 'telling',
      };
      return { askings: [], answers: [], tellings: [telling], extras: [] };
    }
  }
  if (record.execution.dueAt === null || record.execution.dueAt > tick) return empty;
  record.execution.dueAt = null;
  const profile = evaluateReceivedBrief(evaluationInput(world, record, circle, tick, 'execution'), rules);
  record.decision = cloneSerializable(profile);
  if (profile.commitment === 'refuse') {
    abortRecord(world, record, profile, tick, rules, 'local conditions caused refusal');
    return empty;
  }
  if (profile.commitment === 'defer' || profile.method.kind === 'hold') {
    deferOrAbort(world, record, profile, tick, rules, 'no lawful opportunity remained before expiry');
    return empty;
  }
  const application = interpretedApplication(world, record, circle, tick, rules);
  if (application.kind !== 'standard') {
    record.execution = {
      state: 'attempted', changedAt: tick, dueAt: null, waiting: null,
    };
    startApplication(world, record, profile, application, circle, tick, rules);
    return empty;
  }
  const opportunity = opportunityFor(world, record, profile, circle, tick);
  if (opportunity === null) {
    deferOrAbort(world, record, profile, tick, rules, 'the requested local opportunity was absent');
    return empty;
  }
  record.execution = {
    state: opportunity.adapted ? 'adapted' : 'attempted', changedAt: tick, dueAt: null, waiting: null,
  };
  const method = opportunity.method;
  if (method.kind === 'observe') {
    const result = observeResult(record, method.target, circle, tick);
    record.execution = { state: 'completed', changedAt: tick, dueAt: null, waiting: null };
    queueDirectiveReport(world, record, profile, result, rules, tick);
    return empty;
  }
  if (method.kind === 'ask' && method.target.kind === 'story') {
    const task: InquiryTask = {
      id: record.id, about: { family: method.target.family }, from: record.principal,
      expiresDay: dayOf(record.received.version.brief.active.until) + 1,
      expiresAt: record.received.version.brief.active.until,
      asked: [], answersHeard: 0, directiveId: record.id,
    };
    const tasks = world.inquiries[record.recipient] ?? (world.inquiries[record.recipient] = []);
    if (!tasks.some((candidate) => candidate.id === task.id)) tasks.push(task);
    return empty;
  }
  if (method.kind === 'tell') {
    const addressedTo = method.audience.kind === 'person'
      ? method.audience.id : adaptivePerson(circle, record.recipient);
    if (addressedTo === null || !circle.members.includes(addressedTo)) {
      deferOrAbort(world, record, profile, tick, rules, 'the audience left before realization');
      return empty;
    }
    const family = method.payload.family ?? `f${world.claimCounter}`;
    const claim = mintClaim(world, {
      ...method.payload.claim, family, parent: method.payload.parent,
    });
    world.claims[claim.id] = claim;
    const telling: Utterance = {
      tick, venue: circle.venue, circleMembers: [...circle.members].sort(),
      speaker: record.recipient, addressedTo, claim, mode: 'telling',
    };
    const factIndex = recordFact(world, record.principal, record.recipient,
      { kind: 'carried-story', ref: claim.family });
    const result: DirectiveExecutionResult = {
      outcome: 'story emitted', reason: 'a lawful audience was present', evidence: [],
      source: record.recipient, uncertainty: 'low', reportedClaim: claim,
      factRefs: [{ asset: record.recipient, factIndex }],
    };
    record.execution = { state: 'completed', changedAt: tick, dueAt: null, waiting: null };
    queueDirectiveReport(world, record, profile, result, rules, tick);
    return { askings: [], answers: [], tellings: [telling], extras: [] };
  }
  deferOrAbort(world, record, profile, tick, rules, 'the selected method is not installed');
  return empty;
}

/** Called immediately after a directive-owned ordinary asking is emitted. */
export function recordDirectiveInquiryAsked(
  world: WorldState, taskId: string, tick: Tick, rules: Rules,
): boolean {
  const record = world.network.directiveState?.records.find((candidate) => candidate.id === taskId);
  const task = world.inquiries[record?.recipient ?? '']?.find((candidate) => candidate.id === taskId);
  if (!record || !task || record.received === null || record.execution === null
    || record.execution.state === 'completed' || record.execution.state === 'aborted') return false;
  const application = applicationOf(record.received.version.brief);
  if (application.kind === 'enemy-interrogation') {
    const applied = { ...application, target: task.addressee ?? application.target };
    completeWithApplicationReport(
      world, record, record.decision!, tick, rules, 'interrogation asked',
      enemyActionFor(
        world, record, applied, 'interrogation-asked', tick,
        positionOf(world, world.npcs[record.recipient]!, tick), dayOf(tick),
      ),
    );
    const remaining = (world.inquiries[record.recipient] ?? []).filter((candidate) => candidate !== task);
    if (remaining.length > 0) world.inquiries[record.recipient] = remaining;
    else delete world.inquiries[record.recipient];
    return true;
  }
  record.execution = { state: 'awaiting-answer', changedAt: tick, dueAt: null,
    waiting: { kind: 'story-answer', taskId, expiresAt: record.received.version.brief.active.until } };
  return true;
}

/** Complete on the first answer actually addressed to the directive asker. */
export function recordDirectiveInquiryAnswer(
  world: WorldState,
  taskId: string,
  utterance: Utterance,
  rules: Rules,
): boolean {
  const record = world.network.directiveState?.records.find((candidate) => candidate.id === taskId);
  if (!record || record.received === null || record.execution?.waiting?.kind !== 'story-answer'
    || record.execution.waiting.taskId !== taskId || utterance.addressedTo !== record.recipient) return false;
  const tasks = world.inquiries[record.recipient] ?? [];
  const task = tasks.find((candidate) => candidate.id === taskId && candidate.directiveId === record.id);
  if (!task) return false;
  const profile = record.decision!;
  const result: DirectiveExecutionResult = {
    outcome: 'answer heard', reason: 'the addressed person answered the ordinary inquiry',
    evidence: [], source: utterance.speaker, uncertainty: 'medium',
    reportedClaim: utterance.claim, factRefs: [],
  };
  record.execution = { state: 'completed', changedAt: utterance.tick, dueAt: null, waiting: null };
  const remaining = tasks.filter((candidate) => candidate !== task);
  if (remaining.length === 0) delete world.inquiries[record.recipient];
  else world.inquiries[record.recipient] = remaining;
  queueDirectiveReport(world, record, profile, result, rules, utterance.tick);
  return true;
}

/** Phase 5: same-tick answers have already run; exact inclusive deadlines now close silence. */
export function expireDirectiveExecutions(world: WorldState, tick: Tick, rules: Rules): void {
  for (const record of world.network.directiveState?.records ?? []) {
    if (record.received === null || record.execution === null
      || record.execution.state === 'completed' || record.execution.state === 'aborted') continue;
    const deadline = record.received.version.brief.active.until;
    if (tick < deadline) continue;
    const tasks = world.inquiries[record.recipient] ?? [];
    const remaining = tasks.filter((task) => task.id !== record.id
      && task.directiveId !== record.id
      && task.id !== (record.execution?.waiting?.kind === 'story-answer'
        ? record.execution.waiting.taskId : ''));
    if (remaining.length === 0) delete world.inquiries[record.recipient];
    else world.inquiries[record.recipient] = remaining;
    const profile = record.decision!;
    abortRecord(world, record, profile, tick, rules, 'the active window ended without an answer');
  }
}

/** Before phase-4 selection, records already beyond their inclusive window cannot win a slot. */
export function expireDirectiveActsBeforeCollection(
  world: WorldState, tick: Tick, rules: Rules,
): void {
  for (const run of [...world.network.pendingCouriers]) {
    if (tick < run.expiresAt) continue;
    world.network.pendingCouriers = world.network.pendingCouriers.filter((candidate) => candidate !== run);
    const record = world.network.directiveState?.records.find((candidate) => {
      const correlation = correlationOf(candidate);
      return correlation.kind === 'courier' && correlation.planId === run.planId;
    });
    if (record?.received && record.execution && record.execution.state !== 'completed'
      && record.execution.state !== 'aborted' && record.decision) {
      abortRecord(world, record, record.decision, tick, rules, 'courier pickup expired before delivery');
      const correlation = correlationOf(record);
      if (correlation.kind === 'courier' && correlation.dropPayloadId !== null) {
        const payload = world.network.dropPayloads?.find((row) => row.id === correlation.dropPayloadId);
        if (payload && payload.failedAt === null) payload.failedAt = tick;
      }
    }
  }
  for (const record of world.network.directiveState?.records ?? []) {
    if (record.received === null || record.execution === null
      || record.execution.state === 'completed' || record.execution.state === 'aborted'
      || record.execution.state === 'awaiting-answer'
      || tick <= record.received.version.brief.active.until) continue;
    const profile = record.decision!;
    abortRecord(world, record, profile, tick, rules, 'the active window expired before execution');
  }
}

/** Phase-5 latches for operations that complete only when the requested physical reality occurs. */
export function settleDirectiveApplications(world: WorldState, tick: Tick, rules: Rules): void {
  for (const record of world.network.directiveState?.records ?? []) {
    if (!record.received || !record.execution || !record.decision
      || record.execution.state === 'completed' || record.execution.state === 'aborted') continue;
    const application = applicationOf(record.received.version.brief);
    if (application.kind === 'posting' && application.venue !== null) {
      const override = (world.scheduleOverrides[record.recipient] ?? [])
        .find((row) => row.sourceRef === `posting:${record.recipient}`);
      if (override && record.execution.changedAt < tick
        && positionOf(world, world.npcs[record.recipient]!, tick) === override.venue) {
        completeWithApplicationReport(world, record, record.decision, tick, rules, 'posting occupied');
      }
    } else if (application.kind === 'rendezvous') {
      const invitation = world.network.invitations?.find((row) => row.sourceDirectiveId === record.id);
      if (invitation?.status === 'attended') {
        completeWithApplicationReport(world, record, record.decision, tick, rules, 'rendezvous attended');
      } else if (invitation?.status === 'missed') {
        abortRecord(world, record, record.decision, tick, rules, 'rendezvous window missed');
      }
    } else if (application.kind === 'enemy-watch'
      && record.execution.changedAt < tick
      && tick % CONVERSATION_BEAT === 0
      && dayOf(tick) >= application.startDay && dayOf(tick) < application.startDay + 8
      && tick % TICKS_PER_DAY >= 960 && tick % TICKS_PER_DAY < 1140
      && positionOf(world, world.npcs[record.recipient]!, tick) === application.post.venue) {
      const worked = record.execution.workedDays ?? (record.execution.workedDays = []);
      const day = dayOf(tick);
      if (!worked.includes(day)) {
        worked.push(day);
        worked.sort((a, b) => a - b);
        queueDirectiveReport(world, record, record.decision, {
          outcome: 'watch worked', reason: 'the guard physically stood the ordered post',
          evidence: [], source: record.recipient, uncertainty: 'low',
          reportedClaim: null, factRefs: [],
          enemyAction: enemyActionFor(
            world, record, application, 'watch-worked', tick, application.post.venue, day,
          ),
        }, rules, tick);
      }
    }
  }
}

export const directiveConversationBeat = CONVERSATION_BEAT;
