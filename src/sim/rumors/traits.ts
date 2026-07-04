import type { Claim, EntityId } from './claim';

export type TraitId = string;

export interface TraitContext {
  ownerId: EntityId;
  faction: string;
  /** Stable order fixed at world authoring — deterministic fills index into this. */
  rivals: readonly EntityId[];
  factionOf(e: EntityId): string | null;
}

export interface TraitDef {
  id: TraitId;
  appliesTo(claim: Claim, ctx: TraitContext): boolean;
  /** Returns ONLY the changed fields. Must be pure and deterministic. */
  transform(claim: Claim, ctx: TraitContext): Partial<Claim>;
  /** Behavioral fingerprint for identity-transform traits. */
  retellGate: 'none' | 'requires-corroboration';
}

/**
 * Ordered composition — the spec's "composition over hops = ordered function
 * composition", applied within one mind: each trait sees the previous trait's output.
 */
export function applyTraits(
  traits: readonly TraitDef[],
  claim: Claim,
  ctx: TraitContext,
): Partial<Claim> {
  let acc: Claim = claim;
  const merged: Partial<Claim> = {};
  for (const t of traits) {
    if (!t.appliesTo(acc, ctx)) continue;
    const delta = t.transform(acc, ctx);
    Object.assign(merged, delta);
    acc = { ...acc, ...delta };
  }
  return merged;
}
