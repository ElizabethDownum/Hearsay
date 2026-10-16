import { ESLint, Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

// R48 (Astra M3): the no-omniscience fences keyed off EXTENSIONLESS specifiers only, so the
// ordinary TypeScript spelling `../sim/world.js` (which `moduleResolution` maps to `src/sim/world.ts`)
// crossed the intel and enemy boundaries without a single error. Both spellings must fire, for
// every banned module, in both subtrees; the panels fence (a `/**` glob) is the positive control
// that always caught the extension. Allowed modules stay allowed under either spelling.

async function importRulesFor(file: string): Promise<Linter.RulesRecord> {
  const cfg = await new ESLint().calculateConfigForFile(file);
  return { 'no-restricted-imports': (cfg.rules ?? {})['no-restricted-imports']! } as Linter.RulesRecord;
}

function violations(code: string, rules: Linter.RulesRecord): number {
  return new Linter().verify(code, { rules }).length;
}

const BANNED = ['types', 'world', 'step', 'agents', 'campaign'] as const;

describe('import fences fire on the .js spelling as well as the extensionless one (R48)', () => {
  it('intel: every banned engine module, relative and glob forms, both spellings', async () => {
    const rules = await importRulesFor('src/intel/board.ts');
    for (const mod of BANNED) {
      for (const ext of ['', '.js']) {
        expect(violations(`import { x } from '../sim/${mod}${ext}';`, rules), `../sim/${mod}${ext}`).toBeGreaterThan(0);
        expect(violations(`import { x } from '../../src/sim/${mod}${ext}';`, rules), `**/sim/${mod}${ext}`).toBeGreaterThan(0);
      }
    }
    expect(violations("import { Rules } from '../sim/rules';", rules)).toBe(0);
    expect(violations("import { Rules } from '../sim/rules.js';", rules)).toBe(0);
  }, 15000);

  it('enemy: every banned engine module, relative and glob forms, both spellings', async () => {
    const rules = await importRulesFor('src/sim/enemy/digest.ts');
    for (const mod of BANNED) {
      for (const ext of ['', '.js']) {
        expect(violations(`import { x } from '../${mod}${ext}';`, rules), `../${mod}${ext}`).toBeGreaterThan(0);
        expect(violations(`import { x } from '../../sim/${mod}${ext}';`, rules), `**/sim/${mod}${ext}`).toBeGreaterThan(0);
      }
    }
    expect(violations("import { Rules } from '../rules';", rules)).toBe(0);
    expect(violations("import { Rules } from '../rules.js';", rules)).toBe(0);
  }, 15000);

  it('panels (positive control): the fence already covered the extension', async () => {
    const rules = await importRulesFor('app/src/panels/Codex.tsx');
    expect(violations("import { buildWorld } from '../../../src/sim/world.js';", rules)).toBeGreaterThan(0);
    expect(violations("import { buildWorld } from '../../../src/sim/world';", rules)).toBeGreaterThan(0);
  }, 15000);
});
