import { generateValidTown } from '../../src/world/serve';
import { worldFromTown } from '../../src/world/attach';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import { blitzCrier } from '../../src/bots/archetypes';
import { applyAction, type Action } from '../../src/sim/campaign';
import { step } from '../../src/sim/step';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { TICKS_PER_DAY, dayOf, minuteOfDay } from '../../src/core/time';
import type { Rules } from '../../src/sim/rules';
import type { WorldState } from '../../src/sim/types';

/**
 * Digest cost at campaign scale (report-style, npm test at DEFAULT 12 days; on-demand day-40 run:
 * `$env:DIGEST_DAYS = '40'; npx vitest run tests/harness/digest-cost.report.test.ts;
 * Remove-Item Env:DIGEST_DAYS`).
 *
 * P4-T8's carry: `digestedThrough` sits unused — `enemyDigest` (src/sim/enemy/digest.ts) re-folds
 * ALL of `world.enemy.evidence` every night (several `.filter`/`.find` passes over the full log),
 * idempotent but O(total-evidence), not O(new-evidence). Before any windowing refactor lands:
 * measure at Coronation scale — no attribution without measurement (P6-T9 pinned rule).
 *
 * Method: one procgen town, enemy active via `worldFromTown` (guard roster + town map wired), a
 * blitz-crier campaign for gossip pressure (day-0 injects at the three best-connected NPCs, same
 * idiom as tests/harness/procgen.report.test.ts's enemy-active probe). We drive the world
 * tick-by-tick (mirroring `runBotCampaignOn`'s loop, since it exposes no timing hook) and time
 * (harness-only, never src/**) the WHOLE `step` call at the nightly beat (minute 1439) against the
 * immediately preceding, ordinary tick (minute 1438). Neither minute lands on the 15-minute
 * conversation beat (1438 % 15 = 13, 1439 % 15 = 14), so both are otherwise-quiet ticks — the only
 * asymmetry is the nightly block (`runEnemyDay` + `expireInquiries` + `runVignettes` +
 * `scenarioNightly`), which isolates the added nightly cost from ordinary per-tick overhead.
 *
 * A single real-tick sample is noisy (GC pauses, OS scheduling) relative to its own few-ms scale,
 * which is too coarse to read a per-entry growth rate off directly. `enemyDigest` is documented as
 * a pure fold (state read, zero mutation) — this harness leans on that purity to ALSO take a
 * repeated, side-effect-free median-of-N benchmark of the exact digest call each night made
 * (same state, same day, same rules), which is far less noisy and isolates the fold itself from
 * the other nightly-beat costs (`expireInquiries`/`runVignettes`/`scenarioNightly`) that the
 * single real-tick `nightlyMs` sample bundles in. Both series are printed; the fit + day-40
 * extrapolation reads off the low-noise digest-median series, since that is what a windowing
 * refactor would actually change.
 */

// No @types/node in this repo (types: ["vitest/globals"]) — reach process.env through
// globalThis, mirroring tests/world/soak.report.test.ts's SOAK_SEEDS idiom.
const digestEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const DAYS = Number(digestEnv['DIGEST_DAYS'] ?? 12);
if (!Number.isInteger(DAYS) || DAYS <= 0) {
  throw new Error(`digest-cost: DIGEST_DAYS must be a positive integer (got '${digestEnv['DIGEST_DAYS']}')`);
}

const DIGEST_BENCH_REPS = 50; // median-of-N, side-effect-free (enemyDigest never mutates state)

interface DayRow {
  day: number;
  evidenceLen: number;
  nightlyMs: number;      // real tick, minute 1439 (runEnemyDay + expireInquiries + runVignettes + scenarioNightly)
  adjacentMs: number;     // real tick, minute 1438 (ordinary, otherwise-quiet tick)
  digestMedianMs: number; // median-of-N pure enemyDigest() call, same evidence, isolated
}

/** Median of N side-effect-free calls to the pure digest fold — never mutates `world`. */
function benchDigest(world: WorldState, day: number, rules: Rules, reps: number): number {
  const samples: number[] = [];
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    enemyDigest(world.enemy, day, rules);
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

/**
 * Drives one enemy-active world tick-by-tick over `days`, a blitz-crier campaign layered on top
 * (same action-application loop as `runBotCampaignOn`, reimplemented here so the nightly tick and
 * its immediate predecessor can be timed individually).
 */
function driveWithTiming(world: WorldState, rules: Rules, days: number): DayRow[] {
  const rows: DayRow[] = [];
  const totalTicks = days * TICKS_PER_DAY;
  let curDay = -1;
  let dayActions: Action[] = [];
  let ai = 0;
  let adjacentMs = NaN;

  while (world.tick < totalTicks) {
    const day = dayOf(world.tick);
    if (day !== curDay) {
      curDay = day;
      dayActions = blitzCrier.decide(world, rules, day);
      ai = 0;
      adjacentMs = NaN;
    }
    while (ai < dayActions.length && dayActions[ai]!.tick === world.tick) {
      applyAction(world, dayActions[ai]!);
      ai += 1;
    }
    const mod = minuteOfDay(world.tick);
    if (mod === 1438) {
      const t0 = performance.now();
      step(world, rules);
      adjacentMs = performance.now() - t0;
    } else if (mod === 1439) {
      const t0 = performance.now();
      step(world, rules);
      const nightlyMs = performance.now() - t0;
      const digestMedianMs = benchDigest(world, day, rules, DIGEST_BENCH_REPS);
      rows.push({ day, evidenceLen: world.enemy.evidence.length, nightlyMs, adjacentMs, digestMedianMs });
    } else {
      step(world, rules);
    }
  }
  return rows;
}

/** Least-squares slope/intercept/R² of y against x. */
function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i]!;
    ssRes += (ys[i]! - pred) ** 2;
    ssTot += (ys[i]! - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

describe(`digest cost at campaign scale — ${DAYS} days (npm test; on-demand DIGEST_DAYS=40)`, () => {
  it('measures nightly-step wall ms vs evidence length; prints the table + day-40 extrapolation',
    { timeout: 30000 }, () => {
      // JIT warmup, discarded: a cold-start first call to step/runEnemyDay measured ~2-4x its
      // steady-state cost (V8 hadn't compiled the hot path yet), which would otherwise pollute
      // day 0 of the real table with a startup artifact rather than an evidence-length effect.
      // Same machinery, a throwaway world/seed, timings discarded.
      const warmupTown = generateValidTown('digest-cost-warmup', STANDARD_GEN_CONFIG,
        STANDARD_GEN_CONTENT, STANDARD_RULES, { knownTraitIds: Object.keys(TRAITS) }).town;
      driveWithTiming(worldFromTown(warmupTown, 'digest-cost-warmup'), STANDARD_RULES, 2);

      const { town } = generateValidTown('digest-cost-1', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT,
        STANDARD_RULES, { knownTraitIds: Object.keys(TRAITS) });
      const world = worldFromTown(town, 'digest-cost-1');
      const rows = driveWithTiming(world, STANDARD_RULES, DAYS);

      console.log(`\n=== digest cost · ${DAYS} days · ${town.fixture.npcs.length} NPCs · bot ${blitzCrier.name} ===`);
      console.log(`${'day'.padEnd(5)}${'evidenceLen'.padEnd(13)}${'nightlyMs'.padEnd(12)}${'adjacentMs'.padEnd(12)}${'deltaMs'.padEnd(10)}${'digestMedMs'.padEnd(12)}`);
      for (const r of rows) {
        const delta = r.nightlyMs - r.adjacentMs;
        console.log(`${String(r.day).padEnd(5)}${String(r.evidenceLen).padEnd(13)}${r.nightlyMs.toFixed(3).padEnd(12)}${r.adjacentMs.toFixed(3).padEnd(12)}${delta.toFixed(3).padEnd(10)}${r.digestMedianMs.toFixed(4).padEnd(12)}`);
      }

      // Fit both series against evidence length: the noisy real-tick nightlyMs (brief's literal
      // measurement) and the low-noise digestMedianMs (isolated pure-fold benchmark). Report both;
      // the day-40 extrapolation and the pinned-rule verdict read off the low-noise series.
      const xs = rows.map((r) => r.evidenceLen);
      const nightlyFit = linearFit(xs, rows.map((r) => r.nightlyMs));
      const digestFit = linearFit(xs, rows.map((r) => r.digestMedianMs));

      const firstDay = rows[0]!;
      const lastDay = rows[rows.length - 1]!;
      const daySpan = lastDay.day - firstDay.day;
      const evGrowthPerDay = daySpan === 0 ? 0 : (lastDay.evidenceLen - firstDay.evidenceLen) / daySpan;
      const ev40 = lastDay.evidenceLen + evGrowthPerDay * (40 - lastDay.day);

      // Conservative day-40 projection: the largest-observed-n cost-per-entry ratio (day-40
      // evidenceLen / last measured evidenceLen), applied to nightlyMs — the metric the pinned
      // rule actually names. Using the LARGEST measured n minimizes the fixed-cost-per-tick share
      // baked into the ratio (a small-n day inflates it, since fixed overhead dominates there).
      const scaleToDay40 = ev40 / lastDay.evidenceLen;
      const nightly40Conservative = lastDay.nightlyMs * scaleToDay40;
      const digest40Conservative = lastDay.digestMedianMs * scaleToDay40;
      // Naive least-squares extrapolation, printed for transparency only (see fit-shape note).
      const nightly40Fit = nightlyFit.intercept + nightlyFit.slope * ev40;
      const digest40Fit = digestFit.intercept + digestFit.slope * ev40;

      console.log(`\nreal-tick fit:     nightlyMs      ~= ${nightlyFit.intercept.toFixed(4)} + ${nightlyFit.slope.toFixed(6)} x evidenceLen  (R^2 = ${nightlyFit.r2.toFixed(3)})`);
      console.log(`digest-median fit: digestMedianMs  ~= ${digestFit.intercept.toFixed(4)} + ${digestFit.slope.toFixed(6)} x evidenceLen  (R^2 = ${digestFit.r2.toFixed(3)})`);
      console.log(`evidence growth: ~${evGrowthPerDay.toFixed(1)} entries/day (day ${firstDay.day}->${lastDay.day}); day-40 evidenceLen ~= ${ev40.toFixed(0)} (scale x${scaleToDay40.toFixed(2)} over the last measured day)`);

      const digestFitIsLinear = digestFit.r2 >= 0.8 && digestFit.slope > 0;
      console.log(`observed fit shape (digest-median series): ${digestFitIsLinear
        ? `linear-in-evidence-length holds (R^2 = ${digestFit.r2.toFixed(3)} >= 0.8, positive slope)`
        : `flat / noise-dominated in this range (R^2 = ${digestFit.r2.toFixed(3)}, slope ${digestFit.slope >= 0 ? 'positive' : 'non-positive'}) `
          + `-- the least-squares extrapolation (${digest40Fit.toFixed(3)} ms) is not reliable; `
          + `using the conservative largest-n ratio-scaled projection instead`}`);

      console.log(`\nday-40 extrapolation (conservative, ratio-scaled from the largest measured day): `
        + `digest-median ~= ${digest40Conservative.toFixed(3)} ms, nightly-tick ~= ${nightly40Conservative.toFixed(3)} ms`);
      console.log(`day-40 extrapolation (naive least-squares, reference only): `
        + `digest-median ~= ${digest40Fit.toFixed(3)} ms, nightly-tick ~= ${nightly40Fit.toFixed(3)} ms`);

      const decisionMs = nightly40Conservative; // the conservative bound decides the verdict
      const breach = decisionMs >= 25;
      console.log('\nPINNED RULE: day-12-default trend extrapolated to day 40 keeps nightly digest '
        + 'under 25ms => DEFER windowing to Plan 10; else STOP / BLOCKED-decision.');
      console.log(`day-40 extrapolated nightly (conservative) = ${decisionMs.toFixed(3)} ms => VERDICT: ${breach
        ? 'BLOCKED-decision — breaches 25ms at day-40 extrapolation; controller decides on windowing.'
        : 'DEFERRED to Plan 10 — measured, cheap, deferred.'}`);

      // Report-style: no threshold on the emergent timing itself (silent-cap law). Assert only
      // that the machinery ran, every day produced a measurement, and gossip pressure actually
      // grew the evidence log (else there is nothing to decide against).
      expect(rows).toHaveLength(DAYS);
      expect(rows.every((r) => Number.isFinite(r.nightlyMs) && Number.isFinite(r.adjacentMs)
        && Number.isFinite(r.digestMedianMs))).toBe(true);
      expect(lastDay.evidenceLen).toBeGreaterThan(0);
    });
});
