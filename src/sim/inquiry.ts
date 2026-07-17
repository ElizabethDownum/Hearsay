import type { Tick } from '../core/time';
import { dayOf } from '../core/time';
import type { Circle } from './agents';
import type { Asking, InquiryKey, Utterance } from './perception';
import { mintClaim, SOMEONE, type EntityId } from './rumors/claim';
import { STANCE } from './rumors/propagation';
import type { Rules } from './rules';
import { applyTraits, traitContextOf } from './rumors/traits';
import type { Belief, InquiryTask, WorldState } from './types';
import { trustBetween } from './world';

/** The belief an answerer would produce for a key, or null. */
export function matchBelief(store: Record<string, Belief>, about: InquiryKey): Belief | null {
  if ('family' in about) return store[about.family] ?? null;
  let best: Belief | null = null;
  let bestFamily = '';
  for (const family of Object.keys(store).sort()) {
    const b = store[family]!;
    if (b.claim.subject !== about.subject) continue;
    if (best === null || b.credence > best.credence || (b.credence === best.credence && family < bestFamily)) {
      best = b; bestFamily = family;
    }
  }
  return best;
}

/**
 * The two floors an answer honors EVEN when compelled. Compulsion (an authority ask at an
 * invitational venue) bypasses the discretion gate and the trust gate — but NEVER these:
 *  - the DISMISS floor: a belief below STANCE.DISMISS is too faint to confirm; and
 *  - the self-dirt block: you never confirm a DAMAGING claim about YOURSELF — "not even behind
 *    closed doors" (the compelled/invitational case). Both are `compelled`-independent.
 * chooseAnswer enforces these inline below; applyDebrief (the debrief's own compulsion) filters its
 * deterministic pick on the SAME predicate — one mechanic, one set of constants, no duplication.
 */
export function confirmableUnderCompulsion(belief: Belief, answererId: EntityId, rules: Rules): boolean {
  if (belief.credence < STANCE.DISMISS) return false;
  const valence = rules.predicates[belief.claim.predicate]?.valence ?? 'neutral';
  if (belief.claim.subject === answererId && valence === 'damaging') return false;
  return true;
}

export function chooseAnswer(
  world: WorldState, answererId: EntityId, asking: Asking, t: Tick, rules: Rules,
): Utterance | null {
  // The avatar answers for itself, through the UI — never automatically. v1: silence,
  // even when compelled at an invitational venue. The human's testimony is not sim-driven.
  if (answererId === world.playerId) return null;
  const answerer = world.npcs[answererId]!;
  const belief = matchBelief(world.beliefs[answererId] ?? {}, asking.about);
  if (!belief) return null;
  // The two compelled-independent floors (DISMISS + self-dirt) — honored even behind closed doors.
  if (!confirmableUnderCompulsion(belief, answererId, rules)) return null;

  const compelled = asking.authority && world.venues[asking.venue]?.access === 'invitational';
  const trust = trustBetween(world, answererId, asking.speaker);
  if (!compelled && trust <= 0) return null;
  // Held-close knowledge: extracted by authority, or confided to the very trusted.
  if (belief.discretion && !compelled && trust < 0.7) return null;

  // Disclosure: attribution names the answerer's actual source — then their traits
  // get their say (testimony rides the same firmware as gossip; it can lie, deterministically).
  const disclosed = {
    ...belief.claim,
    attribution: belief.heardFrom === 'injected' || belief.heardFrom === 'witnessed'
      ? SOMEONE : belief.heardFrom,
  };
  const tellerTraits = answerer.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const delta = applyTraits(tellerTraits, disclosed, traitContextOf(answerer, world));
  const outgoing = mintClaim(world, {
    ...disclosed, ...delta,
    family: belief.claim.family, parent: belief.claim.id,
  });
  world.claims[outgoing.id] = outgoing;
  return {
    tick: t, venue: asking.venue, circleMembers: [...asking.circleMembers],
    speaker: answererId, addressedTo: asking.speaker, claim: outgoing, mode: 'answer',
  };
}

/** First usable task for an asker, or null. */
function usableTask(world: WorldState, askerId: EntityId, day: number, t: Tick): InquiryTask | null {
  for (const task of world.inquiries[askerId] ?? []) {
    if (day < task.expiresDay && task.answersHeard < 2
      && (task.expiresAt === undefined || t <= task.expiresAt)) return task;
  }
  return null;
}

export interface OrdinaryAskOffer {
  actor: EntityId;
  taskIndex: number;
  preferred: EntityId[];
}

/** Pure phase-4 selection input: one usable inquiry and its trust-ranked addressee list per NPC. */
export function collectOrdinaryAskOffers(
  world: WorldState, circle: Circle, t: Tick,
): OrdinaryAskOffer[] {
  const day = dayOf(t);
  const members = [...circle.members].sort();
  const offers: OrdinaryAskOffer[] = [];
  for (const actor of members) {
    if (actor === world.playerId) continue;
    const tasks = world.inquiries[actor] ?? [];
    const taskIndex = tasks.findIndex((task) => day < task.expiresDay && task.answersHeard < 2
      && (task.expiresAt === undefined || t <= task.expiresAt));
    if (taskIndex < 0) continue;
    const task = tasks[taskIndex]!;
    const preferred = members
      .filter((candidate) => candidate !== actor && !task.asked.includes(candidate))
      .filter((candidate) => task.from === 'enemy' || trustBetween(world, actor, candidate) > 0)
      .sort((a, b) =>
        trustBetween(world, actor, b) - trustBetween(world, actor, a) || a.localeCompare(b));
    if (preferred.length > 0) offers.push({ actor, taskIndex, preferred });
  }
  return offers;
}

/**
 * Rider 11R — the avatar's ask fires as a FAMILY-1 speech act. It addresses exactly the person the
 * human named (`task.addressee`, validated in-circle by applyAsk this same tick), never trust-repicked
 * and never substituted; the named addressee answers ONLY if still free this beat (the one-speech-per-
 * beat law — if they already spoke, the asking still happened and simply goes unanswered). The task is
 * CONSUMED at this firing beat regardless of the outcome — no answersHeard tail, no next-beat re-fire —
 * so after the tick there is zero player-ask residue in `world.inquiries`. The NPC/enemy dispatch loop
 * (`runAskPhase` below) is untouched: this path runs ONLY for the avatar's own self-task.
 */
function firePlayerAsk(
  world: WorldState, circle: Circle, member: EntityId, task: InquiryTask, t: Tick, rules: Rules,
  askings: Asking[], answers: Utterance[], spoke: Set<EntityId>,
): void {
  const addressee = task.addressee;
  // A player self-task always carries its addressee (applyAsk records it). A nameless one is malformed
  // — never fire a substitute; just consume it so it leaves no residue. (Also narrows the type below.)
  if (addressee === undefined) { retireTask(world, member, task); return; }
  const asking: Asking = {
    tick: t, venue: circle.venue, circleMembers: [...circle.members].sort(),
    speaker: member, addressedTo: addressee, about: task.about, authority: false,
  };
  askings.push(asking);
  spoke.add(member);
  // Answered only if the named addressee has not already spoken this beat. If they have, there is NO
  // substitution to anyone else — the asking is on the record either way, and the task is still consumed.
  if (!spoke.has(addressee)) {
    const answer = chooseAnswer(world, addressee, asking, t, rules);
    if (answer) {
      answers.push(answer);
      spoke.add(addressee);
    }
  }
  retireTask(world, member, task); // consumed at the firing beat — zero residue
}

/**
 * The ask/answer phase for one circle. One speech per beat: returns who spoke so
 * the tell phase can skip them. Bookkeeping (asked, answersHeard, retirement) happens here.
 */
export function runAskPhase(
  world: WorldState, circle: Circle, t: Tick, rules: Rules, alreadySpoke: readonly EntityId[] = [],
): { askings: Asking[]; answers: Utterance[]; spoke: EntityId[] } {
  const day = dayOf(t);
  const askings: Asking[] = [];
  const answers: Utterance[] = [];
  const spoke = new Set<EntityId>(alreadySpoke);

  for (const member of circle.members) {
    if (spoke.has(member)) continue;

    // The avatar's word opens the beat — but ONLY its OWN logged question (a 'self' task the ask verb
    // placed), never an enemy interrogation conscripted onto it (P7 note 3: find the self task, don't
    // trust usableTask's first-usable). That ask is a speech act (rider 11R), handled apart from the
    // NPC dispatch below; the avatar never runs the trust-repick / 2-answer-tail machinery.
    if (member === world.playerId) {
      const selfTask = (world.inquiries[member] ?? []).find((task) => task.from === 'self');
      if (selfTask) firePlayerAsk(world, circle, member, selfTask, t, rules, askings, answers, spoke);
      continue;
    }

    const task = usableTask(world, member, day, t);
    if (!task) continue;
    const eligible = circle.members
      .filter((m) => m !== member && !task.asked.includes(m) && !spoke.has(m))
      .filter((m) => task.from === 'enemy' || trustBetween(world, member, m) > 0)
      .sort((a, b) =>
        trustBetween(world, member, b) - trustBetween(world, member, a) || (a < b ? -1 : 1));
    if (eligible.length === 0) continue;
    const addressee = eligible[0]!;
    const asking: Asking = {
      tick: t, venue: circle.venue, circleMembers: [...circle.members].sort(),
      speaker: member, addressedTo: addressee, about: task.about,
      authority: task.from === 'enemy',
    };
    askings.push(asking);
    spoke.add(member);
    task.asked.push(addressee);

    const answer = chooseAnswer(world, addressee, asking, t, rules);
    if (answer) {
      answers.push(answer);
      spoke.add(addressee);
      task.answersHeard += 1;
    }
    if (task.answersHeard >= 2) retireTask(world, member, task);
  }
  return { askings, answers, spoke: [...spoke] };
}

/** Resolve only the avatar's causally direct ask/answer against its offered circle. */
export function runPlayerAskPhase(
  world: WorldState, circle: Circle | undefined, t: Tick, rules: Rules,
): { askings: Asking[]; answers: Utterance[]; spoke: EntityId[] } {
  if (!circle || world.playerId === null) return { askings: [], answers: [], spoke: [] };
  const task = (world.inquiries[world.playerId] ?? []).find((candidate) => candidate.from === 'self');
  if (!task) return { askings: [], answers: [], spoke: [] };
  const askings: Asking[] = [];
  const answers: Utterance[] = [];
  const spoke = new Set<EntityId>();
  firePlayerAsk(world, circle, world.playerId, task, t, rules, askings, answers, spoke);
  return { askings, answers, spoke: [...spoke] };
}

function retireTask(world: WorldState, askerId: EntityId, task: InquiryTask): void {
  const remaining = (world.inquiries[askerId] ?? []).filter((x) => x !== task);
  if (remaining.length === 0) delete world.inquiries[askerId];
  else world.inquiries[askerId] = remaining;
}

/** End-of-day sweep: drop tasks that cannot fire tomorrow. */
export function expireInquiries(world: WorldState, day: number): void {
  for (const id of Object.keys(world.inquiries)) {
    const keep = world.inquiries[id]!.filter((x) => x.expiresDay > day + 1 && x.answersHeard < 2);
    if (keep.length === 0) delete world.inquiries[id];
    else world.inquiries[id] = keep;
  }
}
