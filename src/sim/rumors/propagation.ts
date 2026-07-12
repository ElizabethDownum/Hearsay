import { type Tick, TICKS_PER_DAY } from '../../core/time';
import type { Circle } from '../agents';
import type { Utterance } from '../perception';
import type { Rules } from '../rules';
import type { Belief, Npc, WorldState } from '../types';
import { mintClaim, SOMEONE, type Claim, type EntityId } from './claim';
import { applyTraits, traitContextOf } from './traits';
import { trustBetween } from '../world';

export const TELL_THRESHOLD = 0.25;
export const RETELL_COOLDOWN = 240;       // ticks (4h) per (teller, family)
export const CONVERSATION_BEAT = 15;      // tellings evaluated every 15 sim-minutes

/** Hearsay alone never yields certainty — only evidence (artifacts, later plans) exceeds it. */
export const HEARSAY_CEILING = 0.95;

/** Credence bands that drive behavior: dismiss → repeat → believe → act (act arrives later). */
export const STANCE = { DISMISS: 0.2, REPEAT: 0.5, BELIEVE: 0.75 } as const;
export const MIN_RETELL_CREDENCE = STANCE.REPEAT;   // "repeat" belief threshold

export type Stance = 'dismissed' | 'heard' | 'repeating' | 'believing';
export function stanceOf(belief: Belief): Stance {
  if (belief.credence < STANCE.DISMISS) return 'dismissed';
  if (belief.credence < STANCE.REPEAT) return 'heard';
  if (belief.credence < STANCE.BELIEVE) return 'repeating';
  return 'believing';
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function juiciness(claim: Claim, rules: Rules): number {
  const base = rules.predicates[claim.predicate]?.juiciness ?? 0.3;
  return clamp01(base + (claim.severity - 3) * 0.08);
}

export function relevance(hearer: Npc, claim: Claim): number {
  const known = new Set([hearer.id, ...hearer.edges.map((e) => e.to)]);
  const subjectKnown = claim.subject !== SOMEONE && known.has(claim.subject);
  const objectKnown = claim.object !== null && claim.object !== SOMEONE && known.has(claim.object);
  return subjectKnown || objectKnown ? 1 : 0.6;
}

export function freshness(belief: Belief, t: Tick): number {
  const ageDays = (t - belief.heardAt) / TICKS_PER_DAY;
  return Math.max(0, 1 - ageDays / 3);
}

/** Confirmation bias: claims against people you dislike land soft; kin/friends resist. */
export function plausibility(hearer: Npc, claim: Claim, rules: Rules): number {
  if (claim.subject === SOMEONE) return 1;
  const valence = rules.predicates[claim.predicate]?.valence ?? 'neutral';
  if (valence === 'neutral') return 1;
  const dislikes = hearer.rivals.includes(claim.subject) ||
    hearer.edges.some((e) => e.to === claim.subject && e.kind === 'rival');
  const edge = hearer.edges.find((e) => e.to === claim.subject);
  const close = edge !== undefined && (edge.kind === 'kin' || edge.kind === 'lover');
  const friendly = edge !== undefined && edge.kind === 'friend';
  if (valence === 'damaging') return dislikes ? 1.3 : close ? 0.7 : friendly ? 0.85 : 1;
  return dislikes ? 0.7 : close ? 1.3 : friendly ? 1.15 : 1; // flattering
}

export function tellability(
  belief: Belief, teller: Npc, hearer: Npc, world: WorldState, t: Tick, rules: Rules,
): number {
  void teller; void world; // spec formula: juiciness × relevance × A's-confidence × freshness — no trust term by design
  return juiciness(belief.claim, rules) * relevance(hearer, belief.claim) * belief.credence * freshness(belief, t);
}

function passesGates(teller: Npc, belief: Belief, world: WorldState, t: Tick, rules: Rules): boolean {
  // A rumor about you is bait, not a script (spec amendment #3): until the full
  // reaction system lands with the enemy AI, NPCs won't parrot DAMAGING claims
  // about themselves — flattery and neutral news flow freely.
  if (
    belief.claim.subject === teller.id &&
    (rules.predicates[belief.claim.predicate]?.valence ?? 'neutral') === 'damaging'
  ) return false;
  // Held-close knowledge is never volunteered — only direct questions extract it (inquiry.ts).
  if (belief.discretion) return false;
  if (belief.credence < MIN_RETELL_CREDENCE) return false;
  if (freshness(belief, t) <= 0) return false;
  const last = world.lastTold[`${teller.id}:${belief.claim.family}`];
  if (last !== undefined && t - last < RETELL_COOLDOWN) return false;
  const needsCorroboration = teller.traits.some(
    (id) => rules.traits[id]?.retellGate === 'requires-corroboration',
  );
  if (needsCorroboration && belief.apparentSources.length < 2) return false;
  return true;
}

export interface TellingOffer {
  family: string;
  addressedTo: EntityId;
}

/** Pure best (belief, addressee) selection above threshold. */
export function selectTelling(
  world: WorldState, tellerId: EntityId, circle: Circle, t: Tick, rules: Rules,
): TellingOffer | null {
  const teller = world.npcs[tellerId]!;
  const store = world.beliefs[tellerId] ?? {}; // invariant: buildWorld seeds a store for every NPC
  let best: { score: number; family: string; addressee: EntityId; belief: Belief } | null = null;

  for (const family of Object.keys(store).sort()) {
    const belief = store[family]!;
    if (!passesGates(teller, belief, world, t, rules)) continue;
    for (const addressee of [...circle.members].sort()) {
      if (addressee === tellerId || trustBetween(world, tellerId, addressee) <= 0) continue;
      const score = tellability(belief, teller, world.npcs[addressee]!, world, t, rules);
      if (score > TELL_THRESHOLD && (best === null || score > best.score)) {
        best = { score, family, addressee, belief };
      }
    }
  }
  return best === null ? null : { family: best.family, addressedTo: best.addressee };
}

/** Realize a previously selected telling without re-running offer selection. */
export function realizeTelling(
  world: WorldState, tellerId: EntityId, offer: TellingOffer,
  circle: Circle, t: Tick, rules: Rules, recordCooldown = true,
): Utterance | null {
  const belief = world.beliefs[tellerId]?.[offer.family];
  if (!belief || !circle.members.includes(offer.addressedTo)) return null;

  const teller = world.npcs[tellerId]!;
  const tellerTraits = teller.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const delta = applyTraits(tellerTraits, belief.claim, traitContextOf(teller, world));
  const outgoing = mintClaim(world, {
    ...belief.claim, ...delta,
    family: belief.claim.family, parent: belief.claim.id,
  });
  world.claims[outgoing.id] = outgoing;
  if (recordCooldown) world.lastTold[`${tellerId}:${offer.family}`] = t;

  return {
    tick: t, venue: circle.venue, circleMembers: [...circle.members].sort(),
    speaker: tellerId, addressedTo: offer.addressedTo, claim: outgoing, mode: 'telling',
  };
}

/** Compatibility composition for callers that still select and realize in one operation. */
export function chooseTelling(
  world: WorldState, tellerId: EntityId, circle: Circle, t: Tick, rules: Rules,
): Utterance | null {
  const offer = selectTelling(world, tellerId, circle, t, rules);
  return offer === null ? null : realizeTelling(world, tellerId, offer, circle, t, rules);
}

/** The minimal slice of a heard utterance a mind ingests — what perception hands over. */
export interface Hearing {
  tick: Tick;
  speaker: EntityId;
  claim: Claim;
}

/** The origin this hearing APPEARS to come from — named attribution wins over the teller. */
export function apparentSourceOf(hearing: Hearing): EntityId {
  return hearing.claim.attribution !== SOMEONE ? hearing.claim.attribution : hearing.speaker;
}

export function ingest(
  world: WorldState, hearerId: EntityId, hearing: Hearing, addressed: boolean, rules: Rules,
): void {
  const store = world.beliefs[hearerId]!; // invariant: buildWorld seeds a store for every NPC
  const existing = store[hearing.claim.family];
  const source = apparentSourceOf(hearing);
  if (existing) {
    existing.timesHeard += 1;
    // Nobody is their own corroborator — a story citing YOU as its origin proves nothing to you.
    if (source !== hearerId && !existing.apparentSources.includes(source)) {
      existing.apparentSources.push(source);
      existing.credence = Math.min(HEARSAY_CEILING, existing.credence + 0.15);
      // Spec: stale news revives with new corroboration — a fresh APPARENT source
      // resets the freshness clock. A repeat origin refreshes nothing.
      existing.heardAt = hearing.tick;
    }
    return; // first version sticks
  }
  const trust = trustBetween(world, hearerId, hearing.speaker);
  store[hearing.claim.family] = {
    claim: hearing.claim,
    credence: Math.min(HEARSAY_CEILING, clamp01((0.35 + 0.45 * trust * (addressed ? 1 : 0.5)) * plausibility(world.npcs[hearerId]!, hearing.claim, rules))),
    heardFrom: hearing.speaker,
    heardAt: hearing.tick,
    firstHeardAt: hearing.tick,
    timesHeard: 1,
    apparentSources: source === hearerId ? [] : [source],
    discretion: false,
    counterSpun: false,
  };
}
