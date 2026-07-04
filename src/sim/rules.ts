import type { PredicateId } from './rumors/claim';
import type { TraitDef, TraitId } from './rumors/traits';

export interface PredicateDef {
  id: PredicateId;
  /** 0..1 — how tellable the story is on its own. */
  juiciness: number;
  /** Moralizer target: the sin-register version of this predicate. */
  sinVersion: PredicateId | null;
  /** Partisan only fires on faction-relevant claims. */
  factionRelevant: boolean;
  /** Who the claim helps or harms — confirmation bias reads this. */
  valence: 'damaging' | 'neutral' | 'flattering';
}

/**
 * Injected engine configuration: the engine defines this shape, content supplies
 * the data, and callers pass it in. Rules contains functions (trait transforms),
 * so it must NEVER be stored inside WorldState (serializability law) — it is
 * always passed as a parameter.
 */
export interface Rules {
  predicates: Record<PredicateId, PredicateDef>;
  traits: Record<TraitId, TraitDef>;
}
