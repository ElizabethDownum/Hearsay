// Validator soak (spec: "solvability invariants across thousands of generated seeds, nightly").
// Default: 150 seeds (runs inside `npm test`). Big batch, PowerShell:
//   $env:SOAK_SEEDS = '2000'; npm run soak; Remove-Item Env:SOAK_SEEDS
import { generateTown } from '../../src/world/gen';
import { validateTown } from '../../src/world/validate';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { TRAITS } from '../../src/content/traits';

const COUNT = Number(process.env.SOAK_SEEDS ?? 150);
const OPTS = { knownTraitIds: Object.keys(TRAITS) };

describe(`validator soak — ${COUNT} seeds`, () => {
  it('every seed serves a valid town within budget; prints the distribution', () => {
    const attempts: number[] = [];
    let firstTryFails = 0;
    const failCounts = new Map<string, number>();

    for (let i = 0; i < COUNT; i++) {
      const seed = `soak-${i}`;
      // first-attempt validity, measured separately (the serve loop hides it)
      const first = validateTown(generateTown(`${seed}#0`, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT), STANDARD_GEN_CONFIG, OPTS);
      if (!first.ok) {
        firstTryFails += 1;
        for (const f of first.failures) failCounts.set(f.invariant, (failCounts.get(f.invariant) ?? 0) + 1);
      }
      const served = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, OPTS);
      attempts.push(served.attempts);
      expect(validateTown(served.town, STANDARD_GEN_CONFIG, OPTS).ok).toBe(true); // belt and braces
    }

    const histogram = new Map<number, number>();
    for (const a of attempts) histogram.set(a, (histogram.get(a) ?? 0) + 1);
    const firstTryRate = (COUNT - firstTryFails) / COUNT;
    console.log(`\n=== validator soak · ${COUNT} seeds · ${STANDARD_GEN_CONFIG.npcCount} NPCs · ${STANDARD_GEN_CONFIG.districtCount} districts ===`);
    console.log(`first-try validity: ${(firstTryRate * 100).toFixed(1)}%`);
    console.log(`attempts histogram: ${[...histogram.entries()].sort(([x], [y]) => x - y).map(([k, v]) => `${k}→${v}`).join('  ')}`);
    if (failCounts.size > 0) {
      console.log(`first-try failures by invariant: ${[...failCounts.entries()].map(([k, v]) => `${k}:${v}`).join('  ')}`);
    }

    // HYPOTHESIS (escalation license applies): the standard config should mostly
    // validate first try. If the rate craters, the printed invariant counts say why —
    // report BLOCKED with them; do not lower the floor.
    expect(firstTryRate).toBeGreaterThanOrEqual(0.5);
  });
});
