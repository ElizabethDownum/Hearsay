import { generateValidTown } from '../../src/world/serve';
import { worldFromTown } from '../../src/world/attach';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import { runBotCampaignOn } from '../../src/bots/runner';
import { blitzCrier } from '../../src/bots/archetypes';
import { minuteOfDay } from '../../src/core/time';
import type { WorldState } from '../../src/sim/types';

/**
 * Watch-window retune measurement (report-style, npm run mc). P4-T9's carry: the fixed WATCH
 * window `{1080,1200}` lands in a retell-cooldown lull, so a watch's first capture tends to
 * arrive a day late. This harness measures WHERE evening speech actually flows before any
 * window is adopted — no attribution without measurement.
 *
 * A watch posts a guard at a venue for a minute-of-day window; the guard captures whatever is
 * said in earshot while standing there. The windows are venue-blind constants, so the value of a
 * window is simply how much public-venue speech falls inside it. We therefore drive one blitz
 * campaign per procgen seed and, over the resulting chronicle, count `telling` records at PUBLIC
 * venues whose `minuteOfDay(tick)` lands in each candidate window — the same run scored three
 * ways. No enemy staging is needed: the question is where words flow.
 *
 * Emergent counts have NO pass/fail threshold (silent-cap law): the test asserts only that every
 * run completed and produced flow, then prints the per-seed/per-window table + totals and the
 * decision-rule verdict. The pinned rule (before looking): adopt the highest-exposure challenger
 * iff it beats control by >= 10% total public-venue exposure; otherwise keep control.
 */

interface Window { from: number; to: number }
// Half-open [from, to), matching the sim's schedule/override convention (>= from && < to).
const WINDOWS = {
  control: { from: 1080, to: 1200 }, // the current WATCH constant
  A: { from: 960, to: 1140 },        // straddles the assignment window's gossip shoulder
  B: { from: 1005, to: 1185 },       // 15-aligned midpoint shift
} as const;
type WindowKey = keyof typeof WINDOWS;
const KEYS: WindowKey[] = ['control', 'A', 'B'];

const inWindow = (m: number, w: Window): boolean => m >= w.from && m < w.to;

/** Public-venue tellings across the whole chronicle whose minute-of-day lands in `w`. */
function exposureIn(world: WorldState, w: Window): number {
  let n = 0;
  for (const e of world.chronicle) {
    if (e.kind !== 'telling') continue;
    if (world.venues[e.venue]?.access !== 'public') continue;
    if (inWindow(minuteOfDay(e.tick), w)) n += 1;
  }
  return n;
}

const gen = (seed: string): ReturnType<typeof generateValidTown>['town'] =>
  generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES,
    { knownTraitIds: Object.keys(TRAITS) }).town;

const winLabel = (k: WindowKey): string => `${k}{${WINDOWS[k].from},${WINDOWS[k].to}}`;

describe('watch-window retune — evening-flow measurement (npm run mc)', () => {
  const SEEDS = ['ww-1', 'ww-2', 'ww-3', 'ww-4', 'ww-5'];
  const DAYS = 3;

  it('measures public-venue utterance exposure per candidate window; prints table + verdict', { timeout: 30000 }, () => {
    const totals: Record<WindowKey, number> = { control: 0, A: 0, B: 0 };
    const rows: { seed: string; npcs: number; counts: Record<WindowKey, number> }[] = [];

    for (const seed of SEEDS) {
      const town = gen(seed);
      const world = worldFromTown(town, seed);
      runBotCampaignOn(world, STANDARD_RULES, blitzCrier, DAYS);

      const counts = { control: 0, A: 0, B: 0 } as Record<WindowKey, number>;
      for (const k of KEYS) {
        counts[k] = exposureIn(world, WINDOWS[k]);
        totals[k] += counts[k];
      }
      rows.push({ seed, npcs: town.fixture.npcs.length, counts });
    }

    console.log(`\n=== watch-window exposure · ${SEEDS.length} seeds × ${DAYS} days · bot ${blitzCrier.name} ===`);
    console.log(`windows: ${KEYS.map(winLabel).join('   ')}   (public-venue tellings, minute-of-day in [from,to))`);
    console.log(`${'seed'.padEnd(8)}${'NPCs'.padEnd(6)}${KEYS.map((k) => k.padEnd(10)).join('')}`);
    for (const r of rows) {
      console.log(`${r.seed.padEnd(8)}${String(r.npcs).padEnd(6)}${KEYS.map((k) => String(r.counts[k]).padEnd(10)).join('')}`);
    }
    console.log(`${'TOTAL'.padEnd(14)}${KEYS.map((k) => String(totals[k]).padEnd(10)).join('')}`);

    // Decision rule, pinned before looking: best challenger vs control, >= 10% adopt threshold.
    const control = totals.control;
    const challengers: WindowKey[] = ['A', 'B'];
    const best = challengers.reduce((a, b) => (totals[b] > totals[a] ? b : a));
    const gain = control === 0 ? Infinity : (totals[best] - control) / control;
    const adopt = gain >= 0.10;
    console.log(`\ncontrol total = ${control}`);
    for (const k of challengers) {
      const g = control === 0 ? Infinity : (totals[k] - control) / control;
      console.log(`${winLabel(k)} total = ${totals[k]}  (${(g * 100).toFixed(1)}% vs control)`);
    }
    console.log(`best challenger = ${winLabel(best)} at ${(gain * 100).toFixed(1)}% vs control`);
    console.log(adopt
      ? `VERDICT: ADOPT ${winLabel(best)} — beats control by >= 10%.`
      : `VERDICT: KEEP control ${winLabel('control')} — no challenger clears +10%; measured, control confirmed.`);

    // Report-style: no threshold on emergent counts. Assert only that the machinery ran and
    // evening speech actually flowed (else there is nothing to retune against).
    expect(rows).toHaveLength(SEEDS.length);
    expect(rows.every((r) => r.npcs > 0)).toBe(true);
    expect(control + totals.A + totals.B).toBeGreaterThan(0);
  });
});
