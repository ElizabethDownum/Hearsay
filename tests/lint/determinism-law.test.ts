import { ESLint, Linter } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { accessedName, assertParsed, chainNames, isAccess, unwrapNode } from '../helpers/callgraph';

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

function parseSource(src: string): ts.SourceFile {
  return ts.createSourceFile('probe.ts', src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
}

function normalizedStatementText(statement: ts.Statement, sourceFile: ts.SourceFile): string {
  return statement.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function hasExportModifier(statement: ts.Statement): boolean {
  return ts.canHaveModifiers(statement)
    && (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

function topLevelStatements(src: string, keyword: 'export' | 'import'): string[] {
  const sourceFile = parseSource(src);
  return sourceFile.statements
    .filter((statement) => keyword === 'import'
      ? ts.isImportDeclaration(statement)
      : ts.isExportDeclaration(statement) || ts.isExportAssignment(statement) || hasExportModifier(statement))
    .map((statement) => normalizedStatementText(statement, sourceFile));
}

function isEngineSpecifier(moduleSpecifier: ts.Expression): boolean {
  return ts.isStringLiteral(moduleSpecifier)
    && /(?:\/src\/sim\/|\/src\/world\/|\/src\/bots\/|\/src\/harness\/)/.test(moduleSpecifier.text);
}

function engineCrossings(src: string): string[] {
  const sourceFile = parseSource(src);
  return sourceFile.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      return isEngineSpecifier(statement.moduleSpecifier) && statement.importClause?.isTypeOnly !== true
        ? [normalizedStatementText(statement, sourceFile)]
        : [];
    }
    if (ts.isExportDeclaration(statement)) {
      return statement.moduleSpecifier && isEngineSpecifier(statement.moduleSpecifier) && !statement.isTypeOnly
        ? [normalizedStatementText(statement, sourceFile)]
        : [];
    }
    return [];
  });
}

function listFilesRecursive(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

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

describe('input hatch law — app/src/input/** crossings are type-only', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '../..');
  const inputRoot = path.join(repoRoot, 'app/src/input');
  const inputFiles = listFilesRecursive(inputRoot).filter((file) => /\.(ts|tsx)$/.test(file));

  it('enumerates the known input surface', () => {
    expect(inputFiles.map((file) => path.relative(repoRoot, file).replace(/\\/g, '/'))).toContain('app/src/input/actions.ts');
  });

  it.each(inputFiles.map((file) => path.relative(repoRoot, file).replace(/\\/g, '/')))('%s keeps engine crossings type-only', (relativeFile) => {
    const source = fs.readFileSync(path.join(repoRoot, relativeFile), 'utf8');
    for (const statement of engineCrossings(source)) {
      expect(statement).toMatch(/^(?:import|export)\s+type\b/);
    }
  });

  it('self-probes the crossing helper on legal, legal, and illegal forms', () => {
    expect(engineCrossings("import { step } from '../../../src/sim/step';"))
      .toEqual(["import { step } from '../../../src/sim/step';"]);
    expect(engineCrossings("import type { Action } from '../../../src/sim/campaign';"))
      .toEqual([]);
    expect(engineCrossings("import '../../../src/sim/step';"))
      .toHaveLength(1);
    // ASI bypass (the reviewed Important finding): the value import must be caught.
    expect(engineCrossings(
      "import type { Action } from '../../../src/sim/campaign'\nimport { step } from '../../../src/sim/step'\n",
    )).toEqual(["import { step } from '../../../src/sim/step'"]);
    // Multi-line value import fires.
    expect(engineCrossings("import {\n  step,\n} from '../../../src/sim/step';")).toHaveLength(1);
    // Multi-line type-only import is legal.
    expect(engineCrossings("import type {\n  Action,\n} from '../../../src/sim/campaign';")).toEqual([]);
    // Mixed clause is a VALUE import (isTypeOnly false) and must fire.
    expect(engineCrossings("import { type Action, step } from '../../../src/sim/step';")).toHaveLength(1);
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

// townview.ts is a barrel that sits at app/src/ — OUTSIDE both the panels/** and town/** globs
// the panels-law block fences (eslint.config.js). The prong above ("the type-barrel path
// (../townview) is unfenced") relies on that fact: it's how the fenced town canvas legally
// obtains PlayerView/TownMap by name. But "unfenced" cuts both ways — no eslint block ever
// inspects townview.ts's OWN exports or imports, so nothing stops a future edit from adding a
// runtime (VALUE) export or a value/side-effect import there. If that happened, any fenced
// town/ file importing '../townview' would receive an engine value with zero lint diagnostic —
// the fence would go dark exactly where it matters. This is a plain source-scan (no eslint
// involved) pinning townview.ts to a type-only surface, closing that hole without touching the
// fence's pinned rule value.
describe('townview law — the unfenced barrel can never smuggle an engine value', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '../..');
  const townviewSource = fs.readFileSync(path.join(repoRoot, 'app/src/townview.ts'), 'utf8');

  it('finds real export statements (the scan itself is not vacuous)', () => {
    expect(topLevelStatements(townviewSource, 'export').length).toBeGreaterThan(0);
  });

  it('every top-level export is `export type` — no export {, default, *, const/function/class/let/var', () => {
    for (const statement of topLevelStatements(townviewSource, 'export')) {
      expect(statement).toMatch(/^export\s+type\b/);
    }
  });

  it('every top-level import is `import type` — no side-effect, value, or dynamic import', () => {
    // townview.ts has zero import statements today (it only re-exports); this asserts the law
    // that WOULD bind the moment one is added — a bare `import '../../src/sim/x'` or a value
    // `import { x } from '...'` can't start with "import type" and so fails immediately.
    for (const statement of topLevelStatements(townviewSource, 'import')) {
      expect(statement).toMatch(/^import\s+type\b/);
    }
  });

  // Plan 11 Task 13 widened this barrel from 4 re-exports to the whole directive/composer type
  // surface, so the pin matters more than ever: prove it FIRES rather than merely that it passes.
  // These synthetic sources are run through the same `topLevelStatements` extractor the real scan
  // uses, so a regression in the extractor shows up here first.
  it('FIRES: a synthetic VALUE export / import through the barrel trips the pin', () => {
    const exportsOf = (src: string) => topLevelStatements(src, 'export');
    for (const smuggled of [
      "export { directiveView } from '../../src/sim/directives/view';",
      "export const BEAT = 15;",
      "export function directiveView() {}",
      "export default 1;",
      "export * from '../../src/sim/directives/view';",
      "export type { A } from './a'\nexport { b } from './b'\n",   // ASI bypass
    ]) {
      const statements = exportsOf(smuggled);
      expect(statements.length, `nothing extracted from: ${smuggled}`).toBeGreaterThan(0);
      expect(
        statements.some((statement) => !/^export\s+type\b/.test(statement)),
        `the pin missed a value export in: ${smuggled}`,
      ).toBe(true);
    }
    for (const smuggled of [
      "import { directiveView } from '../../src/sim/directives/view';",
      "import '../../src/sim/directives/view';",
      "import { type A, directiveView } from '../../src/sim/directives/view';",
    ]) {
      const statements = topLevelStatements(smuggled, 'import');
      expect(statements.length, `nothing extracted from: ${smuggled}`).toBeGreaterThan(0);
      expect(
        statements.some((statement) => !/^import\s+type\b/.test(statement)),
        `the pin missed a value import in: ${smuggled}`,
      ).toBe(true);
    }
    // …and the barrel's own legal forms stay clean under the very same extractor.
    expect(exportsOf("export type { DirectiveLedgerView } from '../../src/sim/directives/view';")
      .every((statement) => /^export\s+type\b/.test(statement))).toBe(true);
  });
});

describe('composition-root fence — only main.tsx + loop/** may import engine values', () => {
  // The fenced ZONE (any covered app/src module): a sim/world/bots/harness VALUE import fires; core
  // and content — the foundations the app legitimately uses — do not. (Pre-registered like the panels
  // law: calculateConfigForFile computes config from the path's glob match alone.)
  it('flags an engine-value import from a covered app module (assets.ts); leaves core alone', async () => {
    const rules = await importRulesFor('app/src/assets.ts');
    expect(violations("import { step } from '../../src/sim/step';", rules)).toBeGreaterThan(0);
    expect(violations("import { attachPlayer } from '../../src/world/attach';", rules)).toBeGreaterThan(0);
    expect(violations("import { fnv1a32 } from '../../src/core/rng';", rules)).toBe(0); // core is not the engine
    expect(violations("import { TERMS } from '../../src/content/terms';", rules)).toBe(0); // content is data
  });

  // Any covered app/src path that isn't one of the exempt seams is fenced — even one that doesn't
  // exist yet (the path's glob match is what computes the config).
  it('the fence reaches a hypothetical new app module', async () => {
    const rules = await importRulesFor('app/src/widgets/probe.tsx');
    expect(violations("import { WorldState } from '../../../src/sim/types';", rules)).toBeGreaterThan(0);
  });

  // The composition root and its substrate are EXEMPT — engine values are legal there by design.
  it('exempts the named composition root (main.tsx) and loop/**', async () => {
    const main = await new ESLint().calculateConfigForFile('app/src/main.tsx');
    expect(isOn(main.rules?.['no-restricted-imports'] ?? 'off')).toBe(false);
    const loop = await new ESLint().calculateConfigForFile('app/src/loop/session.ts');
    expect(isOn(loop.rules?.['no-restricted-imports'] ?? 'off')).toBe(false);
  });

  // The type-only seams are exempt (they cross by TYPE only, pinned type-only elsewhere) so the
  // specifier-keyed core rule can't false-fire on their legal `import type`/`export type`.
  it('exempts the type-only seams input/** and townview.ts', async () => {
    const input = await new ESLint().calculateConfigForFile('app/src/input/actions.ts');
    expect(isOn(input.rules?.['no-restricted-imports'] ?? 'off')).toBe(false);
    const barrel = await new ESLint().calculateConfigForFile('app/src/townview.ts');
    expect(isOn(barrel.rules?.['no-restricted-imports'] ?? 'off')).toBe(false);
  });
});

describe('headless-sim law — the engine never imports app/UI code', () => {
  it('flags an app import from a src engine file; the content ban survives alongside it', async () => {
    const rules = await importRulesFor('src/sim/step.ts');
    expect(violations("import main from '../../app/src/main';", rules)).toBeGreaterThan(0);
    expect(violations("import { predicates } from '../content/predicates';", rules)).toBeGreaterThan(0);
  });
});

/**
 * THE DETERMINISM FENCE, BINDING-AWARE (whole-branch finding I-4).
 *
 * THE SCAN'S CHARTER. The ESLint prongs above are SPELLING rules: `no-restricted-properties` matches
 * the literal receiver `Math`/`Date`, and `no-restricted-syntax` matches the literal callee name
 * `Date`. The reviewer ran the configured ESLint API against a deterministic-core filename and got:
 *
 *     Math.random()               -> diagnostic        globalThis.Math.random()    -> NONE
 *     Date.now()                  -> diagnostic        const D=Date; D.now()       -> NONE
 *     new Date()                  -> diagnostic        const C=Date; new C()       -> NONE
 *                                                      Reflect.construct(Date, []) -> NONE
 *
 * Semantically identical wall-clock and entropy calls could therefore be introduced while the
 * claimed fence stayed green. This layer answers the question a spelling rule cannot: *which
 * expressions in the deterministic core REACH `Math.random`, `Date.now`, or a zero-argument `Date`
 * construction, however they are spelled?*
 *
 * It resolves bindings IN-MODULE — `const M = Math`, `const { random } = Math`, `const r = Math.random`,
 * an alias of an alias, `globalThis.` qualification, static bracket keys, and the invocation helpers
 * `.call`/`.apply`/`.bind` read from a guarded callable — and reports a reach wherever it lands,
 * including a bare reference handed off as a callback and a reflective construction. A key only the
 * running program knows resolves to `.*` and is reported rather than skipped; a source the parser
 * only RECOVERED from is refused outright rather than scanned as clean.
 *
 * WHERE THE MANDATE LINE IS. Resolution stops at the module boundary. A deterministic-core file that
 * imports a helper which itself calls the wall clock is not visible here, and enumerating that class
 * would mean a whole-program analyzer. That residual is the accepted P11-13/P11-16 data-flow class:
 * this scan asserts everything resolvable and deliberately goes no further. The engine/content and
 * headless-sim import fences above are what bound which modules the core may reach at all.
 *
 * The ESLint prongs are KEPT, not replaced: they fire in the editor and in `npm run lint` at the
 * moment of typing, which a test-time scan cannot do. This layer is the completeness backstop.
 */
const DETERMINISTIC_ROOTS = [
  'src/core', 'src/sim', 'src/content', 'src/world', 'src/bots', 'src/harness',
];

/** A canonical reach: what an expression names once aliases and qualification are stripped. */
const GUARDED_CALLS = ['Math.random', 'Date.now'];
const GUARDED_CONSTRUCTOR = 'Date';
const REFLECTIVE = ['Reflect.construct', 'Reflect.apply'];

/**
 * `.call`, `.apply` and `.bind` are read FROM the callable they invoke, so a receiver chain resolves
 * straight through them: `Date.now.call(Date)` reaches `Date.now` and nothing else. Without this the
 * guarded access is skipped as an intermediate receiver while the outer access resolves to
 * `Date.now.call`, which is guarded nowhere — so `const D = Date; D.now.call(D)` was a direct clock
 * call invisible to both the ESLint spelling rules and this layer.
 */
const INVOCATION_HELPERS = ['call', 'apply', 'bind'];

/** Strip any chain of invocation helpers read from a guarded callable. */
function throughInvocationHelpers(reach: string): string {
  let current = reach;
  for (;;) {
    const helper = INVOCATION_HELPERS.find((name) => current.endsWith(`.${name}`));
    if (helper === undefined) return current;
    const callable = current.slice(0, -(helper.length + 1));
    if (!GUARDED_CALLS.includes(callable) && callable !== GUARDED_CONSTRUCTOR) return current;
    current = callable;
  }
}

interface EntropyReach {
  /** The canonical thing reached, e.g. `Math.random`, or `new Date` for a bare construction. */
  reach: string;
  /** How it was spelled, for the failure message. */
  text: string;
  line: number;
}

function buildAliases(file: ts.SourceFile): Map<string, string> {
  const aliases = new Map<string, string>();
  // A fixpoint: `const A = Math; const B = A; B.random()` needs the second pass to see the first.
  for (let pass = 0; pass < 4; pass += 1) {
    const before = aliases.size;
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
        const reach = reachOf(node.initializer, aliases);
        if (reach !== null) {
          if (ts.isIdentifier(node.name)) aliases.set(node.name.text, reach);
          else if (ts.isObjectBindingPattern(node.name)) {
            for (const element of node.name.elements) {
              const key = element.propertyName !== undefined
                ? (ts.isIdentifier(element.propertyName) || ts.isStringLiteral(element.propertyName)
                  ? element.propertyName.text : null)
                : (ts.isIdentifier(element.name) ? element.name.text : null);
              if (key !== null && ts.isIdentifier(element.name)) {
                aliases.set(element.name.text, `${reach}.${key}`);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    if (aliases.size === before) break;
  }
  return aliases;
}

/** The canonical global an expression reaches, or `null` when it reaches none. */
function reachOf(node: ts.Node, aliases: ReadonlyMap<string, string>): string | null {
  const target = unwrapNode(node);
  if (ts.isIdentifier(target)) {
    if (target.text === 'Math' || target.text === 'Date' || target.text === 'Reflect') return target.text;
    return aliases.get(target.text) ?? null;
  }
  if (isAccess(target)) {
    const base = reachOf(target.expression, aliases);
    if (base === null) {
      // `globalThis.Math` / `globalThis.Date` — the qualification names the same global.
      const chain = chainNames(target);
      const [root, next] = chain;
      return chain.length === 2 && root === 'globalThis'
        && (next === 'Math' || next === 'Date' || next === 'Reflect') ? next! : null;
    }
    const key = accessedName(target);
    return key === null ? `${base}.*` : `${base}.${key}`;
  }
  return null;
}

/** Type annotations name `Date` without reaching its value. */
function inTypePosition(node: ts.Node): boolean {
  for (let cursor: ts.Node | undefined = node; cursor !== undefined; cursor = cursor.parent) {
    if (ts.isTypeNode(cursor) || ts.isTypeAliasDeclaration(cursor) || ts.isInterfaceDeclaration(cursor)) {
      return true;
    }
  }
  return false;
}

function entropyReaches(source: string, fileName: string): EntropyReach[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assertParsed(file, 'the determinism scan');
  const aliases = buildAliases(file);
  const found: EntropyReach[] = [];
  const at = (node: ts.Node): EntropyReach => ({
    reach: '', text: node.getText(file).replace(/\s+/g, ' ').slice(0, 80),
    line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
  });

  const visit = (node: ts.Node): void => {
    // A zero-argument construction of whatever `Date` is called here — the wall clock made flesh.
    if (ts.isNewExpression(node) && (node.arguments?.length ?? 0) === 0
      && reachOf(node.expression, aliases) === GUARDED_CONSTRUCTOR) {
      found.push({ ...at(node), reach: 'new Date' });
    }
    // `Reflect.construct(Date, [])` / `Reflect.apply(Date.now, ...)` — construction by indirection.
    if (ts.isCallExpression(node)) {
      const callee = reachOf(node.expression, aliases);
      if (callee !== null && REFLECTIVE.includes(callee)) {
        const first = node.arguments[0];
        const subject = first === undefined ? null : reachOf(first, aliases);
        if (subject !== null
          && (subject === GUARDED_CONSTRUCTOR || GUARDED_CALLS.includes(subject) || subject.endsWith('.*'))) {
          found.push({ ...at(node), reach: `${callee}(${subject})` });
        }
      }
    }
    // Any expression that REACHES the guarded call — called, aliased, or handed off as a callback.
    if (ts.isIdentifier(node) || isAccess(node)) {
      const parent: ts.Node | undefined = node.parent;
      const isReceiver = parent !== undefined && isAccess(parent) && parent.expression === node;
      if (!isReceiver && !inTypePosition(node)) {
        const resolved = reachOf(node, aliases);
        const reach = resolved === null ? null : throughInvocationHelpers(resolved);
        if (reach !== null
          && (GUARDED_CALLS.includes(reach)
            || (reach.endsWith('.*') && (reach === 'Math.*' || reach === 'Date.*')))) {
          found.push({ ...at(node), reach });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function scanRoot(root: string): { files: number; reaches: (EntropyReach & { file: string })[] } {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '../..');
  const full = path.join(repoRoot, root);
  const files = listFilesRecursive(full).filter((file) => file.endsWith('.ts'));
  const reaches = files.flatMap((file) => {
    const relative = path.relative(repoRoot, file).replace(/\\/g, '/');
    return entropyReaches(fs.readFileSync(file, 'utf8'), relative)
      .map((reach) => ({ ...reach, file: relative }));
  });
  return { files: files.length, reaches };
}

const probe = (src: string): EntropyReach[] => entropyReaches(src, 'src/sim/probe.ts');

describe('determinism law — the AST layer sees qualified, aliased, and reflective spellings', () => {
  it.each(DETERMINISTIC_ROOTS)('%s carries the ESLint determinism rules the scan backs up', async (root) => {
    // The scan's roots are exactly the fenced globs — it can never drift off the law it completes.
    const cfg = await new ESLint().calculateConfigForFile(`${root}/probe.ts`);
    expect(isOn(cfg.rules?.['no-restricted-properties'])).toBe(true);
    expect(isOn(cfg.rules?.['no-restricted-syntax'])).toBe(true);
  }, 20000);

  it('the whole deterministic core is clean under the AST layer', () => {
    const all = DETERMINISTIC_ROOTS.flatMap((root) => scanRoot(root).reaches);
    expect(all.map((r) => `${r.file}:${r.line} ${r.reach} — ${r.text}`)).toEqual([]);
  });

  it('and the scan really read the core (it is not passing on an empty file set)', () => {
    const scanned = DETERMINISTIC_ROOTS.reduce((total, root) => total + scanRoot(root).files, 0);
    expect(scanned).toBeGreaterThan(50);
  });

  it.each([
    ['direct call', 'const x = Math.random();', 'Math.random'],
    ['qualified global', 'const x = globalThis.Math.random();', 'Math.random'],
    ['bracket key', "const x = Math['random']();", 'Math.random'],
    ['object alias', 'const M = Math; const x = M.random();', 'Math.random'],
    ['alias of an alias', 'const A = Math; const B = A; const x = B.random();', 'Math.random'],
    ['destructured member', 'const { random } = Math; const x = random();', 'Math.random'],
    ['function alias', 'const r = Math.random; const x = r();', 'Math.random'],
    ['callback hand-off', 'const xs = [1, 2].map(Math.random);', 'Math.random'],
    ['direct clock', 'const t = Date.now();', 'Date.now'],
    ['qualified clock', 'const t = globalThis.Date.now();', 'Date.now'],
    ['aliased clock', 'const D = Date; const t = D.now();', 'Date.now'],
    ['destructured clock', 'const { now } = Date; const t = now();', 'Date.now'],
    ['argless construction', 'const d = new Date();', 'new Date'],
    ['aliased construction', 'const C = Date; const d = new C();', 'new Date'],
    ['qualified construction', 'const d = new globalThis.Date();', 'new Date'],
    ['reflective construction', 'const d = Reflect.construct(Date, []);', 'Reflect.construct(Date)'],
    ['reflective aliased construction', 'const C = Date; const d = Reflect.construct(C, []);',
      'Reflect.construct(Date)'],
    ['reflective apply', 'const t = Reflect.apply(Date.now, Date, []);', 'Reflect.apply(Date.now)'],
    // Invocation helpers (finding I-4). `.call`/`.apply`/`.bind` are read FROM the callable, so the
    // receiver chain resolves through them: `D.now.call(D)` is a direct clock call spelled sideways.
    ['aliased clock through .call', 'const D = Date; const t = D.now.call(D);', 'Date.now'],
    ['aliased entropy through .call', 'const M = Math; const x = M.random.call(M);', 'Math.random'],
    ['clock through .bind', 'const D = Date; const f = D.now.bind(D); const t = f();', 'Date.now'],
    ['entropy through .apply', 'const x = Math.random.apply(Math, []);', 'Math.random'],
    ['qualified clock through .call', 'const t = globalThis.Date.now.call(Date);', 'Date.now'],
  ])('FIRES on %s', (_form, src, reach) => {
    expect(probe(src).map((found) => found.reach)).toContain(reach);
  });

  it.each([
    ['a seeded Date', 'const d = new Date(0);'],
    ['an aliased seeded Date', 'const C = Date; const d = new C(1755993600000);'],
    ['lawful Math helpers', 'const f = Math.floor(2.5); const m = Math.max(1, 2);'],
    ['lawful aliased Math helpers', 'const M = Math; const f = M.floor(2.5);'],
    ['Date.parse', "const p = Date.parse('2026-01-01');"],
    ['a Date TYPE annotation', 'function at(d: Date): Date { return d; }'],
    ['an unrelated object with its own random', 'const rng = makeRng(); const x = rng.random();'],
    ['an unrelated now', 'const clock = { now: () => 0 }; const t = clock.now();'],
    // The helper mapping resolves the CALLABLE it is read from, so it fires on a guarded one only.
    ['a non-guarded callable using .call',
      'const clock = { now: () => 0 }; const t = clock.now.call(clock);'],
    ['a lawful Math helper using .call', 'const f = Math.floor.call(Math, 2.5);'],
    ['a lawful Math helper using .apply', 'const m = Math.max.apply(Math, [1, 2]);'],
  ])('stays SILENT on %s', (_form, src) => {
    expect(probe(src)).toEqual([]);
  });

  it('a key only the running program knows fails closed rather than passing', () => {
    expect(probe('const key = pick(); const x = Math[key]();').map((f) => f.reach))
      .toContain('Math.*');
  });

  it('the scan refuses a source the parser only recovered from', () => {
    expect(() => probe('function broken( {')).toThrow(/could not parse/);
  });
});
