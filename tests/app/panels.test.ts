import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WebViewPanel } from '../../app/src/panels/WebViewPanel';
import { Codex, type CodexDetailRow } from '../../app/src/panels/Codex';
import {
  DayPlanner, directiveIntentFrom, directiveIssues, defaultDirectiveDraft,
  missionDraftFor, standardMissionFor,
  type DirectiveDraft, type DirectiveMissionDraft,
} from '../../app/src/panels/DayPlanner';
import { Directives } from '../../app/src/panels/Directives';
import { Network } from '../../app/src/panels/Network';
import { Treasury } from '../../app/src/panels/Treasury';
import { TownCanvas } from '../../app/src/town/TownCanvas';
import { computeLayout } from '../../app/src/town/layout';
import { VERB_TERM } from '../../app/src/input/actions';
import { newSession, type LocalOffer } from '../../app/src/loop/session';
import { TERMS } from '../../src/content/terms';
import { STANDARD_RULES } from '../../src/content/rules';
import { webView, type WebView } from '../../src/intel/web';
import { boardView } from '../../src/intel/board';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import {
  applyAssignInformant, applyCourier, applyDirective, applyMeet, venueOpensFor,
} from '../../src/sim/actions';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import { blankIntel, playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
import { directiveView } from '../../src/sim/directives/view';
import { applicationOf } from '../../src/sim/directives/types';
import { ensureDirectiveState } from '../../src/sim/directives/state';
import { recruitmentHistoryView, type RecruitmentHistoryRow } from '../../src/sim/network/recruitment';
import { stableStringify } from '../../src/sim/hash';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { InjectSpec } from '../../src/sim/actions';
import type { IntelEntry } from '../../src/intel/types';
import type { PlayerView, NetworkView } from '../../src/sim/fieldwork';
import type { DirectiveBrief } from '../../src/sim/directives/types';
import type { TownFixture, Venue, WorldState } from '../../src/sim/types';

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

/** The T13 planner props that are not about the local moment. Spread, then override. */
const plannerBase = {
  paused: true, coin: 200, economy: ECON, onVerb: noop, onRequestLocal: noop,
  localPending: false, onLocal: noop,
  net: { assets: [], drops: [] } as NetworkView,
  board: boardView([], 1, STANDARD_RULES),
};

describe('DayPlanner — requested local moment', () => {
  // MIGRATED from the Task-4 shape (`offeredNames: string[]`) to the Task-13 shape (`offer:
  // LocalOffer | null`). Same law under test — the request button is the only local control until a
  // real offer exists — now stated against the token-bearing offer the session actually returns.
  it('with NO offer: one request button, and not one local submit control anywhere', () => {
    const page = html(createElement(DayPlanner, {
      ...plannerBase, view: plannerView, offer: null,
    }));
    expect(page).toContain('aria-label="request local interaction"');
    expect(page).not.toContain('aria-label="local moment"');
    for (const label of ['submit tell', 'submit ask', 'submit sell', 'submit recruit',
      'submit debrief', 'submit host', 'submit directive',
      'preset posting', 'preset courier', 'preset rendezvous']) {
      expect(page, `an offer-less planner must not render "${label}"`).not.toContain(`aria-label="${label}"`);
    }
  });

  it('with an offer: the local surface appears and lists the frozen circle by id', () => {
    const page = html(createElement(DayPlanner, {
      ...plannerBase, view: plannerView,
      offer: { tick: 0, venue: 'v1', circleMembers: ['ada', 'bez'], token: 't#0' },
    }));
    expect(page).toContain('aria-label="local moment"');
    expect(page).toContain('ada');
    expect(page).toContain('bez');
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
    const page = html(createElement(Network, { view: netView, history: [] }));
    expect(page).toContain('gale');
    expect(page).toContain(`>${TERMS['mice-money']!.label}<`);   // handle named through <Term>
    expect(page).toContain('width:60%');                         // the verdigris bar fill = strike proxy
    expect(page).toContain('2✗');                                // strikes shown as a colour-free channel
    expect(page).toContain('>4<');                               // facts COUNT, never the fact content
    expect(page).toContain(`>${TERMS['dossier']!.label}<`);      // a null-handle freebie reads "dossier"
  });

  it('lists dead drops and teaches the turncoat cross-check habit (no trust number anywhere)', () => {
    const page = html(createElement(Network, { view: netView, history: [] }));
    expect(page).toContain('drop-a');
    expect(page).toContain(`>${TERMS['turncoat']!.label}<`);
    expect(page).not.toContain('trust:'); // trust is never surfaced as a number
  });

  it('an empty roster invites recruiting, without crashing', () => {
    const page = html(createElement(Network, { view: { assets: [], drops: [] }, history: [] }));
    expect(page).toContain(`>${TERMS['verb-recruit']!.label}<`);
  });

  // ── Task 13: "Requested post is not operational post" + the public approach history ────────────
  it('labels the authored post column "Requested post" — never assigned/active/attending', () => {
    const page = html(createElement(Network, { view: netView, history: [] }));
    expect(page).toContain('Requested post');
    for (const forbidden of ['assigned', 'Assigned', 'attending', 'Attending', 'active post']) {
      expect(page, `the roster must not say "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('renders the PUBLIC approach history and never decorates loyalty/reliability/risk/reason', () => {
    const history: RecruitmentHistoryRow[] = [
      { tick: 15, venue: 'square', recruiter: 'you', target: 'eve', stage: 'approach', response: null, via: 'self' },
      { tick: 45, venue: 'square', recruiter: 'you', target: 'eve', stage: 'answer', response: 'hesitate', via: 'self' },
    ];
    const page = html(createElement(Network, { view: netView, history }));
    expect(page).toContain('eve');
    // The three lawful response words, and nothing that grades the person.
    expect(page).toMatch(/asks for time|accept|refuse/);
    for (const forbidden of ['loyal', 'Loyal', 'reliab', 'Reliab', 'risk', 'Risk',
      'eligib', 'Eligib', 'compromis', 'Compromis', 'because']) {
      expect(page, `approach history must not decorate "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('a hesitation reads "asks for time" — never a grade, never a reason', () => {
    const history: RecruitmentHistoryRow[] = [
      { tick: 15, venue: 'square', recruiter: 'you', target: 'eve', stage: 'approach', response: null, via: 'self' },
      { tick: 45, venue: 'square', recruiter: 'you', target: 'eve', stage: 'answer', response: 'hesitate', via: 'gale' },
    ];
    const page = html(createElement(Network, { view: { assets: [], drops: [] }, history }));
    expect(page).toContain('asks for time');
    expect(page).toContain('gale'); // the delivering channel is lawful provenance
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
        ...plannerBase, view: viewFor(station), offer: null,
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// Plan 11 Task 13 — the directive desk and the epistemically honest local composers.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The staged desk town. Deterministic, test-authored schedules — never generated-world roulette:
 * `ada`/`cyn` stand in the square with the avatar all day; `bez`/`dov`/`eve` stand in the market all
 * day. That split IS the option-source proof: `ada` is a LOCAL asset (direct verbs and the first
 * directive hop may name them), `dov` is a REMOTE asset on the same player roster (only the final
 * recipient and the later relays may name them), `eve` is a street-directory face on no roster.
 */
const allDay = (venue: string) => [{ days: 'all' as const, from: 0, to: 1439, venue }];
function deskTown(): TownFixture {
  const person = (id: string, name: string, venue: string) => ({
    id, name, home: 'home-0', occupation: 'grocer', faction: 'none' as const,
    traits: ['literalist' as const], rivals: [], schedule: allDay(venue), edges: [],
  });
  return {
    venues: [
      { id: 'square', district: 'd0', access: 'public' as const },
      { id: 'market', district: 'd0', access: 'public' as const },
      { id: 'safehouse', district: 'd0', access: 'private' as const },
      { id: 'salon', district: 'd0', access: 'invitational' as const },
      { id: 'home-0', district: 'd0', access: 'private' as const },
    ],
    npcs: [
      person('ada', 'Ada', 'square'), person('cyn', 'Cyn', 'square'),
      person('bez', 'Bez', 'market'), person('dov', 'Dov', 'market'), person('eve', 'Eve', 'market'),
    ],
  };
}

function deskWorld(seed: string): WorldState {
  const world = buildWorld(deskTown(), seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  // Street knowledge is wired at generation in every real world; wire it here too, so a late
  // `world.npcs` insertion is what it is in a real campaign — invisible to the public directory.
  world.enemy.map = buildTownMap(deskTown());
  world.station = 'noble';
  world.coin = 200;
  for (const id of ['ada', 'dov']) {
    world.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.intel.informants.push({ id, assignedVenue: null });
  }
  return world;
}

/** The same staged town, but your ONE asset (`dov`) stands in the market. The composer may still
 *  name them as the final recipient; there is simply nobody in this moment to hand the brief to. */
function remoteOnlyDeskWorld(seed: string): WorldState {
  const world = buildWorld(deskTown(), seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.enemy.map = buildTownMap(deskTown());
  world.station = 'noble';
  world.coin = 200;
  world.network.assets.push({ id: 'dov', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.intel.informants.push({ id: 'dov', assignedVenue: null });
  return world;
}

/** One DELIVERED board row — the player physically heard family `f-desk` as this reported version. */
function deliverBoardRow(world: WorldState, family = 'f-desk', claimId = 'c-desk'): void {
  world.intel.log.push({
    ...blankIntel(), tick: 0, venue: 'square', via: 'self', kind: 'utterance', overheard: false,
    speaker: 'ada', addressedTo: 'you', mode: 'telling', claimId, family,
    reported: { subject: 'eve', predicate: 'stole', object: null, count: 2, severity: 4,
      place: 'market', attribution: SOMEONE },
  });
}

/** The exact props the composition root folds — every one of them from an epistemic selector. */
function deskProps(world: WorldState, over: Record<string, unknown> = {}) {
  const view = playerView(world);
  return {
    view,
    paused: true,
    coin: world.coin,
    economy: ECON,
    onVerb: noop,
    onRequestLocal: noop,
    onLocal: noop,
    localPending: true,
    net: networkView(world),
    board: boardView(world.intel.log, 1, STANDARD_RULES),
    offer: {
      // Frozen exactly as `session.ts` freezes it: the prepared frame's circle, minus the avatar,
      // SORTED. Derived from the real selector — never a hand-authored parallel circle.
      tick: world.tick, venue: view.avatar.venue!,
      circleMembers: [...view.avatar.circleMembers].sort(), token: 'desk#0',
    } as LocalOffer,
    ...over,
  };
}

/** The `<option value="...">` list of one aria-labelled select. Throws when the select is missing —
 *  a silently absent control must never read as "contains neither name". */
function optionsOf(page: string, label: string): string[] {
  const block = page.match(new RegExp(`<select[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</select>`));
  if (!block) throw new Error(`no <select aria-label="${label}"> in the rendered page`);
  return [...block[1]!.matchAll(/<option[^>]*value="([^"]*)"/g)].map((m) => m[1]!);
}

/** Is the aria-labelled button greyed? Throws when the button is missing, so a control that quietly
 *  disappeared can never read as "greyed" — the same non-vacuity guard `optionsOf` carries. */
function isDisabled(page: string, label: string): boolean {
  const tag = page.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`));
  if (!tag) throw new Error(`no <button aria-label="${label}"> in the rendered page`);
  return /\sdisabled(?:=""|\s|>)/.test(tag[0]);
}

// ── The desk panel ───────────────────────────────────────────────────────────────────────────────

describe('Directives — the desk shows authored levers, an authored clock, and returned reports', () => {
  const ROW = {
    id: 'd0', recipient: 'ada', issuedAt: at(1, 2), clock: 'active' as const,
    handoff: { outboundVia: ['cyn'], reportVia: ['dov'] },
    authored: {
      mission: { kind: 'learn' as const, target: { kind: 'person' as const, id: 'eve' } },
      priority: 'urgent' as const, authority: 'office' as const, discretion: 'compartmented' as const,
      specificity: 'guided' as const,
      guidance: [{ kind: 'avoid-venue' as const, venue: 'salon' }],
      active: { from: at(1, 2), until: at(3, 0) }, report: 'reasoned' as const,
      reportBy: at(2, 0), purpose: 'find out who paid eve',
    } as DirectiveBrief,
    reports: [],
  };

  it('renders the recipient, the issue time, and BOTH authored routes as the player wrote them', () => {
    const page = html(createElement(Directives, { view: { rows: [ROW] } }));
    expect(page).toContain('ada');
    expect(page).toContain('day 1');
    expect(page).toContain('cyn');   // outbound relay
    expect(page).toContain('dov');   // return relay
  });

  it('renders the mission and all EIGHT independent handoff levers', () => {
    const page = html(createElement(Directives, { view: { rows: [ROW] } }));
    for (const value of ['learn', 'eve', 'urgent', 'office', 'compartmented', 'guided',
      'avoid-venue', 'salon', 'reasoned', 'find out who paid eve']) {
      expect(page, `the desk owes the player "${value}"`).toContain(value);
    }
  });

  it('renders the authored clock word and no delivery/execution/allegiance status anywhere', () => {
    for (const clock of ['active', 'due', 'overdue'] as const) {
      const page = html(createElement(Directives, { view: { rows: [{ ...ROW, clock }] } }));
      expect(page).toContain(clock);
    }
    const page = html(createElement(Directives, { view: { rows: [ROW] } }));
    for (const forbidden of ['delivered', 'executing', 'deferred', 'refused', 'adapted', 'aborted',
      'compromised', 'loyal', 'turncoat', 'in transit', 'pending delivery']) {
      expect(page, `the desk must never say "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('a withheld purpose says so, and never invents one', () => {
    const page = html(createElement(Directives, {
      view: { rows: [{ ...ROW, authored: { ...ROW.authored, purpose: null } }] },
    }));
    expect(page).toContain('withheld');
    expect(page).not.toContain('find out who paid eve');
  });

  it('a received report shows field labels ONLY where the field is non-null', () => {
    const page = html(createElement(Directives, {
      view: { rows: [{ ...ROW, reports: [{
        receivedAt: at(2, 0), via: 'dov',
        report: { outcome: 'eve was at the market', reason: null, evidence: null,
          source: 'ada', uncertainty: null },
      }] }] },
    }));
    expect(page).toContain('eve was at the market');
    expect(page).toContain('<dt>outcome</dt>');
    expect(page).toContain('<dt>source</dt>');
    // A null field gets NO label at all — not a blank row. (The row's authored report EXPECTATION is
    // "reasoned", so the bare word "reason" is legitimately on the page; the LABEL must not be.)
    expect(page).not.toContain('<dt>reason</dt>');
    expect(page).not.toContain('<dt>uncertainty</dt>');
    expect(page).not.toContain('<dt>evidence</dt>');
  });

  it('an empty desk says so without crashing', () => {
    expect(html(createElement(Directives, { view: { rows: [] } }))).toContain('desk-note');
  });
});

// ── Option sources: every list is pinned to one lawful feed ──────────────────────────────────────

describe('local composers — every option list comes from its pinned, lawful source', () => {
  it('direct verbs and the first directive hop name the LOCAL circle; never the remote asset', () => {
    const world = deskWorld('desk-src');
    deliverBoardRow(world);
    const page = html(createElement(DayPlanner, deskProps(world)));

    // The frozen circle is what the offer says it is — derived from the real selector, not authored.
    expect([...playerView(world).avatar.circleMembers].sort()).toEqual(['ada', 'cyn']);

    for (const label of ['tell addressee', 'ask addressee', 'sell buyer', 'host invitee']) {
      const ids = optionsOf(page, label);
      expect(ids, `${label} offers the local circle`).toContain('ada');
      expect(ids, `${label} must never offer the remote asset`).not.toContain('dov');
    }
    // Recruit offers the circle MINUS your own roster — your bookkeeping is public, and `ada` is
    // already yours. Never the remote asset, and never anyone outside the frozen circle.
    expect(optionsOf(page, 'recruit target')).toEqual(['cyn']);
    // Asset-only direct verbs: the circle INTERSECTED with your own roster.
    for (const label of ['debrief asset', 'courier asset', 'meet asset', 'post informant']) {
      expect(optionsOf(page, label), `${label} offers the local asset`).toEqual(['ada']);
    }
    // The first addressed hop must be standing in front of you.
    const firstHop = optionsOf(page, 'directive first hop');
    expect(firstHop).toContain('ada');
    expect(firstHop).not.toContain('dov');
  });

  it('the final recipient and the later relays may name BOTH roster assets, local or remote', () => {
    const world = deskWorld('desk-src-2');
    const page = html(createElement(DayPlanner, deskProps(world)));
    for (const label of ['directive recipient', 'directive outbound relay', 'directive report relay']) {
      const ids = optionsOf(page, label);
      expect(ids, `${label} names the local asset`).toContain('ada');
      expect(ids, `${label} names the remote asset`).toContain('dov');
      expect(ids, `${label} is roster-only`).not.toContain('eve');
    }
  });

  it('mission/guidance people come from the street directory; venues from the street map', () => {
    const world = deskWorld('desk-src-3');
    const page = html(createElement(DayPlanner, deskProps(world)));
    expect(optionsOf(page, 'directive mission person')).toContain('eve'); // on no roster at all
    expect(optionsOf(page, 'directive guidance person')).toContain('eve');
    const venues = optionsOf(page, 'directive mission venue');
    expect(venues).toEqual(expect.arrayContaining(['square', 'market', 'safehouse', 'salon']));
  });

  it('the story/payload list is DELIVERED board rows only, and submits the player-heard version', () => {
    const world = deskWorld('desk-src-4');
    deliverBoardRow(world);
    const page = html(createElement(DayPlanner, deskProps(world)));
    expect(optionsOf(page, 'directive mission story')).toEqual(['f-desk']);
    expect(optionsOf(page, 'sell story')).toEqual(['f-desk']);

    // The payload the composer would submit is the REPORTED version, parented on the heard claim.
    const draft = defaultDirectiveDraft(deskProps(world));
    const shaped = directiveIntentFrom({
      ...draft,
      mission: { application: 'standard', mission: 'shape', operation: 'spread',
        audience: 'eve', payload: draft.payloads['f-desk']! },
    });
    expect(stableStringify(shaped)).toContain('"family":"f-desk"');
    expect(stableStringify(shaped)).toContain('"parent":"c-desk"');
    expect(stableStringify(shaped)).toContain('"severity":4');  // the heard severity, not world truth
  });

  it('a hidden NPC, an undelivered raw claim, and an enemy-only asset change NO option markup', () => {
    const world = deskWorld('desk-blind');
    deliverBoardRow(world);
    const before = html(createElement(DayPlanner, deskProps(world)));

    world.npcs['zed'] = {
      id: 'zed', name: 'Zed', home: 'home-0', occupation: 'guard', faction: 'none',
      traits: [], rivals: [], schedule: allDay('market'), edges: [],
    };
    world.claims['c-secret'] = {
      id: 'c-secret', family: 'f-secret', parent: null, subject: 'eve', predicate: 'poisoned',
      object: null, count: null, severity: 5, place: null, attribution: SOMEONE,
    };
    world.network.enemyAssets.push({
      id: 'bez', mice: 'money', wagePaidThroughDay: 0, strikes: 0, facts: [],
    });

    expect(html(createElement(DayPlanner, deskProps(world)))).toBe(before);
  });
});

// ── Lever independence: ten levers, ten separate fields ──────────────────────────────────────────

describe('the directive composer exposes ten independent levers', () => {
  const world = deskWorld('desk-levers');
  deliverBoardRow(world);
  const base = (): DirectiveDraft => defaultDirectiveDraft(deskProps(world));

  it('renders a distinct control for every one of the ten levers', () => {
    const page = html(createElement(DayPlanner, deskProps(world)));
    for (const label of [
      'directive recipient',                                              // 1
      'directive first hop', 'directive outbound relay', 'directive report relay', // 2
      'directive application', 'directive mission',                       // 3
      'directive shape operation',                                        // 3 — spread vs suppress
      'directive rendezvous from', 'directive rendezvous until',          // 3 — the meeting window
      'directive meeting venue', 'directive meeting from', 'directive meeting until', // 3 — sound-out
      'directive specificity', 'directive guidance kind',                 // 4
      'directive priority',                                              // 5
      'directive authority',                                             // 6
      'directive discretion',                                            // 7
      'directive active from', 'directive active until',                 // 8
      'directive report expectation', 'directive report by',             // 9
      'directive purpose',                                               // 10
    ]) {
      expect(page, `lever control "${label}" is missing`).toContain(`aria-label="${label}"`);
    }
    expect(page).toContain('aria-label="withhold purpose"');
    expect(page).toContain('aria-label="request a meeting"');
    expect(page).toContain('aria-label="submit directive"');
  });

  /** Change one draft field; the serialized intent must differ in exactly that one JSON path. */
  const changedPaths = (over: Partial<DirectiveDraft>, from: DirectiveDraft = base()): string[] => {
    const before = directiveIntentFrom(from) as unknown;
    const after = directiveIntentFrom({ ...from, ...over } as DirectiveDraft) as unknown;
    const paths: string[] = [];
    const walk = (a: unknown, b: unknown, path: string): void => {
      if (stableStringify(a) === stableStringify(b)) return;
      if (a && b && typeof a === 'object' && typeof b === 'object'
        && !Array.isArray(a) && !Array.isArray(b)) {
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
          walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key],
            path ? `${path}.${key}` : key);
        }
        return;
      }
      paths.push(path);
    };
    walk(before, after, '');
    return paths.sort();
  };

  it.each([
    ['recipient', { recipient: 'dov' }, ['recipient']],
    ['outbound relays', { outboundVia: ['dov'] }, ['handoff.outboundVia']],
    ['return relays', { reportVia: ['dov'] }, ['handoff.reportVia']],
    ['priority', { priority: 'urgent' }, ['brief.priority']],
    ['authority', { authority: 'compel' }, ['brief.authority']],
    ['discretion', { discretion: 'compartmented' }, ['brief.discretion']],
    ['specificity', { specificity: 'detailed' }, ['brief.specificity']],
    ['guidance', { guidance: [{ kind: 'avoid-person', person: 'eve' }] }, ['brief.guidance']],
    ['active from', { activeFrom: 60 }, ['brief.active.from']],
    ['active until', { activeUntil: 900 }, ['brief.active.until']],
    ['report expectation', { report: 'full' }, ['brief.report']],
    ['report by', { reportBy: 120 }, ['brief.reportBy']],
    ['purpose', { purpose: 'because I said so' }, ['brief.purpose']],
  ])('changing %s changes exactly that field of the submitted action', (_label, over, expected) => {
    expect(changedPaths(over as Partial<DirectiveDraft>)).toEqual(expected);
  });

  it('nothing auto-changes: a priority change leaves the window, routes, and report alone', () => {
    const urgent = directiveIntentFrom({ ...base(), priority: 'urgent' });
    const routine = directiveIntentFrom(base());
    const strip = (i: unknown) => {
      const clone = JSON.parse(stableStringify(i)) as { brief: Record<string, unknown> };
      delete clone.brief['priority'];
      return stableStringify(clone);
    };
    expect(strip(urgent)).toBe(strip(routine));
  });

  it('sound-out never offers the recipient as its own target (the permanent engine guard, mirrored)', () => {
    const page = html(createElement(DayPlanner, deskProps(world)));
    const recipient = optionsOf(page, 'directive recipient')[0]!;
    expect(optionsOf(page, 'directive sound-out target')).not.toContain(recipient);
  });

  // ── Lever 3's typed subfields are levers in their own right ─────────────────────────────────────
  // The engine's mission/application contract carries a shape OPERATION, a sound-out MEETING request,
  // and a rendezvous WINDOW. Each gets its own control and joins the exactly-one-path-moves proof.
  const shapeMission = (operation: 'spread' | 'suppress'): DirectiveMissionDraft => ({
    application: 'standard', mission: 'shape', operation, audience: 'eve',
    payload: base().payloads['f-desk']!,
  });
  const soundOutMission = (meeting: { venue: string; from: number; until: number } | null): DirectiveMissionDraft =>
    ({ application: 'standard', mission: 'sound-out', target: 'eve', topic: 'recruitment', handle: null, meeting });
  const rendezvousMission = (from: number, until: number): DirectiveMissionDraft =>
    ({ application: 'rendezvous', venue: 'market', from, until });

  it('the shape OPERATION is its own lever: spread → suppress moves exactly that field', () => {
    const from = { ...base(), mission: shapeMission('spread') };
    expect(changedPaths({ mission: shapeMission('suppress') }, from))
      .toEqual(['brief.mission.operation']);
  });

  it('the sound-out MEETING request is its own lever', () => {
    const from = { ...base(), mission: soundOutMission(null) };
    expect(changedPaths({ mission: soundOutMission({ venue: 'market', from: 30, until: 45 }) }, from))
      .toEqual(['brief.mission.meeting']);
  });

  it('the rendezvous window is TWO levers, and does not follow the active window', () => {
    const from = { ...base(), mission: rendezvousMission(30, 60) };
    expect(changedPaths({ mission: rendezvousMission(15, 60) }, from)).toEqual(['application.from']);
    expect(changedPaths({ mission: rendezvousMission(30, 90) }, from)).toEqual(['application.until']);
    // …and lever 8 no longer drags it: moving activeFrom moves activeFrom, and nothing else.
    expect(changedPaths({ activeFrom: 45 }, from)).toEqual(['brief.active.from']);
  });
});

// ── The Board is the ONLY story-payload source ───────────────────────────────────────────────────

describe('story family / parent / payload come only from delivered board rows', () => {
  it('an empty board holds no payload, and no claim the player never heard is constructible', () => {
    const world = deskWorld('payload-empty');            // nothing was ever delivered
    const sources = deskProps(world);
    const draft = defaultDirectiveDraft(sources);
    expect(draft.payloads).toEqual({});

    const payloadless: DirectiveMissionDraft[] = [
      { application: 'courier', target: 'eve', payload: null },
      { application: 'standard', mission: 'shape', operation: 'spread', audience: 'eve', payload: null },
      { application: 'standard', mission: 'shape', operation: 'suppress', audience: 'eve', payload: null },
      { application: 'standard', mission: 'shape-redirect', audience: 'eve', redirectTo: 'bez', payload: null },
    ];
    for (const mission of payloadless) {
      expect(directiveIntentFrom({ ...draft, mission }), stableStringify(mission)).toBeNull();
      expect(directiveIssues({ ...draft, mission }, sources)).toContain('no delivered story to send');
    }
  });

  it('the payload-bearing options stay VISIBLE and say plainly why nothing can be sent', () => {
    const page = html(createElement(DayPlanner, deskProps(deskWorld('payload-visible'))));
    // What you hold is a public fact about you, so this greys — it never hides the control.
    expect(optionsOf(page, 'directive application')).toContain('courier');
    expect(optionsOf(page, 'directive mission')).toEqual(expect.arrayContaining(['shape', 'shape-redirect']));
    expect(optionsOf(page, 'directive mission story')).toEqual(['']);
    expect(page).toContain('aria-label="directive payload note"');
    expect(page).toContain('no delivered story to send');
  });

  it('the REAL option transitions mint nothing when the board is empty', () => {
    const world = deskWorld('payload-transition');
    const draft = defaultDirectiveDraft(deskProps(world));
    const options = { people: ['eve', 'bez'], venues: ['market'], families: [], tick: 0 };
    const minted = [
      missionDraftFor('courier', draft, options),
      standardMissionFor('shape', draft, options),
      standardMissionFor('shape-redirect', draft, options),
    ];
    for (const mission of minted) {
      // A manufactured claim would have to carry a severity and a predicate; there is none to carry.
      expect(stableStringify(mission), 'a payload was minted').not.toContain('"severity"');
      expect(directiveIntentFrom({ ...draft, mission })).toBeNull();
    }
  });

  it('one delivered row composes exactly that family, parented on the claim the player heard', () => {
    const world = deskWorld('payload-one');
    deliverBoardRow(world);
    const draft = defaultDirectiveDraft(deskProps(world));
    expect(Object.keys(draft.payloads)).toEqual(['f-desk']);
    const shaped = stableStringify(directiveIntentFrom({
      ...draft, mission: { application: 'courier', target: 'eve', payload: draft.payloads['f-desk']! },
    }));
    expect(shaped).toContain('"family":"f-desk"');
    expect(shaped).toContain('"parent":"c-desk"');
    expect(shaped).toContain('"severity":4');       // the version the player HEARD, not world truth
    expect(shaped).not.toContain('"family":null');  // …and never a minted one
    expect(shaped).not.toContain('"parent":null');
  });
});

// ── Client validation: well-formed routes and times only, computed from public facts ─────────────

describe('the composer greys its own submit on routes and times the engine must refuse', () => {
  const world = deskWorld('validate');
  deliverBoardRow(world);
  const sources = () => deskProps(world);
  const base = (): DirectiveDraft => defaultDirectiveDraft(sources());
  const soundOut = (target: string, meeting: { venue: string; from: number; until: number } | null = null):
  DirectiveMissionDraft => ({
    application: 'standard', mission: 'sound-out', target, topic: 'recruitment', handle: null, meeting,
  });
  const rendezvous = (from: number, until: number): DirectiveMissionDraft =>
    ({ application: 'rendezvous', venue: 'market', from, until });

  it('the staged draft is well formed: nothing is raised, so the cases below are not vacuous', () => {
    expect(directiveIssues(base(), sources())).toEqual([]);
    expect(base().recipient).toBe('ada');           // the local asset; `dov` is the remote one
  });

  it.each([
    ['a remote final recipient handed over in person',
      { recipient: 'dov' }, 'hand it over in person only to someone in this moment',
      { outboundVia: ['ada'] }],
    ['an outbound relay that IS the final recipient',
      { outboundVia: ['ada'] }, 'an outbound relay cannot be the final recipient',
      { recipient: 'dov' }],
    ['a report relay that IS the final recipient',
      { reportVia: ['ada'] }, 'a report relay cannot be the final recipient',
      { reportVia: ['dov'] }],
    ['the first hop selected again through add-outbound-relay',
      { recipient: 'dov', outboundVia: ['ada', 'ada'] }, 'the outbound route repeats a relay',
      { outboundVia: ['ada'] }],
    ['a duplicated report relay',
      { reportVia: ['dov', 'dov'] }, 'the report route repeats a relay',
      { reportVia: ['dov'] }],
    ['a sound-out target that collides with a changed recipient',
      { mission: soundOut('ada') }, 'an asset cannot be asked to sound themselves out',
      { mission: soundOut('eve') }],
    ['a reversed active window',
      { activeFrom: 200, activeUntil: 100, reportBy: null }, 'the active window runs backwards',
      { activeFrom: 100, activeUntil: 200 }],
    ['a report deadline outside the active window',
      { reportBy: 99999 }, 'the report deadline falls outside the active window',
      { reportBy: 120 }],
    ['a reversed rendezvous window',
      { mission: rendezvous(60, 30) }, 'the rendezvous window runs backwards',
      { mission: rendezvous(30, 60) }],
    ['a rendezvous window off the conversation beat',
      { mission: rendezvous(31, 61) }, 'the rendezvous window must sit on a conversation beat',
      { mission: rendezvous(30, 60) }],
    ['a sound-out meeting window off the conversation beat',
      { mission: soundOut('eve', { venue: 'market', from: 31, until: 61 }) },
      'the meeting window must sit on a conversation beat',
      { mission: soundOut('eve', { venue: 'market', from: 30, until: 60 }) }],
  ])('%s is reported, and clears the moment it is fixed', (_label, over, note, fix) => {
    const broken = { ...base(), ...over } as DirectiveDraft;
    expect(directiveIssues(broken, sources()), `unreported: ${note}`).toContain(note);
    expect(directiveIssues({ ...broken, ...fix } as DirectiveDraft, sources())).toEqual([]);
  });

  it('an active window that has already closed is reported against the offered beat', () => {
    const late = {
      ...deskProps(world),
      offer: { tick: 99999, venue: 'square', circleMembers: ['ada', 'cyn'], token: 'desk#late' },
    };
    expect(directiveIssues(base(), late)).toContain('the active window has already closed');
  });

  it('the greying is REAL: an undeliverable draft disables submit and prints its note on the page', () => {
    const page = html(createElement(DayPlanner, deskProps(remoteOnlyDeskWorld('validate-render'))));
    expect(isDisabled(page, 'submit directive')).toBe(true);
    expect(page).toContain('aria-label="directive notes"');
    expect(page).toContain('hand it over in person only to someone in this moment');
    // The option itself is never hidden — the remote asset stays nameable as the final recipient.
    expect(optionsOf(page, 'directive recipient')).toEqual(['dov']);
  });

  it('a well-formed desk draft leaves the submit live', () => {
    const page = html(createElement(DayPlanner, deskProps(world)));
    expect(isDisabled(page, 'submit directive')).toBe(false);
    expect(page).not.toContain('aria-label="directive notes"');
  });
});

// ── Preset ≡ custom: one typed execution branch, reached two ways ─────────────────────────────────

describe('preset and fully composed custom applications reach the SAME typed execution branch', () => {
  /** The application + mission shape, with ids and the default envelope normalized away. */
  function branchOf(world: WorldState): unknown {
    const record = ensureDirectiveState(world).records.at(-1)!;
    const brief = record.authored.brief;
    return JSON.parse(stableStringify({
      recipient: record.recipient,
      application: applicationOf(brief),
      mission: brief.mission,
    }));
  }

  const stage = (seed: string): WorldState => deskWorld(seed);

  const CUSTOM_ENVELOPE = {
    priority: 'urgent' as const, authority: 'compel' as const, discretion: 'compartmented' as const,
    specificity: 'detailed' as const, guidance: [{ kind: 'avoid-person' as const, person: 'eve' }],
    report: 'full' as const, purpose: 'a purpose the preset never has',
  };

  it('posting: applyAssignInformant and a composed posting directive land on one branch', () => {
    const preset = stage('branch-post-a');
    applyAssignInformant(preset, 'ada', 'market', 0);

    const custom = stage('branch-post-b');
    applyDirective(custom, 'ada', { outboundVia: [], reportVia: [] }, {
      ...CUSTOM_ENVELOPE,
      mission: { kind: 'learn', target: { kind: 'venue', id: 'market' } },
      active: { from: 15, until: 7 * TICKS_PER_DAY }, reportBy: 7 * TICKS_PER_DAY,
    }, 0, { kind: 'posting', venue: 'market' });

    expect(branchOf(custom)).toEqual(branchOf(preset));
  });

  it('rendezvous: applyMeet and a composed rendezvous directive land on one branch', () => {
    const preset = stage('branch-rv-a');
    applyMeet(preset, 'ada', 0);

    const custom = stage('branch-rv-b');
    applyDirective(custom, 'ada', { outboundVia: [], reportVia: [] }, {
      ...CUSTOM_ENVELOPE,
      mission: { kind: 'learn', target: { kind: 'venue', id: 'safehouse' } },
      active: { from: 15, until: 15 }, reportBy: 15,
    }, 0, { kind: 'rendezvous', venue: 'safehouse', from: 15, until: 30 });

    expect(branchOf(custom)).toEqual(branchOf(preset));
  });

  it('courier: applyCourier and a composed courier directive land on one branch', () => {
    const spec: InjectSpec = {
      subject: 'eve', predicate: 'stole', object: null, count: null, severity: 3,
      place: null, attribution: SOMEONE,
    };
    const preset = stage('branch-cr-a');
    applyCourier(preset, 'ada', spec, 'cyn', null, 0, STANDARD_RULES);

    const custom = stage('branch-cr-b');
    applyDirective(custom, 'ada', { outboundVia: [], reportVia: [] }, {
      ...CUSTOM_ENVELOPE,
      mission: { kind: 'shape', operation: 'spread', redirectTo: null,
        payload: { family: null, parent: null, claim: spec },
        audience: { kind: 'person', id: 'cyn' } },
      active: { from: 15, until: 3 * TICKS_PER_DAY }, reportBy: 3 * TICKS_PER_DAY,
    }, 0, { kind: 'courier', target: 'cyn' });

    expect(branchOf(custom)).toEqual(branchOf(preset));
  });

  it('varying every custom lever leaves the APPLICATION fixed', () => {
    const world = deskWorld('branch-fixed');
    deliverBoardRow(world);
    const base: DirectiveDraft = {
      ...defaultDirectiveDraft(deskProps(world)),
      mission: { application: 'posting', venue: 'market' },
    };
    const applicationOfDraft = (draft: DirectiveDraft): unknown =>
      JSON.parse(stableStringify((directiveIntentFrom(draft) as { application: unknown }).application));
    const fixed = applicationOfDraft(base);
    const variations: Partial<DirectiveDraft>[] = [
      { outboundVia: ['dov'] }, { reportVia: ['dov'] }, { authority: 'compel' },
      { discretion: 'compartmented' }, { specificity: 'detailed' },
      { guidance: [{ kind: 'not-before', tick: 60 }] }, { purpose: null },
      { report: 'none' }, { reportBy: null }, { priority: 'urgent' },
      { activeFrom: 60 }, { activeUntil: 5000 },
    ];
    for (const over of variations) {
      expect(applicationOfDraft({ ...base, ...over }), stableStringify(over)).toEqual(fixed);
    }
  });

  it('a RELAYED custom posting alters no operational coverage before physical receipt', () => {
    const world = deskWorld('branch-relay');
    applyDirective(world, 'dov', { outboundVia: ['ada'], reportVia: [] }, {
      mission: { kind: 'learn', target: { kind: 'venue', id: 'market' } },
      priority: 'routine', authority: 'relationship', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 15, until: 7 * TICKS_PER_DAY },
      report: 'outcome', reportBy: 7 * TICKS_PER_DAY, purpose: null,
    }, 0, { kind: 'posting', venue: 'market' });

    const record = ensureDirectiveState(world).records.at(-1)!;
    expect(record.received, 'the relay has not handed it over yet').toBeNull();
    expect(world.intel.informants.find((i) => i.id === 'dov')!.assignedVenue).toBeNull();
    // The player-facing surfaces show the AUTHORED mark and nothing operational.
    expect(networkView(world).assets.find((a) => a.id === 'dov')!.requestedVenue).toBeNull();
    expect(directiveView(world).rows.at(-1)!.recipient).toBe('dov');
  });
});

// ── Twin worlds and the public bundle ────────────────────────────────────────────────────────────

/** Every hidden RECRUITMENT field, moved on an approach record the public history never reads.
 *  `recruitmentHistoryView` folds delivered player intel (`world.intel.network`) alone, so the
 *  willingness class, the decided answer, the handle, the leverage, and the real enemy linkage are
 *  all invisible by construction — which is exactly what these mutations have to prove. */
function flipRecruitmentHidden(world: WorldState): void {
  for (const approach of ensureDirectiveState(world).recruitmentApproaches) {
    approach.initial = 'accept';               // the willingness the approach actually met
    approach.decided = 'refuse';               // …and the answer it actually reached
    approach.status = 'closed';
    approach.mice = 'coercion';
    approach.leverageFamily = 'f-hidden';
    approach.resolveAt = 45;
    approach.decisionDueAt = 90;
    approach.sourceDirectiveId = 'd-hidden';
    approach.enemyLinkedAtDecision = true;     // the real enemy linkage
  }
}

/** One reader per HIDDEN `EnemyState` category, so "every hidden enemy field" can be CHECKED rather
 *  than claimed. `map` is absent on purpose and is NOT one of the categories this list claims: the
 *  street map is public knowledge `playerView` lawfully serves, so moving it would move the public
 *  bundle. The arm's title says "hidden enemy field" for exactly that reason. */
const ENEMY_STATE_CATEGORIES: ((w: WorldState) => boolean)[] = [
  (w) => w.enemy.observers.length > 0,
  (w) => w.enemy.evidence.length > 0,
  (w) => w.enemy.digestedThrough > 0,
  (w) => w.enemy.sketch.length > 0,
  (w) => w.enemy.watchedDistricts.length > 0,
  (w) => w.enemy.decisions.length > 0,
  (w) => w.enemy.featureCounter > 0,
  (w) => w.enemy.interrogated.length > 0,
  (w) => w.enemy.inquiriesIssued.length > 0,
  (w) => (w.enemy.pendingOrders ?? []).length > 0,
  (w) => (w.enemy.issuedDirectiveIds ?? []).length > 0,
  (w) => (w.enemy.actionLedger ?? []).length > 0,
];

/** Every HIDDEN enemy-state category, moved together — the arm's label claims "every hidden enemy
 *  field", so it owes each one. `enemy.map` is deliberately outside that claim: the street map is
 *  PUBLIC knowledge that `playerView` lawfully serves, so moving it would be a real change, not a
 *  hidden one, and asserting byte-identity over it would assert something false. */
function flipEnemyState(world: WorldState): void {
  const enemy = world.enemy;
  enemy.observers.push({ id: 'bez', vigilance: 0.9 });
  enemy.evidence.push({
    kind: 'utterance', tick: 0, venue: 'market', observer: 'bez', overheard: true, speaker: 'eve',
    addressedTo: 'dov', mode: 'telling', claimId: 'c-hidden', family: 'f-hidden', about: null,
    reported: { subject: 'eve', predicate: 'stole', object: null, count: null, severity: 3,
      place: null, attribution: SOMEONE },
  });
  enemy.digestedThrough = 1;
  enemy.sketch.push({
    id: 'sf-hidden', kind: 'carrier-profile', day: 1, family: null, subject: 'ada',
    district: 'd0', detail: 'hidden',
    evidence: [{ tick: 0, observer: 'bez', claimId: null, messageId: null }],
  });
  enemy.watchedDistricts.push('d0');
  enemy.decisions.push({ day: 1, features: [], inquiries: [], watches: [], interrogations: [] });
  enemy.featureCounter = 7;
  enemy.interrogated.push('ada:s:you');
  enemy.inquiriesIssued.push('s:you');
  enemy.pendingOrders = [{ key: 'o-hidden', issuedDay: 1, reconsiderAfterDay: 3, directiveIds: [] }];
  enemy.issuedDirectiveIds = ['d-enemy'];
  enemy.actionLedger = [{
    orderKey: 'o-hidden', kind: 'watch', directiveIds: [], leadFeatureId: null, subject: 'ada',
    about: null, district: 'd0', scheduleStartDay: 1,
    posts: [{ guard: 'bez', venue: 'market' }], workedDays: [1], askedAt: null,
  }];
}

/** Every hidden dimension the player may never see, flipped in one call. */
function flipHidden(world: WorldState): void {
  const state = ensureDirectiveState(world);
  for (const record of state.records) {
    record.received = {
      tick: 30, version: { ...record.authored, id: 'v-hidden', brief: {
        ...record.authored.brief, priority: 'urgent', purpose: 'HIDDEN-MUTATION',
      } }, handoffFrom: 'bez', messageId: 'm-hidden',
    };
    record.decision = {
      interpretation: record.authored.brief.mission, commitment: 'refuse', initiative: 'adaptive',
      risk: 'bold', method: { kind: 'hold' }, timing: { actAt: 30, reportAt: null },
      disclosure: { outcome: false, reason: false, evidence: false, source: false, uncertainty: false },
      candor: 'doctored',
    };
    record.execution = { state: 'aborted', changedAt: 45, dueAt: null, waiting: null };
  }
  for (const message of state.messages) {
    message.holder = 'bez'; message.nextHop = 1; message.deliveredAt = 30;
    message.failedAt = 45; message.expiresAt = 999;
  }
  state.scrutiny.push({ observer: 'ada', principal: 'you', observedAt: 0, cause: 'confrontation' });
  for (const asset of world.network.assets) {
    asset.turned = true;
    asset.facts.push({ tick: 0, kind: 'carried-story', ref: 'f-hidden' });
  }
  world.network.enemyAssets.push({
    id: 'bez', mice: 'money', wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true,
  });
  world.network.pendingCouriers = [];
  flipRecruitmentHidden(world);
  flipEnemyState(world);
  world.scheduleOverrides['dov'] = [{ fromDay: 0, toDay: 9, from: 0, to: 1440, venue: 'salon', source: 'vignette' }];
}

/** A staged desk world carrying one authored directive, one mark, and one delivered board row. */
function bundleWorld(seed: string): WorldState {
  const world = deskWorld(seed);
  deliverBoardRow(world);
  applyDirective(world, 'ada', { outboundVia: [], reportVia: ['dov'] }, {
    mission: { kind: 'learn', target: { kind: 'person', id: 'eve' } },
    priority: 'routine', authority: 'relationship', discretion: 'quiet', specificity: 'guided',
    guidance: [], active: { from: 15, until: 3 * TICKS_PER_DAY },
    report: 'outcome', reportBy: 2 * TICKS_PER_DAY, purpose: null,
  }, 0, { kind: 'standard' });
  world.intel.courierPlans = [{ id: 'plan-0', asset: 'ada', target: 'eve', from: 'square',
    to: 'market', authoredAt: 0, acknowledgedAt: null }];
  world.network.pendingCouriers.push({
    planId: 'plan-0', asset: 'ada', target: 'eve', viaDrop: null,
    spec: { subject: 'eve', predicate: 'stole', object: null, count: null, severity: 3,
      place: null, attribution: SOMEONE },
    pickedUpAt: 0, expiresAt: 3 * TICKS_PER_DAY,
  });
  // One open recruitment approach, so the hidden-field mutations below MUTATE a real record rather
  // than merely adding one (the same non-vacuity fix the courier-removal prong needed).
  ensureDirectiveState(world).recruitmentApproaches.push({
    id: 'ap-0', principal: 'player', recruiter: 'you', target: 'eve', mice: 'money',
    leverageFamily: null, openedAt: 0, resolveAt: null, decisionDueAt: null, status: 'waiting',
    initial: 'hesitate', decided: null, sourceDirectiveId: null, enemyLinkedAtDecision: false,
  });
  return world;
}

const publicBundle = (world: WorldState) => stableStringify({
  playerView: playerView(world), networkView: networkView(world),
  courierRouteView: courierRouteView(world), directiveView: directiveView(world),
});

const LAYOUT = computeLayout(playerView(deskWorld('layout')).map, 'layout');

/** Town + Network + Directive + DayPlanner markup, folded exactly as the composition root folds it. */
function deskMarkup(world: WorldState): string {
  const view = playerView(world);
  return [
    html(createElement(TownCanvas, {
      view, layout: LAYOUT, selected: null, watchSightings: new Set<string>(),
      courierRoutes: courierRouteView(world), onSelect: noop,
    })),
    html(createElement(Network, { view: networkView(world), history: recruitmentHistoryView(world) })),
    html(createElement(Directives, { view: directiveView(world) })),
    html(createElement(DayPlanner, deskProps(world))),
  ].join('\n');
}

describe('hidden-state twins render byte-identical bundles and byte-identical markup', () => {
  it('flipping every hidden dimension moves neither the bundle nor one byte of markup', () => {
    const clean = bundleWorld('twin-clean');
    const flipped = bundleWorld('twin-clean');
    flipHidden(flipped);
    // Non-vacuity: the flip really reached the recruitment record and EVERY HIDDEN enemy-state
    // category (`enemy.map` is public and deliberately outside the claim — see the list above).
    expect(ensureDirectiveState(flipped).recruitmentApproaches.length).toBeGreaterThan(0);
    expect(ensureDirectiveState(flipped).recruitmentApproaches
      .every((a) => a.initial === 'accept' && a.decided === 'refuse' && a.enemyLinkedAtDecision)).toBe(true);
    expect(ENEMY_STATE_CATEGORIES.filter((read) => !read(flipped))).toEqual([]);
    expect(ENEMY_STATE_CATEGORIES.filter((read) => read(clean))).toEqual([]);

    expect(publicBundle(flipped)).toBe(publicBundle(clean));
    expect(deskMarkup(flipped)).toBe(deskMarkup(clean));
  });

  /** Each arm carries the check that it really MOVED what its label names — an arm that quietly
   *  mutates nothing would otherwise assert byte-identity against itself and prove nothing. */
  it.each([
    ['a remote schedule/position', (w: WorldState) => {
      w.scheduleOverrides['dov'] = [{ fromDay: 0, toDay: 9, from: 0, to: 1440, venue: 'salon', source: 'vignette' }];
    }, (w: WorldState) => (w.scheduleOverrides['dov'] ?? []).length > 0],
    ['message holder/cursor/delivery/failure/expiry', (w: WorldState) => {
      for (const m of ensureDirectiveState(w).messages) {
        m.holder = 'dov'; m.nextHop = 1; m.deliveredAt = 30; m.failedAt = 45; m.expiresAt = 900;
      }
    }, (w: WorldState) => ensureDirectiveState(w).messages.every((m) => m.deliveredAt === 30)],
    ['a received brief / decision profile / execution', (w: WorldState) => {
      for (const r of ensureDirectiveState(w).records) {
        r.received = { tick: 30, version: { ...r.authored, id: 'v-x', brief: {
          ...r.authored.brief, purpose: 'MUTATED' } }, handoffFrom: 'dov', messageId: 'm-x' };
        r.decision = {
          interpretation: { kind: 'learn', target: { kind: 'person', id: 'dov' } },
          commitment: 'refuse', initiative: 'adaptive', risk: 'bold', method: { kind: 'hold' },
          timing: { actAt: 30, reportAt: 45 },
          disclosure: { outcome: false, reason: false, evidence: false, source: false, uncertainty: false },
          candor: 'doctored',
        };
        r.execution = { state: 'completed', changedAt: 40, dueAt: null, waiting: null };
      }
    }, (w: WorldState) => ensureDirectiveState(w).records.every(
      (r) => r.received !== null && r.decision !== null && r.execution !== null)],
    ['held observation queue state', (w: WorldState) => {
      ensureDirectiveState(w).heldObservations.push({
        id: 'o-x', fingerprint: 'f', rootFingerprint: 'r', principal: 'player', observer: 'ada',
        observedAt: 0,
        content: { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'market', actor: 'eve' } },
        sourceDirectiveId: null, route: [], factRefs: [], queuedIn: null, deliveredAt: null,
      });
    }, (w: WorldState) => ensureDirectiveState(w).heldObservations.length > 0],
    ['raw compartment facts', (w: WorldState) => {
      for (const a of w.network.assets) a.facts.push({ tick: 0, kind: 'carried-story', ref: 'f-raw' });
    }, (w: WorldState) => w.network.assets.every((a) => a.facts.length > 0)],
    ['a runtime courier removal', (w: WorldState) => { w.network.pendingCouriers = []; },
      (w: WorldState) => w.network.pendingCouriers.length === 0],
    ['recruitment willingness / decided answer / handle / leverage / enemy linkage',
      flipRecruitmentHidden,
      (w: WorldState) => ensureDirectiveState(w).recruitmentApproaches.every(
        (a) => a.initial === 'accept' && a.decided === 'refuse' && a.enemyLinkedAtDecision)],
    ['every turned / scrutiny / hidden enemy field', (w: WorldState) => {
      for (const a of w.network.assets) a.turned = true;
      ensureDirectiveState(w).scrutiny.push({ observer: 'ada', principal: 'you', observedAt: 0, cause: 'confrontation' });
      w.network.enemyAssets.push({ id: 'bez', mice: 'ego', wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true });
      flipEnemyState(w);
    }, (w: WorldState) => w.network.assets.every((a) => a.turned === true)
      && ensureDirectiveState(w).scrutiny.length > 0 && w.network.enemyAssets.length > 0
      && ENEMY_STATE_CATEGORIES.every((read) => read(w))],
  ])('mutating %s moves neither the public bundle nor the desk markup', (_label, mutate, moved) => {
    const control = bundleWorld('matrix');
    const probe = bundleWorld('matrix');
    expect(moved(control), 'the arm is vacuous BEFORE it runs — nothing left to move').toBe(false);
    mutate(probe);
    expect(moved(probe), 'the arm did not move the state its label names').toBe(true);
    expect(publicBundle(probe)).toBe(publicBundle(control));
    expect(deskMarkup(probe)).toBe(deskMarkup(control));
  });
});

describe('positive controls — each lawful change moves exactly its own surface', () => {
  const parts = (world: WorldState) => ({
    player: stableStringify(playerView(world)),
    network: stableStringify(networkView(world)),
    courier: stableStringify(courierRouteView(world)),
    directive: stableStringify(directiveView(world)),
    board: stableStringify(boardView(world.intel.log, 1, STANDARD_RULES)),
  });
  type Part = keyof ReturnType<typeof parts>;

  const movedKeys = (mutate: (w: WorldState) => void): Part[] => {
    const control = parts(bundleWorld('pc'));
    const probe = bundleWorld('pc');
    mutate(probe);
    const after = parts(probe);
    return (Object.keys(control) as Part[]).filter((k) => after[k] !== control[k]);
  };

  it('moving an NPC into the avatar’s room moves ONLY the player view', () => {
    expect(movedKeys((w) => {
      w.scheduleOverrides['dov'] = [{ fromDay: 0, toDay: 9, from: 0, to: 1440, venue: 'square', source: 'vignette' }];
    })).toEqual(['player']);
  });

  it('a delivered field report moves ONLY the board', () => {
    expect(movedKeys((w) => { deliverBoardRow(w, 'f-new', 'c-new'); })).toEqual(['board']);
  });

  it('a received directive report moves ONLY the directive desk', () => {
    expect(movedKeys((w) => {
      ensureDirectiveState(w).records[0]!.receivedReports.push({
        receivedAt: 60, via: 'dov',
        report: { outcome: 'eve was seen', reason: null, evidence: null, source: 'ada', uncertainty: 'low' },
      });
    })).toEqual(['directive']);
  });

  it('acknowledging a courier mark moves ONLY the courier overlay', () => {
    expect(movedKeys((w) => { w.intel.courierPlans![0]!.acknowledgedAt = 60; })).toEqual(['courier']);
  });
});

// ── The driver-at-a-distance law, at the app seam ────────────────────────────────────────────────

describe('remote work never pauses and never toasts; a requested offer always pauses', () => {
  it('a remote directive report delivered mid-advance leaves stopped === "complete"', () => {
    const session = newSession('cor-1');
    const world = session.world;
    const asset = world.network.assets[0]!.id;
    world.network.directiveState = undefined;
    ensureDirectiveState(world).records.push({
      id: 'd-remote', principal: 'player', principalId: world.playerId!, recipient: asset,
      issuedAt: 0, handoff: { outboundVia: [], reportVia: [] },
      authored: { id: 'v-remote', parent: null, directiveId: 'd-remote', brief: {
        mission: { kind: 'learn', target: { kind: 'venue', id: 'safehouse' } },
        priority: 'routine', authority: 'relationship', discretion: 'quiet', specificity: 'guided',
        guidance: [], active: { from: 15, until: 3 * TICKS_PER_DAY },
        report: 'outcome', reportBy: 2 * TICKS_PER_DAY, purpose: null,
      }, claimedIssuer: world.playerId!, replyRoute: [world.playerId!], changedBy: null, changes: [] },
      received: null, decision: null, execution: null,
      receivedReports: [{ receivedAt: 15, via: asset,
        report: { outcome: 'nothing to report', reason: null, evidence: null, source: null, uncertainty: null } }],
    });
    expect(session.advance(30).stopped).toBe('complete');
    expect(session.localOffer()).toBeNull();
    expect(directiveView(world).rows).toHaveLength(1); // the report is on the desk, unannounced
  });

  it('a REQUESTED offer pauses the same advance', () => {
    const session = newSession('cor-1');
    expect(session.requestLocalInteraction().refused).toBe(false);
    expect(session.advance(30).stopped).toBe('local-offer');
    expect(session.localOffer()).not.toBeNull();
  });

  it('main.tsx pauses only on a local offer or a terminal campaign', () => {
    const src = readFileSync(join(process.cwd(), 'app/src/main.tsx'), 'utf8');
    // The ONE pause reason: the local offer. (A terminal campaign leaves the loop through the
    // scenario early-return, not through a stop reason.)
    expect(src).toMatch(/result\.stopped === 'local-offer'/);
    expect(src).not.toMatch(/stopped === 'complete'/);
    // The only event listener the shell installs is the keyboard.
    expect([...src.matchAll(/addEventListener\('([a-z]+)'/g)].map((m) => m[1])).toEqual(['keydown']);
  });
});

// ── The toast policy, fail-closed ────────────────────────────────────────────────────────────────

/**
 * Every `setToast(...)` argument in a source, extracted by walking balanced parentheses (string and
 * template contents skipped), so the argument this check judges is the WHOLE argument — never a
 * prefix a length cap happened to leave behind.
 */
function toastArguments(src: string): string[] {
  const args: string[] = [];
  const needle = 'setToast(';
  for (let start = src.indexOf(needle); start >= 0; start = src.indexOf(needle, start + 1)) {
    let i = start + needle.length;
    let depth = 1;
    let quote: string | null = null;
    while (i < src.length && depth > 0) {
      const c = src[i]!;
      if (quote !== null) {
        if (c === '\\') i += 1;
        else if (c === quote) quote = null;
      } else if (c === "'" || c === '"' || c === '`') quote = c;
      else if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      i += 1;
    }
    args.push(src.slice(start + needle.length, i - 1).replace(/\s+/g, ' ').trim());
  }
  return args;
}

/** The engine's own refusal, surfaced verbatim. The ONE non-literal argument the policy allows, and
 *  it is pinned to this exact spelling — an "engine refusal" variable by any other name is a miss. */
const ENGINE_REFUSAL = 'err instanceof Error ? err.message : String(err)';
const STRING_LITERAL = String.raw`(?:'[^']*'|"[^"]*"|\`(?:[^\`\\]|\\.)*\`)`;
/** Fail-closed: only a literal, a ternary CHOOSING between two literals, or the pinned refusal. */
const LAWFUL_TOAST_ARG = new RegExp(
  `^(?:${STRING_LITERAL}|[\\w.!?[\\]]+ \\? ${STRING_LITERAL} : ${STRING_LITERAL})$`,
);
const REMOTE_NOUNS = ['delivered', 'received', 'report', 'execut', 'pickup', 'picked up', 'failed'];

/** Both halves of the policy, as one reporter: the forms it rejects and why. */
function toastViolations(src: string): string[] {
  const out: string[] = [];
  for (const arg of toastArguments(src)) {
    if (arg !== ENGINE_REFUSAL && !LAWFUL_TOAST_ARG.test(arg)) {
      out.push(`non-literal toast argument: ${arg}`);
      continue; // its text is not in the source, so the noun scan below cannot judge it
    }
    for (const noun of REMOTE_NOUNS) {
      if (arg.toLowerCase().includes(noun)) out.push(`toast announces remote "${noun}": ${arg}`);
    }
  }
  return out;
}

describe('the toast policy reports every remote announcement, literal or carried', () => {
  const src = readFileSync(join(process.cwd(), 'app/src/main.tsx'), 'utf8');

  it('the extractor is not vacuous: it finds main.tsx’s real setToast call sites', () => {
    const args = toastArguments(src);
    expect(args.length).toBeGreaterThan(4);
    expect(args).toContain(ENGINE_REFUSAL);          // the one allowed passthrough, by exact name
  });

  it('main.tsx announces no remote event, and hands setToast nothing but literals', () => {
    expect(toastViolations(src)).toEqual([]);
  });

  it.each([
    ['a violating literal', "setToast('the report was delivered');", 'toast announces remote "delivered"'],
    ['a variable carrying remote text',
      "const remoteNotice = 'report received';\n  setToast(remoteNotice);", 'non-literal toast argument'],
    ['a helper call whose text the scan cannot see', 'setToast(describeRemote(msg));', 'non-literal toast argument'],
    ['a concatenation onto a variable', "setToast(prefix + ' arrived');", 'non-literal toast argument'],
  ])('FIRES on %s', (_label, snippet, expected) => {
    const found = toastViolations(snippet);
    expect(found.length, `silent on: ${snippet}`).toBeGreaterThan(0);
    expect(found.join(' | ')).toContain(expected);
  });

  it.each([
    ["setToast('');", 'the clearing literal'],
    ['setToast(`queued for ${fmtTick(t)} — unpause to fire`);', 'a template with interpolations'],
    ["setToast(refused ? `a` : `b`);", 'a ternary choosing between two literals'],
    [`setToast(${ENGINE_REFUSAL});`, 'the pinned engine-refusal passthrough'],
  ])('stays silent on %s (%s)', (snippet) => {
    expect(toastViolations(snippet)).toEqual([]);
  });
});
