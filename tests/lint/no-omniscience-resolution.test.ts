import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// R48-1 (R48 review M-1): the no-omniscience fences in eslint.config.js match import SPECIFIERS
// literally, so a spelling the patterns do not anticipate (`../../types` from a deeper enemy
// subdirectory, `./../world`, `../enemy/../world.js`, a dynamic `import()`) crosses the boundary
// with zero lint errors although it resolves to the very module the fence bans. This test closes
// every spelling at once: it resolves every module specifier under the two fenced subtrees with
// the TypeScript resolver, under the real tsconfig, and asserts that none lands on a WorldState
// module. The lint fence stays as the fast, message-bearing guard; this is the law behind it.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FENCED = ['src/sim/enemy', 'src/intel'] as const;
const BANNED = ['types', 'world', 'step', 'agents', 'campaign'].map((mod) =>
  path.resolve(ROOT, 'src', 'sim', `${mod}.ts`));

function compilerOptions(): ts.CompilerOptions {
  const configPath = path.resolve(ROOT, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  expect(error).toBeUndefined();
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);
  expect(parsed.errors).toEqual([]);
  return parsed.options;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Every module specifier a source text names: static imports, re-exports, and dynamic `import()`. */
function specifiers(file: string, source: string): string[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteralLike(arg)) found.push(arg.text);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
      && ts.isStringLiteral(node.moduleReference.expression)) {
      found.push(node.moduleReference.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The banned modules a file reaches, by resolved path, as `specifier -> resolved` pairs. */
function reaches(file: string, source: string, options: ts.CompilerOptions): Array<[string, string]> {
  return specifiers(file, source).flatMap((spec) => {
    const resolved = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule?.resolvedFileName;
    const target = resolved ? path.resolve(resolved) : '';
    return BANNED.includes(target) ? [[spec, path.relative(ROOT, target)] as [string, string]] : [];
  });
}

describe('no-omniscience law: nothing under the fenced subtrees RESOLVES to a WorldState module (R48-1)', () => {
  const options = compilerOptions();

  for (const subtree of FENCED) {
    it(`${subtree}: every specifier, in every spelling, resolved under the real tsconfig`, () => {
      const files = walk(path.resolve(ROOT, subtree));
      expect(files.length).toBeGreaterThan(0);
      const crossings = files.flatMap((file) =>
        reaches(file, fs.readFileSync(file, 'utf8'), options).map(([spec, target]) =>
          `${path.relative(ROOT, file)}: '${spec}' -> ${target}`));
      expect(crossings).toEqual([]);
    });
  }

  // Positive control: the spellings the lint fence misses (R48 review M-1, N-3) are all visible to
  // the resolver. These sources are never written to disk; the containing path only sets the
  // directory the resolver works from.
  it('sees the spellings the lint patterns do not (positive control)', () => {
    const cases: Array<[string, string, string]> = [
      ['src/sim/enemy/sub/x.ts', "import { x } from '../../types.js';", 'src/sim/types.ts'],
      ['src/sim/enemy/sub/x.ts', "import type { WorldState } from '../../world';", 'src/sim/world.ts'],
      ['src/sim/enemy/x.ts', "import { x } from './../world';", 'src/sim/world.ts'],
      ['src/sim/enemy/x.ts', "export { step } from '../enemy/../step.js';", 'src/sim/step.ts'],
      ['src/intel/x.ts', "import { x } from '../sim/./agents.js';", 'src/sim/agents.ts'],
      ['src/intel/deep/x.ts', "const m = import('../../sim/campaign');", 'src/sim/campaign.ts'],
    ];
    for (const [file, source, target] of cases) {
      const hits = reaches(path.resolve(ROOT, file), source, options);
      expect(hits.map(([, resolved]) => resolved), `${file}: ${source}`).toEqual([target.replace(/\//g, path.sep)]);
    }
    // And an allowed module under any spelling is not reported.
    expect(reaches(path.resolve(ROOT, 'src/sim/enemy/sub/x.ts'), "import { Rules } from '../../rules.js';", options)).toEqual([]);
  });
});
