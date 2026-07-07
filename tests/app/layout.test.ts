import { describe, expect, it } from 'vitest';
import { computeAngleOrder, computeLayout, venueArchetype, type TownLayout } from '../../app/src/town/layout';
import type { TownMap } from '../../src/sim/enemy/state';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { buildTownMap } from '../../src/sim/world';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';

// layout.ts is DOM-free PURE MATH — this file exercises it with hand-built and generated maps and
// never touches a canvas/DOM. The law under test: same map+seed ⇒ byte-equal layout on every
// machine (fixed relax iterations, jitter only from Rng(seed,'layout') — no Date/Math.random).

type Access = TownMap['venues'][number]['access'];
function townMap(rows: [id: string, district: string, access?: Access][]): TownMap {
  return {
    venues: rows.map(([id, district, access]) => ({ id, district, access: access ?? 'public' })),
    directory: [],
  };
}

/** Three districts, a regular ring each, both singletons + the safehouse pinned in d0. */
const THREE: TownMap = townMap([
  ['market-d0', 'd0'], ['tavern-d0', 'd0'], ['chapel-d0', 'd0'], ['workshop-d0', 'd0'],
  ['cathedral', 'd0'], ['docks', 'd0'], ['safehouse', 'd0', 'private'],
  ['market-d1', 'd1'], ['tavern-d1', 'd1'], ['chapel-d1', 'd1'], ['workshop-d1', 'd1'],
  ['market-d2', 'd2'], ['tavern-d2', 'd2'], ['chapel-d2', 'd2'], ['workshop-d2', 'd2'],
]);

const SINGLETONS = new Set(['cathedral', 'docks']);
const isRegular = (id: string) => id !== 'safehouse' && !SINGLETONS.has(id);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** A realistic generated map — proves the layout survives production scale (72 npcs, 3 districts). */
function generatedMap(seed: string): TownMap {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  const world = worldFromTown(town, seed);
  attachPlayer(world, town);
  return buildTownMap({ venues: Object.values(world.venues), npcs: Object.values(world.npcs) });
}

describe('computeLayout — determinism (same map + seed ⇒ byte-equal, every machine)', () => {
  it('is byte-equal across two calls with the same map and seed', () => {
    const a = computeLayout(THREE, 'seed-alpha');
    const b = computeLayout(THREE, 'seed-alpha');
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('is byte-equal at production scale (generated 72-npc town)', () => {
    const m = generatedMap('town-x1');
    expect(JSON.stringify(computeLayout(m, 'k'))).toBe(JSON.stringify(computeLayout(m, 'k')));
  });

  it('has stable, sorted key order (deterministic serialization)', () => {
    const l = computeLayout(THREE, 'seed-alpha');
    expect(Object.keys(l.venues)).toEqual([...Object.keys(l.venues)].sort());
    expect(Object.keys(l.districtHulls)).toEqual([...Object.keys(l.districtHulls)].sort());
  });
});

describe('computeLayout — seed sensitivity (different seed ⇒ different layout)', () => {
  it('moves at least one venue when the seed changes', () => {
    const a = computeLayout(THREE, 'seed-alpha');
    const b = computeLayout(THREE, 'seed-beta');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('computeLayout — all venues land in the unit square [0,1]²', () => {
  it('keeps every hand-built venue in-bounds', () => {
    const l = computeLayout(THREE, 'seed-alpha');
    for (const [id, p] of Object.entries(l.venues)) {
      expect(p.x, `${id}.x`).toBeGreaterThanOrEqual(0);
      expect(p.x, `${id}.x`).toBeLessThanOrEqual(1);
      expect(p.y, `${id}.y`).toBeGreaterThanOrEqual(0);
      expect(p.y, `${id}.y`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps every venue in-bounds at production scale', () => {
    const l = computeLayout(generatedMap('town-x2'), 'k');
    for (const p of Object.values(l.venues)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });
});

describe('computeLayout — completeness & hulls', () => {
  it('places every map venue with its real district', () => {
    const l = computeLayout(THREE, 'seed-alpha');
    expect(Object.keys(l.venues).sort()).toEqual(THREE.venues.map((v) => v.id).sort());
    for (const v of THREE.venues) expect(l.venues[v.id]!.district).toBe(v.district);
  });

  it('emits one finite, positive-extent hull per district', () => {
    const l = computeLayout(THREE, 'seed-alpha');
    expect(Object.keys(l.districtHulls).sort()).toEqual(['d0', 'd1', 'd2']);
    for (const h of Object.values(l.districtHulls)) {
      expect(Number.isFinite(h.cx) && Number.isFinite(h.cy)).toBe(true);
      expect(h.rx).toBeGreaterThan(0);
      expect(h.ry).toBeGreaterThan(0);
    }
  });
});

function clusteringFailures(l: TownLayout): string[] {
  const bad: string[] = [];
  for (const [id, p] of Object.entries(l.venues)) {
    if (!isRegular(id)) continue;
    const ownD = dist(p, { x: l.districtHulls[p.district]!.cx, y: l.districtHulls[p.district]!.cy });
    for (const [d, h] of Object.entries(l.districtHulls)) {
      if (d === p.district) continue;
      if (ownD >= dist(p, { x: h.cx, y: h.cy })) bad.push(`${id}(${p.district}) drifted toward ${d}`);
    }
  }
  return bad;
}

describe('computeLayout — the diagram reads: districts cluster', () => {
  it('puts every regular venue nearer its own hull center than any other district hull', () => {
    expect(clusteringFailures(computeLayout(THREE, 'seed-alpha'))).toEqual([]);
  });

  it('still clusters at production scale (many homes per district must not bleed across hulls)', () => {
    expect(clusteringFailures(computeLayout(generatedMap('town-x3'), 'k'))).toEqual([]);
  });
});

describe('computeLayout — the safehouse sits near center when the map carries it', () => {
  it('pins the safehouse within a small radius of (0.5, 0.5)', () => {
    const s = computeLayout(THREE, 'seed-alpha').venues['safehouse']!;
    expect(dist(s, { x: 0.5, y: 0.5 })).toBeLessThan(0.1);
  });

  it('omits a safehouse node when the map has none (and does not throw)', () => {
    const noSafe = townMap([['market-d0', 'd0'], ['tavern-d0', 'd0'], ['market-d1', 'd1']]);
    const l = computeLayout(noSafe, 'seed-alpha');
    expect(l.venues['safehouse']).toBeUndefined();
    expect(Object.keys(l.venues).sort()).toEqual(['market-d0', 'market-d1', 'tavern-d0']);
  });

  it('is the closest node to center among all venues', () => {
    const l: TownLayout = computeLayout(THREE, 'seed-alpha');
    const center = { x: 0.5, y: 0.5 };
    const safe = dist(l.venues['safehouse']!, center);
    for (const [id, p] of Object.entries(l.venues)) {
      if (id === 'safehouse') continue;
      expect(safe, `safehouse should be nearer center than ${id}`).toBeLessThanOrEqual(dist(p, center));
    }
  });
});

describe('venueArchetype — the id→archetype map shared with the glyph lookup', () => {
  it('strips the district suffix, folds homes, and matches singletons/safehouse exactly', () => {
    expect(venueArchetype('market-d2')).toBe('market');
    expect(venueArchetype('guard-post-d0')).toBe('guard-post');
    expect(venueArchetype('tavern-d11')).toBe('tavern');
    expect(venueArchetype('cathedral')).toBe('cathedral');
    expect(venueArchetype('docks')).toBe('docks');
    expect(venueArchetype('safehouse')).toBe('safehouse');
    expect(venueArchetype('home-mara')).toBe('home');
    expect(venueArchetype('home')).toBe('home');
  });
});

describe('computeAngleOrder — deterministic clockwise walk for arrow-key navigation', () => {
  it('lists every venue exactly once and is stable across calls', () => {
    const l = computeLayout(THREE, 'seed-alpha');
    const order = computeAngleOrder(l);
    expect([...order].sort()).toEqual(Object.keys(l.venues).sort());
    expect(computeAngleOrder(l)).toEqual(order);
  });
});
