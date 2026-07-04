import { diffClaims, mintClaim, SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import { PREDICATES } from '../../src/content/predicates';

const base = (world: { claimCounter: number }): Claim =>
  mintClaim(world, {
    family: 'r1', parent: null,
    subject: 'osric', predicate: 'met-secretly-with', object: 'jonet',
    count: null, severity: 2, place: 'docks', attribution: SOMEONE,
  });

describe('claims', () => {
  it('mints ids from the world counter (replay-stable)', () => {
    const w = { claimCounter: 0 };
    expect(base(w).id).toBe('c0');
    expect(base(w).id).toBe('c1');
    expect(w.claimCounter).toBe(2);
  });

  it('diff is exact: only changed fields, with from/to', () => {
    const w = { claimCounter: 0 };
    const a = base(w);
    const b: Claim = { ...a, id: 'c9', parent: a.id, severity: 4, attribution: 'mara' };
    const d = diffClaims(a, b);
    expect(d).toEqual([
      { field: 'severity', from: 2, to: 4 },
      { field: 'attribution', from: SOMEONE, to: 'mara' },
    ]);
    expect(diffClaims(a, a)).toEqual([]);
  });

  it('predicate table: seven predicates, sin mappings resolve to real predicates', () => {
    expect(Object.keys(PREDICATES)).toHaveLength(7);
    for (const p of Object.values(PREDICATES)) {
      expect(p.juiciness).toBeGreaterThan(0);
      expect(p.juiciness).toBeLessThanOrEqual(1);
      if (p.sinVersion) expect(PREDICATES[p.sinVersion]).toBeDefined();
    }
  });

  it('predicate table pins the exact seven-entry ontology', () => {
    expect(PREDICATES).toEqual({
      'met-secretly-with':        { id: 'met-secretly-with',        juiciness: 0.7,  sinVersion: 'is-having-an-affair-with', factionRelevant: true, valence: 'damaging' },
      'is-having-an-affair-with': { id: 'is-having-an-affair-with', juiciness: 0.9,  sinVersion: null, factionRelevant: false, valence: 'damaging' },
      'stole':                    { id: 'stole',                    juiciness: 0.8,  sinVersion: null, factionRelevant: true, valence: 'damaging' },
      'is-bankrupt':              { id: 'is-bankrupt',              juiciness: 0.6,  sinVersion: null, factionRelevant: true, valence: 'damaging' },
      'owes-money-to':            { id: 'owes-money-to',            juiciness: 0.35, sinVersion: 'stole', factionRelevant: false, valence: 'damaging' },
      'blessed-the-harvest':      { id: 'blessed-the-harvest',      juiciness: 0.15, sinVersion: null, factionRelevant: false, valence: 'flattering' },
      // Plan 4 Task 3 (amendment #3): the counter-spin vehicle — juicy enough to clear TELL_THRESHOLD.
      'rescued-the-drowning-child': { id: 'rescued-the-drowning-child', juiciness: 0.65, sinVersion: null, factionRelevant: false, valence: 'flattering' },
    });
  });
});
