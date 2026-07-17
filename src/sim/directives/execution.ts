import { dayOf, type Tick } from '../../core/time';
import { positionOf, type Circle } from '../agents';
import { cloneSerializable } from '../hash';
import { recordFact } from '../network/compartment';
import { assetFor, isTurnedAgainst } from '../network/roster';
import type { NpcAutonomousIntent, NpcIntentRealization } from '../phases';
import type { ObservationFeed, Utterance } from '../perception';
import { mintClaim, SOMEONE, type EntityId, type VenueId } from '../rumors/claim';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { Rules } from '../rules';
import type { InquiryTask, Npc, WorldState } from '../types';
import { trustBetween } from '../world';
import { evaluateReceivedBrief, type ReceivedBriefInput } from './evaluator';
import { queueDirectiveReport, buildDirectiveReport } from './reports';
import { perceivedScrutiny } from './scrutiny';
import { allocateNetworkMessage, strictNextBeat, validateNetworkRoute } from './state';
import type {
  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord, NetworkMessage,
} from './types';

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
    .filter((record) => record.received !== null && record.execution !== null
      && record.execution.dueAt !== null && record.execution.dueAt <= tick
      && record.execution.state !== 'completed' && record.execution.state !== 'aborted'
      && present.has(record.recipient))
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
export function recordDirectiveInquiryAsked(world: WorldState, taskId: string, tick: Tick): boolean {
  const record = world.network.directiveState?.records.find((candidate) => candidate.id === taskId);
  const task = world.inquiries[record?.recipient ?? '']?.find((candidate) => candidate.id === taskId);
  if (!record || !task || record.received === null || record.execution === null
    || record.execution.state === 'completed' || record.execution.state === 'aborted') return false;
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
  for (const record of world.network.directiveState?.records ?? []) {
    if (record.received === null || record.execution === null
      || record.execution.state === 'completed' || record.execution.state === 'aborted'
      || record.execution.state === 'awaiting-answer'
      || tick <= record.received.version.brief.active.until) continue;
    const profile = record.decision!;
    abortRecord(world, record, profile, tick, rules, 'the active window expired before execution');
  }
}

export const directiveConversationBeat = CONVERSATION_BEAT;
