import { dayOf, TICKS_PER_DAY, type Tick } from '../../core/time';
import type { Circle } from '../agents';
import { cloneSerializable } from '../hash';
import { recordPlayerKnownFact } from './compartment';
import { appendInvitation } from './invitations';
import {
  ensureAssetRecord, principalActor, RECRUIT_DISPOSITION, rosterFor, setDispositionEdge,
} from './roster';
import type { Mice, Principal } from './types';
import {
  allocateNetworkMessage, ensureDirectiveState, perceivedScrutiny, strictNextBeat,
  validateNetworkRoute,
} from '../directives/state';
import { queueDirectiveReport } from '../directives/reports';
import { realizeNetworkForward } from '../directives/transport';
import type {
  DirectiveId, DirectiveMethod, DirectiveRecord, NetworkSpeech, RecruitmentApproach,
  RecruitmentResponse,
} from '../directives/types';
import type { NpcAutonomousIntent, NpcIntentRealization, ScheduledSetup } from '../phases';
import { STANCE } from '../rumors/propagation';
import type { EntityId, RumorId, VenueId } from '../rumors/claim';
import type { TraitId } from '../rumors/traits';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import { trustBetween } from '../world';

/**
 * The registered self-inflating / status-seeking traits an `ego` handle actually purchases. There is
 * no `'ego'` trait in the registry — `ego` is a MICE handle, and this is the fit it reads.
 */
const EGO_TRAITS: TraitId[] = ['exaggerator', 'dramatist', 'name-dropper'];

/** The words a sounding-out asset can honestly put on what it heard. */
const WILLINGNESS: Record<RecruitmentResponse, string> = {
  accept: 'willing', hesitate: 'uncertain', refuse: 'unwilling',
};

const opposite = (principal: Principal): Principal => (principal === 'player' ? 'enemy' : 'player');

/**
 * WHAT THE APPROACH SAID — the candidate's entire input about the offer. Every field here is spoken
 * content that physically arrived (`SpokenNetworkPayload`'s `recruitment-approach` variant); the
 * recruiter-principal's `RecruitmentApproach` row is never read back into a candidate's answer.
 */
export interface SpokenApproach {
  approachId: string;
  recruiter: EntityId;
  target: EntityId;
  mice: Mice | null;
  leverageFamily: RumorId | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// The pure decision layer. Contextual causes only — no seed, no clock, no identity hash, no lottery.

export interface RecruitmentInput {
  relationship: number;
  handleFit: -2 | -1 | 0 | 1 | 2;
  traits: TraitId[];
  protectedRole: boolean;
  enemyLinked: boolean;
  localWitnesses: number;
  perceivedScrutiny: number;
  stage: 'initial' | 'later';
}

/**
 * One outward response union for every hidden category. Each term is a fact the candidate could
 * name out loud — how well they know the recruiter, what is on offer, who is standing there, how
 * closely they are being watched, the weight of their own public post, and (only) real service to
 * the other side. The later stage is a two-way branch: a candidate who asked for time answers.
 */
export function evaluateRecruitment(input: RecruitmentInput): RecruitmentResponse {
  const relationship = input.relationship >= 0.75 ? 2
    : input.relationship >= 0.50 ? 1
      : input.relationship < 0.25 ? -2
        : 0;
  const score = relationship
    + input.handleFit
    - (input.traits.includes('skeptic') ? 1 : 0)
    - (input.localWitnesses > 2 ? 1 : 0)
    - (input.perceivedScrutiny >= 0.70 ? 1 : 0)
    - (input.protectedRole ? 1 : 0)
    + (input.enemyLinked ? (input.stage === 'later' ? 2 : -1) : 0);
  if (input.stage === 'later') return score >= 0 ? 'accept' : 'refuse';
  return score >= 2 ? 'accept' : score <= -2 ? 'refuse' : 'hesitate';
}

/**
 * The ONE lawful constructor of protected pressure — the NPC knows their own PUBLIC role and nothing
 * else. Watch occupations and the scenario cast (usurper + council, both public figures) are the
 * whole v1 protected set. The embodied spymaster is deliberately absent: real linkage already shapes
 * his answer through `enemyLinked`, and stacking both would double-count one fact.
 */
export function isProtectedRole(world: WorldState, rules: Rules, id: EntityId): boolean {
  const npc = world.npcs[id];
  if (!npc) return false;
  if (rules.intel.watchOccupations.includes(npc.occupation)) return true;
  const cast = world.scenario?.cast ?? null;
  return cast !== null && (cast.usurper === id || cast.council.includes(id));
}

/** Whether a candidate's initial profile carries the approach to the opposing handler. */
export function shouldReportApproach(input: {
  enemyHandler: EntityId | null;
  enemyLinked: boolean;
  relationshipToRecruiter: number;
  relationshipToEnemyHandler: number;
}): boolean {
  return input.enemyHandler !== null && (input.enemyLinked
    || input.relationshipToEnemyHandler > input.relationshipToRecruiter);
}

/** Real service to `principal`: their roster, their observers, or their embodied actor. */
export function isLinkedTo(world: WorldState, principal: Principal, id: EntityId): boolean {
  if (rosterFor(world, principal).some((row) => row.id === id)) return true;
  if (principal === 'enemy') {
    return world.network.spymaster === id
      || world.enemy.observers.some((spec) => spec.id === id);
  }
  return world.playerId === id;
}

/** The exact per-handle fit. A null cooperation handle offers nothing and costs nothing. */
export function handleFitFor(
  world: WorldState,
  rules: Rules,
  principal: Principal,
  target: EntityId,
  mice: Mice | null,
  leverageFamily: RumorId | null,
): RecruitmentInput['handleFit'] {
  if (mice === null) return 0;
  if (mice === 'money') {
    const strikes = (rosterFor(world, 'player').find((row) => row.id === target)?.strikes ?? 0)
      + (rosterFor(world, 'enemy').find((row) => row.id === target)?.strikes ?? 0);
    return strikes > 0 ? 0 : 1;
  }
  if (mice === 'ideology') {
    const usurper = world.scenario?.cast.usurper;
    const leans = usurper !== undefined && Object.values(world.beliefs[target] ?? {}).some((belief) =>
      belief.claim.subject === usurper
      && rules.predicates[belief.claim.predicate]?.valence === 'damaging'
      && belief.credence >= STANCE.REPEAT);
    return leans ? 2 : -1;
  }
  if (mice === 'coercion') {
    const holds = principal === 'player' && leverageFamily !== null
      && world.intel.log.some((entry) => entry.family === leverageFamily && entry.reported !== null
        && entry.reported.subject === target
        && rules.predicates[entry.reported.predicate]?.valence === 'damaging');
    return holds ? 2 : -2;
  }
  return (world.npcs[target]?.traits ?? []).some((trait) => EGO_TRAITS.includes(trait)) ? 1 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Approach rows — engine bookkeeping for one physical approach. NO view reads them.

export function approachById(world: WorldState, id: string): RecruitmentApproach | null {
  return world.network.directiveState?.recruitmentApproaches.find((row) => row.id === id) ?? null;
}

/**
 * An approach whose words never physically reached anybody closes with the message that carried them.
 * The coin is still gone — probing is priced — but nothing stays open on a conversation that never
 * happened, so the recruiter may approach again on a later beat.
 */
export function closeUnspokenApproach(world: WorldState, approachId: string, speaker: EntityId): void {
  const approach = approachById(world, approachId);
  if (!approach || approach.recruiter !== speaker || approach.status !== 'approached') return;
  if (answerQueued(world, approachId)) return;
  approach.status = 'closed';
}

/**
 * Open one approach row. `initial` is the response the TARGET will speak; until they physically hear
 * the approach the field is an unread placeholder (`status: 'approached'`, no answer queued yet), and
 * the very next act of every caller is the target's own composition, which overwrites it.
 */
export function openRecruitmentApproach(
  world: WorldState,
  input: {
    principal: Principal; recruiter: EntityId; target: EntityId; mice: Mice | null;
    leverageFamily: RumorId | null; sourceDirectiveId: DirectiveId | null; tick: Tick;
  },
): RecruitmentApproach {
  const state = ensureDirectiveState(world);
  const approach: RecruitmentApproach = {
    id: `a${state.recruitmentApproaches.length}`,
    principal: input.principal,
    recruiter: input.recruiter,
    target: input.target,
    mice: input.mice,
    leverageFamily: input.leverageFamily,
    openedAt: input.tick,
    resolveAt: null,
    decisionDueAt: null,
    status: 'approached',
    initial: 'hesitate',
    decided: null,
    sourceDirectiveId: input.sourceDirectiveId,
    enemyLinkedAtDecision: false,
  };
  state.recruitmentApproaches.push(approach);
  return approach;
}

export function openApproachBetween(
  world: WorldState, principal: Principal, recruiter: EntityId, target: EntityId,
): RecruitmentApproach | null {
  return world.network.directiveState?.recruitmentApproaches.find((row) =>
    row.principal === principal && row.recruiter === recruiter && row.target === target
    && row.status !== 'closed') ?? null;
}

/**
 * The candidate's answer is built from the WORDS THEY HEARD plus facts about themselves: how well
 * they know the person in front of them, who else is standing there, how closely they feel watched,
 * their own public post, and whether they really serve the other side. `channel` is the message's
 * own principal — transport metadata that only names which roster "the other side" means.
 */
function recruitmentInputFrom(
  world: WorldState,
  rules: Rules,
  heard: SpokenApproach,
  channel: Principal,
  circle: Circle,
  tick: Tick,
  stage: RecruitmentInput['stage'],
): RecruitmentInput {
  return {
    relationship: trustBetween(world, heard.target, heard.recruiter),
    handleFit: handleFitFor(world, rules, channel, heard.target, heard.mice, heard.leverageFamily),
    traits: [...(world.npcs[heard.target]?.traits ?? [])],
    protectedRole: isProtectedRole(world, rules, heard.target),
    enemyLinked: isLinkedTo(world, opposite(channel), heard.target),
    localWitnesses: circle.members.filter((id) =>
      id !== heard.recruiter && id !== heard.target).length,
    perceivedScrutiny: perceivedScrutiny(world, heard.target, heard.recruiter, tick),
    stage,
  };
}

/**
 * The offer as the CANDIDATE received it, re-read from the speech that physically reached them.
 * A later answer recovers the words that arrived — never the recruiter's copy, which relay
 * projection may lawfully have diverged from.
 */
function receivedApproach(
  world: WorldState, approachId: string, target: EntityId,
): { heard: SpokenApproach; channel: Principal } | null {
  for (const message of world.network.directiveState?.messages ?? []) {
    const payload = message.payload;
    if (payload.kind !== 'recruitment-approach' || payload.approachId !== approachId) continue;
    if (message.deliveredAt === null || message.holder !== target) continue;
    return {
      heard: {
        approachId, recruiter: payload.recruiter, target: payload.target,
        mice: payload.mice, leverageFamily: payload.leverageFamily,
      },
      channel: message.principal,
    };
  }
  return null;
}

function answerQueued(world: WorldState, approachId: string): boolean {
  return (world.network.directiveState?.messages ?? []).some((message) =>
    message.payload.kind === 'recruitment-response' && message.payload.approachId === approachId);
}

/**
 * The candidate's own profile may carry the approach to the OPPOSITE principal's handler. Queue time
 * changes no membership: this is a physical message that has to arrive. When the candidate IS that
 * handler, nothing is queued — their own hearing already is that principal's knowledge.
 */
function queueApproachReport(
  world: WorldState, heard: SpokenApproach, channel: Principal, tick: Tick,
): void {
  const other = opposite(channel);
  const handler = principalActor(world, other);
  if (handler === null || handler === heard.target || handler === heard.recruiter) return;
  const carry = shouldReportApproach({
    enemyHandler: handler,
    enemyLinked: isLinkedTo(world, other, heard.target),
    relationshipToRecruiter: trustBetween(world, heard.target, heard.recruiter),
    relationshipToEnemyHandler: trustBetween(world, heard.target, handler),
  });
  if (!carry) return;
  validateNetworkRoute(world, heard.target, [handler]);
  // The candidate repeats the offer they were made — nothing they did not hear travels onward.
  allocateNetworkMessage(world, other, heard.target, [handler], {
    kind: 'recruitment-approach', approachId: heard.approachId,
    recruiter: heard.recruiter, target: heard.target,
    mice: heard.mice, leverageFamily: heard.leverageFamily,
  }, strictNextBeat(tick), null, null);
}

/**
 * The candidate answers for themself. `evaluateRecruitment` belongs to the TARGET: its result becomes
 * their own queued SPOKEN answer and nothing else — no caller may read it back out.
 */
function composeCandidateResponse(
  world: WorldState,
  heard: SpokenApproach,
  channel: Principal,
  circle: Circle,
  tick: Tick,
  rules: Rules,
  availableAfter: Tick,
  cause: NetworkSpeech['cause'],
): void {
  const response = evaluateRecruitment(
    recruitmentInputFrom(world, rules, heard, channel, circle, tick, 'initial'),
  );
  recordSpokenAnswer(world, heard.approachId, channel, heard.target, response);
  validateNetworkRoute(world, heard.target, [heard.recruiter]);
  allocateNetworkMessage(world, channel, heard.target, [heard.recruiter], {
    kind: 'recruitment-response', approachId: heard.approachId, response,
  }, availableAfter, null, cause);
  queueApproachReport(world, heard, channel, tick);
}

/**
 * The recruiter-side row RECORDS the answer that is about to be spoken (and, on a decided answer,
 * the linkage truth at that moment). It is written here and never read back into a candidate's
 * evaluation — bookkeeping flows one way only.
 */
function recordSpokenAnswer(
  world: WorldState, approachId: string, channel: Principal, target: EntityId,
  response: RecruitmentResponse,
): void {
  const approach = approachById(world, approachId);
  if (!approach) return;
  approach.initial = response;
  if (response !== 'hesitate') {
    approach.enemyLinkedAtDecision = isLinkedTo(world, opposite(channel), target);
  }
}

/**
 * Receipt of a spoken approach. The whole input is the three words the speech carried, who is holding
 * it, and the transport cause; the row it names supplies only the offer that was made
 * (handle/leverage), never a decision, status, or linkage field.
 *
 * The cause decides the tier, exactly as the five-phase law does everywhere else: an approach the
 * PLAYER just made carries a player-action cause, so the answer is a causally marked direct response
 * on the same beat (phase 3). An autonomous approach carries none, so the answer is an ordinary act
 * one beat later — the composure pause that reads identically for every hidden category.
 */
export function hearRecruitmentApproach(
  world: WorldState,
  spoken: SpokenApproach,
  channel: Principal,
  holder: EntityId,
  circle: Circle,
  tick: Tick,
  rules: Rules,
  cause: NetworkSpeech['cause'],
): void {
  if (holder !== spoken.target) {
    receiveApproachAtHandler(world, spoken, holder);
    return;
  }
  if (answerQueued(world, spoken.approachId)) return;
  const direct = cause?.kind === 'player-action';
  composeCandidateResponse(
    world, spoken, channel, circle, tick, rules, direct ? tick : strictNextBeat(tick),
    direct ? cloneSerializable(cause) : null,
  );
}

/**
 * A handler physically hears that one of their own people was approached. This receipt is
 * PRINCIPAL-ASYMMETRIC. The ENEMY handler's receipt IS membership: the ordinary record appears with
 * EMPTY facts — never a fabricated `recruited-by` meeting — and an existing player record is marked
 * turned for that audience alone (the adjudicated late-delivery clause). The PLAYER's receipt of a
 * reported approach is INTEL ONLY: final enrollment stays a direct avatar moment (backlog #23), so
 * the avatar's handler seat creates no roster row and turns nobody. The delivered words are still
 * ordinary player intel through the normal ingestion path.
 */
function receiveApproachAtHandler(
  world: WorldState,
  spoken: SpokenApproach,
  holder: EntityId,
): void {
  if (principalActor(world, 'enemy') !== holder) return;
  ensureAssetRecord(world, 'enemy', spoken.target);
  const exposed = rosterFor(world, 'player').find((row) => row.id === spoken.target);
  if (exposed) exposed.turned = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Answers: the physical receipt that closes an approach.

function scheduleRecruitmentDecision(world: WorldState, approach: RecruitmentApproach): void {
  const due = approach.resolveAt;
  if (due === null || due <= world.tick) return;
  const setup: ScheduledSetup = {
    id: `recruitment-response:${approach.id}:${due}`, due, kind: 'recruitment-response',
    actor: approach.target, ref: approach.id, override: null,
  };
  const rows = world.scheduledSetup ?? (world.scheduledSetup = []);
  if (rows.some((row) => row.id === setup.id)) return;
  rows.push(cloneSerializable(setup));
}

/**
 * The ONE enrollment site in the engine. Reachable only from a direct-recruitment acceptance, and
 * FAIL-CLOSED about it: enrollment is a direct avatar moment, so an approach that came from a
 * directive (a sound-out), or one whose recruiter is not the principal's own actor, refuses loudly
 * rather than quietly growing a roster.
 */
function enrollRecruitedAsset(world: WorldState, approach: RecruitmentApproach, tick: Tick): void {
  if (approach.sourceDirectiveId !== null) {
    throw new Error(`recruitment: enrollment is a direct avatar moment — approach '${approach.id}' came from directive '${approach.sourceDirectiveId}'`);
  }
  if (approach.recruiter !== principalActor(world, approach.principal)) {
    throw new Error(`recruitment: enrollment is a direct avatar moment — approach '${approach.id}' was made by '${approach.recruiter}'`);
  }
  const roster = rosterFor(world, approach.principal);
  if (roster.some((row) => row.id === approach.target)) return;
  roster.push({
    id: approach.target, mice: approach.mice, wagePaidThroughDay: dayOf(tick),
    strikes: 0, facts: [],
    ...(approach.enemyLinkedAtDecision ? { turned: true } : {}),
  });
  if (approach.principal !== 'player') return;
  recordPlayerKnownFact(world, approach.target, { kind: 'recruited-by', ref: 'player' });
  setDispositionEdge(world, approach.target, RECRUIT_DISPOSITION[approach.mice ?? 'money']);
  world.intel.informants.push({ id: approach.target, assignedVenue: null });
}

/** The roster half of a DIRECT recruitment's close. A refusal closes and buys nothing. */
function closeDirectRecruitment(
  world: WorldState,
  approach: RecruitmentApproach,
  response: RecruitmentResponse,
  tick: Tick,
): void {
  if (response !== 'accept') return;
  if (approach.enemyLinkedAtDecision) {
    ensureAssetRecord(world, opposite(approach.principal), approach.target);
  }
  enrollRecruitedAsset(world, approach, tick);
}

/**
 * The asset converts WHAT WAS SAID — never the evaluator's result, the approach row's hidden fields,
 * or any roster truth. It reports the willingness it heard and, when the brief carried a meeting,
 * offers the candidate an ordinary Task-9 invitation. It never enrolls anybody.
 */
export function settleSoundOutAnswer(
  world: WorldState,
  record: DirectiveRecord,
  response: RecruitmentResponse,
  tick: Tick,
  rules: Rules,
): void {
  if (record.received === null || record.decision === null || record.execution === null) return;
  if (record.execution.waiting?.kind !== 'recruitment-answer') return;
  const profile = record.decision;
  const method = profile.method;
  if (method.kind !== 'approach' && method.kind !== 'invite-meeting') return;
  // Who was sounded out is the asset's OWN chosen method, from its OWN received brief.
  const candidate = method.target;
  if (response === 'accept' && method.kind === 'invite-meeting') {
    const counterparty = principalActor(world, record.principal) ?? record.principalId;
    const invitation = appendInvitation(world, {
      kind: 'sound-out', principal: record.principal, inviter: record.recipient,
      counterparty, invitee: candidate, venue: method.venue,
      requested: { from: method.from, until: method.until },
      scheduled: null, status: 'offered', offeredAt: tick, respondedAt: null,
      setupId: null, sourceDirectiveId: record.id, attendedAt: null, closedAt: null,
    });
    validateNetworkRoute(world, record.recipient, [candidate]);
    allocateNetworkMessage(world, record.principal, record.recipient, [candidate], {
      kind: 'invitation', invitationId: invitation.id, invitationKind: 'sound-out',
      inviter: record.recipient, counterparty, invitee: candidate,
      venue: invitation.venue, requested: { ...invitation.requested },
    }, tick, null, null);
  }
  record.execution = response === 'hesitate'
    ? { ...record.execution, changedAt: tick }
    : { state: 'completed', changedAt: tick, dueAt: null, waiting: null };
  queueDirectiveReport(world, record, profile, {
    outcome: WILLINGNESS[response],
    reason: 'the candidate answered the approach in person',
    evidence: [], source: record.recipient, uncertainty: 'medium',
    reportedClaim: null, factRefs: [],
  }, rules, tick);
}

/**
 * The asset's OWN waiting record for this answer — the Task-8 substrate the sound-out conversion
 * runs on. Found by the receiving asset's identity plus the approach it is waiting on, never by
 * dereferencing the recruiter-principal's approach row.
 */
function waitingSoundOutRecord(
  world: WorldState, approachId: string, holder: EntityId,
): DirectiveRecord | null {
  return world.network.directiveState?.records.find((row) => row.recipient === holder
    && row.execution?.waiting?.kind === 'recruitment-answer'
    && row.execution.waiting.approachId === approachId) ?? null;
}

/** "Ask for time": the approach stays open and the later answer is scheduled from the same clock. */
function holdForLaterAnswer(world: WorldState, approach: RecruitmentApproach): void {
  if (approach.status !== 'approached') return;
  approach.status = 'waiting';
  approach.resolveAt = approach.openedAt + TICKS_PER_DAY;
  scheduleRecruitmentDecision(world, approach);
}

/**
 * Physical receipt of a spoken answer by the recruiter who made the approach. The two receipts are
 * disjoint: a DIRECTED approach (one a directive asked for) settles as a sound-out through the
 * asset's own record and can never reach enrollment; only an approach the principal's actor made in
 * person closes as recruitment.
 */
export function settleRecruitmentAnswer(
  world: WorldState,
  approachId: string,
  response: RecruitmentResponse,
  holder: EntityId,
  tick: Tick,
  rules: Rules,
): void {
  const approach = approachById(world, approachId);
  if (!approach || approach.recruiter !== holder || approach.status === 'closed') return;
  if (response === 'hesitate') holdForLaterAnswer(world, approach);
  else {
    approach.status = 'closed';
    approach.decided = response;
  }
  if (approach.sourceDirectiveId !== null) {
    const record = waitingSoundOutRecord(world, approachId, holder);
    if (record !== null) settleSoundOutAnswer(world, record, response, tick, rules);
  } else if (response !== 'hesitate') {
    closeDirectRecruitment(world, approach, response, tick);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The later decision — prior setup marks it due, phase 4 acts on current context.

export function markRecruitmentDecisionDue(world: WorldState, approachId: string, due: Tick): void {
  const approach = approachById(world, approachId);
  if (!approach) {
    throw new Error(`recruitment-response: unknown approach '${approachId}'`);
  }
  if (approach.status !== 'waiting') return;
  approach.decisionDueAt = due;
}

export function collectRecruitmentAnswerIntents(
  world: WorldState, tick: Tick, circles: readonly Circle[],
): NpcAutonomousIntent[] {
  const present = new Set(circles.flatMap((circle) => circle.members));
  return (world.network.directiveState?.recruitmentApproaches ?? [])
    .filter((approach) => approach.status === 'waiting' && approach.decisionDueAt !== null
      && approach.decisionDueAt <= tick && present.has(approach.target))
    .map((approach) => ({
      kind: 'recruitment-answer' as const, actor: approach.target, ref: approach.id, rank: 0 as const,
    }))
    .sort((a, b) => a.actor.localeCompare(b.actor) || a.ref.localeCompare(b.ref));
}

function decideLaterAnswer(
  world: WorldState, heard: SpokenApproach, channel: Principal, circle: Circle, tick: Tick,
  rules: Rules,
): Exclude<RecruitmentResponse, 'hesitate'> {
  const response = evaluateRecruitment(
    recruitmentInputFrom(world, rules, heard, channel, circle, tick, 'later'),
  );
  return response === 'refuse' ? 'refuse' : 'accept';
}

/**
 * The candidate's own autonomous act. The decision is hidden; only the SPOKEN answer travels. Sharing
 * a circle with the recruiter means it is said now; otherwise it waits in their hands as an ordinary
 * held message, and no selector, pause, or toast marks the difference.
 */
export function realizeRecruitmentAnswer(
  world: WorldState, approachId: string, circle: Circle, tick: Tick, rules: Rules,
): NpcIntentRealization<NetworkSpeech> {
  const empty: NpcIntentRealization<NetworkSpeech> = {
    askings: [], answers: [], tellings: [], extras: [],
  };
  const approach = approachById(world, approachId);
  if (!approach || approach.status !== 'waiting' || approach.decisionDueAt === null
    || approach.decisionDueAt > tick || !circle.members.includes(approach.target)) return empty;
  // The candidate answers the offer they were actually made — re-read from the words that arrived.
  const received = receivedApproach(world, approachId, approach.target);
  if (received === null) return empty;
  const decided = decideLaterAnswer(world, received.heard, received.channel, circle, tick, rules);
  approach.decided = decided;
  approach.decisionDueAt = null;
  approach.enemyLinkedAtDecision = isLinkedTo(world, opposite(approach.principal), approach.target);
  approach.status = 'decided';
  validateNetworkRoute(world, approach.target, [approach.recruiter]);
  const messageId = allocateNetworkMessage(
    world, approach.principal, approach.target, [approach.recruiter],
    { kind: 'recruitment-response', approachId: approach.id, response: decided }, tick, null, null,
  );
  const speech = circle.members.includes(approach.recruiter)
    ? realizeNetworkForward(world, messageId, circle, tick, rules) : null;
  if (speech === null) {
    approach.status = 'answer-in-transit';
    return empty;
  }
  return { askings: [], answers: [], tellings: [], extras: [speech] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sound-out: the asset speaks the approach and then knows only what it is told.

/**
 * Emit the observable approach at the asset's real target co-circle. The asset learns NOTHING here —
 * the candidate's answer is a separate spoken act that has to physically come back.
 */
export function startSoundOut(
  world: WorldState,
  record: DirectiveRecord,
  method: Extract<DirectiveMethod, { kind: 'approach' | 'invite-meeting' }>,
  circle: Circle,
  tick: Tick,
  rules: Rules,
): { speech: NetworkSpeech; approachId: string } | null {
  const mission = record.received?.version.brief.mission;
  const handle = mission?.kind === 'sound-out' ? mission.handle : null;
  const approach = openRecruitmentApproach(world, {
    principal: record.principal, recruiter: record.recipient, target: method.target,
    mice: handle, leverageFamily: null, sourceDirectiveId: record.id, tick,
  });
  validateNetworkRoute(world, record.recipient, [method.target]);
  const messageId = allocateNetworkMessage(
    world, record.principal, record.recipient, [method.target], {
      kind: 'recruitment-approach', approachId: approach.id,
      recruiter: record.recipient, target: method.target,
      mice: handle, leverageFamily: null,
    }, tick, tick, null,
  );
  const speech = realizeNetworkForward(world, messageId, circle, tick, rules);
  return speech === null ? null : { speech, approachId: approach.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// The one public recruitment selector: delivered player intel, and nothing else.

export interface RecruitmentHistoryRow {
  tick: Tick;
  venue: VenueId;
  recruiter: EntityId;
  target: EntityId;
  stage: 'approach' | 'answer';
  /** null only on 'approach' rows; 'answer' rows carry the response actually heard. */
  response: RecruitmentResponse | null;
  via: 'self' | EntityId;
}

/**
 * Rows derive EXCLUSIVELY from delivered player intel. No approach row, roster, or hidden field is
 * read: `protectedRole`, `enemyLinked`, `enemyLinkedAtDecision`, `turned`, `status`, `decided` and
 * every reason-like value are structurally absent. An answer whose approach the player never heard
 * builds no row — the raw intel log still shows it, so nothing is hidden, merely not tabulated.
 */
export function recruitmentHistoryView(world: WorldState): RecruitmentHistoryRow[] {
  const entries = world.intel.network ?? [];
  const known = new Map<string, { recruiter: EntityId; target: EntityId }>();
  const rows: RecruitmentHistoryRow[] = [];
  for (const entry of entries) {
    if (entry.spoken.kind !== 'recruitment-approach') continue;
    known.set(entry.spoken.approachId, {
      recruiter: entry.spoken.recruiter, target: entry.spoken.target,
    });
    rows.push({
      tick: entry.tick, venue: entry.venue, recruiter: entry.spoken.recruiter,
      target: entry.spoken.target, stage: 'approach', response: null, via: entry.via,
    });
  }
  for (const entry of entries) {
    if (entry.spoken.kind !== 'recruitment-response') continue;
    const join = known.get(entry.spoken.approachId);
    if (join === undefined) continue;
    rows.push({
      tick: entry.tick, venue: entry.venue, recruiter: join.recruiter, target: join.target,
      stage: 'answer', response: entry.spoken.response, via: entry.via,
    });
  }
  const order = (row: RecruitmentHistoryRow): number => (row.stage === 'approach' ? 0 : 1);
  return rows.sort((a, b) => a.tick - b.tick || a.target.localeCompare(b.target)
    || order(a) - order(b) || String(a.via).localeCompare(String(b.via)));
}
