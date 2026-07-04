import { type Tick, TICKS_PER_DAY } from '../../core/time';
import type { Circle } from '../agents';
import type { Utterance } from '../perception';
import type { Rules } from '../rules';
import type { Belief, Npc, WorldState } from '../types';
import { mintClaim, type Claim, type EntityId } from './claim';
import { applyTraits, type TraitContext } from './traits';
import { trustBetween } from '../world';

export const TELL_THRESHOLD = 0.25;
export const RETELL_COOLDOWN = 240;       // ticks (4h) per (teller, family)
export const MIN_RETELL_CREDENCE = 0.5;   // "repeat" belief threshold
export const CONVERSATION_BEAT = 15;      // tellings evaluated every 15 sim-minutes

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function juiciness(claim: Claim, rules: Rules): number {
  const base = rules.predicates[claim.predicate]?.juiciness ?? 0.3;
  return clamp01(base + (claim.severity - 3) * 0.08);
}

export function relevance(hearer: Npc, claim: Claim): number {
  const known = new Set([hearer.id, ...hearer.edges.map((e) => e.to)]);
  const subjectKnown = claim.subject !== 'someone' && known.has(claim.subject);
  const objectKnown = claim.object !== null && claim.object !== 'someone' && known.has(claim.object);
  return subjectKnown || objectKnown ? 1 : 0.6;
}

export function freshness(belief: Belief, t: Tick): number {
  const ageDays = (t - belief.heardAt) / TICKS_PER_DAY;
  return Math.max(0, 1 - ageDays / 3);
}

export function tellability(
  belief: Belief, teller: Npc, hearer: Npc, world: WorldState, t: Tick, rules: Rules,
): number {
  void teller; void world; // symmetric signature; teller factors arrive in Plan 2
  return juiciness(belief.claim, rules) * relevance(hearer, belief.claim) * belief.credence * freshness(belief, t);
}

function traitContext(npc: Npc, world: WorldState): TraitContext {
  return {
    ownerId: npc.id,
    faction: npc.faction,
    rivals: npc.rivals,
    factionOf: (e) => world.npcs[e]?.faction ?? null,
  };
}

function passesGates(teller: Npc, belief: Belief, world: WorldState, t: Tick, rules: Rules): boolean {
  if (belief.credence < MIN_RETELL_CREDENCE) return false;
  if (freshness(belief, t) <= 0) return false;
  const last = world.lastTold[`${teller.id}:${belief.claim.family}`];
  if (last !== undefined && t - last < RETELL_COOLDOWN) return false;
  const needsCorroboration = teller.traits.some(
    (id) => rules.traits[id]?.retellGate === 'requires-corroboration',
  );
  if (needsCorroboration && belief.distinctSources.length < 2) return false;
  return true;
}

/** Best (belief, addressee) above threshold; deterministic lexicographic tie-break. */
export function chooseTelling(
  world: WorldState, tellerId: EntityId, circle: Circle, t: Tick, rules: Rules,
): Utterance | null {
  const teller = world.npcs[tellerId]!;
  const store = world.beliefs[tellerId] ?? {};
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
  if (!best) return null;

  const tellerTraits = teller.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const delta = applyTraits(tellerTraits, best.belief.claim, traitContext(teller, world));
  const outgoing = mintClaim(world, {
    ...best.belief.claim, ...delta,
    family: best.belief.claim.family, parent: best.belief.claim.id,
  });
  world.claims[outgoing.id] = outgoing;
  world.lastTold[`${tellerId}:${best.family}`] = t;

  return {
    tick: t, venue: circle.venue, circleMembers: [...circle.members],
    speaker: tellerId, addressedTo: best.addressee, claim: outgoing,
  };
}

/** The minimal slice of a heard utterance a mind ingests — what perception hands over. */
export interface Hearing {
  tick: Tick;
  speaker: EntityId;
  claim: Claim;
}

export function ingest(
  world: WorldState, hearerId: EntityId, hearing: Hearing, addressed: boolean,
): void {
  const store = world.beliefs[hearerId]!;
  const existing = store[hearing.claim.family];
  if (existing) {
    existing.timesHeard += 1;
    if (!existing.distinctSources.includes(hearing.speaker)) {
      existing.distinctSources.push(hearing.speaker);
      existing.credence = Math.min(0.95, existing.credence + 0.15);
    }
    return; // first version sticks
  }
  const trust = trustBetween(world, hearerId, hearing.speaker);
  store[hearing.claim.family] = {
    claim: hearing.claim,
    credence: clamp01(0.35 + 0.45 * trust * (addressed ? 1 : 0.5)),
    heardFrom: hearing.speaker,
    heardAt: hearing.tick,
    timesHeard: 1,
    distinctSources: [hearing.speaker],
  };
}
