import type { PredicateId } from '../sim/rumors/claim';
import type { PredicateDef } from '../sim/rules';

export const PREDICATES: Record<PredicateId, PredicateDef> = {
  // ── damaging (16) ─────────────────────────────────────────────────────────
  'met-secretly-with':        { id: 'met-secretly-with',        juiciness: 0.7,  sinVersion: 'is-having-an-affair-with', factionRelevant: true,  valence: 'damaging' },
  'is-having-an-affair-with': { id: 'is-having-an-affair-with', juiciness: 0.9,  sinVersion: null,                        factionRelevant: false, valence: 'damaging' },
  'stole':                    { id: 'stole',                    juiciness: 0.8,  sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'is-bankrupt':              { id: 'is-bankrupt',              juiciness: 0.6,  sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'owes-money-to':            { id: 'owes-money-to',            juiciness: 0.35, sinVersion: 'stole',                     factionRelevant: false, valence: 'damaging' },
  'poisoned':                 { id: 'poisoned',                 juiciness: 0.95, sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'forged-the-lineage':       { id: 'forged-the-lineage',       juiciness: 0.85, sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'plans-to-seize-the-throne':{ id: 'plans-to-seize-the-throne',juiciness: 0.8,  sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'bribed-the-council':       { id: 'bribed-the-council',       juiciness: 0.7,  sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'embezzles-guild-funds':    { id: 'embezzles-guild-funds',    juiciness: 0.75, sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'consorts-with-smugglers':  { id: 'consorts-with-smugglers',  juiciness: 0.65, sinVersion: null,                        factionRelevant: true,  valence: 'damaging' },
  'cheats-at-cards':          { id: 'cheats-at-cards',          juiciness: 0.45, sinVersion: 'stole',                     factionRelevant: false, valence: 'damaging' },
  'fathered-a-bastard':       { id: 'fathered-a-bastard',       juiciness: 0.7,  sinVersion: 'is-having-an-affair-with', factionRelevant: false, valence: 'damaging' },
  'broke-a-betrothal':        { id: 'broke-a-betrothal',        juiciness: 0.6,  sinVersion: null,                        factionRelevant: false, valence: 'damaging' },
  'publicly-quarreled-with':  { id: 'publicly-quarreled-with',  juiciness: 0.55, sinVersion: null,                        factionRelevant: false, valence: 'damaging' },
  'shuttered-the-shop':       { id: 'shuttered-the-shop',       juiciness: 0.5,  sinVersion: null,                        factionRelevant: false, valence: 'damaging' },
  // ── flattering (6) ────────────────────────────────────────────────────────
  'blessed-the-harvest':      { id: 'blessed-the-harvest',      juiciness: 0.15, sinVersion: null, factionRelevant: false, valence: 'flattering' },
  'rescued-the-drowning-child': { id: 'rescued-the-drowning-child', juiciness: 0.65, sinVersion: null, factionRelevant: false, valence: 'flattering' },
  'gave-alms-to-the-poor':    { id: 'gave-alms-to-the-poor',    juiciness: 0.3,  sinVersion: null, factionRelevant: false, valence: 'flattering' },
  'won-the-regatta':          { id: 'won-the-regatta',          juiciness: 0.5,  sinVersion: null, factionRelevant: false, valence: 'flattering' },
  'is-favored-at-court':      { id: 'is-favored-at-court',      juiciness: 0.55, sinVersion: null, factionRelevant: true,  valence: 'flattering' },
  'nursed-the-sick-through-fever': { id: 'nursed-the-sick-through-fever', juiciness: 0.4, sinVersion: null, factionRelevant: false, valence: 'flattering' },
  // ── neutral (2) ───────────────────────────────────────────────────────────
  'is-the-true-heir-of':      { id: 'is-the-true-heir-of',      juiciness: 0.9,  sinVersion: null,                  factionRelevant: true,  valence: 'neutral' },
  'met-at-the-docks-by-night':{ id: 'met-at-the-docks-by-night',juiciness: 0.5,  sinVersion: 'met-secretly-with',   factionRelevant: false, valence: 'neutral' },
};
