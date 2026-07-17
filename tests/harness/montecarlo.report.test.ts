import { runMonteCarlo } from '../../src/harness/montecarlo';
import { patientWhisperer, blitzCrier } from '../../src/bots/archetypes';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';

const SEEDS = ['mc-1', 'mc-2', 'mc-3', 'mc-4', 'mc-5'];
const DAYS = 4;

describe('Monte Carlo report (npm run mc)', () => {
  it('runs both archetypes over the seed batch and prints the distribution table', { timeout: 30000 }, () => {
    const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;
    for (const bot of [patientWhisperer, blitzCrier]) {
      const r = runMonteCarlo({ fixture: TESTFORD, rules: STANDARD_RULES, bot, seeds: SEEDS, days: DAYS });
      console.log(`\n=== ${r.bot} · ${SEEDS.length} seeds · ${DAYS} days ===`);
      console.log(`reach     mean ${pct(r.reach.mean)}  [${pct(r.reach.min)} .. ${pct(r.reach.max)}]`);
      console.log(`believers mean ${pct(r.believers.mean)}  [${pct(r.believers.min)} .. ${pct(r.believers.max)}]`);
      for (const s of r.perSeed) {
        const f = s.families[0];
        console.log(`  ${s.seed}: ${s.families.length} stories, first story reach ${f ? pct(f.reach) : '-'}, halfTown @ ${f?.halfTownTick ?? '-'}`);
      }
      // sanity gates — a broken kernel shows up here before any human reads the table
      expect(r.reach.mean).toBeGreaterThan(0);
      expect(r.reach.max).toBeLessThanOrEqual(1);
      expect(r.believers.mean).toBeLessThanOrEqual(r.reach.mean);
      expect(r.perSeed).toHaveLength(SEEDS.length);
    }
  });
});
