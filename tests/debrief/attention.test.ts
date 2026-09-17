import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import type { IntelEntry } from '../../src/intel/entry';
import { attentionAt } from '../../src/sim/debrief/attention';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { issueDirectiveRecord } from '../../src/sim/directives/state';
import type { DirectiveRecord } from '../../src/sim/directives/types';
import { blankIntel } from '../../src/sim/fieldwork';
import { hashWorld } from '../../src/sim/hash';
import { runUntil } from '../../src/sim/step';
import type { AskingRecord, WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'attention-model', RULES);
  enrollPlayer(world, { home: 'backroom' }); return world;
}
const question = (over: Partial<AskingRecord> = {}): AskingRecord => ({ kind: 'asking', tick: 15,
  venue: 'backroom', speaker: 'bez', addressedTo: 'ada', about: { subject: 'ada' }, authority: true,
  heardBy: [{ id: 'ada', addressed: true }, { id: 'you', addressed: false }], ...over });
const intel = (over: Partial<IntelEntry> = {}): IntelEntry => ({ ...blankIntel(), kind: 'asking',
  tick: 15, venue: 'backroom', via: 'self', overheard: true, speaker: 'bez', addressedTo: 'ada', authority: true,
  about: { subject: 'ada' }, ...over });
const presence = (tick = 990): IntelEntry => intel({ kind: 'presence', tick, venue: 'square',
  speaker: null, addressedTo: null, authority: false, about: null, actor: 'bez' });
function order(world: WorldState): DirectiveRecord {
  return issueDirectiveRecord(world, { principal: 'enemy', principalId: 'ada', recipient: 'bez',
    tick: 0, handoff: { outboundVia: [], reportVia: [] }, cause: null,
    brief: { mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
      priority: 'routine', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 1439 }, report: 'full', reportBy: null, purpose: null,
      application: { kind: 'enemy-watch', district: 'd0', post: { guard: 'bez', venue: 'square' },
        startDay: 0, subject: 'you', about: null } } });
}
function work(record: DirectiveRecord, tick = 990) {
  record.outcomes = [{ tick, reportMessageId: null, result: { outcome: 'watch worked',
    reason: 'post occupied', evidence: [], source: 'bez', uncertainty: 'low', reportedClaim: null, factRefs: [],
    enemyAction: { kind: 'watch-worked', subject: 'you', about: null, district: 'd0', scheduleStartDay: 0,
      guard: 'bez', venue: 'square', workedDay: 0, occurredAt: tick } } }];
}
function answer(world: WorldState, venue = 'backroom') {
  world.chronicle.push(question({ venue }), { kind: 'telling', tick: 15, venue,
    speaker: 'ada', addressedTo: 'bez', claimId: 'c-answer', mode: 'answer',
    heardBy: [{ id: 'bez', addressed: true }, { id: 'you', addressed: false }] });
  world.intel.log.push(intel({ venue }), intel({ kind: 'utterance', venue, speaker: 'ada', addressedTo: 'bez',
    authority: false, about: null, mode: 'answer', claimId: 'c-answer' }));
}

describe('semantic counter-attention without feature-id guessing', () => {
  it('keeps empty history empty', () => {
    expect(attentionAt(fixture(), 100)).toEqual({ signals: [], actual: [], unseenAttentionIds: [], unknownArrivalEntryIndexes: [] });
  });
  it('matches the exact recorded authority question without requiring a sketch feature', () => {
    const world = fixture(); world.chronicle.push(question()); world.intel.log.push(intel());
    const model = attentionAt(world, 15);
    expect(model.signals[0]).toMatchObject({ key: 's:ada', matchedEntryIndexes: [0], attentionIds: ['asking:0'] });
    expect(world.enemy.sketch).toEqual([]); expect(model.unseenAttentionIds).toEqual([]);
  });
  it.each([
    { speaker: 'cyn' }, { venue: 'square' }, { tick: 30 }, { about: { subject: 'cyn' } },
  ])('does not match a question with changed identity/location/time/topic %j', (over) => {
    const world = fixture(); world.chronicle.push(question()); world.intel.log.push(intel(over));
    expect(attentionAt(world, 30).signals[0]).toMatchObject({ matchedEntryIndexes: [], unmatchedEntryIndexes: [0] });
    expect(attentionAt(world, 30).unseenAttentionIds).toEqual(['asking:0']);
  });
  it('deduplicates repeated views of one actual asking without losing their original row indexes', () => {
    const world = fixture(); world.chronicle.push(question()); world.intel.log.push(intel(), intel());
    expect(attentionAt(world, 15).signals[0]).toMatchObject({ entryIndexes: [0, 1],
      matchedEntryIndexes: [0, 1], attentionIds: ['asking:0'] });
  });
  it('maps filtered counter-signal indexes back to the original log and exposes unknown arrivals', () => {
    const world = fixture(); world.chronicle.push(question());
    world.intel.log.push(intel({ via: 'remote-unrecorded' }), intel());
    const model = attentionAt(world, 15);
    expect(model.unknownArrivalEntryIndexes).toEqual([0]);
    expect(model.signals[0]).toMatchObject({ entryIndexes: [1], matchedEntryIndexes: [1] });
  });
  it('real watch work survives duplicate reports and repeated views, independently of sketch results', () => {
    const world = fixture(); const record = order(world); work(record);
    record.outcomes!.push(structuredClone(record.outcomes![0]!));
    world.intel.log.push(presence(960), presence(990), presence(1125));
    const model = attentionAt(world, 1439);
    expect(model.actual).toHaveLength(1); expect(model.signals[0]!.attentionIds).toHaveLength(1);
    expect(model.signals[0]!.matchedEntryIndexes).toEqual([0, 1, 2]);
    expect(model.signals[0]!.issuedDirectiveIds).toEqual([record.id]);
    expect(world.enemy.sketch).toEqual([]);
  });
  it('issued orders and headquarters claims alone never become performed watches', () => {
    const world = fixture(); const record = order(world); world.intel.log.push(presence());
    world.enemy.actionLedger = [{ orderKey: 'claimed', kind: 'watch', directiveIds: [record.id],
      leadFeatureId: null, subject: 'you', about: null, district: 'd0', scheduleStartDay: 0,
      posts: [{ guard: 'bez', venue: 'square' }], workedDays: [0], askedAt: null }];
    const model = attentionAt(world, 1439);
    expect(model.actual).toEqual([]); expect(model.signals[0]).toMatchObject({ attentionIds: [], issuedDirectiveIds: [record.id] });
  });
  it('marks absent received-watch history as unavailable, and reads saved work after execution is replaced', () => {
    const world = fixture(); const record = order(world); world.intel.log.push(presence());
    record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'ada', messageId: 'm0' };
    expect(attentionAt(world, 1439).signals[0]!.missingWorkHistoryIds).toEqual([record.id]);
    work(record); record.execution = { state: 'aborted', changedAt: 1440, dueAt: null, waiting: null };
    expect(attentionAt(world, 1440).signals[0]!.matchedEntryIndexes).toEqual([0]);
    expect(attentionAt(world, 1440).signals[0]!.missingWorkHistoryIds).toEqual([]);
  });
  it('ordinary daytime guard presence does not match an evening work episode', () => {
    const world = fixture(); work(order(world)); world.intel.log.push(presence(300));
    expect(attentionAt(world, 1439).signals[0]!.matchedEntryIndexes).toEqual([]);
  });
  it('matches compelled answers only when there is an actual same-beat authority asking', () => {
    const world = fixture(); answer(world);
    expect(attentionAt(world, 15).signals.find((row) => row.kind === 'compelled-answer')!.matchedEntryIndexes).toEqual([1]);
    const asking = world.chronicle[0]!; asking.tick = 0;
    expect(attentionAt(world, 15).signals.find((row) => row.kind === 'compelled-answer')!.matchedEntryIndexes).toEqual([]);
  });
  it('a public-venue authority answer can trigger suspicion but is not engine compulsion', () => {
    const world = fixture(); answer(world, 'square');
    const signal = attentionAt(world, 15).signals.find((row) => row.kind === 'compelled-answer')!;
    expect(signal.entryIndexes).toEqual([1]); expect(signal.matchedEntryIndexes).toEqual([]);
  });
  it('never reorders an answer before a later-arriving authority clue to create a signal', () => {
    const world = fixture(); answer(world); world.intel.log.reverse();
    expect(attentionAt(world, 15).signals.some((row) => row.kind === 'compelled-answer')).toBe(false);
  });
  it('excludes future work even if a present guard observation already exists', () => {
    const world = fixture(); work(order(world), 1050); world.intel.log.push(presence(990));
    expect(attentionAt(world, 1000).actual).toEqual([]);
    expect(attentionAt(world, 1100).signals[0]!.matchedEntryIndexes).toEqual([0]);
  });
  it('reads actual no-report watch work from the full engine after the directive expires', () => {
    const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
    const world = buildWorld(town, 'attention-live-watch', RULES); world.network.spymaster = 'ada';
    world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
    applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
      { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
    ] });
    const record = world.network.directiveState!.records[0]!;
    const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
    if (packet.payload.kind !== 'directive') throw new Error('watch packet missing');
    record.authored.brief.report = 'none'; packet.payload.version.brief.report = 'none';
    runUntil(world, 1440 + 1141, RULES);
    expect(record.outcomes!.some((row) => row.result.enemyAction?.kind === 'watch-worked')).toBe(true);
    runUntil(world, record.received!.version.brief.active.until + 1, RULES);
    expect(record.execution!.state).toBe('aborted');
    world.intel.log.push(presence(1440 + 990));
    const match = attentionAt(world, world.tick).signals.find((row) => row.kind === 'watch')!;
    expect(match.matchedEntryIndexes).toEqual([0]);
    expect(match.attentionIds).toHaveLength(1);
  });
  it('produces detached output and leaves hypotheses and simulation state untouched', () => {
    const world = fixture(); work(order(world)); world.intel.log.push(presence());
    world.intel.cards.push({ id: 'h0', text: 'my guess', confidence: 1, links: [], createdTick: 0, updatedTick: 0 });
    const before = hashWorld(world); const first = attentionAt(world, 1439);
    expect(attentionAt(world, 1439)).toEqual(first);
    first.actual[0]!.directiveIds.push('changed'); first.signals[0]!.entryIndexes.push(99);
    expect(hashWorld(world)).toBe(before);
  });
});
