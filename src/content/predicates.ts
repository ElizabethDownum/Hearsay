import type { PredicateId } from '../sim/rumors/claim';
import type { PredicateDef } from '../sim/rules';

export const PREDICATES: Record<PredicateId, PredicateDef> = {
  'met-secretly-with':      { id: 'met-secretly-with',      juiciness: 0.7,  sinVersion: 'is-having-an-affair-with', factionRelevant: true, valence: 'damaging' },
  'is-having-an-affair-with': { id: 'is-having-an-affair-with', juiciness: 0.9, sinVersion: null, factionRelevant: false, valence: 'damaging' },
  'stole':                  { id: 'stole',                  juiciness: 0.8,  sinVersion: null, factionRelevant: true, valence: 'damaging' },
  'is-bankrupt':            { id: 'is-bankrupt',            juiciness: 0.6,  sinVersion: null, factionRelevant: true, valence: 'damaging' },
  'owes-money-to':          { id: 'owes-money-to',          juiciness: 0.35, sinVersion: 'stole', factionRelevant: false, valence: 'damaging' },
  'blessed-the-harvest':    { id: 'blessed-the-harvest',    juiciness: 0.15, sinVersion: null, factionRelevant: false, valence: 'flattering' },
};
