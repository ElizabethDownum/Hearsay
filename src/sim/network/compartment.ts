import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import type { CompartmentFact } from './types';
import { findAsset } from './roster';

/**
 * Record a fact an asset learned through USE. The tick is stamped from `world.tick` (never supplied),
 * and the fact is appended in call order. Deduped-EXACT: an identical fact (same tick, kind, ref) is
 * never recorded twice — but the same content at a different tick is a distinct event and is kept.
 * Throws if `asset` is on no roster (a fact can only be recorded against a real asset).
 */
export function recordFact(world: WorldState, asset: EntityId, fact: Omit<CompartmentFact, 'tick'>): void {
  const record = findAsset(world, asset);
  if (!record) throw new Error(`recordFact: '${asset}' is not an asset on any roster`);
  const full: CompartmentFact = { tick: world.tick, kind: fact.kind, ref: fact.ref };
  const dup = record.facts.some((f) => f.tick === full.tick && f.kind === full.kind && f.ref === full.ref);
  if (dup) return;
  record.facts.push(full);
}

/**
 * What an interrogation of `asset` yields — the record, verbatim, nothing more or less, in the order
 * it was learned. Returned as byte-copies: reading the compartment can never mutate the record. A
 * non-asset yields nothing (they know nothing about your network).
 */
export function compartmentOf(world: WorldState, asset: EntityId): CompartmentFact[] {
  const record = findAsset(world, asset);
  if (!record) return [];
  return record.facts.map((f) => ({ tick: f.tick, kind: f.kind, ref: f.ref }));
}
