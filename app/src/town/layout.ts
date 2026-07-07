import { fnv1a32, Rng } from '../../../src/core/rng';
import type { TownMap } from '../townview';

/**
 * Deterministic town layout in the unit square [0,1]². Computed ONCE per world seed and handed to
 * the (fenced, props-only) canvas as a prop.
 *
 * The law: same map + seed ⇒ byte-equal layout on EVERY machine. The only entropy source is
 * `new Rng(seed, 'layout')`; there is NO Date, NO Math.random, and a FIXED relax-iteration count —
 * nothing convergence-dependent. (The determinism lint rule guards this in src/**, but town/ is
 * app-side, so this module holds the law by construction. `Math.sin/cos/sqrt` are permitted — only
 * entropy/wall-clock are banned — and are engine-deterministic on the V8 the tests + Chromium app
 * run on; any cross-engine last-ULP drift is cosmetic and never touches save/replay, which is
 * integer-rational in the sim and never reads this layout.)
 */
export interface TownLayout {
  venues: Record<string, { x: number; y: number; district: string }>;
  districtHulls: Record<string, { cx: number; cy: number; rx: number; ry: number }>;
}

const TAU = Math.PI * 2;
const CENTER = 0.5;

// Ring geometry (unit-square fractions). District centers ride a ring of R_DISTRICT around the
// map center; a district's regular venues ride an inner ring of R_VENUE around their district
// center; the bridging singletons ride R_SINGLETON near the middle, tucked between district spokes;
// the safehouse is pinned at the very center. Chosen so clusters stay well-separated at up to a
// handful of districts (production is 3) and everything lands comfortably inside [0,1].
const R_DISTRICT = 0.30;
const R_VENUE = 0.09;
const R_SINGLETON = 0.15;
const R_SAFEHOUSE_JITTER = 0.02;

// Relaxation: a FIXED number of gentle overlap-resolution passes. The short-range cutoff means
// only nodes that actually crowd each other push apart, so distant districts never interact and
// clustering is preserved; pinned nodes (the safehouse) repel but never move.
const RELAX_ITERS = 40;
const MIN_SEP = 0.045;
const RELAX_K = 0.5;

const SINGLETON_ARCHETYPES = new Set(['cathedral', 'docks']);

/**
 * The archetype a venue id encodes — the single source of truth shared with the canvas glyph
 * lookup. Pure string logic: exact-match singletons/safehouse, the `home-*` family, else the base
 * before a trailing `-d<n>` district suffix (`market-d2` → `market`, `guard-post-d0` → `guard-post`).
 */
export function venueArchetype(id: string): string {
  if (id === 'safehouse') return 'safehouse';
  if (id === 'home' || id.startsWith('home-')) return 'home';
  const m = /^(.*)-d\d+$/.exec(id);
  return m ? m[1]! : id;
}

const isSingleton = (id: string) => SINGLETON_ARCHETYPES.has(venueArchetype(id));
const isSafehouse = (id: string) => venueArchetype(id) === 'safehouse';

interface Pt { x: number; y: number }

export function computeLayout(map: TownMap, seed: string): TownLayout {
  const rng = new Rng(seed, 'layout');
  const districts = [...new Set(map.venues.map((v) => v.district))].sort();
  const n = districts.length;

  // District centers: one spoke per district, angle by SORTED index (seed-independent so the
  // districts never trade places between seeds); a single district sits at the map center.
  const districtCenter = new Map<string, Pt>();
  districts.forEach((d, i) => {
    if (n === 1) { districtCenter.set(d, { x: CENTER, y: CENTER }); return; }
    const a = (TAU * i) / n;
    districtCenter.set(d, { x: CENTER + R_DISTRICT * Math.cos(a), y: CENTER + R_DISTRICT * Math.sin(a) });
  });

  const districtOf = new Map(map.venues.map((v) => [v.id, v.district]));
  const pos = new Map<string, Pt>();
  const pinned = new Set<string>();

  // 1. Regular venues: a jittered inner ring around each district's center. Sorted by id so slot
  //    assignment is deterministic; jitter (angular + radial) is the ONLY seeded quantity.
  for (const d of districts) {
    const regulars = map.venues
      .filter((v) => v.district === d && !isSingleton(v.id) && !isSafehouse(v.id))
      .map((v) => v.id)
      .sort();
    const c = districtCenter.get(d)!;
    const m = regulars.length;
    regulars.forEach((id, j) => {
      const slot = m > 0 ? (TAU * j) / m : 0;
      const aJit = m > 0 ? (rng.float() - 0.5) * (TAU / m) * 0.6 : (rng.float() - 0.5) * TAU;
      const angle = slot + aJit;
      const radius = R_VENUE * (0.7 + 0.5 * rng.float());
      pos.set(id, { x: c.x + radius * Math.cos(angle), y: c.y + radius * Math.sin(angle) });
    });
  }

  // 2. Singletons (cathedral, docks): midway between neighbouring district spokes, on an inner ring
  //    near the middle — the cross-district bridges read as sitting between the hulls.
  const singletons = map.venues.filter((v) => isSingleton(v.id)).map((v) => v.id).sort();
  singletons.forEach((id, k) => {
    const a = (TAU * (k + 0.5)) / Math.max(n, 1) + (rng.float() - 0.5) * 0.15;
    pos.set(id, { x: CENTER + R_SINGLETON * Math.cos(a), y: CENTER + R_SINGLETON * Math.sin(a) });
  });

  // 3. Safehouse: pinned at the center (tiny jitter for a hand-drawn feel), never moved by relax —
  //    which keeps "near center" true no matter what the repulsion does around it.
  for (const v of map.venues) {
    if (!isSafehouse(v.id)) continue;
    const a = rng.float() * TAU;
    const r = R_SAFEHOUSE_JITTER * rng.float();
    pos.set(v.id, { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) });
    pinned.add(v.id);
  }

  // 4. Relaxation — fixed passes of short-range repulsion to tease apart any coincidental overlaps.
  const ids = [...pos.keys()].sort();
  for (let iter = 0; iter < RELAX_ITERS; iter++) {
    const push = new Map<string, Pt>(ids.map((id) => [id, { x: 0, y: 0 }]));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i]!)!, b = pos.get(ids[j]!)!;
        let dx = a.x - b.x, dy = a.y - b.y;
        let d = Math.hypot(dx, dy);
        if (d >= MIN_SEP) continue;
        if (d < 1e-9) {
          // Exact overlap: pick a deterministic direction from the pair's ids (never entropy).
          const ang = (fnv1a32(`${ids[i]} ${ids[j]}`) / 0x1_0000_0000) * TAU;
          dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
        }
        const force = ((MIN_SEP - d) * RELAX_K) / d;
        const pi = push.get(ids[i]!)!, pj = push.get(ids[j]!)!;
        pi.x += dx * force; pi.y += dy * force;
        pj.x -= dx * force; pj.y -= dy * force;
      }
    }
    for (const id of ids) {
      if (pinned.has(id)) continue;
      const p = pos.get(id)!, dv = push.get(id)!;
      p.x = clamp01(p.x + dv.x);
      p.y = clamp01(p.y + dv.y);
    }
  }

  // 5. District hulls: an ellipse around each district's REGULAR venues (the singletons/safehouse
  //    float free between hulls), so the wash reads as tight around the cluster it labels.
  const districtHulls: TownLayout['districtHulls'] = {};
  for (const d of districts) {
    const pts = map.venues
      .filter((v) => v.district === d && !isSingleton(v.id) && !isSafehouse(v.id))
      .map((v) => pos.get(v.id)!);
    const src = pts.length > 0
      ? pts
      : map.venues.filter((v) => v.district === d).map((v) => pos.get(v.id)!);
    const cx = mean(src.map((p) => p.x));
    const cy = mean(src.map((p) => p.y));
    const rx = Math.max(...src.map((p) => Math.abs(p.x - cx)), 0) + R_VENUE * 0.6;
    const ry = Math.max(...src.map((p) => Math.abs(p.y - cy)), 0) + R_VENUE * 0.6;
    districtHulls[d] = { cx, cy, rx, ry };
  }

  // 6. Serialise with sorted keys — byte-stable output.
  const venues: TownLayout['venues'] = {};
  for (const id of [...pos.keys()].sort()) {
    const p = pos.get(id)!;
    venues[id] = { x: p.x, y: p.y, district: districtOf.get(id)! };
  }
  return { venues, districtHulls };
}

/**
 * Venue ids in clockwise angular order around the map center — the order arrow-key navigation walks
 * (art-direction + plan: the canvas is focus-navigable, arrows step venues by angle). Ties (e.g. the
 * near-center safehouse, whose angle is unstable) break by id so the walk is fully deterministic.
 */
export function computeAngleOrder(layout: TownLayout): string[] {
  return Object.keys(layout.venues).sort((a, b) => {
    const pa = layout.venues[a]!, pb = layout.venues[b]!;
    const aa = Math.atan2(pa.y - CENTER, pa.x - CENTER);
    const ab = Math.atan2(pb.y - CENTER, pb.x - CENTER);
    return aa - ab || a.localeCompare(b);
  });
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? CENTER : xs.reduce((a, b) => a + b, 0) / xs.length;
}
