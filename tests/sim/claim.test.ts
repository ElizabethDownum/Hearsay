import { diffClaims, mintClaim, SOMEONE, type Claim } from '../../src/sim/rumors/claim';

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
});
// Predicate-registry tests (table scale, sinVersion resolution, exact ontology
// pin) moved to tests/content/predicates.test.ts — this file now tests only
// Claim mint/diff mechanics. Moved during P6-T1's 7→24 predicate table growth.
