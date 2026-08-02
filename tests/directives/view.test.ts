import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STANDARD_RULES } from '../../src/content/rules';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { ensureDirectiveState, issueDirectiveRecord } from '../../src/sim/directives/state';
import { directiveView } from '../../src/sim/directives/view';
import { stableStringify } from '../../src/sim/hash';
import { miniTown } from '../sim/helpers/minitown';
import type {
  DirectiveBrief, DirectiveDecisionProfile, DirectiveRecord,
} from '../../src/sim/directives/types';
import type { WorldState } from '../../src/sim/types';

/**
 * THE directive desk's epistemic selector (Plan 11 Task 13). Everything below proves the same
 * sentence from two sides: the ledger shows what the PLAYER authored plus what physically came
 * back, and NOTHING about delivery, interpretation, execution, allegiance, or the enemy.
 */

const brief = (over: Partial<DirectiveBrief> = {}): DirectiveBrief => ({
  mission: { kind: 'learn', target: { kind: 'person', id: 'cyn' } },
  priority: 'routine', authority: 'relationship', discretion: 'quiet',
  specificity: 'guided', guidance: [], active: { from: 0, until: 240 },
  report: 'outcome', reportBy: 120, purpose: null,
  ...over,
});

/** A world with a real roster and two REAL player directives issued through the real issuer. */
function fixture(seed = 'dv-1'): WorldState {
  const world = buildWorld(miniTown(), seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  for (const id of ['ada', 'bez', 'cyn']) {
    world.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.intel.informants.push({ id, assignedVenue: null });
  }
  world.tick = 0;
  issueDirectiveRecord(world, {
    principal: 'player', principalId: 'you', recipient: 'ada',
    handoff: { outboundVia: [], reportVia: ['bez'] }, brief: brief(), tick: 0, cause: null,
  });
  world.tick = 15;
  issueDirectiveRecord(world, {
    principal: 'player', principalId: 'you', recipient: 'bez',
    handoff: { outboundVia: ['cyn'], reportVia: [] },
    brief: brief({ reportBy: null, mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } } }),
    tick: 15, cause: null,
  });
  // An ENEMY-principal directive on the same substrate — the selector must never surface it.
  issueDirectiveRecord(world, {
    principal: 'enemy', principalId: 'cyn', recipient: 'dov',
    handoff: { outboundVia: [], reportVia: [] }, brief: brief({ purpose: 'enemy-only-purpose' }),
    tick: 15, cause: null,
  });
  world.tick = 0;
  return world;
}

const playerRecords = (world: WorldState): DirectiveRecord[] =>
  ensureDirectiveState(world).records.filter((record) => record.principal === 'player');

const PROFILE: DirectiveDecisionProfile = {
  interpretation: { kind: 'learn', target: { kind: 'person', id: 'dov' } },
  commitment: 'refuse', initiative: 'adaptive', risk: 'bold',
  method: { kind: 'hold' }, timing: { actAt: 30, reportAt: 45 },
  disclosure: { outcome: false, reason: false, evidence: false, source: false, uncertainty: false },
  candor: 'doctored',
};

/** Flip EVERY hidden dimension the constraints forbid the desk from reading. */
function flipHiddenState(world: WorldState): void {
  const state = ensureDirectiveState(world);
  for (const record of playerRecords(world)) {
    record.received = {
      tick: 30,
      version: {
        id: 'v-mutated', parent: record.authored.id, directiveId: record.id,
        brief: brief({
          priority: 'urgent', authority: 'compel', discretion: 'open', specificity: 'detailed',
          purpose: 'MUTATED-PURPOSE', reportBy: 999,
          mission: { kind: 'learn', target: { kind: 'person', id: 'dov' } },
        }),
        claimedIssuer: 'dov', replyRoute: ['dov'], changedBy: 'dov',
        changes: [{ field: 'purpose', from: null, to: 'MUTATED-PURPOSE' }],
      },
      handoffFrom: 'dov', messageId: 'm-mutated',
    };
    record.decision = PROFILE;
    record.execution = { state: 'aborted', changedAt: 45, dueAt: 60, waiting: null };
  }
  state.scrutiny.push({ observer: 'ada', principal: 'you', observedAt: 0, cause: 'confrontation' });
  for (const message of state.messages) {
    message.deliveredAt = 30;
    message.failedAt = 45;
    message.holder = 'dov';
    message.nextHop = 1;
  }
  for (const asset of world.network.assets) asset.turned = true;
  world.network.enemyAssets.push({
    id: 'dov', mice: 'coercion', wagePaidThroughDay: 3, strikes: 1, facts: [], turned: true,
  });
  world.enemy.sketch.push({
    id: 'sf-1', kind: 'carrier-profile', day: 1, family: null, subject: 'ada',
    district: 'd0', detail: 'the ghost uses a grocer',
    evidence: [{ tick: 0, observer: 'cyn', claimId: null, messageId: 'm0' }],
  });
}

describe('directiveView — the authored ledger is blind to every hidden dimension', () => {
  it('selects only player-principal rows, sorted by issuedAt then id', () => {
    const view = directiveView(fixture());
    expect(view.rows.map((row) => row.id)).toEqual(['d0', 'd1']);
    expect(view.rows.map((row) => row.recipient)).toEqual(['ada', 'bez']);
    expect(view.rows.map((row) => row.issuedAt)).toEqual([0, 15]);
    expect(stableStringify(view)).not.toContain('enemy-only-purpose');
    expect(stableStringify(view)).not.toContain('dov');
  });

  it('shows the AUTHORED brief and the player-known handoff, never the received version', () => {
    const world = fixture();
    const before = stableStringify(directiveView(world));
    flipHiddenState(world);
    const after = stableStringify(directiveView(world));
    expect(after).toBe(before);
    expect(after).not.toContain('MUTATED-PURPOSE');
    expect(after).not.toContain('aborted');
    expect(after).not.toContain('doctored');
  });

  it('the twin flip moves NOTHING: received/decision/execution/scrutiny/turned/enemy roster/sketch', () => {
    const clean = fixture('dv-twin');
    const flipped = fixture('dv-twin');
    flipHiddenState(flipped);
    expect(stableStringify(directiveView(flipped))).toBe(stableStringify(directiveView(clean)));
  });

  it('a physically received report changes ONLY the reports array', () => {
    const world = fixture('dv-report');
    const before = directiveView(world);
    expect(before.rows[0]!.reports).toEqual([]);

    playerRecords(world)[0]!.receivedReports.push({
      receivedAt: 60, via: 'bez',
      report: { outcome: 'saw cyn at the square', reason: null, evidence: null, source: 'ada', uncertainty: 'low' },
    });
    const after = directiveView(world);

    expect(after.rows[0]!.reports).toEqual([{
      receivedAt: 60, via: 'bez',
      report: { outcome: 'saw cyn at the square', reason: null, evidence: null, source: 'ada', uncertainty: 'low' },
    }]);
    // Every other field of every row is byte-identical — reports are the only delta.
    const strip = (v: ReturnType<typeof directiveView>) => stableStringify({
      rows: v.rows.map((row) => ({
        id: row.id, recipient: row.recipient, issuedAt: row.issuedAt,
        handoff: row.handoff, authored: row.authored, clock: row.clock,
      })),
    });
    expect(strip(after)).toBe(strip(before));
    expect(after.rows[0]!.clock).toBe(before.rows[0]!.clock); // a report never rewrites the clock
  });

  it('sorts reports by receivedAt then via', () => {
    const world = fixture('dv-report-order');
    const payload = { outcome: null, reason: null, evidence: null, source: null, uncertainty: null };
    playerRecords(world)[0]!.receivedReports.push(
      { receivedAt: 90, via: 'cyn', report: { ...payload, outcome: 'third' } },
      { receivedAt: 60, via: 'cyn', report: { ...payload, outcome: 'second' } },
      { receivedAt: 60, via: 'ada', report: { ...payload, outcome: 'first' } },
    );
    expect(directiveView(world).rows[0]!.reports.map((r) => r.report.outcome))
      .toEqual(['first', 'second', 'third']);
  });

  it('the clock crosses exact active→due→overdue boundaries on authored time alone', () => {
    const world = fixture('dv-clock');
    const clockOf = (tick: number, id: string): string => {
      world.tick = tick;
      return directiveView(world).rows.find((row) => row.id === id)!.clock;
    };
    // d0 authored reportBy=120 (its deadline), active.until=240.
    expect(clockOf(119, 'd0')).toBe('active');
    expect(clockOf(120, 'd0')).toBe('due');
    expect(clockOf(121, 'd0')).toBe('overdue');
    // d1 authored reportBy=null → the deadline falls back to active.until=240.
    expect(clockOf(239, 'd1')).toBe('active');
    expect(clockOf(240, 'd1')).toBe('due');
    expect(clockOf(241, 'd1')).toBe('overdue');
  });

  it('the clock is unmoved by execution completion or a returned report (authored time only)', () => {
    const world = fixture('dv-clock-2');
    world.tick = 119;
    expect(directiveView(world).rows[0]!.clock).toBe('active');
    const record = playerRecords(world)[0]!;
    record.execution = { state: 'completed', changedAt: 30, dueAt: null, waiting: null };
    record.receivedReports.push({
      receivedAt: 60, via: 'bez',
      report: { outcome: 'done', reason: null, evidence: null, source: null, uncertainty: null },
    });
    expect(directiveView(world).rows[0]!.clock).toBe('active');
    world.tick = 500;
    expect(directiveView(world).rows[0]!.clock).toBe('overdue');
  });

  it('returns DEEP COPIES — mutating a returned row never reaches the world', () => {
    const world = fixture('dv-copy');
    playerRecords(world)[0]!.receivedReports.push({
      receivedAt: 60, via: 'bez',
      report: { outcome: 'observed', reason: null, evidence: null, source: null, uncertainty: null },
    });
    const record = playerRecords(world)[0]!;
    const row = directiveView(world).rows[0]!;

    expect(row.authored).not.toBe(record.authored.brief);
    expect(row.handoff).not.toBe(record.handoff);
    expect(row.reports[0]).not.toBe(record.receivedReports[0]);

    row.authored.purpose = 'tampered';
    row.authored.guidance.push({ kind: 'avoid-person', person: 'dov' });
    row.handoff.reportVia.push('dov');
    row.reports[0]!.report.outcome = 'tampered';

    expect(record.authored.brief.purpose).toBeNull();
    expect(record.authored.brief.guidance).toEqual([]);
    expect(record.handoff.reportVia).toEqual(['bez']);
    expect(record.receivedReports[0]!.report.outcome).toBe('observed');
  });

  it('a world that never issued a directive yields an empty ledger (lazy state stays absent)', () => {
    const world = buildWorld(miniTown(), 'dv-empty', STANDARD_RULES);
    enrollPlayer(world, { home: 'square' });
    expect(directiveView(world)).toEqual({ rows: [] });
    expect(world.network.directiveState).toBeUndefined(); // the selector never materializes state
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural enforcement: the SOURCE of the selector and of every app file may not even NAME the
// hidden dimensions. A token scan is bypassable in general, but these are whole-name bans on a
// small, hand-written surface — and each one is proved to FIRE against an injected violation below.

const repoRoot = process.cwd();
const SELECTOR_FILE = join(repoRoot, 'src/sim/directives/view.ts');

/**
 * Normalize a source down to "the code that could actually REACH a field", so ONE word-bounded
 * pattern per forbidden name reports every common access form instead of one chosen spelling:
 *   1. comments out — prose is not a read (the jargon-scan precedent);
 *   2. computed access with a literal key rewritten to dotted form (`x['name']` ⇒ `x.name`), so the
 *      bracket spelling has become the dotted spelling before any pattern runs;
 *   3. string-literal TEXT out — player-facing copy is not a read either (main.tsx's ending card
 *      lawfully contains the sentence "The council turned on the usurper"). Template `${…}`
 *      expressions are CODE, so they survive step 3 and stay in scope for the patterns.
 * Order is load-bearing: (2) must run before (3), or a bracket key would be erased as a string
 * before it could be normalized into an access. After this pass `x.name`, `x['name']`, `{ name }`
 * and `{ name: alias }` are all, uniformly, a word-bounded occurrence of `name`.
 */
function scannableSource(src: string): string {
  const noComments = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m.startsWith('/*') ? ' ' : ''));
  const dotted = noComments.replace(/\[\s*(['"])([A-Za-z_$][\w$]*)\1\s*\]/g, '.$2');
  const codeOnlyTemplates = dotted.replace(
    /`(?:\\.|\$\{(?:[^{}]|\{[^{}]*\})*\}|[^`\\])*`/g,
    (tpl) => `\`${[...tpl.matchAll(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g)].map((m) => m[0]).join('')}\``,
  );
  return codeOnlyTemplates.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, "''");
}

/** One forbidden name, the single pattern that reports it, and the forms that pattern MUST report.
 *  Carrying the proofs on the prong itself makes the 1:1 pairing structural — a prong cannot be
 *  added without its firing evidence, and no index bookkeeping can drift. */
interface Prong { label: string; pattern: RegExp; violations: string[] }

/** The four access spellings a word-bounded name prong has to catch, given an owner expression. */
const accessForms = (owner: string, name: string): string[] => [
  `const a = ${owner}.${name};`,
  `const b = ${owner}['${name}'];`,
  `const { ${name} } = ${owner};`,
  `const { ${name}: alias } = ${owner};`,
];

const named = (label: string, owner: string, name: string, pattern = new RegExp(`\\b${name}\\b`)): Prong =>
  ({ label, pattern, violations: accessForms(owner, name) });

/** Fail-closed (the T11 convention): a source scan cannot follow an alias, so binding the world to
 *  anything but the canonical `world`, or reaching it with a computed key, is itself the failure —
 *  those forms must go RED rather than silently walk past the world-rooted prongs below. */
const WORLD_ALIAS_PRONGS: Prong[] = [
  {
    label: 'a destructured world (fail-closed: the scan cannot follow the alias)',
    pattern: /(?:const|let|var)\s*\{[^}]*\}\s*=\s*[\w.]*\bworld\b/,
    violations: ['const { network } = world;', 'const { npcs, beliefs } = session.world;'],
  },
  {
    label: 'a world bound under another name (fail-closed)',
    pattern: /(?:const|let|var)\s+(?!world\b)[A-Za-z_$][\w$]*\s*=\s*[\w.]*\.world\b/,
    violations: ['const w = session.world;', 'let hidden = this.world;'],
  },
  {
    label: 'a computed world reach (fail-closed)',
    pattern: /\bworld\s*\[/,
    violations: ['const a = world[key];'],
  },
];

/** Every hidden name the constraints forbid the DESK SELECTOR from reading. */
const FORBIDDEN_IN_SELECTOR: Prong[] = [
  named('received (the mutated version)', 'record', 'received'),
  named('decision', 'record', 'decision'),
  named('execution', 'record', 'execution'),
  named('turned', 'asset', 'turned'),
  named('enemyAssets', 'world.network', 'enemyAssets'),
  named('sketch', 'world.enemy', 'sketch'),
  named('perceivedScrutiny', 'row', 'perceivedScrutiny'),
  named('scrutiny', 'state', 'scrutiny'),
  named('recruitmentApproaches', 'state', 'recruitmentApproaches'),
  { label: 'enemyLinked (in any suffixed spelling)', pattern: /\benemyLinked/,
    violations: [...accessForms('row', 'enemyLinked'), 'const c = row.enemyLinkedAtDecision;'] },
  named('message transit (deliveredAt)', 'message', 'deliveredAt'),
  named('message transit (failedAt)', 'message', 'failedAt'),
  named('message transit (nextHop)', 'message', 'nextHop'),
  named('the message queue', 'state', 'messages'),
  named('heldObservations', 'state', 'heldObservations'),
  named('npcs (the roster behind the views)', 'world', 'npcs'),
  named('beliefs', 'world', 'beliefs'),
  ...WORLD_ALIAS_PRONGS,
];

describe('hidden-name source scan — the selector cannot name what it must not know', () => {
  const selectorSource = scannableSource(readFileSync(SELECTOR_FILE, 'utf8'));

  it('the scan is not vacuous: the selector source really was read', () => {
    expect(selectorSource).toMatch(/export function directiveView/);
    expect(selectorSource).toMatch(/receivedReports/); // the ONE lawful near-neighbour survives
  });

  it.each(FORBIDDEN_IN_SELECTOR)('never names $label', ({ pattern }) => {
    expect(pattern.test(selectorSource)).toBe(false);
  });

  it.each(FORBIDDEN_IN_SELECTOR)('FIRES: $label is reported in every access form', ({ pattern, violations }) => {
    expect(violations.length).toBeGreaterThan(0);
    for (const form of violations) {
      expect(pattern.test(scannableSource(form)), `must report the form: ${form}`).toBe(true);
    }
  });
});

/** Hidden names no APP file (composition root included) may reach for — in ANY access form, and
 *  whether the record is reached through the raw world or through an imported helper under an
 *  alias, which is why these are word-bounded NAME prongs and not dotted-path prongs. */
const FORBIDDEN_IN_APP: Prong[] = [
  named('the raw directive substrate', 'world.network', 'directiveState'),
  named('received (the mutated version)', 'record', 'received'),
  named('decision', 'record', 'decision'),
  named('execution', 'record', 'execution'),
  named('enemyAssets', 'world.network', 'enemyAssets'),
  named('sketch', 'world.enemy', 'sketch'),
  named('perceivedScrutiny', 'row', 'perceivedScrutiny'),
  named('turned', 'asset', 'turned'),
  named('evaluateReceivedBrief', 'engine', 'evaluateReceivedBrief'),
  named('heldObservations', 'state', 'heldObservations'),
  named('recruitmentApproaches', 'state', 'recruitmentApproaches'),
  named('the message queue', 'state', 'messages'),
  named('npcs (the roster behind the views)', 'world', 'npcs'),
  named('beliefs', 'world', 'beliefs'),
  named('inquiries', 'world', 'inquiries'),
  { label: 'the world roster behind NetworkView', pattern: /\bworld\s*\.\s*network\s*\.\s*assets\b/,
    violations: ['const a = world.network.assets;', "const b = world['network']['assets'];"] },
  ...WORLD_ALIAS_PRONGS,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('hidden-name source scan — no app surface reaches behind its selectors', () => {
  const appFiles = walk(join(repoRoot, 'app/src')).filter((f) => /\.tsx?$/.test(f));

  it('enumerates a real app surface including the new directive desk', () => {
    const rel = appFiles.map((f) => f.replace(/\\/g, '/'));
    expect(rel.some((f) => f.endsWith('app/src/panels/Directives.tsx'))).toBe(true);
    expect(rel.some((f) => f.endsWith('app/src/main.tsx'))).toBe(true);
    expect(appFiles.length).toBeGreaterThan(10);
  });

  it('the app scan is not vacuous: normalization leaves real code standing', () => {
    const main = scannableSource(readFileSync(join(repoRoot, 'app/src/main.tsx'), 'utf8'));
    expect(main).toMatch(/const world = session\.world;/);
    expect(main).toMatch(/directiveView\(world\)/);
  });

  it.each(FORBIDDEN_IN_APP)('no app file names $label', ({ label, pattern }) => {
    for (const file of appFiles) {
      const src = scannableSource(readFileSync(file, 'utf8'));
      expect(pattern.test(src), `${file.replace(/\\/g, '/')} names ${label}`).toBe(false);
    }
  });

  it.each(FORBIDDEN_IN_APP)('FIRES: $label is reported in every access form', ({ pattern, violations }) => {
    expect(violations.length).toBeGreaterThan(0);
    for (const form of violations) {
      expect(pattern.test(scannableSource(form)), `must report the form: ${form}`).toBe(true);
    }
  });

  // The exact coverage counterexamples the frontier review demonstrated against the old dotted-only
  // patterns: five real access forms the app scan walked straight past. Each is now pinned to the
  // prong that owns it, and the whole app prong list has to report it.
  it.each([
    ['received (the mutated version)', 'const { received } = record;'],
    ['decision', "const x = record['decision'];"],
    ['execution', 'const { execution: x } = record;'],
    ['turned', "const x = asset['turned'];"],
    ['the message queue', 'const { messages } = state;'],
  ])('FIRES: the form a dotted-only scan let through — %s', (label, form) => {
    const prong = FORBIDDEN_IN_APP.find((p) => p.label === label);
    expect(prong, `no app prong is labelled '${label}'`).toBeDefined();
    expect(prong!.pattern.test(scannableSource(form)), `still silent on: ${form}`).toBe(true);
  });
});
