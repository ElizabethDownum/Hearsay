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

/** Comment text is prose, not a read — strip it (the jargon-scan precedent). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m.startsWith('/*') ? ' ' : ''));
}

/** Every hidden name the constraints forbid the DESK SELECTOR from reading. */
const FORBIDDEN_IN_SELECTOR: [string, RegExp][] = [
  ['.received (the mutated version)', /\.received\b/],
  ['.decision', /\.decision\b/],
  ['.execution', /\.execution\b/],
  ['.turned', /\.turned\b/],
  ['enemyAssets', /enemyAssets/],
  ['enemy.sketch', /enemy\s*\.\s*sketch/],
  ['perceivedScrutiny', /perceivedScrutiny/],
  ['scrutiny', /\bscrutiny\b/],
  ['recruitmentApproaches', /recruitmentApproaches/],
  ['enemyLinked', /enemyLinked/],
  ['message transit (deliveredAt)', /deliveredAt/],
  ['message transit (failedAt)', /failedAt/],
  ['message transit (nextHop)', /nextHop/],
  ['the message queue', /\.messages\b/],
  ['heldObservations', /heldObservations/],
  ['world.npcs', /world\s*\.\s*npcs/],
  ['world.beliefs', /world\s*\.\s*beliefs/],
];

describe('hidden-name source scan — the selector cannot name what it must not know', () => {
  const selectorSource = stripComments(readFileSync(SELECTOR_FILE, 'utf8'));

  it('the scan is not vacuous: the selector source really was read', () => {
    expect(selectorSource).toMatch(/export function directiveView/);
  });

  it.each(FORBIDDEN_IN_SELECTOR)('never names %s', (_label, pattern) => {
    expect(pattern.test(selectorSource)).toBe(false);
  });

  it('FIRES: an injected violation of every prong is caught (the scan is real)', () => {
    const injected = [
      'const a = record.received;', 'const b = record.decision;', 'const c = record.execution;',
      'const d = asset.turned;', 'world.network.enemyAssets', 'world.enemy.sketch',
      'perceivedScrutiny(world, a, b, c)', 'const s = scrutiny;', 'state.recruitmentApproaches',
      'row.enemyLinked', 'm.deliveredAt', 'm.failedAt', 'm.nextHop', 'state.messages',
      'state.heldObservations', 'world.npcs[id]', 'world.beliefs[id]',
    ];
    expect(injected).toHaveLength(FORBIDDEN_IN_SELECTOR.length);
    FORBIDDEN_IN_SELECTOR.forEach(([label, pattern], index) => {
      expect(pattern.test(injected[index]!), `${label} must fire on '${injected[index]}'`).toBe(true);
    });
  });
});

/** Hidden names no APP file (composition root included) may reach for. */
const FORBIDDEN_IN_APP: [string, RegExp][] = [
  ['the raw directive substrate', /directiveState/],
  ['enemyAssets', /enemyAssets/],
  ['enemy.sketch', /enemy\s*\.\s*sketch/],
  ['perceivedScrutiny', /perceivedScrutiny/],
  ['.turned', /\.turned\b/],
  ['evaluateReceivedBrief', /evaluateReceivedBrief/],
  ['heldObservations', /heldObservations/],
  ['recruitmentApproaches', /recruitmentApproaches/],
  ['world.npcs (the roster behind the views)', /world\s*\.\s*npcs/],
  ['world.beliefs', /world\s*\.\s*beliefs/],
  ['world.inquiries', /world\s*\.\s*inquiries/],
  ['world.network.assets', /world\s*\.\s*network\s*\.\s*assets/],
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

  it.each(FORBIDDEN_IN_APP)('no app file names %s', (label, pattern) => {
    for (const file of appFiles) {
      const src = stripComments(readFileSync(file, 'utf8'));
      expect(pattern.test(src), `${file.replace(/\\/g, '/')} names ${label}`).toBe(false);
    }
  });

  it('FIRES: each app prong catches its injected violation', () => {
    const injected = [
      'world.network.directiveState', 'world.network.enemyAssets', 'world.enemy.sketch',
      'perceivedScrutiny(w, a, b, 0)', 'asset.turned', 'evaluateReceivedBrief(x)',
      'state.heldObservations', 'state.recruitmentApproaches', 'world.npcs[id]?.name',
      'world.beliefs[id]', 'world.inquiries[id]', 'world.network.assets',
    ];
    expect(injected).toHaveLength(FORBIDDEN_IN_APP.length);
    FORBIDDEN_IN_APP.forEach(([label, pattern], index) => {
      expect(pattern.test(injected[index]!), `${label} must fire on '${injected[index]}'`).toBe(true);
    });
  });
});
