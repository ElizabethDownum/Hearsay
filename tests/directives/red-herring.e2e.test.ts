import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { at, dayOf, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyDirective } from '../../src/sim/actions';
import { positionOf } from '../../src/sim/agents';
import { applyEnemyDecision, captureEvidence, runEnemyDay } from '../../src/sim/counterintel';
import { enemyDigest } from '../../src/sim/enemy/digest';
import {
  RUNAROUND_COOLDOWN_DAYS, WATCH,
  type EnemyDecision, type SketchFeature, type TailDrop,
} from '../../src/sim/enemy/state';
import {
  attemptDirective, markDirectiveDue, settleDirectiveApplications,
} from '../../src/sim/directives/execution';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type {
  DirectiveBrief, DirectiveRecord, NetworkMessage, NetworkSpeech,
} from '../../src/sim/directives/types';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import type { TickEvents } from '../../src/sim/perception';
import { stepTransaction } from '../../src/sim/phases';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import type { Npc, ScheduleOverride, TownFixture, WorldState } from '../../src/sim/types';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';

/**
 * Task 12 crown e2e — a lawfully delivered FALSE LEAD spends enemy attention.
 *
 * Every seam here is the real one: the player's own `applyDirective`, the physical hop that carries
 * it, the turncoat's handler copy, the spymaster's own captured observation, the pure digest, the
 * enemy's own physically travelling watch order, two real worked nights that come home as reports,
 * and then the cancellation that must ALSO travel. Nothing teleports, and no test forces a hook the
 * production path lacks.
 */
const RULES = STANDARD_RULES;

const npc = (id: string, home: string, occupation = 'grocer'): Npc => ({
  id, name: id, home, occupation, faction: 'none', traits: ['literalist'],
  rivals: [], schedule: [{ days: 'all', from: 0, to: 1439, venue: home }], edges: [],
});

/**
 * Redherringford. Two PUBLIC d0 venues so the digest's own lexicographic post pick ('plaza') is NOT
 * the guard's ordinary place ('square') — that is what makes "the guard leaves the post" observable
 * through real `positionOf` rather than an assertion about an override row.
 */
const FIXTURE: TownFixture = {
  venues: [
    { id: 'plaza', district: 'd0', access: 'public' },
    { id: 'square', district: 'd0', access: 'public' },
    { id: 'backroom', district: 'd0', access: 'invitational' },
    { id: 'home-mira', district: 'd0', access: 'private' },
    { id: 'lane', district: 'd1', access: 'public' },
  ],
  npcs: [
    npc('boss', 'square', 'clerk'),   // the embodied spymaster
    npc('gale', 'square', 'guard'),   // the enemy's one observer — ordinarily at 'square'
    npc('mira', 'home-mira'),         // the decoy subject the false brief names
    npc('mole', 'square'),            // the player's asset, secretly turned
  ],
};

/** The unrelated enemy override the cancellation must leave alone. */
const UNRELATED: ScheduleOverride = {
  fromDay: 0, toDay: 30, from: 0, to: 60, venue: 'backroom',
  source: 'enemy', sourceRef: 'order:watch:d9:gale',
};

function staged(seed: string): WorldState {
  const world = buildWorld(FIXTURE, seed, RULES);
  world.enemy.map = buildTownMap(FIXTURE);
  world.enemy.observers = [{ id: 'gale', vigilance: 1 }];
  world.network.spymaster = 'boss';
  world.network.enemyAssets.push({ id: 'gale', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  enrollPlayer(world, { home: 'square' });
  world.network.assets.push({
    id: 'mole', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true,
  });
  world.npcs.mole!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });
  world.npcs.gale!.edges.push({ to: 'boss', kind: 'colleague', trust: 0.8 });
  world.scheduleOverrides.gale = [{ ...UNRELATED }];

  // Prerequisites the runaround chain does not test, staged the accepted way (through
  // applyEnemyDecision, so featureCounter stays coherent): ONE origin-vague anywhere (heuristic 8's
  // gate) plus one subject-less d0 feature, so the arriving brief lead is the second d0 feature AND
  // the only subject-bearing one in that district.
  const prerequisites: SketchFeature[] = [
    { id: 'sf0', kind: 'origin-vague', day: 0, family: 'fs', subject: 'ghost', district: 'd1',
      detail: 'staged prerequisite: the enemy already has a vague answer on file',
      evidence: [{ tick: 0, observer: 'gale', claimId: 'c-stage', messageId: null }] },
    { id: 'sf1', kind: 'district-activity', day: 0, family: 'fs', subject: null, district: 'd0',
      detail: 'staged prerequisite: d0 already smells of something',
      evidence: [{ tick: 0, observer: 'gale', claimId: 'c-stage', messageId: null }] },
  ];
  applyEnemyDecision(world, { day: 0, features: prerequisites, inquiries: [], watches: [], interrogations: [] });
  world.enemy.inquiriesIssued.push('s:ghost'); // the staged vague answer is already asked about
  return world;
}

/** A believable shape brief naming mira — and aimed at an audience mole can never reach. */
const DECOY_BRIEF: DirectiveBrief = {
  mission: {
    kind: 'shape', operation: 'spread', redirectTo: null,
    audience: { kind: 'person', id: 'mira' },
    payload: { family: 'f-decoy', parent: null, claim: { subject: 'mira', predicate: 'stole',
      object: null, count: 2, severity: 4, place: null, attribution: SOMEONE } },
  },
  priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: 0, until: at(0, 23, 59) },
  report: 'outcome', reportBy: null, purpose: null,
};

const eventsFor = (speech: NetworkSpeech): TickEvents => ({
  tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
});

const circle = (venue: string, ...members: EntityId[]) => ({ venue, members });

const messagesOf = (world: WorldState, kind: NetworkMessage['payload']['kind']): NetworkMessage[] =>
  (world.network.directiveState?.messages ?? []).filter((m) => m.payload.kind === kind);

const reportsFor = (world: WorldState, id: string): NetworkMessage[] =>
  messagesOf(world, 'directive-report').filter((m) =>
    m.payload.kind === 'directive-report' && m.payload.directiveId === id);

function recordWithKey(world: WorldState, orderKey: string): DirectiveRecord {
  const record = world.network.directiveState!.records.find((row) =>
    row.correlation?.kind === 'enemy-order' && row.correlation.orderKey === orderKey);
  expect(record, `an enemy order for '${orderKey}'`).toBeDefined();
  return record!;
}

function deliverTo(world: WorldState, message: NetworkMessage, venue: string, tick: number): NetworkSpeech {
  world.tick = tick;
  const to = message.route[message.nextHop]!;
  const speech = realizeNetworkForward(world, message.id, circle(venue, message.holder, to), tick, RULES);
  expect(speech, `${message.id} → ${to} at ${tick}`).not.toBeNull();
  return speech!;
}

/** Deliver the player's decoy brief to the turned asset; the handler copy is queued but stranded. */
function issueDecoy(world: WorldState): NetworkMessage {
  world.tick = 0;
  applyDirective(world, 'mole', { outboundVia: [], reportVia: [] }, DECOY_BRIEF, 0);
  const outbound = messagesOf(world, 'directive')[0]!;
  deliverTo(world, outbound, 'square', 0);
  const copies = messagesOf(world, 'handler-brief');
  expect(copies).toHaveLength(1);
  return copies[0]!;
}

/** The handler meeting: mole physically hands the received copy to the spymaster. */
function handOver(world: WorldState, copy: NetworkMessage, tick = at(1, 8)): void {
  const speech = deliverTo(world, copy, 'backroom', tick);
  captureEvidence(world, eventsFor(speech), RULES);
}

/** The nightly beat, then the physically issued orders it decided. */
function nightly(world: WorldState, day: number): EnemyDecision {
  world.tick = at(day, 23, 59);
  const decision = enemyDigest(world.enemy, day, RULES);
  applyEnemyDecision(world, decision);
  return decision;
}

/** Deliver the watch order, stand the post on `startDay` and `startDay + 1`, and report both home. */
function standTwoNights(world: WorldState, startDay: number): DirectiveRecord {
  const record = recordWithKey(world, 'watch:d0');
  const order = messagesOf(world, 'directive').find((m) =>
    m.payload.kind === 'directive' && m.payload.version.directiveId === record.id)!;
  deliverTo(world, order, 'square', at(startDay - 1, 23, 59) + 1);
  const due = record.decision!.timing.actAt!;
  world.tick = due;
  markDirectiveDue(world, record.id, due);
  attemptDirective(world, record.id, circle('square', 'gale', 'mole'), due, RULES);
  expect(record.execution).toMatchObject({ state: 'attempted' });

  for (const day of [startDay, startDay + 1]) {
    // Late enough in the window that the attempt tick is strictly earlier (Task 9's own
    // `changedAt < tick` latch: standing a post is never the same beat as accepting the order).
    const workedAt = day * TICKS_PER_DAY + WATCH.from + 120;
    world.tick = workedAt;
    settleDirectiveApplications(world, workedAt, RULES);
  }
  expect(record.execution!.workedDays).toEqual([startDay, startDay + 1]);
  for (const report of reportsFor(world, record.id)) {
    deliverTo(world, report, 'square', Math.max(report.availableAfter, at(startDay + 1, 20)));
  }
  return record;
}

/** Everything up to (but not including) the nightly that decides the runaround. */
function upToTwoWastedNights(seed: string): WorldState {
  const world = staged(seed);
  handOver(world, issueDecoy(world));
  const day1 = nightly(world, 1);
  expect(day1.watches).toEqual([expect.objectContaining({ district: 'd0', subject: 'mira' })]);
  standTwoNights(world, 2);
  return world;
}

const tailDropsOf = (decision: EnemyDecision): TailDrop[] | undefined => decision.tailDrops;

describe('the false brief travels, spends two nights, and buys a runaround', () => {
  it('a stranded handler copy leaves the enemy mind untouched; the handler meeting seeds the lead', () => {
    const control = staged('rh-control');
    issueDecoy(control);
    const beforeContact = stableStringify(control.enemy);
    expect(stableStringify(enemyDigest(control.enemy, 1, RULES)))
      .toBe(stableStringify(enemyDigest(staged('rh-control').enemy, 1, RULES)));
    expect(control.enemy.evidence).toHaveLength(0);
    // The control never meets its handler: no capture, no lead, no watch, ever.
    const controlNight = nightly(control, 1);
    expect(controlNight.features).toEqual([]);
    expect(controlNight.watches).toEqual([]);
    expect(stableStringify({ evidence: control.enemy.evidence })).toBe(
      stableStringify({ evidence: JSON.parse(beforeContact).evidence }));

    const met = staged('rh-control');
    handOver(met, issueDecoy(met));
    expect(met.enemy.evidence).toHaveLength(1);
    const night = nightly(met, 1);
    expect(night.features).toEqual([expect.objectContaining({
      kind: 'carrier-profile', subject: 'mira', district: 'd0', family: 'f-decoy',
    })]);
    // The captured copy is the ONLY thing the lead rests on — a resolvable network ref.
    expect(night.features[0]!.evidence).toEqual([{
      tick: at(1, 8), observer: 'boss', claimId: null,
      messageId: messagesOf(met, 'handler-brief')[0]!.id,
    }]);
    expect(night.watches).toEqual([expect.objectContaining({
      district: 'd0', subject: 'mira', about: { family: 'f-decoy' },
      leadFeatureId: night.features[0]!.id,
    })]);
  });

  it('two unproductive worked nights emit exactly one runaround and one tail drop', () => {
    const world = upToTwoWastedNights('rh-full');
    const ledger = world.enemy.actionLedger!;
    expect(ledger).toEqual([expect.objectContaining({
      orderKey: 'watch:d0', kind: 'watch', subject: 'mira', district: 'd0',
      scheduleStartDay: 2, workedDays: [2, 3], posts: [{ guard: 'gale', venue: 'plaza' }],
    })]);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);

    const decision = nightly(world, 4);
    expect(decision.features).toEqual([expect.objectContaining({
      kind: 'runaround', subject: 'mira', district: 'd0', family: 'f-decoy', day: 4,
    })]);
    expect(tailDropsOf(decision)).toEqual([{
      leadFeatureId: ledger[0]!.leadFeatureId, subject: 'mira', district: 'd0',
      watchStartDay: 2, untilDay: 4 + RUNAROUND_COOLDOWN_DAYS,
    }]);
    // The cancellation is a real physical order to the guard who actually stands there.
    const cancel = recordWithKey(world, 'cancel:watch:d0:gale');
    expect(cancel).toMatchObject({ principal: 'enemy', principalId: 'boss', recipient: 'gale' });
    expect(cancel.authored.brief).toMatchObject({
      priority: 'urgent', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      report: 'outcome', reportBy: null, purpose: null,
      mission: { kind: 'learn', target: { kind: 'venue', id: 'plaza' } },
      application: { kind: 'cancel-watch', district: 'd0', guard: 'gale', venue: 'plaza', startDay: 2 },
      active: { until: (4 + 7) * TICKS_PER_DAY - 1 },
    });
    expect(cancel.authored.brief.active.from).toBe(at(5, 0));
    expect(world.enemy.pendingOrders?.map((row) => row.key)).toContain('cancel:watch:d0:gale');
    // Still only HQ's paperwork: the guard has not heard a word yet.
    expect(world.scheduleOverrides.gale!.some((row) => row.sourceRef === 'order:watch:d0:gale')).toBe(true);
  });

  it('the composed loop is replay-exact: the same seed and script reproduce it byte for byte', () => {
    const a = upToTwoWastedNights('rh-replay');
    const b = upToTwoWastedNights('rh-replay');
    nightly(a, 4);
    nightly(b, 4);
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(stableStringify(b.enemy)).toBe(stableStringify(a.enemy));
  });

  it('the PRODUCTION path (stepTransaction) reaches runaround emission and tail-drop issuance', () => {
    const world = upToTwoWastedNights('rh-production');
    world.tick = at(4, 23, 59);
    stepTransaction(world, RULES);
    const decision = world.enemy.decisions.at(-1)!;
    expect(decision.features.some((f) => f.kind === 'runaround')).toBe(true);
    expect(tailDropsOf(decision)).toHaveLength(1);
    expect(recordWithKey(world, 'cancel:watch:d0:gale')).toBeDefined();
  });
});

// ── Tail-drop delivery twins: the original watch working, the tail drop decided, and then the
// three ways the CHANNEL can answer. HQ's ledger and the street are allowed to disagree. ──

function tailDropDecided(seed: string): { world: WorldState; cancel: NetworkMessage } {
  const world = upToTwoWastedNights(seed);
  nightly(world, 4);
  const record = recordWithKey(world, 'cancel:watch:d0:gale');
  const cancel = messagesOf(world, 'directive').find((m) =>
    m.payload.kind === 'directive' && m.payload.version.directiveId === record.id)!;
  return { world, cancel };
}

const galeAt = (world: WorldState, tick: number): string =>
  positionOf(world, world.npcs.gale!, tick);

const POST_WINDOW = at(5, 0) + WATCH.from + 15;

describe('(a) the cancellation is delivered — the guard really leaves the post', () => {
  it('removes exactly its own override, and only the returning receipt moves HQ\'s books', () => {
    const { world, cancel } = tailDropDecided('rh-twin-a');
    expect(galeAt(world, POST_WINDOW)).toBe('plaza'); // still standing it

    deliverTo(world, cancel, 'square', at(5, 0));
    const record = recordWithKey(world, 'cancel:watch:d0:gale');
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    attemptDirective(world, record.id, circle('square', 'gale', 'mole'), due, RULES);

    // Real world reality: the post override is gone, the UNRELATED enemy override survives, and
    // `positionOf` puts the guard back at his ordinary place next window.
    expect(world.scheduleOverrides.gale).toEqual([UNRELATED]);
    expect(galeAt(world, POST_WINDOW)).toBe('square');

    // HQ still believes the post is staffed until the receipt physically arrives.
    expect(world.enemy.actionLedger![0]!.posts).toEqual([{ guard: 'gale', venue: 'plaza' }]);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);

    const report = reportsFor(world, record.id);
    expect(report).toHaveLength(1);
    expect(report[0]!.payload).toMatchObject({
      enemyAction: { kind: 'watch-cancelled', guard: 'gale', venue: 'plaza',
        district: 'd0', scheduleStartDay: 2 },
    });
    deliverTo(world, report[0]!, 'square', Math.max(report[0]!.availableAfter, at(5, 20)));
    expect(world.enemy.actionLedger![0]!.posts).toEqual([]);
    expect(world.enemy.watchedDistricts).toEqual([]);
    expect(world.enemy.pendingOrders?.map((row) => row.key) ?? [])
      .not.toContain('cancel:watch:d0:gale');
  });
});

describe('(b) spymaster and guard separated — HQ\'s books move, the street does not', () => {
  it('changes EnemyState only by the lawful issuance bookkeeping, and the guard keeps standing', () => {
    const world = upToTwoWastedNights('rh-twin-b');
    const before = JSON.parse(stableStringify(world.enemy)) as Record<string, unknown>;
    const galeBefore = stableStringify(world.scheduleOverrides.gale);
    nightly(world, 4);
    const after = JSON.parse(stableStringify(world.enemy)) as Record<string, unknown>;

    const show = (value: unknown): string => stableStringify(value === undefined ? null : value);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((key) => show(before[key]) !== show(after[key])).sort();
    // The ONLY lawful movement is the bookkeeping `applyEnemyDecision` writes for an issuance.
    const LAWFUL = ['decisions', 'digestedThrough', 'featureCounter', 'issuedDirectiveIds',
      'pendingOrders', 'sketch'];
    expect(changed.filter((key) => !LAWFUL.includes(key))).toEqual([]);
    expect(changed).toContain('pendingOrders');       // non-vacuous: the reservation really landed
    expect(changed).toContain('issuedDirectiveIds');
    // The street is untouched: ledger row, markers, watched districts, and the real schedule.
    expect(stableStringify(after.actionLedger)).toBe(stableStringify(before.actionLedger));
    expect(stableStringify(after.watchedDistricts)).toBe(stableStringify(before.watchedDistricts));
    expect(stableStringify(after.interrogated)).toBe(stableStringify(before.interrogated));
    expect(stableStringify(world.scheduleOverrides.gale)).toBe(galeBefore);
    expect(galeAt(world, POST_WINDOW)).toBe('plaza'); // he never heard; he keeps the post

    // No second cancellation issues while the first is in transit.
    const keyed = () => world.network.directiveState!.records.filter((row) =>
      row.correlation?.kind === 'enemy-order' && row.correlation.orderKey === 'cancel:watch:d0:gale');
    expect(keyed()).toHaveLength(1);
    world.enemy.sketch = world.enemy.sketch.filter((f) => f.kind !== 'runaround');
    applyEnemyDecision(world, { ...nightlyDecisionFor(world, 5), day: 5 });
    expect(keyed()).toHaveLength(1);

    // Non-vacuity: the delivered twin really does move the very things this twin froze.
    const delivered = tailDropDecided('rh-twin-b-nonvacuous');
    deliverTo(delivered.world, delivered.cancel, 'square', at(5, 0));
    const record = recordWithKey(delivered.world, 'cancel:watch:d0:gale');
    const due = record.decision!.timing.actAt!;
    delivered.world.tick = due;
    markDirectiveDue(delivered.world, record.id, due);
    attemptDirective(delivered.world, record.id, circle('square', 'gale', 'mole'), due, RULES);
    expect(stableStringify(delivered.world.scheduleOverrides.gale)).not.toBe(galeBefore);
    expect(galeAt(delivered.world, POST_WINDOW)).not.toBe(galeAt(world, POST_WINDOW));
  });
});

/** The digest the given day would produce — used to prove a SECOND night issues no reissue. */
function nightlyDecisionFor(world: WorldState, day: number): EnemyDecision {
  world.tick = at(day, 23, 59);
  return enemyDigest(world.enemy, day, RULES);
}

describe('(c) a refused or never-answered cancellation is one-shot either way', () => {
  it('a refusal leaves the post standing, settles at receipt with no marker write, and never reissues', () => {
    const { world, cancel } = tailDropDecided('rh-twin-c');
    deliverTo(world, cancel, 'square', at(5, 0));
    const record = recordWithKey(world, 'cancel:watch:d0:gale');
    // The guard is only asked once his window has closed: the evaluator's own refusal, not a hook.
    const late = record.authored.brief.active.until + 1;
    world.tick = late;
    record.execution!.dueAt = late;
    attemptDirective(world, record.id, circle('square', 'gale', 'mole'), late, RULES);
    expect(record.execution).toMatchObject({ state: 'aborted' });
    expect(world.scheduleOverrides.gale!.some((row) => row.sourceRef === 'order:watch:d0:gale')).toBe(true);
    expect(galeAt(world, POST_WINDOW)).toBe('plaza');

    const refusal = reportsFor(world, record.id);
    expect(refusal).toHaveLength(1);
    expect(refusal[0]!.payload).toMatchObject({ enemyAction: null });
    deliverTo(world, refusal[0]!, 'square', Math.max(refusal[0]!.availableAfter, late + 15));
    expect(world.enemy.pendingOrders?.map((row) => row.key) ?? [])
      .not.toContain('cancel:watch:d0:gale');
    // No marker write, no ledger write: HQ heard "no", not "done".
    expect(world.enemy.actionLedger![0]!.posts).toEqual([{ guard: 'gale', venue: 'plaza' }]);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);

    // …and the runaround already on file means no later nightly ever reissues the cancellation.
    const day = dayOf(late) + 1;
    applyEnemyDecision(world, nightlyDecisionFor(world, day));
    expect(world.network.directiveState!.records.filter((row) =>
      row.correlation?.kind === 'enemy-order'
      && row.correlation.orderKey === 'cancel:watch:d0:gale')).toHaveLength(1);
  });

  it('a cancellation nobody answers prunes at reconsiderAfterDay without reissue', () => {
    const { world } = tailDropDecided('rh-twin-c2');
    const reservation = world.enemy.pendingOrders!.find((row) => row.key === 'cancel:watch:d0:gale')!;
    world.tick = at(reservation.reconsiderAfterDay + 1, 23, 59);
    runEnemyDay(world, RULES);
    expect(world.enemy.pendingOrders?.map((row) => row.key) ?? [])
      .not.toContain('cancel:watch:d0:gale');
    expect(world.network.directiveState!.records.filter((row) =>
      row.correlation?.kind === 'enemy-order'
      && row.correlation.orderKey === 'cancel:watch:d0:gale')).toHaveLength(1);
    expect(galeAt(world, POST_WINDOW)).toBe('plaza');
  });
});

describe('private authored state is not enemy input', () => {
  it('clone worlds differing only in guidance/purpose/tag/codex/turned are byte-identical to the enemy', () => {
    const world = upToTwoWastedNights('rh-clone');
    const twin = structuredClone(world);

    // Alter ONLY things the player authored privately or that live in hidden truth.
    const record = twin.network.directiveState!.records.find((row) => row.principal === 'player')!;
    record.authored.brief.guidance = [{ kind: 'note', text: 'private authored guidance' }];
    record.authored.brief.purpose = 'a purpose the enemy never heard';
    twin.intel.tags.push({ id: 't-private', target: 'npc:mira', text: 'my own hunch',
      createdTick: 0, updatedTick: 0 });
    twin.intel.codex.push({ npc: 'mira', trait: 'exaggerator', proposedAt: 0 });
    twin.network.assets.find((row) => row.id === 'mole')!.turned = false;

    // The perturbation is real…
    expect(stableStringify(twin)).not.toBe(stableStringify(world));
    // …and the enemy boundary plus the digest output are byte-identical.
    expect(stableStringify(twin.enemy)).toBe(stableStringify(world.enemy));
    expect(stableStringify(enemyDigest(twin.enemy, 4, RULES)))
      .toBe(stableStringify(enemyDigest(world.enemy, 4, RULES)));

    // Positive control: the SAME probe detects a change the enemy really did capture — one thing
    // said about mira, at the post, inside the window, on a watched night.
    const control = structuredClone(world);
    control.enemy.evidence.push({
      tick: at(3, 0) + WATCH.from + 30, venue: 'plaza', observer: 'gale', overheard: true,
      speaker: 'mira', addressedTo: 'gale', kind: 'utterance', mode: 'telling',
      claimId: 'c-control', family: 'f-decoy',
      reported: { subject: 'mira', predicate: 'stole', object: null, count: 2, severity: 4,
        place: null, attribution: SOMEONE },
      about: null,
    });
    expect(stableStringify(control.enemy)).not.toBe(stableStringify(world.enemy));
    expect(stableStringify(enemyDigest(control.enemy, 4, RULES)))
      .not.toBe(stableStringify(enemyDigest(world.enemy, 4, RULES)));
  });
});

describe('the real-menial decoy — presence is not evidence, and no "decoy" flag exists anywhere', () => {
  it('the watched person may stand at the very post all night and still waste it', () => {
    const world = upToTwoWastedNights('rh-menial');
    // Real, lawful, low-value work: mira occupies the watched venue for both watched windows, in
    // plain sight of the guard. Nothing is SAID, so nothing enters the enemy's evidence log.
    world.scheduleOverrides.mira = [{
      fromDay: 2, toDay: 4, from: WATCH.from, to: WATCH.to, venue: 'plaza',
      source: 'player', sourceRef: 'test:menial:mira',
    }];
    for (const day of [2, 3]) {
      const tick = day * TICKS_PER_DAY + WATCH.from + 30;
      expect(positionOf(world, world.npcs.mira!, tick)).toBe('plaza');
      expect(positionOf(world, world.npcs.gale!, tick)).toBe('plaza');
      captureEvidence(world, { tick, positions: { mira: 'plaza', gale: 'plaza' },
        utterances: [], askings: [] }, RULES);
    }
    expect(world.enemy.evidence.filter((e) => e.tick >= at(2, 0))).toHaveLength(0);
    const decision = nightly(world, 4);
    expect(decision.features.some((f) => f.kind === 'runaround')).toBe(true);
  });

  it('no engine module carries a decoy/red-herring flag — the enemy reads only its own captures', () => {
    const stripComments = (source: string) => source
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });
    const sources = walk(join(process.cwd(), 'src'));
    expect(sources.length).toBeGreaterThan(20);
    const banned = /decoy|redherring|red_herring|falselead/i;
    const offenders = sources.filter((file) => banned.test(stripComments(readFileSync(file, 'utf8'))));
    expect(offenders).toEqual([]);
    // Non-vacuity: the same scan DOES fire on a planted flag, and DOES ignore prose about one.
    expect(banned.test(stripComments('interface F { isDecoy: boolean }'))).toBe(true);
    expect(banned.test(stripComments('// the decoy-subject rule\nconst x = 1;'))).toBe(false);
  });
});
