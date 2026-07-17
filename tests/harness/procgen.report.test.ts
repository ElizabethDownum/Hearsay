import { runMonteCarlo } from '../../src/harness/montecarlo';
import { blitzCrier, patientWhisperer, cannyWhisperer } from '../../src/bots/archetypes';
import { worldFromTown } from '../../src/world/attach';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';

const gen = (seed: string): ReturnType<typeof generateValidTown>['town'] =>
  generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES,
    { knownTraitIds: Object.keys(TRAITS) }).town;
const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

describe('procgen pacing probe (npm run mc)', () => {
  // Probe 1 — trait-aware bots, pre-saturation. Re-swept for Plan 6's 14-trait pool (P4-T4
  // 8-seed sweep over probe-town-1..8, run BEFORE re-pinning): the trait-draw reshape moved the
  // gatekeeper geometry. probe-town-5's old hub 'griffin' now draws
  // [moralizer,dramatist,partisan,relocator] — no longer a gatekeeper, so canny≈patient there
  // (it becomes the non-gatekeeper equivalence town for probes 2–3). The ONE divergent
  // gatekeeper-hub town in the sweep is probe-town-2, whose best-connected hub 'enid' carries
  // [skeptic,minimizer] (retellGate requires-corroboration): patient strands the hop-zero whisper
  // at the gatekeeper (~1% reach), canny reads the trait and hands it to the non-gatekeeper
  // 'cosima' instead (~89% reach). Pinned here per the escalation license — the divergent town is
  // where "read the town" is worth measuring.
  const DIVERGENT = gen('probe-town-2');
  const SEEDS = ['mcg-1', 'mcg-2', 'mcg-3', 'mcg-4', 'mcg-5'];

  it('canny reads the town and clears the gatekeeper that strands the patient whisperer', { timeout: 30000 }, () => {
    const results = [patientWhisperer, cannyWhisperer, blitzCrier].map((bot) => {
      const r = runMonteCarlo({ fixture: DIVERGENT.fixture, rules: STANDARD_RULES, bot, seeds: SEEDS, days: 2 });
      console.log(`\n=== ${r.bot} · ${DIVERGENT.fixture.npcs.length} NPCs · ${SEEDS.length} seeds · 2 days ===`);
      console.log(`reach     mean ${pct(r.reach.mean)}  [${pct(r.reach.min)} .. ${pct(r.reach.max)}]`);
      console.log(`believers mean ${pct(r.believers.mean)}  [${pct(r.believers.min)} .. ${pct(r.believers.max)}]`);
      console.log(`claims    mean ${r.claims.mean.toFixed(1)}  [${r.claims.min} .. ${r.claims.max}]`);
      console.log(`halfTown  ${r.halfTown ? `mean ${r.halfTown.mean.toFixed(0)}  [${r.halfTown.min} .. ${r.halfTown.max}]` : '(no family crossed half the town)'}`);
      expect(r.believers.mean).toBeLessThanOrEqual(r.reach.mean); // believers ⊆ reach, always
      return r;
    });
    const [patient, canny] = results;
    // HYPOTHESIS (escalation license): patient hands hop zero to the skeptic 'enid' and
    // strands near 1%; canny hands it to the non-gatekeeper 'cosima' and clears the town. If this
    // fails structurally, STOP and report with the printed table — never widen seeds/days to force it.
    // Measured 2026-07 (14-trait pool): patient reach ~1%, canny reach ~89%.
    expect(canny!.reach.mean).toBeGreaterThan(patient!.reach.mean);
  });

  // Probe 2 — the butterfly at town scale, pre-saturation. Same fixture (probe-town-5, the
  // non-gatekeeper equivalence town after the Plan 6 re-sweep), two world seeds: the circle
  // shuffles diverge before saturation and mint a different claim count. Plan-3 measured this gap
  // on Testford (85 vs 248); here it stands as the town-scale metric.
  it('same fixture, different world seed → a different claim count (butterfly, 2 days)', () => {
    const town = gen('probe-town-5');
    const r = runMonteCarlo({ fixture: town.fixture, rules: STANDARD_RULES, bot: blitzCrier,
      seeds: ['wseed-1', 'wseed-2'], days: 2 });
    for (const s of r.perSeed) {
      console.log(`butterfly ${s.seed}: claims=${s.claimsTotal}, first-story halfTown=${s.families[0]?.halfTownTick ?? '-'}`);
    }
    console.log(`claims aggregate over 2 world seeds: mean ${r.claims.mean.toFixed(1)}  [${r.claims.min} .. ${r.claims.max}]`);
    expect(r.perSeed[0]!.claimsTotal).not.toBe(r.perSeed[1]!.claimsTotal);
  });

  // Probe 3 — enemy-active. worldFromTown wires the guard roster + town map, so the nightly
  // digest (Task 9) runs and turns the campaign's evidence into sketch features. Feature counts
  // are emergent (reported, not pinned); the assertion is that the machinery ran every seed.
  it('enemy-active: the nightly digest builds a sketch from the campaign it observes', { timeout: 30000 }, () => {
    const town = gen('probe-town-5');
    const r = runMonteCarlo({ makeWorld: (seed) => worldFromTown(town, seed), rules: STANDARD_RULES,
      bot: blitzCrier, seeds: ['es-1', 'es-2', 'es-3'], days: 4 });
    for (const s of r.perSeed) {
      console.log(`enemy ${s.seed}: sketchFeatures=${s.sketchCount}, decisions=${s.decisions}, claims=${s.claimsTotal}`);
    }
    console.log(`sketchFeatures aggregate: ${r.sketchFeatures ? `mean ${r.sketchFeatures.mean.toFixed(1)}  [${r.sketchFeatures.min} .. ${r.sketchFeatures.max}]` : 'null'}`);
    expect(r.sketchFeatures).not.toBeNull();            // observers present → sketch measured
    expect(r.perSeed.every((s) => s.decisions > 0)).toBe(true); // the digest ran nightly, every seed
  });
});
