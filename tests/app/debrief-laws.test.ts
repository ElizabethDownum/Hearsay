import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ESLint } from 'eslint';
import { TERMS } from '../../src/content/terms';
import { resolveSlot, UI_GLYPHS } from '../../app/src/assets';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const PANELS = ['DebriefReading', 'DebriefThreads', 'DebriefTimeline', 'DebriefOverlay', 'DebriefEnding'];
const NEW_TERMS = ['terminal-debrief', 'artifact', 'forgery', 'seance', 'thread', 'timeline', 'overlay', 'phantom', 'lag',
  'debrief-epigraph', 'unrecorded', 'ambiguous', 'reported-account', 'actual-attention', 'claim-change', 'evidence-arrival', 'orphan-history'];
const parse = (source: string) => ts.createSourceFile('probe.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function terminalGateIssues(source: string): string[] {
  const file = parse(source); const calls: ts.CallExpression[] = []; const names: ts.Identifier[] = [];
  const consumers: (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === 'debriefView') names.push(node);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'debriefView') calls.push(node);
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === 'DebriefEnding') consumers.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const enclosingGate = (node: ts.Node): ts.IfStatement | null => {
    let child = node; let parent = child.parent;
    while (parent) {
      if (ts.isIfStatement(parent) && child === parent.thenStatement
        && parent.expression.getText(file).replace(/\s/g, '') === "status&&status!=='running'") return parent;
      child = parent; parent = child.parent;
    }
    return null;
  };
  const issues: string[] = [];
  if (calls.length !== 1) issues.push('exactly one fold call required');
  if (consumers.length !== 1) issues.push('exactly one terminal consumer required');
  if (names.length !== 2) issues.push('only the import and direct call may reference debriefView');
  if (!calls[0] || !consumers[0] || enclosingGate(calls[0]) === null
    || enclosingGate(calls[0]) !== enclosingGate(consumers[0])) issues.push('fold and payload must share the terminal then branch');
  if (!source.includes('const status = world.scenario?.status;')) issues.push('status must derive from the actual scenario');
  return issues;
}

describe('the actual terminal boundary and unchanged broad panel fence', () => {
  it('main contains exactly one guarded fold and one guarded payload consumer, with no alias references', () => {
    expect(terminalGateIssues(read('app/src/main.tsx'))).toEqual([]);
  });
  it('the same source check fires when the real fold is hoisted outside the terminal branch', () => {
    const source = read('app/src/main.tsx'); const call = '    const debrief = debriefView(world);';
    expect(source).toContain(call);
    const broken = source.replace(call, '').replace('  const status = world.scenario?.status;',
      '  const status = world.scenario?.status;\n  const debrief = debriefView(world);');
    expect(terminalGateIssues(broken)).toContain('fold and payload must share the terminal then branch');
  });
  it('the same source check rejects a second alias of the hidden fold', () => {
    expect(terminalGateIssues(read('app/src/main.tsx')+'\nconst leakedFold = debriefView;\n'))
      .toContain('only the import and direct call may reference debriefView');
  });
  it.each(PANELS)('the existing actual config bans value and type sim imports at %s.tsx', async (panel) => {
    const eslint = new ESLint({ cwd: root }); const filePath = path.join(root, 'app/src/panels/'+panel+'.tsx');
    for (const source of ["import { debriefView } from '../../../src/sim/debrief/index'; void debriefView;",
      "import type { DebriefView } from '../../../src/sim/debrief/index'; export type Props = DebriefView;"]) {
      const results = await eslint.lintText(source, { filePath });
      expect(results.flatMap((row) => row.messages).some((row) => row.ruleId === 'no-restricted-imports')).toBe(true);
    }
    const actual = await eslint.lintText(read('app/src/panels/'+panel+'.tsx'), { filePath });
    expect(actual.flatMap((row) => row.messages)).toEqual([]);
  }, 15000);
  it('the existing townview seam re-exports only erased types, including the complete debrief contract', () => {
    const valid = (source: string) => parse(source).statements.every((node) => ts.isExportDeclaration(node) && node.isTypeOnly);
    const source = read('app/src/townview.ts'); expect(source).toContain("export type { DebriefView } from '../../src/sim/debrief/index'");
    expect(valid(source)).toBe(true);
    expect(valid(source+"\nexport { debriefView } from '../../src/sim/debrief/index';")).toBe(false);
    expect(valid(source+"\nimport '../../src/sim/debrief/index';")).toBe(false);
  });
});

describe('registered terminal vocabulary and primitive asset fallbacks', () => {
  it('all new terms are registered once, with bounded truthful tooltip text', () => {
    const source = read('src/content/terms.ts');
    for (const id of NEW_TERMS) {
      expect(TERMS[id]?.id).toBe(id); expect(TERMS[id]!.short.length).toBeGreaterThan(0); expect(TERMS[id]!.short.length).toBeLessThanOrEqual(120);
      const pattern = new RegExp('[\'\"]'+id+'[\'\"]\\s*:', 'g');
      expect([...source.matchAll(pattern)]).toHaveLength(1);
    }
    expect(TERMS['debrief']!.short).toContain('Compelling your own asset');
    expect(TERMS['terminal-debrief']!.short).toContain('campaign has ended');
    expect(TERMS['debrief-epigraph']!.label).toBe('what can happen, not what will happen');
    expect(TERMS.phantom!.short).toContain('missing history does not prove it');
  });
  it('every new slot is documented, null and resolvable, with a nonempty glyph or flat paper fallback', () => {
    const manifest = JSON.parse(read('assets/manifest.json')) as { slots: Record<string, unknown> };
    for (const id of ['icon.ui.letter', 'icon.ui.forgery-quill', 'icon.ui.seance', 'texture.paper.debrief']) {
      expect(manifest.slots[id]).toBeNull(); expect(resolveSlot(id)).toEqual({ kind: 'fallback' });
      expect(read('docs/asset-slots.md')).toContain('`'+id+'`'); expect(read('app/src/main.tsx')).toContain("resolveSlot('"+id+"')");
    }
    for (const id of ['letter', 'forgery-quill', 'seance', 'scrying']) expect(UI_GLYPHS[id]!.length).toBeGreaterThan(0);
    expect(manifest.slots['icon.ui.scrying']).toBeNull();
    expect(read('app/src/theme.css')).toContain('background-color: var(--paper)');
  });
});

// This bounded solid-color calculation reads the actual stylesheet. It is not a
// browser cascade/layout substitute; unsupported color syntax fails explicitly.
type ContrastRule = { selectors: string[]; declarations: [string, string][]; order: number };
function contrastRules(source: string): ContrastRule[] {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match, order) => ({
    selectors: match[1]!.split(',').map((value) => value.trim()), order,
    declarations: match[2]!.split(';').map((value) => value.trim()).filter(Boolean).map((value) => {
      const colon = value.indexOf(':'); if (colon < 1) throw new Error('Unsupported CSS declaration: '+value);
      return [value.slice(0, colon).trim(), value.slice(colon + 1).trim()] as [string, string];
    }),
  }));
}
function contrastDeclarations(rules: ContrastRule[], selectors: string[]): Record<string, string> {
  const selected = rules.flatMap((rule) => {
    const matches = rule.selectors.filter((selector) => selectors.includes(selector));
    return matches.length === 0 ? [] : [{ ...rule, specificity: Math.max(...matches.map((selector) =>
      (selector.match(/\./g) ?? []).length)) }];
  }).sort((left, right) => left.specificity - right.specificity || left.order - right.order);
  if (selected.length === 0) throw new Error('Actual CSS selector missing: '+selectors.join(', '));
  return Object.fromEntries(selected.flatMap((rule) => rule.declarations.map(([property, value]) =>
    [property === 'background' ? 'background-color' : property, value])));
}
function actualContrast(theme: 'light' | 'dark', surface: 'inline' | 'exact'): number {
  const rules = contrastRules(read('app/src/theme.css'));
  const palette = contrastDeclarations(rules, [":root[data-theme='"+theme+"']"]);
  const automaticPalettes = rules.filter((rule) => rule.selectors.includes(':root'));
  expect(automaticPalettes).toHaveLength(2);
  const automatic = Object.fromEntries(automaticPalettes[theme === 'light' ? 0 : 1]!.declarations);
  for (const token of ['--ink', '--paper', '--gilt']) expect(palette[token]).toBe(automatic[token]);
  const style = contrastDeclarations(rules, surface === 'inline'
    ? ['.debrief-change', '.debrief-desk .debrief-change'] : ['.diff-cell', '.debrief-desk .diff-cell']);
  const hex = (value: string | undefined): string => {
    if (value === undefined) throw new Error('Actual text color/background is unspecified');
    const variable = /^var\((--[\w-]+)\)$/.exec(value);
    const resolved = variable ? palette[variable[1]!] : value;
    if (resolved === undefined || !/^#[0-9a-f]{6}$/i.test(resolved)) throw new Error('Unsupported actual color: '+value);
    return resolved;
  };
  const luminance = (value: string): number => {
    const rgb = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  };
  const foreground = luminance(hex(style.color)); const background = luminance(hex(style['background-color']));
  return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
}
describe('terminal changed words and exact values retain actual theme contrast', () => {
  it.each([
    { theme: 'light', surface: 'inline' }, { theme: 'dark', surface: 'inline' },
    { theme: 'light', surface: 'exact' }, { theme: 'dark', surface: 'exact' },
  ] as const)('$theme $surface text meets normal-text contrast from actual CSS tokens and selectors', ({ theme, surface }) => {
    const ratio = actualContrast(theme, surface);
    expect(ratio, theme+' '+surface+' actual contrast ratio '+ratio).toBeGreaterThanOrEqual(4.5);
  });
  it('the narrow-viewport comparison table scrolls instead of breaking words mid-character', () => {
    const source = read('app/src/theme.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const narrow = /@media \(max-width: 600px\) \{(.*)\}/.exec(source)?.[1];
    if (narrow === undefined) throw new Error('Actual narrow-viewport block missing');
    expect(contrastDeclarations(contrastRules(source), ['.debrief-card'])['overflow-wrap']).toBe('anywhere');
    const rules = contrastRules(narrow);
    expect(contrastDeclarations(rules, ['.debrief-card .board-table'])).toMatchObject({ display: 'block', 'overflow-x': 'auto' });
    for (const cell of ['th', 'td']) expect(contrastDeclarations(rules, ['.debrief-card .board-table '+cell])['overflow-wrap']).toBe('normal');
  });
  it('the shared live-panel changed-value primitive keeps its original color treatment', () => {
    const shared = contrastDeclarations(contrastRules(read('app/src/theme.css')), ['.diff-cell']);
    expect(shared).toMatchObject({ 'background-color': 'var(--gilt)', color: 'var(--paper)', 'font-weight': '600' });
  });
});
