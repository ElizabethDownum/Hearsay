import type { PredicateId } from '../sim/rumors/claim';

export interface PredicateDef {
  id: PredicateId;
  /** 0..1 — how tellable the story is on its own. */
  juiciness: number;
  /** Moralizer target: the sin-register version of this predicate. */
  sinVersion: PredicateId | null;
  /** Partisan only fires on faction-relevant claims. */
  factionRelevant: boolean;
}

export const PREDICATES: Record<PredicateId, PredicateDef> = {
  'met-secretly-with':      { id: 'met-secretly-with',      juiciness: 0.7,  sinVersion: 'is-having-an-affair-with', factionRelevant: true },
  'is-having-an-affair-with': { id: 'is-having-an-affair-with', juiciness: 0.9, sinVersion: null, factionRelevant: false },
  'stole':                  { id: 'stole',                  juiciness: 0.8,  sinVersion: null, factionRelevant: true },
  'is-bankrupt':            { id: 'is-bankrupt',            juiciness: 0.6,  sinVersion: null, factionRelevant: true },
  'owes-money-to':          { id: 'owes-money-to',          juiciness: 0.35, sinVersion: 'stole', factionRelevant: false },
  'blessed-the-harvest':    { id: 'blessed-the-harvest',    juiciness: 0.15, sinVersion: null, factionRelevant: false },
};
