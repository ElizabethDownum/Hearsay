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

describe('determinism law — new Plan-6 dirs are really covered by the src/sim/** globs', () => {
  // src/sim/scenario/** and src/sim/vignettes/** don't exist as real files yet at this
  // task's checkpoint (vignettes ships later), but calculateConfigForFile computes config
  // from the PATH's glob match alone (same pre-registration precedent as the intel/app laws
  // below) — so these probes prove the existing src/sim/**/*.ts globs really reach the new
  // subdirs, with no eslint.config.js edit needed or permitted.
  const newDirs = ['src/sim/scenario/probe.ts', 'src/sim/vignettes/probe.ts'];

  it.each(newDirs)('%s: Math.random() fires the entropy diagnostic', async (file) => {
    const rules = await determinismRulesFor(file);
    expect(violations('const x = Math.random();', rules)).toBeGreaterThan(0);
  }, 15000);

  it.each(newDirs)('%s: importing src/content/** fires the content-ban diagnostic', async (file) => {
    const rules = await importRulesFor(file);
    expect(violations("import { X } from '../../content/predicates';", rules)).toBeGreaterThan(0);
  }, 15000);

  it.each(newDirs)('%s: importing app/src/main fires the app-ban diagnostic', async (file) => {
    const rules = await importRulesFor(file);
    expect(violations("import { Y } from '../../../app/src/main';", rules)).toBeGreaterThan(0);
  }, 15000);
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

  // Same flat-config replacement lesson applies to the app-ban: src/sim/enemy/** matches both
  // the engine-wide headless-sim block and this block, so the app-ban group must be repeated
  // here too, or it silently goes dark for this subtree.
  it('still bans app imports under src/sim/enemy/** (headless-sim law survives the merge)', async () => {
    const cfg = await new ESLint().calculateConfigForFile('src/sim/enemy/digest.ts');
    const cfgRules = cfg.rules ?? {};
    const rules = { 'no-restricted-imports': cfgRules['no-restricted-imports']! } as Linter.RulesRecord;
    expect(violations("import main from '../../../app/src/main';", rules)).toBeGreaterThan(0);
  });
});

// These three laws are PRE-REGISTERED before any src/intel/ or app/ file exists (Plan-3/4
// precedent): calculateConfigForFile computes config from the PATH's glob match alone, so the
// probe fires even against hypothetical files. As above, snippets use plain value-import
// syntax — the bare Linter() has no TS parser, so `import type` would be a parse error, not a
// rule hit; no-restricted-imports keys off the module specifier regardless of the `type` modifier.
async function importRulesFor(file: string): Promise<Linter.RulesRecord> {
  const cfg = await new ESLint().calculateConfigForFile(file);
  return { 'no-restricted-imports': (cfg.rules ?? {})['no-restricted-imports']! } as Linter.RulesRecord;
}

describe('intel law — board-side intel never imports WorldState', () => {
  it('flags a WorldState import (relative and glob forms) but leaves Rules alone', async () => {
    const rules = await importRulesFor('src/intel/board.ts');
    expect(violations("import { WorldState } from '../sim/types';", rules)).toBeGreaterThan(0);
    expect(violations("import { WorldState } from '../../src/sim/world';", rules)).toBeGreaterThan(0);
    expect(violations("import { Rules } from '../sim/rules';", rules)).toBe(0);
  });

  it('still bans content imports under src/intel/** (the flat-config merge lesson holds)', async () => {
    const rules = await importRulesFor('src/intel/board.ts');
    expect(violations("import { predicates } from '../content/predicates';", rules)).toBeGreaterThan(0);
  });

  // src/intel/** is NOT covered by the engine-wide headless-sim block, so (per the same
  // flat-config replacement lesson) the app-ban group must be repeated in the intel block's
  // own rule value, or it never applies to this subtree.
  it('still bans app imports under src/intel/** (headless-sim law reaches board-side intel too)', async () => {
    const rules = await importRulesFor('src/intel/board.ts');
    expect(violations("import main from '../../app/src/main';", rules)).toBeGreaterThan(0);
  });
});

describe('panels law — presentation code receives props, never reaches into the sim', () => {
  it('flags a sim import for app/src/panels/**', async () => {
    const rules = await importRulesFor('app/src/panels/Board.tsx');
    expect(violations("import { step } from '../../../src/sim/step';", rules)).toBeGreaterThan(0);
    expect(violations("import { Row } from './parts';", rules)).toBe(0);
  });

  // The SAME panels-law block now also covers app/src/town/** (its `files` array gained the town
  // glob — no new block, same rule value). This prong proves the fence really reaches a town/ path:
  // a src/sim import from the town canvas fires the panels-law diagnostic, while local + assets +
  // the townview type-barrel imports the diagram legitimately uses stay clean.
  it('flags a sim import for app/src/town/** (fence extended over the town canvas)', async () => {
    const rules = await importRulesFor('app/src/town/TownCanvas.tsx');
    expect(violations("import { playerView } from '../../../src/sim/fieldwork';", rules)).toBeGreaterThan(0);
    expect(violations("import { buildTownMap } from '../../../src/sim/world';", rules)).toBeGreaterThan(0);
    expect(violations("import { computeLayout } from './layout';", rules)).toBe(0);
    expect(violations("import { resolveSlot } from '../assets';", rules)).toBe(0);
    // The type-barrel path (../townview) is unfenced — the diagram gets PlayerView/TownMap through
    // it without tripping the fence. (Plain-import syntax: the bare Linter() has no TS parser; the
    // rule keys off the specifier, not the `type` modifier.)
    expect(violations("import { PlayerView } from '../townview';", rules)).toBe(0);
  });
});

describe('headless-sim law — the engine never imports app/UI code', () => {
  it('flags an app import from a src engine file; the content ban survives alongside it', async () => {
    const rules = await importRulesFor('src/sim/step.ts');
    expect(violations("import main from '../../app/src/main';", rules)).toBeGreaterThan(0);
    expect(violations("import { predicates } from '../content/predicates';", rules)).toBeGreaterThan(0);
  });
});
