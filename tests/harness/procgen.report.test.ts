import { runMonteCarlo } from '../../src/harness/montecarlo';
import { runBotCampaign } from '../../src/bots/runner';
import { blitzCrier, patientWhisperer } from '../../src/bots/archetypes';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import { stableStringify } from '../../src/sim/hash';

const SEEDS = ['mcg-1', 'mcg-2', 'mcg-3', 'mcg-4', 'mcg-5'];
const DAYS = 4;

describe('procgen pacing probe (npm run mc)', () => {
  const { town } = generateValidTown('probe-town', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT,
    { knownTraitIds: Object.keys(TRAITS) });

  it('runs both archetypes on a generated town; world-seed variance is visible in MC min/max', () => {
    const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;
    let varianceSeen = false;
    for (const bot of [patientWhisperer, blitzCrier]) {
      const r = runMonteCarlo({ fixture: town.fixture, rules: STANDARD_RULES, bot, seeds: SEEDS, days: DAYS });
      console.log(`\n=== ${r.bot} · generated town (${town.fixture.npcs.length} NPCs) · ${SEEDS.length} seeds · ${DAYS} days ===`);
      console.log(`reach     mean ${pct(r.reach.mean)}  [${pct(r.reach.min)} .. ${pct(r.reach.max)}]`);
      console.log(`believers mean ${pct(r.believers.mean)}  [${pct(r.believers.min)} .. ${pct(r.believers.max)}]`);
      for (const s of r.perSeed) {
        const f = s.families[0];
        console.log(`  ${s.seed}: ${s.families.length} stories, first story reach ${f ? pct(f.reach) : '-'}, halfTown @ ${f?.halfTownTick ?? '-'}`);
      }
      expect(r.reach.mean).toBeGreaterThan(0);
      expect(r.believers.mean).toBeLessThanOrEqual(r.reach.mean);
      const halfTowns = new Set(r.perSeed.map((s) => s.families[0]?.halfTownTick ?? null));
      if (r.reach.min < r.reach.max || r.believers.min < r.believers.max || halfTowns.size > 1) varianceSeen = true;
    }
    // The Plan-2 carry-forward, made real: Testford saturated before its only >4 circle
    // formed; at 72 NPCs the circle shuffles must gate spread, so world-seed variance
    // shows up in the aggregates. HYPOTHESIS about an emergent system — if it fails,
    // STOP and report with the printed tables; never widen seeds/days/town size to force it.
    expect(varianceSeen).toBe(true);
  });

  // Vehicle is blitzCrier, not patientWhisperer (PROVISIONAL amendment, Task 8): on
  // 'probe-town', bestConnected[0] (rainald) is a skeptic — injections carry no
  // apparentSources and skeptics never retell uncorroborated stories, so the
  // whisperer's campaign dies at hop zero deterministically (1/72 reach, 0 tellings)
  // and CANNOT diverge across world seeds. A gatekeeper eating a trait-blind whisper
  // is the spec's design working; naive-bot-vs-gatekeeper is recorded as pacing data
  // for the Plan-4 trait-aware bot pass. The butterfly needs a campaign that
  // actually propagates.
  it('same fixture, different world seed → different campaign (butterfly at town scale)', () => {
    const a = runBotCampaign(town.fixture, STANDARD_RULES, 'wseed-1', blitzCrier, 2);
    const b = runBotCampaign(town.fixture, STANDARD_RULES, 'wseed-2', blitzCrier, 2);
    expect(stableStringify({ beliefs: a.world.beliefs, chronicle: a.world.chronicle }))
      .not.toBe(stableStringify({ beliefs: b.world.beliefs, chronicle: b.world.chronicle }));
    // Plan-2 watch item, now measured: claims-registry growth at MC scale.
    console.log(`claims minted over ${2} days (blitz-crier): wseed-1=${Object.keys(a.world.claims).length}, wseed-2=${Object.keys(b.world.claims).length}`);
  });
});
