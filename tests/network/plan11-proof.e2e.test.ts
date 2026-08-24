import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Network } from '../../app/src/panels/Network';
import { Directives } from '../../app/src/panels/Directives';
import { localParticipants, type LocalActionIntent } from '../../app/src/loop/session';
import { at, dayOf, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { positionOf } from '../../src/sim/agents';
import { applyAction, runLogOn, type Action, type ActionLog } from '../../src/sim/campaign';
import { finishTick, prepareTick, type PreparedTick } from '../../src/sim/phases';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { WATCH, type SketchFeature } from '../../src/sim/enemy/state';
import { playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
import { directiveView } from '../../src/sim/directives/view';
import { perceivedScrutiny } from '../../src/sim/directives/scrutiny';
import { SOMEONE, type EntityId, type VenueId } from '../../src/sim/rumors/claim';
import type {
  DirectiveBrief, DirectiveRecord, NetworkMessage,
} from '../../src/sim/directives/types';
import type { Npc, ScheduleOverride, TownFixture, WorldState } from '../../src/sim/types';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import { assetFor } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import { recruitmentHistoryView } from '../../src/sim/network/recruitment';
import { pin, recruitWorld, trust } from './helpers/recruit-town';

/**
 * Plan 11 Task 14 — the two crown proofs, as COMPOSED behavior.
 *
 * Everything here rides the production seams: the player's own prepared-frame local offer, the real
 * relay hop that mutates a brief in transit, the turncoat's handler copy of the version that
 * actually arrived, the pure digest, the enemy's own physically travelling watch order, two real
 * worked nights that come home as reports, and the cancellation that must ALSO travel. No
 * production force hook exists and none is used; every helper below lives in this file.
 */
const RULES = STANDARD_RULES;

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// Shared substrate: the prepared-frame local offer, exactly as `app/src/loop/session.ts` freezes it.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

interface LocalOffer {
  tick: number;
  venue: VenueId;
  circleMembers: EntityId[];
  token: string;
  frame: PreparedTick;
}

/**
 * `session.requestLocalInteraction()` + `session.localOffer()` at the engine seam: prepare the tick,
 * find the avatar's frozen circle, and freeze the token. Same three lines the session runs
 * (`session.ts:205-220`) — a test-local surface over the SAME `prepareTick`, never a parallel one.
 */
function requestLocalOffer(world: WorldState): LocalOffer {
  const frame = prepareTick(world, RULES);
  const player = world.playerId;
  expect(player, 'an avatar is enrolled').not.toBeNull();
  const circle = frame.circles.find((candidate) => candidate.members.includes(player!));
  return {
    tick: frame.tick,
    venue: frame.positions[player!]!,
    circleMembers: (circle?.members ?? []).filter((id) => id !== player).sort(),
    token: `${frame.offerToken}#0`,
    frame,
  };
}

/**
 * `session.chooseLocal(token, intent)` + the advance that runs it: token identity, then the beat.
 * The membership fence is the SHIPPED `localParticipants` (`app/src/loop/session.ts`), imported
 * rather than mirrored — a mirror of a switch statement is a copy that can drift away from the
 * thing it is supposed to be proving, and this file's whole claim is that the crown scenario rides
 * production seams.
 */
function chooseLocalAndAdvance(
  world: WorldState, offer: LocalOffer, token: string, intents: LocalActionIntent[],
): void {
  if (token !== offer.token) throw new Error('session: stale or invalid local offer token');
  const members = new Set(offer.circleMembers);
  for (const intent of intents) {
    for (const participant of localParticipants(intent)) {
      if (!members.has(participant)) {
        throw new Error(`session: local participant '${participant}' is not in the offered circle`);
      }
    }
  }
  finishTick(world, RULES, offer.frame, () => {
    for (const intent of intents) {
      applyAction(world, { ...intent, tick: offer.tick } as Action, RULES, offer.frame);
    }
  });
}

/**
 * Everything the player may lawfully consult when deciding what to submit. Scanned below: if a
 * hidden name ever reaches this snapshot, the discipline pin fires here first.
 */
function playerFacing(world: WorldState, offer: LocalOffer | null): unknown {
  return {
    offer: offer === null ? null
      : { tick: offer.tick, venue: offer.venue, circleMembers: offer.circleMembers },
    view: playerView(world),
    network: networkView(world),
    directives: directiveView(world),
    courierRoutes: courierRouteView(world),
    intelLog: world.intel.log,
  };
}

/** Every property name anywhere inside a JSON value — the exact-key form of the desk's scan. */
function jsonKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) jsonKeys(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      out.add(key);
      jsonKeys(inner, out);
    }
  }
  return out;
}

/**
 * Hidden engine state, as EXACT property names. Exact rather than substring because the desk owes
 * the player two lawful fields whose names contain a banned one — a physically returned report's
 * `receivedAt`, and that report's own `evidence` line. `received` and `evidence` are still banned
 * as keys; `receivedAt` is not `received`.
 */
const HIDDEN_KEYS = [
  'turned', 'received', 'receivedReports', 'decision', 'execution', 'candor', 'commitment',
  'initiative', 'perceivedScrutiny', 'eligible', 'compromised', 'enemyLinked', 'protectedRole',
  'sketch', 'actionLedger', 'watchedDistricts', 'pendingOrders', 'issuedDirectiveIds',
  'deliveredAt', 'failedAt', 'nextHop', 'processedRelayHops', 'leadFeatureId',
];
/** …plus the names that may not appear ANYWHERE, as key or value. */
const HIDDEN_SUBSTRINGS = [
  'turned', 'candor', 'perceivedScrutiny', 'enemyLinked', 'protectedRole', 'actionLedger',
  'watchedDistricts', 'pendingOrders', 'issuedDirectiveIds', 'isTurnedAsset',
];

function assertBlind(label: string, facing: unknown): void {
  const keys = jsonKeys(facing);
  expect(HIDDEN_KEYS.filter((name) => keys.has(name)), `${label}: forbidden keys`).toEqual([]);
  const serialized = stableStringify(facing);
  for (const name of HIDDEN_SUBSTRINGS) {
    expect(serialized, `${label} leaks '${name}'`).not.toContain(name);
  }
}

const messagesOf = (world: WorldState, kind: NetworkMessage['payload']['kind']): NetworkMessage[] =>
  (world.network.directiveState?.messages ?? []).filter((m) => m.payload.kind === kind);

const recordsOf = (world: WorldState): DirectiveRecord[] =>
  world.network.directiveState?.records ?? [];

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// E2E A — a believable false brief spends real enemy attention.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Provingford. Two PUBLIC d0 venues so the digest's own lexicographic post pick ('plaza') is NOT the
 * guard's ordinary place ('square') — that is what makes "the guard leaves the post" observable
 * through real `positionOf`. The backroom is where the avatar hands the brief to relay A and where
 * the turncoat later meets his handler; the lane (d1) is where the second, consequential player
 * channel does its own real work while enemy attention is spent on the decoy.
 */
const allDay = (venue: VenueId) => [{ days: 'all' as const, from: 0, to: 1439, venue }];

const person = (
  id: string, home: VenueId, occupation: string, traits: Npc['traits'], venue = home,
): Npc => ({
  id, name: id, home, occupation, faction: 'none', traits,
  rivals: [], schedule: allDay(venue), edges: [],
});

// CONTROLLER-AMENDED SUBSTRATE (ledger P11-17, 2026-08-23): the brief's "existing Testford/Watchford
// helpers" instruction is amended for this fixture. Provingford is a hand-authored world built
// through the real production attachment APIs (`buildWorld`/`buildTownMap`/`enrollPlayer`/
// `applyEnemyDecision`) with no production force hooks — the review's Minor M-1 disposition.
const PROVINGFORD: TownFixture = {
  venues: [
    { id: 'plaza', district: 'd0', access: 'public' },       // the post the digest picks
    { id: 'square', district: 'd0', access: 'public' },      // the guard's ordinary place
    { id: 'backroom', district: 'd0', access: 'invitational' },
    { id: 'home-mira', district: 'd0', access: 'private' },
    { id: 'lane', district: 'd1', access: 'public' },
  ],
  npcs: [
    person('boss', 'square', 'clerk', ['literalist']),        // the embodied spymaster
    person('gale', 'square', 'guard', ['literalist']),        // the enemy's one observer
    person('mira', 'home-mira', 'grocer', ['literalist']),    // the decoy subject
    person('relay', 'backroom', 'scribe', ['numberer']),      // relay A — cannot move a subject
    person('mole', 'backroom', 'grocer', ['literalist']),     // suspected turncoat B
    person('tess', 'lane', 'weaver', ['literalist']),         // the second channel's audience
    person('worker', 'lane', 'printer', ['literalist']),      // the consequential second channel
  ],
};

/** The prerequisite the runaround chain does not test, staged the accepted way (Task-12 idiom). */
const PREREQUISITES: SketchFeature[] = [
  { id: 'sf0', kind: 'origin-vague', day: 0, family: 'fs', subject: 'ghost', district: 'd1',
    detail: 'staged prerequisite: the enemy already has a vague answer on file',
    evidence: [{ tick: 0, observer: 'gale', claimId: 'c-stage', messageId: null }] },
  { id: 'sf1', kind: 'district-activity', day: 0, family: 'fs', subject: null, district: 'd0',
    detail: 'staged prerequisite: d0 already smells of something',
    evidence: [{ tick: 0, observer: 'gale', claimId: 'c-stage', messageId: null }] },
];

/** The handler window: the ONE real schedule intersection that lets B reach his handler. */
const HANDLER_MEETING: ScheduleOverride = {
  fromDay: 0, toDay: 1, from: at(0, 8), to: at(0, 10), venue: 'backroom',
  source: 'player', sourceRef: 'test:handler-window',
};

interface StageOptions {
  /** false = the control twin: B and his handler never share a circle. */
  handlerMeeting?: boolean;
}

function provingWorld(seed: string, options: StageOptions = {}): WorldState {
  const world = buildWorld(PROVINGFORD, seed, RULES);
  world.enemy.map = buildTownMap(PROVINGFORD);
  world.enemy.observers = [{ id: 'gale', vigilance: 1 }];
  world.network.spymaster = 'boss';
  world.network.enemyAssets.push({
    id: 'gale', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
  });
  enrollPlayer(world, { home: 'backroom' });
  for (const id of ['relay', 'mole', 'worker']) {
    world.network.assets.push({
      id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
      ...(id === 'mole' ? { turned: true } : {}),
    });
    world.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });
  }
  world.npcs.gale!.edges.push({ to: 'boss', kind: 'colleague', trust: 0.8 });
  world.npcs.mole!.edges.push({ to: 'relay', kind: 'friend', trust: 0.6 });
  // B is NOT in the room when the brief is handed over — he walks in on the next beat. That is what
  // makes the offer-tick fence decision route-driven here too: the avatar hands the brief to the
  // relay standing in front of him, for a recipient who is provably somewhere else (I-1).
  world.scheduleOverrides['mole'] = [{
    fromDay: 0, toDay: 1, from: 0, to: 10, venue: 'lane',
    source: 'player', sourceRef: 'test:mole-arrives-late',
  }];
  if (options.handlerMeeting !== false) {
    world.scheduleOverrides['boss'] = [{ ...HANDLER_MEETING }];
  }
  applyEnemyDecision(world, {
    day: 0, features: PREREQUISITES, inquiries: [], watches: [], interrogations: [],
  });
  world.enemy.inquiriesIssued.push('s:ghost');
  return world;
}

/** A believable shape brief naming mira — with NO count, so relay A's numberer must invent one. */
const DECOY_BRIEF: DirectiveBrief = {
  mission: {
    kind: 'shape', operation: 'spread', redirectTo: null,
    audience: { kind: 'person', id: 'mira' },
    payload: { family: 'f-decoy', parent: null, claim: {
      subject: 'mira', predicate: 'stole', object: null, count: null,
      severity: 4, place: null, attribution: SOMEONE,
    } },
  },
  priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: 0, until: at(0, 23, 59) },
  report: 'outcome', reportBy: null, purpose: null,
};

/** The consequential second channel: a real shape a real asset really completes. */
const CONSEQUENCE_BRIEF: DirectiveBrief = {
  mission: {
    kind: 'shape', operation: 'spread', redirectTo: null,
    audience: { kind: 'person', id: 'tess' },
    payload: { family: 'f-consequence', parent: null, claim: {
      subject: 'tess', predicate: 'stole', object: null, count: 3,
      severity: 4, place: null, attribution: SOMEONE,
    } },
  },
  priority: 'urgent', authority: 'office', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: 0, until: at(3, 0) },
  report: 'outcome', reportBy: null, purpose: null,
};

const DECOY_ACTION: LocalActionIntent = {
  kind: 'directive', recipient: 'mole',
  handoff: { outboundVia: ['relay'], reportVia: [] }, brief: DECOY_BRIEF,
};

const CONSEQUENCE_ACTION: LocalActionIntent = {
  kind: 'directive', recipient: 'worker',
  handoff: { outboundVia: [], reportVia: [] }, brief: CONSEQUENCE_BRIEF,
};

/** The whole player log — the only save-relevant intent in either live world. */
const PLAYER_LOG: ActionLog = [
  { ...DECOY_ACTION, tick: 0 } as Action,
  { tick: 15, kind: 'goTo', venue: 'lane' },
  { ...CONSEQUENCE_ACTION, tick: 30 } as Action,
];

const decoyRecord = (world: WorldState): DirectiveRecord => {
  const record = recordsOf(world).find((row) =>
    row.principal === 'player' && row.recipient === 'mole');
  expect(record, 'the decoy directive record exists').toBeDefined();
  return record!;
};

function orderRecord(world: WorldState, orderKey: string): DirectiveRecord | undefined {
  return recordsOf(world).find((row) =>
    row.correlation?.kind === 'enemy-order' && row.correlation.orderKey === orderKey);
}

const reportsFor = (world: WorldState, id: string): NetworkMessage[] =>
  messagesOf(world, 'directive-report').filter((m) =>
    m.payload.kind === 'directive-report' && m.payload.directiveId === id);

/**
 * Run the two crown player actions through the REAL offer path, then let the world run itself to
 * `until`. Every remaining leg — the relay hop, the handler meeting, the nightly digest, the
 * enemy's own travelling orders, the worked nights, the returning reports, the tail drop — is
 * autonomous production behavior on real schedules.
 */
function playCrownA(world: WorldState, until: number): WorldState {
  const offerA = requestLocalOffer(world);
  expect(offerA.tick).toBe(0);
  expect(offerA.venue).toBe('backroom');
  // The decision inputs: the offered circle names the relay, and the roster says he is an asset.
  expect(offerA.circleMembers).toContain('relay');
  expect(networkView(world).assets.map((a) => a.id)).toContain('relay');
  // …and B, the brief's actual recipient, is NOT standing here. The shipped fence lets this through
  // on the FIRST HOP alone, so this offer beat is route-driven, not accidentally co-located.
  expect(offerA.circleMembers, 'the recipient is elsewhere at the handover').not.toContain('mole');
  chooseLocalAndAdvance(world, offerA, offerA.token, [DECOY_ACTION]);
  return runLogOn(world, RULES, PLAYER_LOG.slice(1), until);
}

const RUN_UNTIL = at(5, 0);

describe('E2E A — a believable false brief spends real enemy attention', () => {
  it('authored ≠ received: relay A mutates the version B actually gets, with lineage', () => {
    const world = provingWorld('proof-a-lineage');
    playCrownA(world, at(1, 0));

    const record = decoyRecord(world);
    expect(record.received, 'B physically received a version').not.toBeNull();
    const authored = record.authored.brief.mission;
    const received = record.received!.version.brief.mission;
    expect(authored.kind).toBe('shape');
    expect(received.kind).toBe('shape');
    if (authored.kind !== 'shape' || received.kind !== 'shape') throw new Error('shape');

    // (2) authored and received DIFFER, and the difference is the relay's own registered trait.
    expect(authored.payload.claim.count).toBeNull();
    expect(received.payload.claim.count).toBe(3);           // numberer: "there were three of them"
    expect(stableStringify(received)).not.toBe(stableStringify(authored));
    // …with lineage: who changed it, and exactly which field.
    expect(record.received!.version.changedBy).toBe('relay');
    expect(record.received!.version.changes).toEqual([
      { field: 'brief.mission.payload.claim.count', from: null, to: 3 },
    ]);
    expect(record.received!.version.parent).not.toBeNull();
    expect(record.received!.handoffFrom).toBe('relay');
    // …and the decoy AIM survived transit: a numberer cannot move a subject.
    expect(received.payload.claim.subject).toBe('mira');
  });

  it('B reports the RECEIVED version, and a stranded copy leaves the enemy mind untouched', () => {
    // The control twin: identical in every way except that B and his handler never meet.
    const control = provingWorld('proof-a-control', { handlerMeeting: false });
    playCrownA(control, at(1, 0));
    const copies = messagesOf(control, 'handler-brief');
    expect(copies, 'the handler copy exists as a queued physical message').toHaveLength(1);
    const copy = copies[0]!;
    expect(copy.payload.kind).toBe('handler-brief');
    if (copy.payload.kind !== 'handler-brief') throw new Error('handler-brief');
    // (3) the copy carries what ARRIVED, not what was authored.
    const carried = copy.payload.version.brief.mission;
    if (carried.kind !== 'shape') throw new Error('shape');
    expect(carried.payload.claim.count).toBe(3);
    expect(carried.payload.claim.subject).toBe('mira');
    expect(copy.payload.sourceDirectiveId).toBe(decoyRecord(control).id);
    // (4) …and while it is stranded the enemy mind has not moved by one byte: not its evidence,
    //     not its sketch, and not one of its decisions. Compared against a twin whose player never
    //     issued anything at all, so this is byte-equality with an untouched mind, not self-equality.
    expect(copy.deliveredAt).toBeNull();
    const untouched = provingWorld('proof-a-control', { handlerMeeting: false });
    runLogOn(untouched, RULES, [], at(1, 0));
    expect(control.enemy.evidence).toEqual([]);
    expect(control.enemy.sketch.map((f) => f.id)).toEqual(['sf0', 'sf1']);
    expect(stableStringify(control.enemy.evidence)).toBe(stableStringify(untouched.enemy.evidence));
    expect(stableStringify(control.enemy.sketch)).toBe(stableStringify(untouched.enemy.sketch));
    expect(stableStringify(control.enemy.decisions)).toBe(stableStringify(untouched.enemy.decisions));
    expect(stableStringify(enemyDigest(control.enemy, 1, RULES)))
      .toBe(stableStringify(enemyDigest(untouched.enemy, 1, RULES)));
  });

  it('(3) B\'s own low-scrutiny profile elects to report; the copy is queued, never teleported', () => {
    const world = provingWorld('proof-a-profile', { handlerMeeting: false });
    playCrownA(world, at(1, 0));
    const record = decoyRecord(world);
    // The profile is the evaluator's own, computed from what arrived — a POSTCONDITION reading.
    expect(perceivedScrutiny(world, 'mole', 'you', 15)).toBeLessThan(0.35);
    expect(record.decision).toMatchObject({ candor: 'doctored', commitment: 'attempt' });
    const copy = messagesOf(world, 'handler-brief')[0]!;
    expect(copy).toMatchObject({ principal: 'enemy', origin: 'mole', route: ['boss'] });
    // Queueing alone is inert: no enemy evidence, and the digest is byte-identical to a world whose
    // player never issued anything at all.
    expect(world.enemy.evidence).toEqual([]);
    const untouched = provingWorld('proof-a-profile', { handlerMeeting: false });
    expect(stableStringify(enemyDigest(world.enemy, 1, RULES)))
      .toBe(stableStringify(enemyDigest(untouched.enemy, 1, RULES)));
  });

  it('the whole chain runs: lead → travelling order → worked nights → runaround → tail drop', () => {
    const world = provingWorld('proof-a-chain');
    playCrownA(world, at(1, 0));

    // (5) the FIRST real handler contact delivered the content-bearing copy — not a later one:
    //     the copy has been queued and carriable since the morning, and lands on the very first
    //     beat of the ONE window in which B and his handler physically share a room.
    const copy = messagesOf(world, 'handler-brief')[0]!;
    expect(copy.deliveredAt).not.toBeNull();
    expect(dayOf(copy.deliveredAt!)).toBe(0);
    expect(copy.availableAfter).toBeLessThan(HANDLER_MEETING.from);
    expect(copy.deliveredAt!).toBe(HANDLER_MEETING.from);
    const captured = world.enemy.evidence.filter((e) => e.kind === 'network');
    expect(captured).toHaveLength(1);
    expect(captured[0]!.network.messageId).toBe(copy.id);
    expect(captured[0]!.observer).toBe('boss');

    // (6) the digest's lead binds, by the decoy-precedence rule, to the RECEIVED claim subject.
    const lead = world.enemy.sketch.find((f) => f.kind === 'carrier-profile');
    expect(lead).toMatchObject({
      kind: 'carrier-profile', subject: 'mira', district: 'd0', family: 'f-decoy', day: 0,
    });
    expect(lead!.evidence.map((row) => row.messageId)).toEqual([copy.id]);

    // …and the order the lead bought is HQ paperwork until it physically reaches its guard.
    const watch = orderRecord(world, 'watch:d0');
    expect(watch, 'the enemy issued a watch order').toBeDefined();
    expect(watch!).toMatchObject({ principal: 'enemy', principalId: 'boss', recipient: 'gale' });
    expect(watch!.received, 'not received yet at day 1 00:00').toBeNull();
    expect(world.scheduleOverrides['gale'] ?? [], 'the guard has heard nothing').toEqual([]);
    expect(world.enemy.actionLedger ?? []).toEqual([]);

    // (7) delivered, the order spends REAL watch nights on the decoy subject, and the guard's
    //     'watch-worked' reports physically return to HQ through the reply route.
    runLogOn(world, RULES, [], at(4, 0));
    expect(watch!.received, 'the guard physically received it').not.toBeNull();
    expect(world.scheduleOverrides['gale']).toEqual([expect.objectContaining({
      venue: 'plaza', source: 'enemy', sourceRef: 'order:watch:d0:gale',
    })]);
    for (const day of [1, 2, 3]) {
      expect(positionOf(world, world.npcs.gale!, day * TICKS_PER_DAY + WATCH.from + 30)).toBe('plaza');
    }
    const ledger = world.enemy.actionLedger ?? [];
    expect(ledger).toEqual([expect.objectContaining({
      orderKey: 'watch:d0', kind: 'watch', subject: 'mira', about: { family: 'f-decoy' },
      district: 'd0', scheduleStartDay: 1, posts: [{ guard: 'gale', venue: 'plaza' }],
    })]);
    expect(ledger[0]!.workedDays).toEqual([1, 2, 3]);
    const worked = reportsFor(world, watch!.id).filter((m) =>
      m.payload.kind === 'directive-report' && m.payload.enemyAction?.kind === 'watch-worked');
    expect(worked.length).toBeGreaterThanOrEqual(2);
    for (const report of worked) {
      expect(report.deliveredAt, `${report.id} came home`).not.toBeNull();
      expect(report.route).toEqual(['boss']);
    }

    // (8) two REPORTED unproductive nights bought exactly one runaround and one tail drop…
    const runarounds = world.enemy.sketch.filter((f) => f.kind === 'runaround');
    expect(runarounds).toHaveLength(1);
    expect(runarounds[0]).toMatchObject({ subject: 'mira', district: 'd0', family: 'f-decoy', day: 3 });
    expect(world.enemy.decisions.flatMap((d) => d.tailDrops ?? [])).toEqual([{
      leadFeatureId: ledger[0]!.leadFeatureId, subject: 'mira', district: 'd0',
      watchStartDay: 1, untilDay: 5,
    }]);

    // …whose cancel-watch directive travels back OUT, and is still only paperwork.
    const cancel = orderRecord(world, 'cancel:watch:d0:gale');
    expect(cancel, 'the tail drop travels as a cancel-watch directive').toBeDefined();
    expect(cancel!).toMatchObject({ principal: 'enemy', principalId: 'boss', recipient: 'gale' });
    expect(cancel!.authored.brief.application).toMatchObject({
      kind: 'cancel-watch', district: 'd0', guard: 'gale', venue: 'plaza', startDay: 1,
    });
    expect(cancel!.received, 'the guard has not heard the stand-down yet').toBeNull();
    expect(world.scheduleOverrides['gale']!.some((row) =>
      row.sourceRef === 'order:watch:d0:gale')).toBe(true);
    expect(positionOf(world, world.npcs.gale!, at(4, 0) + WATCH.from + 30)).toBe('plaza');
    expect(world.enemy.actionLedger![0]!.posts).toEqual([{ guard: 'gale', venue: 'plaza' }]);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);

    // …only its DELIVERY makes the guard stand down, and only the RETURNING report moves the books.
    runLogOn(world, RULES, [], at(5, 0));
    expect(cancel!.received).not.toBeNull();
    expect((world.scheduleOverrides['gale'] ?? []).some((row) =>
      row.sourceRef === 'order:watch:d0:gale')).toBe(false);
    expect(positionOf(world, world.npcs.gale!, at(4, 0) + WATCH.from + 30)).toBe('square');
    const cancelled = reportsFor(world, cancel!.id);
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0]!.payload).toMatchObject({
      enemyAction: { kind: 'watch-cancelled', guard: 'gale', venue: 'plaza',
        district: 'd0', scheduleStartDay: 1 },
    });
    expect(cancelled[0]!.deliveredAt).not.toBeNull();
    expect(world.enemy.actionLedger![0]!.posts).toEqual([]);
    expect(world.enemy.watchedDistricts).toEqual([]);

    // (9) the consequential second channel completed while all that attention was spent.
    const consequence = recordsOf(world).find((row) => row.recipient === 'worker')!;
    expect(consequence.execution).toMatchObject({ state: 'completed' });
    expect(Object.values(world.claims).some((c) => c.family === 'f-consequence')).toBe(true);
    expect(consequence.receivedReports.map((row) => row.report.outcome)).toEqual(['story emitted']);
  });

  it('(10) the control twin buys the enemy no lead, no order, no runaround, and no tail drop', () => {
    const control = provingWorld('proof-a-chain', { handlerMeeting: false });
    playCrownA(control, RUN_UNTIL);
    expect(control.enemy.evidence).toEqual([]);
    expect(control.enemy.sketch.map((f) => f.id)).toEqual(['sf0', 'sf1']);
    expect(control.enemy.actionLedger ?? []).toEqual([]);
    expect(control.enemy.watchedDistricts).toEqual([]);
    expect(orderRecord(control, 'watch:d0')).toBeUndefined();
    expect(orderRecord(control, 'cancel:watch:d0:gale')).toBeUndefined();
    expect(control.enemy.decisions.flatMap((d) => d.tailDrops ?? [])).toEqual([]);
    // …while the SAME consequential channel still completed: the twin is not simply inert.
    const consequence = recordsOf(control).find((row) => row.recipient === 'worker')!;
    expect(consequence.execution).toMatchObject({ state: 'completed' });
  });

  it('both live worlds replay from the successful log to the same hashes', () => {
    for (const handlerMeeting of [true, false]) {
      const label = `handlerMeeting=${handlerMeeting}`;
      const live = provingWorld('proof-a-replay', { handlerMeeting });
      playCrownA(live, RUN_UNTIL);
      const replay = runLogOn(
        provingWorld('proof-a-replay', { handlerMeeting }), RULES, PLAYER_LOG, RUN_UNTIL,
      );
      expect(hashWorld(replay), label).toBe(hashWorld(live));
      expect(stableStringify(replay.enemy), label).toBe(stableStringify(live.enemy));
    }
  });

  it('no action was chosen from hidden state — the decision surface carries none of it', () => {
    const world = provingWorld('proof-a-blind');
    const offer = requestLocalOffer(world);
    assertBlind('the decision surface', playerFacing(world, offer));
    chooseLocalAndAdvance(world, offer, offer.token, [DECOY_ACTION]);
    runLogOn(world, RULES, PLAYER_LOG.slice(1), RUN_UNTIL);
    // …and it still carries none of it after the whole hidden chain has run.
    assertBlind('the post-run player surface', playerFacing(world, null));

    // Non-vacuity: the hidden chain really ran, and the raw world DOES carry the keys this world
    // can grow (the recruitment-only names are proven non-vacuously in E2E B's twin scan).
    expect(world.enemy.sketch.some((f) => f.kind === 'runaround')).toBe(true);
    const rawKeys = jsonKeys(JSON.parse(stableStringify(world)));
    const GROWN_HERE = ['turned', 'received', 'receivedReports', 'decision', 'execution', 'candor',
      'commitment', 'initiative', 'sketch', 'actionLedger', 'watchedDistricts',
      'issuedDirectiveIds', 'deliveredAt', 'failedAt', 'nextHop', 'processedRelayHops',
      'leadFeatureId'];
    expect(GROWN_HERE.filter((name) => !rawKeys.has(name))).toEqual([]);
    expect(GROWN_HERE.filter((name) => !HIDDEN_KEYS.includes(name))).toEqual([]);
    // FIRING PROOF: the same scan refuses a surface carrying one hidden key or one hidden word.
    expect(() => assertBlind('planted key', { rows: [{ turned: false }] })).toThrow();
    expect(() => assertBlind('planted word', { note: 'watchedDistricts' })).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// E2E B — context is the only explanation for a hesitant recruit.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** Prepend a day-0 window override so a pinned person steps out for exactly that block (T11 idiom). */
function excursion(world: WorldState, id: EntityId, venue: VenueId, from: number, to: number): void {
  const row: ScheduleOverride = {
    fromDay: 0, toDay: 1, from, to, venue, source: 'player', sourceRef: `test:excursion:${id}`,
  };
  world.scheduleOverrides[id] = [row, ...(world.scheduleOverrides[id] ?? [])];
}

/** The one handler window: 60..120 on day 0, while the candidate is still thinking. */
const HANDLER_WINDOW = { from: 60, until: 120 };

/**
 * The twins. IDENTICAL seed and IDENTICAL staging: cass trusts the avatar at 0.3 (so money's +1
 * lands her score in the hesitate band) and the spymaster at 0.9 (so her own initial profile reports
 * the approach). The ONE difference is whether she ever physically stands in the same room as him.
 */
function hesitantTwin(compromised: boolean): WorldState {
  const world = recruitWorld('plan11-hesitant');
  pin(world, 'square', 'you', 'cass');
  pin(world, 'annex', 'sly');
  trust(world, 'cass', 'you', 0.3);
  trust(world, 'cass', 'sly', 0.9);
  if (compromised) excursion(world, 'cass', 'annex', HANDLER_WINDOW.from, HANDLER_WINDOW.until);
  return world;
}

const RECRUIT_CASS: LocalActionIntent = {
  kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null,
};

/** The avatar walks out before the decision day and comes back the next morning. */
const AWAY_LOG: ActionLog = [
  { tick: 15, kind: 'goTo', venue: 'safehouse' },
  { tick: TICKS_PER_DAY + 15, kind: 'goTo', venue: 'square' },
];

/** …and the same log with a legitimate eyewitness leg through the handler's room. */
const WITNESS_LOG: ActionLog = [
  { tick: HANDLER_WINDOW.from, kind: 'goTo', venue: 'annex' },
  { tick: HANDLER_WINDOW.until, kind: 'goTo', venue: 'safehouse' },
  { tick: TICKS_PER_DAY + 15, kind: 'goTo', venue: 'square' },
];

/** The first conversation beat after the avatar walks back into her circle. */
const RETURN_TICK = TICKS_PER_DAY + 45;

/** (1) the direct offered-beat approach, then the rest of the day-0/day-1 branch, autonomously. */
function playRecruitment(world: WorldState, log: ActionLog = AWAY_LOG): WorldState {
  const offer = requestLocalOffer(world);
  expect(offer.tick).toBe(0);
  expect(offer.circleMembers).toContain('cass');
  chooseLocalAndAdvance(world, offer, offer.token, [RECRUIT_CASS]);
  return runLogOn(world, RULES, log, RETURN_TICK);
}

/**
 * What the player actually observed, with the transport serial dropped. `messageId` associates and
 * dedupes; the constraints' speech law says such metadata "may associate and dedupe but never
 * creates principal knowledge", no selector or panel exposes it, and `recruitmentHistoryView`
 * projects it away. The twins' divergence on exactly that field — and nothing else — is asserted
 * explicitly below rather than papered over.
 */
const observedContext = (world: WorldState): string => stableStringify(
  (world.intel.network ?? []).map(({ tick, venue, via, overheard, speaker, addressedTo, spoken }) =>
    ({ tick, venue, via, overheard, speaker, addressedTo, spoken })),
);

/** Every player-facing surface the twins must share, byte for byte — markup included. */
interface FacingSurfaces {
  history: string;
  networkView: string;
  directiveView: string;
  observedContext: string;
  informants: string;
  networkPanel: string;
  directivesPanel: string;
}

function facingSurfaces(world: WorldState): FacingSurfaces {
  const view = networkView(world);
  const history = recruitmentHistoryView(world);
  const desk = directiveView(world);
  return {
    history: stableStringify(history),
    networkView: stableStringify(view),
    directiveView: stableStringify(desk),
    observedContext: observedContext(world),
    informants: stableStringify(world.intel.informants),
    networkPanel: renderToStaticMarkup(createElement(Network, { view, history })),
    directivesPanel: renderToStaticMarkup(createElement(Directives, { view: desk })),
  };
}

/** A harmless standing order: watch the room you are already standing in, and tell me everything. */
const HARMLESS_BRIEF: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
  priority: 'urgent', authority: 'office', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: RETURN_TICK, until: at(3, 0) },
  report: 'full', reportBy: RETURN_TICK + 45, purpose: null,
};

/** Issue it identically in a twin, at that twin's own next offered beat. */
function issueHarmless(world: WorldState): LocalOffer {
  // Identical staging in both twins: the enrolled asset now trusts her handler enough to be asked
  // for a reasoned report at all (`disclosure.reason` needs relationship >= 0.40).
  trust(world, 'cass', 'you', 0.8);
  const offer = requestLocalOffer(world);
  expect(offer.circleMembers).toContain('cass');
  chooseLocalAndAdvance(world, offer, offer.token, [{
    kind: 'directive', recipient: 'cass',
    handoff: { outboundVia: [], reportVia: [] }, brief: HARMLESS_BRIEF,
  }]);
  return offer;
}

describe('E2E B — context is the only explanation for a hesitant recruit', () => {
  it('one deterministic visible branch: approach → asks for time → accepts on a physical return', () => {
    for (const compromised of [false, true]) {
      const label = `compromised=${compromised}`;
      const world = hesitantTwin(compromised);
      const offer = requestLocalOffer(world);
      chooseLocalAndAdvance(world, offer, offer.token, [RECRUIT_CASS]);

      // (2) the target visibly asks for time — and that is all the player is told.
      expect(recruitmentHistoryView(world).map((row) => `${row.stage}:${row.response}`), label)
        .toEqual(['approach:null', 'answer:hesitate']);

      // (5) the avatar walks away before she decides, so her answer has to travel.
      runLogOn(world, RULES, [AWAY_LOG[0]!], TICKS_PER_DAY + 15);
      expect(world.network.directiveState!.recruitmentApproaches[0]!.status, label)
        .toBe('answer-in-transit');
      expect(assetFor(world, 'player', 'cass'), label).toBeNull();
      expect(recruitmentHistoryView(world), label).toHaveLength(2);   // nothing appeared while away
      expect(world.scenario!.status, label).toBe('running');          // and no session stop

      // (6) the player receives it in person, and an ORDINARY roster entry appears.
      runLogOn(world, RULES, [AWAY_LOG[1]!], RETURN_TICK);
      const rows = recruitmentHistoryView(world);
      expect(rows.map((row) => `${row.stage}:${row.response}`), label)
        .toEqual(['approach:null', 'answer:hesitate', 'answer:accept']);
      expect(rows.at(-1)!.tick, label).toBeGreaterThan(TICKS_PER_DAY);
      expect(assetFor(world, 'player', 'cass')!.mice, label).toBe('money');
      expect(networkView(world).assets.map((a) => a.id), label).toContain('cass');
    }
  });

  it('(7) the twins are BYTE-IDENTICAL to the player — selectors and rendered markup alike', () => {
    const honest = playRecruitment(hesitantTwin(false));
    const compromised = playRecruitment(hesitantTwin(true));
    // Non-vacuity first: the surfaces really carry the lifecycle, and the desk really has a row.
    issueHarmless(honest);
    issueHarmless(compromised);
    const left = facingSurfaces(honest);
    const right = facingSurfaces(compromised);
    expect(JSON.parse(left.history)).toHaveLength(3);
    expect(JSON.parse(left.networkView).assets).toHaveLength(1);
    expect(JSON.parse(left.directiveView).rows).toHaveLength(1);
    expect(left.networkPanel).toContain('cass');
    expect(left.directivesPanel).toContain('cass');

    for (const key of Object.keys(left) as (keyof FacingSurfaces)[]) {
      expect(right[key], `the twins differ on ${key}`).toBe(left[key]);
    }
    // …and no surface names a category, a grade, or a reason. ('turned' is matched as a whole word
    // so a lawful "returned reports" heading is prose, not a read — the turncoat-pillar precedent.)
    for (const [key, surface] of Object.entries(left)) {
      expect(surface, `${key} says "turned"`).not.toMatch(/\bturned\b/);
      for (const banned of ['compromised', 'protectedRole', 'enemyLinked', 'isTurnedAsset',
        'eligible', 'because', 'loyal', 'Loyal', 'reliab', 'Reliab']) {
        expect(surface, `${key} says "${banned}"`).not.toContain(banned);
      }
    }

    // The ONE thing that is not byte-stable across the twins is the transport SERIAL: the turncoat
    // twin's extra handler copy advances the message counter, so a later message wears a later id.
    // Prove it precisely — the observed rows are otherwise pairwise identical, and no selector or
    // panel above carries an id at all.
    const raw = (world: WorldState) => world.intel.network ?? [];
    expect(raw(compromised)).toHaveLength(raw(honest).length);
    const differing = raw(honest).map((row, index) => {
      const other = raw(compromised)[index]!;
      return [...new Set([...Object.keys(row), ...Object.keys(other)])].filter((key) =>
        stableStringify(row[key as keyof typeof row] ?? null)
          !== stableStringify(other[key as keyof typeof other] ?? null));
    }).flat();
    expect([...new Set(differing)]).toEqual(['messageId']);
  });

  it('(8) the hidden truth genuinely differs: only the compromised record is turned', () => {
    const honest = playRecruitment(hesitantTwin(false));
    const compromised = playRecruitment(hesitantTwin(true));
    expect(assetFor(honest, 'player', 'cass')!.turned).toBeUndefined();
    expect(assetFor(honest, 'enemy', 'cass')).toBeNull();
    expect(assetFor(compromised, 'player', 'cass')!.turned).toBe(true);
    expect(assetFor(compromised, 'enemy', 'cass')).not.toBeNull();
    expect(assetFor(compromised, 'enemy', 'cass')!.facts).toEqual([]);  // never a fabricated meeting
    expect(hashWorld(compromised)).not.toBe(hashWorld(honest));
    // …and the compromise happened at the physical meeting, not at queue time.
    const meeting = (compromised.network.directiveState?.messages ?? []).find((m) =>
      m.principal === 'enemy' && m.payload.kind === 'recruitment-approach');
    expect(meeting!.deliveredAt).toBeGreaterThanOrEqual(HANDLER_WINDOW.from);
    expect(meeting!.deliveredAt).toBeLessThanOrEqual(HANDLER_WINDOW.until);
  });

  it('(9) observed context differs ONLY when a player source really witnessed the meeting', () => {
    // Blind pair: nobody of yours is in that room, so there is nothing lawful to observe.
    const blindHonest = playRecruitment(hesitantTwin(false));
    const blindCompromised = playRecruitment(hesitantTwin(true));
    expect(stableStringify(blindCompromised.intel.network ?? []))
      .toBe(stableStringify(blindHonest.intel.network ?? []));
    expect(stableStringify(blindCompromised.intel.log)).toBe(stableStringify(blindHonest.intel.log));

    // Eyewitness pair: the SAME staging, plus an avatar who walks through the annex in that window.
    const seenHonest = playRecruitment(hesitantTwin(false), WITNESS_LOG);
    const seenCompromised = playRecruitment(hesitantTwin(true), WITNESS_LOG);
    const seen = (world: WorldState) => (world.intel.network ?? [])
      .filter((row) => row.spoken.kind === 'recruitment-approach' && row.overheard);
    expect(seen(seenHonest), 'nothing happened in the honest twin\'s annex').toEqual([]);
    const witnessed = seen(seenCompromised);
    expect(witnessed, 'the avatar physically watched her meet him').toHaveLength(1);
    expect(witnessed[0]!.spoken).toMatchObject({ kind: 'recruitment-approach', target: 'cass' });
    // Context, never a verdict: the witnessed row carries no category and no "why".
    const serialized = stableStringify(witnessed[0]);
    for (const banned of ['turned', 'protectedRole', 'enemyLinked', 'compromised', 'eligible',
      'reason', 'decided', 'status']) {
      expect(serialized, banned).not.toContain(banned);
    }

    // The observed context reaches the PUBLIC record too — as one more ordinary approach row, in
    // the room the avatar was standing in, at the minute he was standing there. Still no category,
    // still no reason: the game records context and leaves the "why" to the player.
    const honestRows = recruitmentHistoryView(seenHonest);
    const seenRows = recruitmentHistoryView(seenCompromised);
    expect(seenRows).toHaveLength(honestRows.length + 1);
    const extra = seenRows.filter((row) => !honestRows.some((other) =>
      stableStringify(other) === stableStringify(row)));
    expect(extra).toHaveLength(1);
    expect(extra[0]).toMatchObject({ stage: 'approach', target: 'cass', venue: 'annex', via: 'self' });
    expect(extra[0]!.tick).toBeGreaterThanOrEqual(HANDLER_WINDOW.from);
    expect(extra[0]!.tick).toBeLessThanOrEqual(HANDLER_WINDOW.until);
    expect(Object.keys(extra[0]!).sort())
      .toEqual(['recruiter', 'response', 'stage', 'target', 'tick', 'venue', 'via']);
    // …and the BLIND pair — the one the byte-identity proof uses — still shares its whole record.
    expect(stableStringify(recruitmentHistoryView(blindCompromised)))
      .toBe(stableStringify(recruitmentHistoryView(blindHonest)));
  });

  it('(10) a later harmless directive reports differently — and the desk still gives no reason', () => {
    const honest = playRecruitment(hesitantTwin(false));
    const compromised = playRecruitment(hesitantTwin(true));
    for (const world of [honest, compromised]) {
      issueHarmless(world);
      runLogOn(world, RULES, [], at(2, 0));
    }
    const reportOf = (world: WorldState) => directiveView(world).rows.at(-1)!.reports;
    const honestReport = reportOf(honest);
    const doctoredReport = reportOf(compromised);
    // The player physically received a report in BOTH worlds…
    expect(honestReport, 'the honest report came home').toHaveLength(1);
    expect(doctoredReport, 'the doctored report came home').toHaveLength(1);
    expect(honestReport[0]!.report.outcome).toBe(doctoredReport[0]!.report.outcome);
    // …and they differ in exactly the way a doctored channel differs — with no label saying so.
    expect(honestReport[0]!.report.reason).not.toBeNull();
    expect(doctoredReport[0]!.report.reason).toBeNull();
    expect(honestReport[0]!.report.evidence).not.toBeNull();
    expect(doctoredReport[0]!.report.evidence).toBeNull();
    expect(stableStringify(doctoredReport)).not.toBe(stableStringify(honestReport));

    const markup = renderToStaticMarkup(createElement(Directives, { view: directiveView(compromised) }));
    expect(markup).toContain('observed venue');            // the outcome the player did receive
    expect(markup).not.toContain('<dt>reason</dt>');       // …and no label for what never came back
    expect(markup).not.toContain('<dt>evidence</dt>');
    expect(markup, 'the desk must never say "turned"').not.toMatch(/\bturned\b/);
    for (const banned of ['compromised', 'doctored', 'because', 'unreliable']) {
      expect(markup, `the desk must never say "${banned}"`).not.toContain(banned);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// E2E B companion — the SAME asset may sound someone out, and may never enrol them.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

const MEETING = { venue: 'safehouse' as VenueId, from: at(1, 4), until: at(1, 4) + 15 };

interface SoundOutStage {
  /** cass → twin, the ONE relationship the candidate's own answer reads. */
  targetTrust: number;
  meeting: typeof MEETING | null;
  /** `null` is the plain cooperation ask, which offers nothing and costs nothing. */
  handle?: 'money' | null;
  log?: ActionLog;
  until?: number;
}

const soundOutBrief = (stage: SoundOutStage): DirectiveBrief => ({
  mission: {
    kind: 'sound-out', target: 'twin',
    topic: stage.handle === undefined ? 'cooperation' : 'recruitment',
    handle: stage.handle ?? null, meeting: stage.meeting,
  },
  priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'detailed',
  guidance: [], active: { from: RETURN_TICK, until: at(3, 0) },
  report: 'outcome', reportBy: RETURN_TICK + 60, purpose: null,
});

/** The asset E2E B just enrolled, now working as a recruiter, on a candidate she can really reach. */
function soundOutFrom(compromised: boolean, stage: SoundOutStage): WorldState {
  const world = playRecruitment(hesitantTwin(compromised));
  expect(assetFor(world, 'player', 'cass'), 'the companion starts from a real enrolment').not.toBeNull();
  pin(world, 'square', 'twin');                       // identical staging in both twins
  trust(world, 'twin', 'cass', stage.targetTrust);
  const offer = requestLocalOffer(world);
  expect(offer.circleMembers).toEqual(expect.arrayContaining(['cass', 'twin']));
  chooseLocalAndAdvance(world, offer, offer.token, [{
    kind: 'directive', recipient: 'cass',
    handoff: { outboundVia: [], reportVia: [] }, brief: soundOutBrief(stage),
  }]);
  return runLogOn(world, RULES, stage.log ?? [], stage.until ?? at(2, 0));
}

const soundOutRecord = (world: WorldState): DirectiveRecord => {
  const record = recordsOf(world).find((row) =>
    row.recipient === 'cass' && row.authored.brief.mission.kind === 'sound-out');
  expect(record, 'the sound-out directive record exists').toBeDefined();
  return record!;
};

/** The willingness the asset actually SAID, in the order it said it. */
const willingnessHeard = (world: WorldState): (string | null)[] =>
  soundOutRecord(world).receivedReports.map((row) => row.report.outcome);

const enrolmentFootprint = (world: WorldState): unknown => ({
  asset: assetFor(world, 'player', 'twin'),
  enemyAsset: assetFor(world, 'enemy', 'twin'),
  informants: world.intel.informants.map((row) => row.id).sort(),
  compartment: compartmentOf(world, 'player', 'twin'),
  roster: world.network.assets.map((row) => row.id).sort(),
});

/** The avatar walks to the safehouse for the arranged meeting and stands there through it. */
const ATTEND_LOG: ActionLog = [{ tick: at(1, 3), kind: 'goTo', venue: 'safehouse' }];

describe('E2E B companion — sound-out learns and arranges; it never enrols', () => {
  it('the enrolled asset learns willingness and arranges a real direct meeting', () => {
    for (const compromised of [false, true]) {
      const label = `compromised=${compromised}`;
      // Stopped BEFORE the arranged window: the invitation lifecycle is still open, so what is
      // asserted here is the arrangement itself and not its aftermath.
      const arranged = soundOutFrom(compromised, {
        targetTrust: 0.8, meeting: MEETING, handle: 'money', until: MEETING.from - 1,
      });

      // It LEARNED: a willingness report physically came back to the player.
      expect(willingnessHeard(arranged), label).toEqual(['willing']);

      // It ARRANGED: a real invitation the candidate answered for herself, and a real schedule row
      // that only her accepted reply wrote — the avatar was never scheduled by anybody.
      expect((arranged.network.invitations ?? []).at(-1), label).toMatchObject({
        kind: 'sound-out', principal: 'player', inviter: 'cass', counterparty: 'you',
        invitee: 'twin', venue: 'safehouse', status: 'accepted',
      });
      expect((arranged.scheduleOverrides['twin'] ?? []).some((row) => row.venue === 'safehouse'), label)
        .toBe(true);
      expect(arranged.scheduleOverrides['you'] ?? [], label).toEqual([]);
      expect(enrolmentFootprint(arranged), `${label}: arranged`).toEqual({
        asset: null, enemyAsset: null, informants: ['cass'], compartment: [], roster: ['cass'],
      });

      // …and the meeting is a REAL direct one: the avatar walks there, the candidate keeps the
      // appointment, and the moment is an opportunity — still nobody is enrolled by it.
      const attended = soundOutFrom(compromised, {
        targetTrust: 0.8, meeting: MEETING, handle: 'money',
        log: ATTEND_LOG, until: MEETING.until + 1,
      });
      const kept = (attended.network.invitations ?? []).at(-1)!;
      expect(kept.attendedAt, `${label}: the candidate kept the appointment`).toBe(MEETING.from);
      expect(kept.status, label).toBe('attended');
      expect(positionOf(attended, attended.npcs.twin!, MEETING.from), label).toBe('safehouse');
      expect(enrolmentFootprint(attended), `${label}: attended`).toEqual({
        asset: null, enemyAsset: null, informants: ['cass'], compartment: [], roster: ['cass'],
      });
    }
  });

  it('no willingness branch, and no twin, adds an asset record', () => {
    // The plain cooperation ask (`handle: null`) is the one form whose fit contributes nothing, so
    // the candidate's own relationship alone spans all three outward answers. Fixture choice only:
    // no threshold, formula or band is touched, and the labels below are the engine's own words.
    const branches: { label: string; targetTrust: number }[] = [
      { label: 'willing', targetTrust: 0.8 },
      { label: 'uncertain', targetTrust: 0.6 },
      { label: 'unwilling', targetTrust: 0.1 },
    ];
    for (const compromised of [false, true]) {
      for (const { label, targetTrust } of branches) {
        for (const meeting of [MEETING, null]) {
          const cell = `${label}/compromised=${compromised}/meeting=${meeting !== null}`;
          const world = soundOutFrom(compromised, { targetTrust, meeting });
          expect(willingnessHeard(world)[0] ?? null, `${cell}: outcome`).toBe(label);
          expect(enrolmentFootprint(world), cell).toEqual({
            asset: null, enemyAsset: null, informants: ['cass'], compartment: [],
            roster: ['cass'],
          });
        }
      }
    }
  });
});
