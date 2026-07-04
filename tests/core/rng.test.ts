import { Rng, fnv1a32 } from '../../src/core/rng';

describe('fnv1a32', () => {
  it('is deterministic and 32-bit unsigned', () => {
    expect(fnv1a32('hearsay')).toBe(fnv1a32('hearsay'));
    expect(fnv1a32('hearsay')).toBeGreaterThanOrEqual(0);
    expect(fnv1a32('hearsay')).toBeLessThan(2 ** 32);
    expect(fnv1a32('a')).not.toBe(fnv1a32('b'));
  });
});

describe('Rng', () => {
  it('same seed + stream reproduces the exact sequence', () => {
    const a = new Rng('seed-1', 'tie-breaks');
    const b = new Rng('seed-1', 'tie-breaks');
    for (let i = 0; i < 1000; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('different streams from one seed are independent sequences', () => {
    const a = new Rng('seed-1', 'circles');
    const b = new Rng('seed-1', 'world-gen');
    const draws = Array.from({ length: 20 }, () => [a.nextU32(), b.nextU32()]);
    expect(draws.some(([x, y]) => x !== y)).toBe(true);
  });

  it('int stays in [min, max) across 5000 draws and hits both edges', () => {
    const r = new Rng('seed-2', 'test');
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(7);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6]));
  });

  it('pick throws on empty, shuffle is a deterministic permutation', () => {
    const r = new Rng('seed-3', 'test');
    expect(() => r.pick([])).toThrow();
    const orig = [1, 2, 3, 4, 5];
    const s1 = new Rng('s', 'x').shuffle(orig);
    const s2 = new Rng('s', 'x').shuffle(orig);
    expect(s1).toEqual(s2);
    expect([...s1].sort()).toEqual(orig);
    expect(orig).toEqual([1, 2, 3, 4, 5]); // input untouched
  });
});
