import { TICKS_PER_DAY, type Tick } from '../../core/time';
import type { Mice, Principal } from '../network/types';
import type { ObservationFeed } from '../perception';
import type { Rules } from '../rules';
import { SOMEONE, type EntityId, type VenueId } from '../rumors/claim';
import type { TraitId } from '../rumors/traits';
import type { Npc } from '../types';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import { beatAtOrAfter, strictNextBeat } from './state';
import { candorFor, projectBrief, projectShapePayloadForMethod } from './mutation';
import type {
  BriefVersion, DirectiveDecisionProfile, DirectiveMethod, DirectiveMission,
  DirectiveTarget,
} from './types';

export interface ReceivedBriefInput {
  directiveId: string;
  version: BriefVersion;
  messagePrincipal: Principal;
  handoffFrom: EntityId;
  recipient: {
    id: EntityId;
    faction: Npc['faction'];
    rivals: EntityId[];
    knownFactions: Record<EntityId, Npc['faction']>;
    traits: TraitId[];
    mice: Mice | null;
    relationshipToIssuer: number;
    strikes: number;
    turned: boolean;
  };
  local: {
    tick: Tick;
    venue: VenueId;
    circleMembers: EntityId[];
    observations: ObservationFeed;
  };
  perceivedScrutiny: number;
  stage: 'receipt' | 'execution';
}

function commitmentPoints(input: ReceivedBriefInput, mission: DirectiveMission, rules: Rules): number {
  const brief = input.version.brief;
  const relationship = input.recipient.relationshipToIssuer;
  let points = relationship >= 0.70 ? 2 : relationship >= 0.40 ? 1 : 0;
  if (relationship < 0.20 && (brief.authority === 'request' || brief.authority === 'relationship')) points -= 1;
  if (brief.authority === 'relationship' && relationship >= 0.50) points += 1;
  if (brief.authority === 'office' || brief.authority === 'compel') points += 2;
  if (brief.priority === 'urgent') points += 1;
  if (input.recipient.strikes >= 2) points -= 1;
  if (brief.discretion === 'compartmented' && input.local.circleMembers.length > 3) points -= 1;
  if (input.recipient.mice === 'ideology' && mission.kind === 'shape') {
    const subject = mission.payload.claim.subject;
    const faction = subject === SOMEONE || (subject !== input.recipient.id
      && !input.recipient.rivals.includes(subject)) ? null
      : input.recipient.knownFactions[subject] ?? null;
    const damaging = rules.predicates[mission.payload.claim.predicate]?.valence === 'damaging';
    if (damaging && faction === input.recipient.faction) points -= 3;
  }
  if (input.recipient.mice === 'coercion' && input.perceivedScrutiny >= 0.50) points -= 2;
  return points;
}

function fallbackPerson(input: ReceivedBriefInput, avoided: ReadonlySet<EntityId>): EntityId | null {
  return [...input.local.circleMembers]
    .filter((id) => id !== input.recipient.id && !avoided.has(id))
    .sort()[0] ?? null;
}

function retarget(target: DirectiveTarget, input: ReceivedBriefInput,
  avoidedPeople: ReadonlySet<EntityId>, avoidedVenues: ReadonlySet<VenueId>): DirectiveTarget | null {
  if (target.kind === 'person') {
    const id = fallbackPerson(input, avoidedPeople);
    return id === null ? null : { kind: 'person', id };
  }
  if (target.kind === 'venue') return avoidedVenues.has(input.local.venue)
    ? null : { kind: 'venue', id: input.local.venue };
  return null;
}

function baseMethod(mission: DirectiveMission, input: ReceivedBriefInput, rules: Rules): DirectiveMethod {
  if (mission.kind === 'learn') return mission.target.kind === 'story'
    ? { kind: 'ask', target: mission.target }
    : { kind: 'observe', target: mission.target };
  if (mission.kind === 'shape') return {
    kind: 'tell', audience: mission.audience,
    payload: projectShapePayloadForMethod(mission.payload, mission.operation,
      mission.redirectTo, input.recipient, rules, input.perceivedScrutiny),
  };
  return mission.meeting === null
    ? { kind: 'approach', target: mission.target }
    : { kind: 'invite-meeting', target: mission.target, ...mission.meeting };
}

function chooseMethod(mission: DirectiveMission, input: ReceivedBriefInput,
  initiative: 'literal' | 'adaptive', risk: 'avoidant' | 'measured' | 'bold', rules: Rules): DirectiveMethod {
  const method = baseMethod(mission, input, rules);
  const guidance = input.version.brief.guidance;
  const avoidedPeople = new Set(guidance.filter((row) => row.kind === 'avoid-person').map((row) => row.person));
  const avoidedVenues = new Set(guidance.filter((row) => row.kind === 'avoid-venue').map((row) => row.venue));
  const before = guidance.some((row) => row.kind === 'not-before' && input.local.tick < row.tick);
  const after = guidance.some((row) => row.kind === 'not-after' && input.local.tick > row.tick);
  if (before || after) return { kind: 'hold' };

  const contradicted = guidance.some((row) => row.kind === 'expected-presence'
    && input.local.tick >= row.at && input.local.venue === row.venue
    && !input.local.observations.observations.some((observation) =>
      observation.kind === 'presence' && observation.actor === row.person && observation.venue === row.venue));
  const personPresent = (id: EntityId): boolean => input.local.circleMembers.includes(id);
  const forbidden = avoidedVenues.has(input.local.venue)
    || [...avoidedPeople].some(personPresent);
  if (!contradicted && !forbidden) return method;
  if (initiative === 'literal' || risk === 'avoidant') return { kind: 'hold' };
  if (risk === 'bold' && forbidden) return method;
  if (initiative !== 'adaptive') return { kind: 'hold' };

  if (method.kind === 'observe' || method.kind === 'ask') {
    const target = retarget(method.target, input, avoidedPeople, avoidedVenues);
    return target === null ? { kind: 'hold' } : { ...method, target };
  }
  if (method.kind === 'tell') {
    const audience = retarget(method.audience, input, avoidedPeople, avoidedVenues);
    if (audience === null || audience.kind === 'story') return { kind: 'hold' };
    return { ...method, audience };
  }
  if (method.kind === 'approach' || method.kind === 'invite-meeting') {
    const target = fallbackPerson(input, avoidedPeople);
    return target === null ? { kind: 'hold' } : { ...method, target };
  }
  return { kind: 'hold' };
}

function timing(input: ReceivedBriefInput, commitment: 'refuse' | 'defer' | 'attempt'):
  { commitment: 'refuse' | 'defer' | 'attempt'; timing: { actAt: Tick | null; reportAt: Tick | null } } {
  const brief = input.version.brief;
  if (input.local.tick > brief.active.until || commitment === 'refuse') {
    return { commitment: 'refuse', timing: { actAt: null, reportAt: null } };
  }
  let actAt: Tick;
  if (input.stage === 'execution') actAt = input.local.tick;
  else if (commitment === 'defer') actAt = beatAtOrAfter(input.local.tick + TICKS_PER_DAY);
  else {
    const base = Math.max(strictNextBeat(input.local.tick), beatAtOrAfter(brief.active.from));
    actAt = base + (brief.priority === 'urgent' ? 0
      : brief.priority === 'important' ? CONVERSATION_BEAT : 4 * CONVERSATION_BEAT);
  }
  if (actAt > brief.active.until) {
    return { commitment: 'refuse', timing: { actAt: null, reportAt: null } };
  }
  if (input.stage === 'receipt' && input.perceivedScrutiny >= 0.50) {
    actAt += CONVERSATION_BEAT;
    if (actAt > brief.active.until) {
      return { commitment: 'refuse', timing: { actAt: null, reportAt: null } };
    }
  }
  let reportAt: Tick | null = null;
  if (commitment === 'attempt' && brief.report !== 'none') {
    const desired = beatAtOrAfter(Math.max(actAt, Math.min(brief.reportBy ?? brief.active.until, brief.active.until)));
    reportAt = desired <= brief.active.until ? desired : actAt;
  }
  return { commitment, timing: { actAt, reportAt } };
}

export function evaluateReceivedBrief(input: ReceivedBriefInput, rules: Rules): DirectiveDecisionProfile {
  const knownFactions: Record<EntityId, Npc['faction']> = {
    [input.recipient.id]: input.recipient.faction,
  };
  for (const rival of input.recipient.rivals) {
    const faction = input.recipient.knownFactions[rival];
    if (faction !== undefined) knownFactions[rival] = faction;
  }
  const lawfulRecipient = { ...input.recipient, knownFactions };
  const projection = projectBrief({ version: input.version, speaker: lawfulRecipient,
    lastFrom: input.handoffFrom, audience: input.messagePrincipal,
    turnedAgainstAudience: input.recipient.turned, perceivedScrutiny: input.perceivedScrutiny,
    mode: 'private-interpretation' }, rules);
  const interpretedBrief = projection.brief;
  const mission = interpretedBrief.mission;
  const evaluatedInput = { ...input, recipient: lawfulRecipient,
    version: { ...input.version, brief: interpretedBrief } };
  const points = commitmentPoints(evaluatedInput, mission, rules);
  let commitment: 'refuse' | 'defer' | 'attempt' = points <= 0 ? 'refuse' : points === 1 ? 'defer' : 'attempt';
  const hasSharedContext = interpretedBrief.purpose !== null
    || interpretedBrief.guidance.some((row) => row.kind === 'note');
  const initiative = input.perceivedScrutiny >= 0.50 ? 'literal'
    : hasSharedContext && interpretedBrief.specificity !== 'detailed'
      && (input.recipient.relationshipToIssuer >= 0.50 || input.recipient.mice === 'ideology'
        || input.recipient.turned) ? 'adaptive' : 'literal';
  let riskPoints = interpretedBrief.priority === 'urgent' ? 1 : 0;
  if (interpretedBrief.authority === 'compel') riskPoints += 1;
  if (interpretedBrief.discretion === 'quiet') riskPoints -= 1;
  if (interpretedBrief.discretion === 'compartmented') riskPoints -= 2;
  if (input.local.circleMembers.filter((id) =>
    id !== input.recipient.id && id !== input.handoffFrom).length > 2) riskPoints -= 1;
  if (input.recipient.relationshipToIssuer >= 0.70) riskPoints += 1;
  if (input.recipient.mice === 'coercion') riskPoints += 1;
  if (input.perceivedScrutiny >= 0.70) riskPoints -= 2;
  const risk = riskPoints <= -1 ? 'avoidant' : riskPoints >= 2 ? 'bold' : 'measured';
  const scheduled = timing({ ...input, version: { ...input.version, brief: interpretedBrief } }, commitment);
  commitment = scheduled.commitment;
  const method = commitment === 'refuse' ? { kind: 'hold' as const }
    : chooseMethod(mission, evaluatedInput, initiative, risk, rules);

  const disclosure = { outcome: false, reason: false, evidence: false, source: false, uncertainty: false };
  if (interpretedBrief.report === 'outcome') disclosure.outcome = true;
  if (interpretedBrief.report === 'reasoned' || interpretedBrief.report === 'full') {
    disclosure.outcome = true; disclosure.reason = true; disclosure.uncertainty = true;
  }
  if (interpretedBrief.report === 'full') { disclosure.evidence = true; disclosure.source = true; }
  if (interpretedBrief.discretion === 'compartmented') disclosure.source = false;
  if (input.recipient.relationshipToIssuer < 0.40) disclosure.reason = false;
  if (input.perceivedScrutiny >= 0.50) { disclosure.reason = false; disclosure.source = false; }
  return { interpretation: mission, commitment, initiative, risk, method,
    timing: scheduled.timing, disclosure,
    candor: candorFor(input.recipient.turned, input.perceivedScrutiny, input.recipient.traits) };
}
