import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import type { CompartmentFact, Principal } from './types';
import { assetFor } from './roster';

/**
 * Record a fact an asset learned through USE. The tick is stamped from `world.tick` (never supplied),
 * and the fact is appended in call order. Deduped-EXACT: an identical fact (same tick, kind, ref) is
 * never recorded twice — but the same content at a different tick is a distinct event and is kept.
 * Throws if `asset` is on no roster (a fact can only be recorded against a real asset).
 */
export function recordFact(
  world: WorldState,
  principal: Principal,
  asset: EntityId,
  fact: Omit<CompartmentFact, 'tick'>,
): number {
  const record = assetFor(world, principal, asset);
  if (!record) throw new Error(`recordFact: '${asset}' is not a ${principal} asset`);
  const full: CompartmentFact = { tick: world.tick, kind: fact.kind, ref: fact.ref };
  const dup = record.facts.some((f) => f.tick === full.tick && f.kind === full.kind && f.ref === full.ref);
  if (dup) return record.facts.findIndex((f) =>
    f.tick === full.tick && f.kind === full.kind && f.ref === full.ref);
  record.facts.push(full);
  return record.facts.length - 1;
}

/** Record a fact in a player-witnessed moment and mark exactly that compartment index as known. */
export function recordPlayerKnownFact(
  world: WorldState,
  asset: EntityId,
  fact: Omit<CompartmentFact, 'tick'>,
): number {
  const factIndex = recordFact(world, 'player', asset, fact);
  const known = world.intel.knownAssetFacts ?? (world.intel.knownAssetFacts = []);
  if (!known.some((row) => row.asset === asset && row.factIndex === factIndex)) {
    known.push({ asset, factIndex, receivedAt: world.tick });
  }
  return factIndex;
}

/**
 * What an interrogation of `asset` yields — the record, verbatim, nothing more or less, in the order
 * it was learned. Returned as byte-copies: reading the compartment can never mutate the record. A
 * non-asset yields nothing (they know nothing about your network).
 */
export function compartmentOf(world: WorldState, principal: Principal, asset: EntityId): CompartmentFact[] {
  const record = assetFor(world, principal, asset);
  if (!record) return [];
  return record.facts.map((f) => ({ tick: f.tick, kind: f.kind, ref: f.ref }));
}
