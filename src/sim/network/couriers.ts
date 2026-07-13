import { dayOf, minuteOfDay, type Tick } from '../../core/time';
import { circlesAt } from '../agents';
import { mintClaim, type Claim } from '../rumors/claim';
import { applyTraits, traitContextOf } from '../rumors/traits';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { Utterance } from '../perception';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import type { CourierTasking } from './types';
import { recordFact } from './compartment';

/** A courier run undelivered by its 3rd day past tasking lapses — the coin is never refunded. */
export const COURIER_EXPIRY_DAYS = 3;

/**
 * Deliver every pending courier run whose asset shares a circle with its target THIS beat — the
 * asset's schedule did the walking. ZERO new spread machinery: each delivery becomes an ORDINARY
 * utterance (speaker = the asset, mode 'telling', a fresh family minted off the world counter exactly
 * as applyInject/applyTell hop-zero), trait-transformed by the asset's REAL traits on the way out.
 * The returned utterances fold into the same tick's events, so chronicle/capture/ingest read them
 * like any other — a guard in the circle attributes the CARRIER, not the player.
 *
 * Determinism: runs are processed in queue (insertion) order; the delivery beat is strictly AFTER
 * the tasking beat (the courier carries it, THEN delivers). A run expires — dropped, unrefunded —
 * once its 3rd day past tasking arrives. A `carried-story` fact (ref = the minted family) records
 * the leg on the courier's compartment: the chain the enemy pulls if they take them.
 */
export function deliverCouriers(world: WorldState, t: Tick, rules: Rules): Utterance[] {
  if (minuteOfDay(t) % CONVERSATION_BEAT !== 0) return []; // tellings happen on conversation beats
  if (world.network.pendingCouriers.length === 0) return [];

  // Circles are invariant across this beat's deliveries (a delivery moves no one), so compute once.
  const circles = circlesAt(world, t);
  const delivered: Utterance[] = [];
  const remaining: CourierTasking[] = [];
  for (const run of world.network.pendingCouriers) {
    if (dayOf(t) - dayOf(run.queuedTick) >= COURIER_EXPIRY_DAYS) continue; // expired → dropped, no refund
    if (t <= run.queuedTick) { remaining.push(run); continue; }             // carried, not yet delivered
    const circle = circles.find(
      (c) => c.members.includes(run.asset) && c.members.includes(run.target),
    );
    if (!circle) { remaining.push(run); continue; }                          // schedules haven't met yet

    // Fresh family, minted deterministically off the world counter (the registry idiom — globally
    // unique, so concurrent runs never collide; NOT a keyed scheme like the vignettes' pair-granular ids).
    const family = `f${world.claimCounter}`;
    const base: Claim = { id: 'pending', family, parent: null, ...run.spec };
    const traits = world.npcs[run.asset]!.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
    const delta = applyTraits(traits, base, traitContextOf(world.npcs[run.asset]!, world));
    const claim = mintClaim(world, { ...run.spec, ...delta, family, parent: null });
    world.claims[claim.id] = claim;
    recordFact(world, 'player', run.asset, { kind: 'carried-story', ref: family });

    delivered.push({
      tick: t, venue: circle.venue, circleMembers: [...circle.members],
      speaker: run.asset, addressedTo: run.target, claim, mode: 'telling',
    });
  }
  world.network.pendingCouriers = remaining;
  return delivered;
}
