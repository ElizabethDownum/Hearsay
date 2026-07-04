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
  });

  it('leaves lawful code alone (new Date with args, Math.floor, Date.parse)', async () => {
    const rules = await determinismRulesFor('src/core/rng.ts');
    const clean = "const d = new Date(0); const f = Math.floor(2.5); const p = Date.parse('2026-01-01');";
    expect(violations(clean, rules)).toBe(0);
  });
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
  });

  const banned = ['src/sim/step.ts', 'src/bots/archetypes.ts', 'src/harness/metrics.ts', 'src/world/types.ts'];
  it.each(banned)('%s is banned from importing content', async (file) => {
    const cfg = await new ESLint().calculateConfigForFile(file);
    expect(isOn(cfg.rules?.['no-restricted-imports'])).toBe(true);
  });

  it('content itself may import anything; tests are outside the law', async () => {
    const content = await new ESLint().calculateConfigForFile('src/content/rules.ts');
    expect(isOn(content.rules?.['no-restricted-imports'] ?? 'off')).toBe(false);
    const test = await new ESLint().calculateConfigForFile('tests/sim/claim.test.ts');
    expect(isOn(test.rules?.['no-restricted-properties'] ?? 'off')).toBe(false);
  });
});
