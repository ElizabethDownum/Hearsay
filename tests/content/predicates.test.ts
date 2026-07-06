import { PREDICATES } from '../../src/content/predicates';

describe('predicate registry', () => {
  it('registry is at spec v1 scale: 24 predicates, 16/6/2 by valence', () => {
    const all = Object.values(PREDICATES);
    expect(all).toHaveLength(24);
    expect(all.filter((p) => p.valence === 'damaging')).toHaveLength(16);
    expect(all.filter((p) => p.valence === 'flattering')).toHaveLength(6);
    expect(all.filter((p) => p.valence === 'neutral')).toHaveLength(2);
  });

  it('every sinVersion resolves to a registered predicate', () => {
    for (const p of Object.values(PREDICATES)) {
      if (p.sinVersion !== null) expect(PREDICATES[p.sinVersion]).toBeDefined();
    }
  });

  it('the docks ladder climbs two sin hops: neutral sighting → secret meeting → affair', () => {
    const hop1 = PREDICATES['met-at-the-docks-by-night']!.sinVersion;
    expect(hop1).toBe('met-secretly-with');
    expect(PREDICATES[hop1!]!.sinVersion).toBe('is-having-an-affair-with');
  });

  it('ids self-agree and juiciness stays in (0,1]', () => {
    for (const [key, p] of Object.entries(PREDICATES)) {
      expect(p.id).toBe(key);
      expect(p.juiciness).toBeGreaterThan(0);
      expect(p.juiciness).toBeLessThanOrEqual(1);
    }
  });

  it('pins the exact 24-entry ontology (verbatim from the spec table)', () => {
    expect(PREDICATES).toEqual({
      // ── damaging (16) ─────────────────────────────────────────────────────
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
      // ── flattering (6) ────────────────────────────────────────────────────
      'blessed-the-harvest':      { id: 'blessed-the-harvest',      juiciness: 0.15, sinVersion: null, factionRelevant: false, valence: 'flattering' },
      'rescued-the-drowning-child': { id: 'rescued-the-drowning-child', juiciness: 0.65, sinVersion: null, factionRelevant: false, valence: 'flattering' },
      'gave-alms-to-the-poor':    { id: 'gave-alms-to-the-poor',    juiciness: 0.3,  sinVersion: null, factionRelevant: false, valence: 'flattering' },
      'won-the-regatta':          { id: 'won-the-regatta',          juiciness: 0.5,  sinVersion: null, factionRelevant: false, valence: 'flattering' },
      'is-favored-at-court':      { id: 'is-favored-at-court',      juiciness: 0.55, sinVersion: null, factionRelevant: true,  valence: 'flattering' },
      'nursed-the-sick-through-fever': { id: 'nursed-the-sick-through-fever', juiciness: 0.4, sinVersion: null, factionRelevant: false, valence: 'flattering' },
      // ── neutral (2) ───────────────────────────────────────────────────────
      'is-the-true-heir-of':      { id: 'is-the-true-heir-of',      juiciness: 0.9,  sinVersion: null,                  factionRelevant: true,  valence: 'neutral' },
      'met-at-the-docks-by-night':{ id: 'met-at-the-docks-by-night',juiciness: 0.5,  sinVersion: 'met-secretly-with',   factionRelevant: false, valence: 'neutral' },
    });
  });
});
