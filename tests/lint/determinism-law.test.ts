import { ESLint, Linter } from 'eslint';

// The determinism law is only real if every prong PROVABLY fires. We pull the
// computed config for a real engine file (glob application included) and run
// its rules against violation snippets — red/green, end to end.

async function determinismRulesFor(file: string): Promise<Linter.RulesRecord> {
  const eslint = new ESLint();
  const cfg = await eslint.calculateConfigForFile(file);
  const rules = cfg.rules ?? {};
  return {
    'no-restricted-properties': rules['no-restricted-properties']!,
    'no-restricted-syntax': rules['no-restricted-syntax']!,
  } as Linter.RulesRecord;
}

function violations(code: string, rules: Linter.RulesRecord): number {
  return new Linter().verify(code, { rules }).length;
}

const isOn = (entry: unknown): boolean =>
  Array.isArray(entry) ? entry[0] === 2 || entry[0] === 'error' : entry === 2 || entry === 'error';

describe('determinism law — every prong fires (red) and clean code passes (green)', () => {
  it('bans Math.random / Date.now / argless new Date in engine code', async () => {
    const rules = await determinismRulesFor('src/core/rng.ts');
    expect(violations('const x = Math.random();', rules)).toBeGreaterThan(0);
    expect(violations('const t = Date.now();', rules)).toBeGreaterThan(0);
    expect(violations('const d = new Date();', rules)).toBeGreaterThan(0);
  }, 15000);

  it('leaves lawful code alone (new Date with args, Math.floor, Date.parse)', async () => {
    const rules = await determinismRulesFor('src/core/rng.ts');
    const clean = "const d = new Date(0); const f = Math.floor(2.5); const p = Date.parse('2026-01-01');";
    expect(violations(clean, rules)).toBe(0);
  }, 15000);
});

describe('determinism law — glob coverage', () => {
  const covered = [
    'src/core/rng.ts',
    'src/sim/step.ts',
    'src/content/rules.ts',
    'src/bots/archetypes.ts',   // live≡replay depends on bot entropy-freedom
    'src/harness/metrics.ts',   // and on harness entropy-freedom
    'src/world/types.ts',
  ];
  it.each(covered)('%s carries the determinism rules', async (file) => {
    const cfg = await new ESLint().calculateConfigForFile(file);
    expect(isOn(cfg.rules?.['no-restricted-properties'])).toBe(true);
    expect(isOn(cfg.rules?.['no-restricted-syntax'])).toBe(true);
  }, 15000);

  const banned = ['src/sim/step.ts', 'src/bots/archetypes.ts', 'src/harness/metrics.ts', 'src/world/types.ts'];
  it.each(banned)('%s is banned from importing content', async (file) => {
    const cfg = await new ESLint().calculateConfigForFile(file);
    expect(isOn(cfg.rules?.['no-restricted-imports'])).toBe(true);
  }, 15000);

  it('content itself may import anything; tests are outside the law', async () => {
    const content = await new ESLint().calculateConfigForFile('src/content/rules.ts');
    expect(isOn(content.rules?.['no-restricted-imports'] ?? 'off')).toBe(false);
    const test = await new ESLint().calculateConfigForFile('tests/sim/claim.test.ts');
    expect(isOn(test.rules?.['no-restricted-properties'] ?? 'off')).toBe(false);
  });
});

describe('no-omniscience law — the enemy never imports WorldState', () => {
  // Note: the bare Linter() here (like the rest of this file) has no TS parser, so these
  // probes use plain import syntax over the same paths `import type` would use in real code —
  // no-restricted-imports keys off the module specifier, not the `type` modifier.
  it('flags an import of WorldState (../types) but not Rules (../rules)', async () => {
    const cfg = await new ESLint().calculateConfigForFile('src/sim/enemy/digest.ts');
    const cfgRules = cfg.rules ?? {};
    const rules = { 'no-restricted-imports': cfgRules['no-restricted-imports']! } as Linter.RulesRecord;
    expect(violations("import { WorldState } from '../types';", rules)).toBeGreaterThan(0);
    expect(violations("import { Rules } from '../rules';", rules)).toBe(0);
  });

  // Flat config merges rules per matching block by REPLACING a repeated rule key wholesale,
  // not deep-merging its `patterns` array. src/sim/enemy/** matches both the engine/content-split
  // block and this block, so the content-ban pattern group must survive alongside the
  // no-omniscience group in the SAME rule config, or the engine/content-split law goes silently
  // dark for the whole src/sim/enemy/** subtree.
  it('still bans content imports under src/sim/enemy/** (engine/content split survives the merge)', async () => {
    const cfg = await new ESLint().calculateConfigForFile('src/sim/enemy/digest.ts');
    const cfgRules = cfg.rules ?? {};
    const rules = { 'no-restricted-imports': cfgRules['no-restricted-imports']! } as Linter.RulesRecord;
    expect(violations("import { PREDICATES } from '../../content/predicates';", rules)).toBeGreaterThan(0);
  });
});
