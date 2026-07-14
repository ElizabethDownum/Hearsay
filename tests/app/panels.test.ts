import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WebViewPanel } from '../../app/src/panels/WebViewPanel';
import { Codex, type CodexDetailRow } from '../../app/src/panels/Codex';
import { DayPlanner } from '../../app/src/panels/DayPlanner';
import { Network } from '../../app/src/panels/Network';
import { Treasury } from '../../app/src/panels/Treasury';
import { VERB_TERM } from '../../app/src/input/actions';
import { newSession } from '../../app/src/loop/session';
import { TERMS } from '../../src/content/terms';
import { STANDARD_RULES } from '../../src/content/rules';
import { webView, type WebView } from '../../src/intel/web';
import { at } from '../../src/core/time';
import { venueOpensFor } from '../../src/sim/actions';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { InjectSpec } from '../../src/sim/actions';
import type { IntelEntry } from '../../src/intel/types';
import type { PlayerView, NetworkView } from '../../src/sim/fieldwork';
import type { Venue } from '../../src/sim/types';

const ECON = STANDARD_RULES.economy;

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
  station: 'noble',
  scenario: null,
};

describe('DayPlanner — requested local moment', () => {
  it('renders one request button, no local submit buttons, and props-fed offered names', () => {
    const page = html(createElement(DayPlanner, {
      view: plannerView, paused: true, coin: 20, economy: ECON, onVerb: noop,
      onRequestLocal: noop, offeredNames: ['ada', 'bez'], localPending: false,
    }));
    expect(page).toContain('aria-label="request local interaction"');
    expect(page).toContain('ada');
    expect(page).toContain('bez');
    expect(page).not.toContain('aria-label="submit tell"');
    expect(page).not.toContain('aria-label="submit ask"');
    expect(page).not.toContain('aria-label="submit sell"');
    expect(page).not.toContain('aria-label="submit recruit"');
  });
});

// ── Task 11: the Network roster panel — verdigris bars from bookkeeping, no trust number ─────────

describe('Network — the roster surface renders player-known bookkeeping only', () => {
  const netView: NetworkView = {
    assets: [
      { id: 'gale', mice: 'money', strikes: 2, wagePaidThroughDay: 3, requestedVenue: 'tavern-0', factsCount: 4, dispositionBar: 0.6 },
      { id: 'mira', mice: null, strikes: 0, wagePaidThroughDay: 6, requestedVenue: null, factsCount: 1, dispositionBar: 1 },
    ],
    drops: [{ id: 'drop-a', venue: 'square-0' }],
  };

  it('shows each asset id, its MICE handle label, the strike-derived bar, and the facts COUNT', () => {
    const page = html(createElement(Network, { view: netView }));
    expect(page).toContain('gale');
    expect(page).toContain(`>${TERMS['mice-money']!.label}<`);   // handle named through <Term>
    expect(page).toContain('width:60%');                         // the verdigris bar fill = strike proxy
    expect(page).toContain('2✗');                                // strikes shown as a colour-free channel
    expect(page).toContain('>4<');                               // facts COUNT, never the fact content
    expect(page).toContain(`>${TERMS['dossier']!.label}<`);      // a null-handle freebie reads "dossier"
  });

  it('lists dead drops and teaches the turncoat cross-check habit (no trust number anywhere)', () => {
    const page = html(createElement(Network, { view: netView }));
    expect(page).toContain('drop-a');
    expect(page).toContain(`>${TERMS['turncoat']!.label}<`);
    expect(page).not.toContain('trust:'); // trust is never surfaced as a number
  });

  it('an empty roster invites recruiting, without crashing', () => {
    const page = html(createElement(Network, { view: { assets: [], drops: [] } }));
    expect(page).toContain(`>${TERMS['verb-recruit']!.label}<`);
  });
});

// ── Task 11: the Treasury panel — coin, next stipend, the whole price list through <Term> ────────

describe('Treasury — coin and a visible price list, every row named', () => {
  it('shows the treasury, next stipend day, and priced verbs from the one economy table', () => {
    const page = html(createElement(Treasury, { coin: 17, stipendDay: 6, economy: ECON }));
    expect(page).toContain('17');                                   // coin on hand
    expect(page).toContain(`>${TERMS['stipend']!.label}<`);
    expect(page).toContain('day 6');                                // next stipend
    expect(page).toContain(`>${ECON.recruitCost.money}<`);          // recruit·money price
    expect(page).toContain(`>${ECON.salonEvent}<`);                 // host·salon price
    expect(page).toContain(`>${TERMS['brokerage']!.label}<`);       // the brokerage row exists
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

/** Deterministically stage a real offered circle around an enrolled reporting channel. */
function requestStagedPanelOffer() {
  const session = newSession('cor-1');
  const guards = new Set(session.world.enemy.observers.map((observer) => observer.id));
  const target = session.world.intel.informants.map((informant) => informant.id)
    .find((id) => !guards.has(id));
  expect(target).toBeDefined();
  const venue = 'panel-offer-room';
  session.world.venues[venue] = { id: venue, district: 'd0', access: 'public' };
  session.world.intel.informants.find((informant) => informant.id === target)!.assignedVenue = venue;
  session.world.scheduleOverrides[target!] = [{
    fromDay: 0, toDay: 1, from: 0, to: 1440, venue, source: 'vignette',
  }];
  session.submit({ kind: 'goTo', venue });
  session.advance(7);
  expect(session.requestLocalInteraction()).toEqual({ requestedFor: 15, refused: false });
  expect(session.advance(20)).toEqual({ advanced: 8, stopped: 'local-offer' });
  const offer = session.localOffer()!;
  expect(offer.circleMembers).toContain(target);
  return { session, offer, target: target! };
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
    const { session, offer, target } = requestStagedPanelOffer();
    const usurper = session.world.scenario!.cast.usurper;
    const council = session.world.scenario!.cast.council;
    const spec: InjectSpec = {
      subject: usurper, predicate: 'poisoned', object: SOMEONE,
      count: null, severity: 5, place: null, attribution: SOMEONE,
    };
    session.chooseLocal(offer.token, { kind: 'tell', to: target, spec });
    session.advance(1);
    expect(session.world.chronicle.some(
      (event) => event.kind === 'telling' && event.speaker === 'you' && event.addressedTo === target,
    )).toBe(true);
    expect(session.world.intel.log.some(
      (entry) => entry.kind === 'utterance' && entry.reported?.subject === usurper,
    )).toBe(false); // the operational informant has observed it, but has not reported yet
    session.advance(15); // next physical beat: target hands the held field report to the avatar
    expect(session.world.intel.log.some(
      (entry) => entry.kind === 'utterance' && entry.reported?.subject === usurper,
    )).toBe(true);
    session.advance(at(3, 0) - session.world.tick);

    const log = session.world.intel.log;
    const web = webView(log, { kind: 'objective', usurper, council }, damagingFamilies(log));
    expect(web.principalsTouched).toContain(usurper); // the fold — as narrated in the task report

    const page = html(createElement(WebViewPanel, { web, onSelectNpc: noop }));
    expect(page).toContain(`<b>${usurper}</b><span class="badge badge-lock"`); // …and now the RENDER
  });
});

// ── O8 (T11 Minor M-3): DayPlanner.canGo mirrors the engine's venueOpensFor (offer/gate parity) ──
// canGo re-derives the access law to grey doors; the engine (applyGoTo → venueOpensFor) is the real
// gate. This behavioral parity test renders the planner and checks that a door is OFFERED (a goTo
// button) iff the engine would open it — guarding the UI mirror against drift from the engine law.
describe('DayPlanner — canGo offers exactly the doors venueOpensFor opens (O8 parity)', () => {
  const testVenues: Venue[] = [
    { id: 'market', district: 'd0', access: 'public' },
    { id: 'safehouse', district: 'd0', access: 'private' },        // special-cased always-open
    { id: 'salon', district: 'd0', access: 'invitational' },       // noble's room
    { id: 'back-room-d0', district: 'd0', access: 'invitational' },// lowlife's room
    { id: 'guard-post', district: 'd0', access: 'invitational' },  // invitational, opens for neither
    { id: 'crypt', district: 'd0', access: 'private' },            // private, opens for neither
  ];

  const viewFor = (station: 'noble' | 'lowlife' | null): PlayerView => ({
    tick: 0,
    avatar: { id: 'you', venue: 'safehouse', circleMembers: [] },
    informants: [],
    occupantsByVenue: {},
    map: { venues: testVenues, directory: [] },
    station,
    scenario: null,
  });

  for (const station of [null, 'noble', 'lowlife'] as const) {
    it(`station=${station ?? 'null'}: every door's button/greyed state matches venueOpensFor`, () => {
      const page = html(createElement(DayPlanner, {
        view: viewFor(station), paused: true, coin: 100, economy: ECON, onVerb: noop,
        onRequestLocal: noop, offeredNames: [], localPending: false,
      }));
      for (const v of testVenues) {
        // Engine truth: pre-station (null) opens everything (P7 behavior); else the access law.
        const engineOpens = station === null ? true : venueOpensFor(station, v);
        // UI truth (the access-law section renders a goTo button `>id</button>` when open, else a
        // greyed `id — no standing` span). Both markers are unique to that section.
        const offeredAsButton = page.includes(`>${v.id}</button>`);
        const greyedAsSpan = page.includes(`${v.id} — no`);
        expect(offeredAsButton, `${station}/${v.id}: offered iff engine opens`).toBe(engineOpens);
        expect(greyedAsSpan, `${station}/${v.id}: greyed iff engine shuts`).toBe(!engineOpens);
      }
    });
  }
});
