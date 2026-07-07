import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WebViewPanel } from '../../app/src/panels/WebViewPanel';
import { Codex, type CodexDetailRow } from '../../app/src/panels/Codex';
import { DayPlanner } from '../../app/src/panels/DayPlanner';
import { VERB_TERM } from '../../app/src/input/actions';
import { newSession } from '../../app/src/loop/session';
import { TERMS } from '../../src/content/terms';
import { STANDARD_RULES } from '../../src/content/rules';
import { webView, type WebView } from '../../src/intel/web';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { venueAt, CIRCLE_SIZE } from '../../src/sim/agents';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import type { InjectSpec } from '../../src/sim/actions';
import type { IntelEntry } from '../../src/intel/types';
import type { PlayerView } from '../../src/sim/fieldwork';
import type { WorldState } from '../../src/sim/types';

// Static server-render (react-dom/server, no DOM, no browser) — the honest way to pin what a
// props-only panel puts on the page, per the no-UI-automation guardrail.
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => {};

// ── Review fix #1: EVERY touched principal wears the gilt checkmark — the usurper included ───────

const objectiveWeb = (touched: string[]): WebView => ({
  subject: { kind: 'objective', usurper: 'valentin', council: ['bea', 'cormac'] },
  families: [{ family: 'f6', versions: 1, entryIndexes: [0] }],
  spokes: [{ carrier: 'roderic', via: 'roderic', families: ['f6'], entryIndexes: [0] }],
  principalsTouched: touched,
});

describe('WebViewPanel — gilt checkmarks for touched principals (usurper first among them)', () => {
  it('a touched USURPER renders the gilt checkmark right after his name', () => {
    const page = html(createElement(WebViewPanel, { web: objectiveWeb(['valentin']), onSelectNpc: noop }));
    expect(page).toMatch(/<b>valentin<\/b><span class="badge badge-lock"[^>]*> ✓<\/span>/);
    expect(page.match(/badge badge-lock/g)).toHaveLength(1); // untouched council — no phantom marks
  });

  it('a touched council member gets the mark; an untouched usurper does not', () => {
    const page = html(createElement(WebViewPanel, { web: objectiveWeb(['bea']), onSelectNpc: noop }));
    expect(page).not.toMatch(/<b>valentin<\/b><span class="badge badge-lock"/);
    expect(page).toMatch(/bea<span class="badge badge-lock"[^>]*> ✓<\/span>/);
    expect(page.match(/badge badge-lock/g)).toHaveLength(1);
  });
});

// ── Review fix #5: the vermilion single-channel badge is a LOCK badge — locked rows only ─────────

describe('Codex — the single-channel badge renders only on a locked row', () => {
  const row = (over: Partial<CodexDetailRow>): CodexDetailRow => ({
    npc: 'ada', trait: 'exaggerator', hits: 2, locked: false,
    pairs: [{ family: 'f1', viaFrom: 'gale', viaTo: 'gale', changeCount: 1 }],
    singleChannelVia: 'gale', ...over,
  });

  it('pre-lock single-channel: NO vermilion badge — the row just counts toward its lock', () => {
    const page = html(createElement(Codex, { rows: [row({})] }));
    expect(page).not.toContain('badge-danger');
    expect(page).toContain('1 to lock'); // 2 hits shown honestly; the via-pair detail opens on click
  });

  it('locked single-channel: the badge names the sole channel', () => {
    const page = html(createElement(Codex, { rows: [row({ hits: 3, locked: true })] }));
    expect(page).toContain('badge-danger');
    expect(page).toContain('rests entirely on gale');
  });
});

// ── Review fix #2: the ask composer offers "family from board clusters | subject" ────────────────

const plannerView: PlayerView = {
  tick: 0,
  avatar: { id: 'you', venue: 'v1', circleMembers: ['ada'] },
  informants: [],
  occupantsByVenue: {},
  map: {
    venues: [{ id: 'v1', district: 'd0', access: 'public' }],
    directory: [{ id: 'ada', occupation: 'weaver', district: 'd0' }],
  },
  scenario: null,
};

describe('DayPlanner — family-based asking from board clusters', () => {
  it('with cluster families, the ask composer offers family mode (registered label) and the family ids', () => {
    const page = html(createElement(DayPlanner, {
      view: plannerView, paused: true, clusterFamilies: ['f6', 'f9'], onVerb: noop,
    }));
    expect(page).toContain(`>${TERMS['family']!.label}<`); // the mode option speaks registered language
    expect(page).toContain('>f6<');
    expect(page).toContain('>f9<');
  });

  it('with no clusters yet, only subject mode is offered', () => {
    const page = html(createElement(DayPlanner, {
      view: plannerView, paused: true, clusterFamilies: [], onVerb: noop,
    }));
    expect(page).not.toContain(`>${TERMS['family']!.label}<`);
  });
});

// ── Review fix #6: toasts speak registered language — every verb kind maps to a registered term ──

describe('VERB_TERM — every verb kind names a registered term', () => {
  it('each mapped term id resolves in TERMS (so the toast label lookup can never throw)', () => {
    for (const [kind, termId] of Object.entries(VERB_TERM)) {
      expect(TERMS[termId], `verb kind '${kind}' maps to unregistered term '${termId}'`).toBeDefined();
    }
  });
});

// ── RUN A re-verification (persistent): the usurper's checkmark renders from the LIVE fold ───────

/** Deterministic day-0 probe (session.test.ts's findCoCircle, compacted): a venue+beat where the
 *  avatar is guaranteed co-circled with >=1 non-observer npc — staging, never physics. */
function findCoCircle(world: WorldState, minNpcs: number): { venue: string; tick: number; npcs: EntityId[] } {
  const guardIds = new Set(world.enemy.observers.map((o) => o.id));
  const others = Object.values(world.npcs).filter((n) => n.id !== world.playerId);
  for (let t = CONVERSATION_BEAT; t < TICKS_PER_DAY; t += CONVERSATION_BEAT) {
    const byVenue = new Map<string, EntityId[]>();
    for (const n of others) {
      const v = venueAt(n, t, world.scheduleOverrides[n.id] ?? []);
      (byVenue.get(v) ?? byVenue.set(v, []).get(v)!).push(n.id);
    }
    for (const [venue, ids] of [...byVenue].sort(([a], [b]) => a.localeCompare(b))) {
      if (!world.venues[venue]) continue;
      if (ids.some((id) => guardIds.has(id))) continue;
      if (ids.length >= minNpcs && ids.length + 1 <= CIRCLE_SIZE) return { venue, tick: t, npcs: [...ids].sort() };
    }
  }
  throw new Error('probe: no co-circle venue found on day 0');
}

function damagingFamilies(log: readonly IntelEntry[]): Set<string> {
  const s = new Set<string>();
  for (const e of log) {
    if (e.kind === 'utterance' && e.family && e.reported
      && STANDARD_RULES.predicates[e.reported.predicate]?.valence === 'damaging') s.add(e.family);
  }
  return s;
}

describe('RUN A re-verified — seed cor-1, tell poison on the usurper, three days: the mark renders', () => {
  it('webView folds principalsTouched=[usurper] and WebViewPanel renders his gilt checkmark', () => {
    const session = newSession('cor-1');
    const usurper = session.world.scenario!.cast.usurper;
    const council = session.world.scenario!.cast.council;
    const spot = findCoCircle(session.world, 1);
    const spec: InjectSpec = {
      subject: usurper, predicate: 'poisoned', object: SOMEONE,
      count: null, severity: 5, place: null, attribution: SOMEONE,
    };
    session.submit({ kind: 'goTo', venue: spot.venue });
    session.advance(spot.tick - session.world.tick);
    session.submit({ kind: 'tell', to: spot.npcs[0]!, spec });
    session.advance(at(3, 0) - session.world.tick);

    const log = session.world.intel.log;
    const web = webView(log, { kind: 'objective', usurper, council }, damagingFamilies(log));
    expect(web.principalsTouched).toContain(usurper); // the fold — as narrated in the task report

    const page = html(createElement(WebViewPanel, { web, onSelectNpc: noop }));
    expect(page).toContain(`<b>${usurper}</b><span class="badge badge-lock"`); // …and now the RENDER
  });
});
