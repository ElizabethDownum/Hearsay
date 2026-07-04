import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import { runCampaign, type Save } from '../../src/sim/campaign';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';

const OPTS = { knownTraitIds: Object.keys(TRAITS) };
const serve = (seed: string) => generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, OPTS);

describe('generateValidTown — fail → reroll, deterministically', () => {
  it('same seed → byte-identical served town and attempt count', () => {
    const a = serve('serve-1');
    const b = serve('serve-1');
    expect(stableStringify(a.town)).toBe(stableStringify(b.town));
    expect(a.attempts).toBe(b.attempts);
    expect(a.attempts).toBeLessThanOrEqual(STANDARD_GEN_CONFIG.maxAttempts);
  });

  it('different seeds → different towns', () => {
    expect(stableStringify(serve('serve-1').town)).not.toBe(stableStringify(serve('serve-2').town));
  });

  it('throws with the last failure report when the reroll budget is exhausted', () => {
    // an impossible contract: more keystones than NPCs can never validate
    const impossible = { ...STANDARD_GEN_CONFIG, npcCount: 8, keystoneCount: 9, maxAttempts: 2 };
    expect(() => generateValidTown('serve-3', impossible, STANDARD_GEN_CONTENT, OPTS))
      .toThrow(/exhausted 2 attempts[\s\S]*keystones-valid/);
  });
});

describe('a served town runs the sim kernel unchanged', () => {
  it('campaign replay on a generated town is hash-identical (determinism suite, procgen edition)', () => {
    const { town } = serve('serve-4');
    const save: Save = {
      seed: 'serve-4',
      log: [{
        tick: at(0, 8), kind: 'inject', target: town.keystones[0]!,
        spec: { subject: SOMEONE, predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: SOMEONE },
      }],
    };
    const w1 = runCampaign(town.fixture, STANDARD_RULES, save, at(2, 0));
    const w2 = runCampaign(town.fixture, STANDARD_RULES, save, at(2, 0));
    expect(hashWorld(w1)).toBe(hashWorld(w2));
    expect(w1.chronicle.length).toBeGreaterThan(0); // the inject record alone guarantees ≥1
  });
});
