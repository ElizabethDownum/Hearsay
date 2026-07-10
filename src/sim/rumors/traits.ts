import type { Claim, EntityId, FieldChange } from './claim';
import type { ReportedClaim } from '../enemy/state';
import type { Npc, WorldState } from '../types';

export type TraitId = string;

export interface TraitContext {
  ownerId: EntityId;
  faction: string;
  /** Stable order fixed at world authoring — deterministic fills index into this. */
  rivals: readonly EntityId[];
  factionOf(e: EntityId): string | null;
}

/**
 * The ONE face of TraitContext construction (Plan 8 T12 O5): a reporter's own context — ownerId +
 * faction + rivals from the npc, `factionOf` resolved against the world roster. Extracted from the
 * four byte-identical copies that had grown up in propagation, the courier path, reporting, and the
 * inquiry answerer — same mechanic, one place. Pure and behavior-preserving (soak/mc unmoved).
 */
export function traitContextOf(npc: Npc, world: WorldState): TraitContext {
  return {
    ownerId: npc.id,
    faction: npc.faction,
    rivals: npc.rivals,
    factionOf: (e) => world.npcs[e]?.faction ?? null,
  };
}

export interface TraitDef {
  id: TraitId;
  appliesTo(claim: Claim, ctx: TraitContext): boolean;
  /** Returns ONLY the changed fields. Must be pure and deterministic. */
  transform(claim: Claim, ctx: TraitContext): Partial<Claim>;
  /** Behavioral fingerprint for identity-transform traits. */
  retellGate: 'none' | 'requires-corroboration';
  /**
   * The codex glossary: does an observed receive→emit differ the way THIS trait would leave it?
   * Read against a captured pair (the version the npc was told, and the diff to the version they
   * later emitted). Pure content — the Evidence Board deduces traits by matching these, never by
   * reading world state. Identity-transform traits (skeptic/literalist) leave no field evidence,
   * so their fingerprint is a constant `false` (deduced behaviorally, not codex-lockable in v1).
   */
  fingerprint(before: ReportedClaim, changes: FieldChange[]): boolean;
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
