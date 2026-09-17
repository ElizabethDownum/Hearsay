import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { fieldReportThreads } from '../../src/sim/debrief/reports';
import { holdFieldObservation, ingestObservedFieldReport, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { hashWorld } from '../../src/sim/hash';
import type { NetworkSpeechRecord, WorldState } from '../../src/sim/types';
import { runUntil } from '../../src/sim/step';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const town = miniTown();
  town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'report-item-debrief', RULES);
  enrollPlayer(world, { home: 'square' }); world.playerVenue = 'backroom';
  world.enemy.observers = [];
  return world;
}
function hold(world: WorldState, observer = 'ada', actor = 'bez', tick = 0) {
  const id = holdFieldObservation(world, 'player', observer, { kind: 'raw', observation: {
    kind: 'presence', tick, venue: 'square', actor,
  } }, null, ['you'], null, []);
  return world.network.directiveState!.heldObservations.find((row) => row.id === id)!;
}
function speech(messageId: string, tick: number, roots: string[] | null, actors?: string[]): NetworkSpeechRecord {
  return { kind: 'network-speech', tick, venue: 'square', speaker: 'ada', addressedTo: 'bez',
    heardBy: [{ id: 'bez', addressed: true }, { id: 'you', addressed: false }],
    messageId, spoken: { kind: 'field-report', onwardTo: null,
      items: (actors ?? roots ?? ['unknown']).map((actor) => ({ observation: {
        kind: 'presence', observedAt: 3, venue: 'square', actor,
      }, factRefs: [] })) }, cause: null, ...(roots === null ? {} : { reportRoots: [...roots] }) };
}

describe('terminal field report items retain source, copies and omissions separately', () => {
  it('returns no invented observations and preserves an untouched world', () => {
    const world = fixture(); const before = hashWorld(world);
    expect(fieldReportThreads(world)).toEqual([]);
    expect(hashWorld(world)).toBe(before);
    expect(world.network.directiveState).toBeUndefined();
  });

  it('retains an unqueued raw observation without inventing a spoken copy or receipt', () => {
    const world = fixture(); const held = hold(world);
    expect(fieldReportThreads(world)).toEqual([{ kind: 'field-report-item',
      id: 'report:' + held.rootFingerprint, rootFingerprint: held.rootFingerprint,
      held: [held], packets: [] }]);
  });

  it('retains a queued packet without inventing its planned transmission', () => {
    const world = fixture(); const held = hold(world); queueUnqueuedFieldReports(world);
    const thread = fieldReportThreads(world)[0]!;
    expect(thread.packets).toEqual([{ messageId: held.queuedIn, transport: 'in-transit',
      transportAt: null, plannedRoute: ['you'], stages: [] }]);
  });

  it('the first recorded empty copy omits its known queued source', () => {
    const world = fixture(); const held = hold(world); queueUnqueuedFieldReports(world);
    world.chronicle.push(speech(held.queuedIn!, 15, []));
    expect(fieldReportThreads(world)[0]!.packets[0]!.stages).toMatchObject([
      { status: 'omitted', item: null, changes: null, tick: 15 },
    ]);
  });

  it('compares by root through reindexing without attributing another item to this observation', () => {
    const world = fixture();
    world.chronicle.push(speech('m0', 15, ['r0', 'r1'], ['ada', 'bez']),
      speech('m0', 30, ['r1'], ['cyn']));
    const threads = fieldReportThreads(world);
    expect(threads[0]!.packets[0]!.stages[1]).toMatchObject({ status: 'omitted', item: null, changes: null });
    expect(threads[1]!.packets[0]!.stages[1]).toMatchObject({ status: 'spoken',
      item: { observation: { actor: 'cyn' } }, changes: [
        { path: '/observation/actor', beforePresent: true, afterPresent: true, before: 'bez', after: 'cyn' },
      ] });
  });

  it.each(['legacy', 'omitted', 'wrong-count', 'duplicate', 'other-kind'] as const)(
    'a %s middle copy breaks same-root comparison', (kind) => {
      const world = fixture();
      const middle = speech('m0', 30, kind === 'legacy' ? null : kind === 'omitted' ? [] : ['r0']);
      if (kind === 'wrong-count') middle.reportRoots = ['r0', 'r1'];
      if (kind === 'duplicate') {
        middle.spoken = speech('m0', 30, ['r0', 'r0']).spoken;
        middle.reportRoots = ['r0', 'r0'];
      }
      if (kind === 'other-kind') middle.spoken = {
        kind: 'invitation-response', invitationId: 'i0', response: 'accept', onwardTo: null,
      };
      world.chronicle.push(speech('m0', 15, ['r0'], ['ada']), middle, speech('m0', 45, ['r0'], ['bez']));
      const stages = fieldReportThreads(world).find((row) => row.rootFingerprint === 'r0')!.packets[0]!.stages;
      expect(stages.at(-1)).toMatchObject({ tick: 45, status: 'spoken', changes: null });
      if (kind !== 'other-kind') expect(stages[1]!.status).toBe(kind === 'omitted' ? 'omitted' : 'unknown');
    });

  it('keeps a spoken root without a retained held observation or packet', () => {
    const world = fixture(); world.chronicle.push(speech('missing-packet', 15, ['orphan']));
    expect(fieldReportThreads(world)[0]).toMatchObject({ rootFingerprint: 'orphan', held: [],
      packets: [{ messageId: 'missing-packet', transport: 'unrecorded', plannedRoute: null,
        stages: [{ chronicleIndex: 0, status: 'spoken', heardBy: [
          { id: 'bez', addressed: true }, { id: 'you', addressed: false },
        ] }] }] });
  });

  it('one root keeps distinct observers and separate report routes without merging equal copies', () => {
    const world = fixture(); const first = hold(world);
    const id = holdFieldObservation(world, 'player', 'bez', { kind: 'reported', observation: {
      kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez',
    } }, first.rootFingerprint, ['you'], null, []);
    const second = world.network.directiveState!.heldObservations.find((row) => row.id === id)!;
    expect(first.rootFingerprint).toBe(second.rootFingerprint);
    queueUnqueuedFieldReports(world);
    expect(first.queuedIn).not.toBe(second.queuedIn);
    world.chronicle.push(speech(first.queuedIn!, 15, [first.rootFingerprint]),
      speech(second.queuedIn!, 30, [second.rootFingerprint]));
    const rows = fieldReportThreads(world);
    expect(rows).toHaveLength(1); expect(rows[0]!.held).toHaveLength(2);
    expect(rows[0]!.packets).toHaveLength(2);
    expect(rows[0]!.packets.map((row) => row.stages[0]!.changes)).toEqual([null, null]);
  });

  it('identical raw facts from different original observers remain different roots', () => {
    const world = fixture(); const first = hold(world); const second = hold(world, 'bez');
    expect(first.rootFingerprint).not.toBe(second.rootFingerprint);
    expect(fieldReportThreads(world)).toHaveLength(2);
  });

  it('preserves a missing queued packet association as unknown history', () => {
    const world = fixture(); const held = hold(world); held.queuedIn = 'missing';
    expect(fieldReportThreads(world)[0]!.packets).toEqual([{ messageId: 'missing',
      transport: 'unrecorded', transportAt: null, plannedRoute: null, stages: [] }]);
  });

  it('returns independent nested holdings, report items, audience and change values', () => {
    const world = fixture(); const held = hold(world); queueUnqueuedFieldReports(world);
    const root = held.rootFingerprint;
    const first = speech(held.queuedIn!, 15, [root]);
    const second = speech(held.queuedIn!, 30, [root]);
    if (second.spoken.kind === 'field-report') second.spoken.items[0]!.factRefs.push({ asset: 'ada', factIndex: 0 });
    world.chronicle.push(first, second); const before = hashWorld(world);
    const thread = fieldReportThreads(world)[0]!;
    thread.held[0]!.route.push('elsewhere');
    const stages = thread.packets[0]!.stages;
    stages[0]!.heardBy[0]!.id = 'changed';
    stages[0]!.item!.observation.venue = 'elsewhere';
    (stages[1]!.changes![0]!.after as { asset: string; factIndex: number }[])[0]!.asset = 'changed';
    expect(stages[1]!.item!.factRefs).toEqual([{ asset: 'ada', factIndex: 0 }]);
    expect(hashWorld(world)).toBe(before);
  });

  it('a real turned courier delivers an empty envelope and closes holdings without delivering their information', () => {
    const world = fixture();
    world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true });
    const held = hold(world); queueUnqueuedFieldReports(world);
    const packet = world.network.directiveState!.messages[0]!;
    const heard = realizeNetworkForward(world, packet.id,
      { venue: 'backroom', members: ['ada', 'you'] }, 15, RULES)!;
    expect(heard.spoken).toMatchObject({ kind: 'field-report', items: [] });
    ingestObservedFieldReport(world, 'player', heard);
    expect(world.intel.log).toEqual([]);
    expect(held.deliveredAt).toBe(15);
    // Direct transport invocation bypasses the phase's chronicle append; preserve its actual returned speech.
    world.chronicle.push({ kind: 'network-speech', tick: heard.tick, venue: heard.venue,
      speaker: heard.speaker, addressedTo: heard.addressedTo,
      heardBy: [{ id: 'you', addressed: true }], messageId: heard.messageId,
      spoken: heard.spoken, cause: null, reportRoots: [] });
    expect(fieldReportThreads(world)[0]).toMatchObject({ held: [{ deliveredAt: 15 }], packets: [
      { transport: 'delivered', transportAt: 15, stages: [{ status: 'omitted', item: null }] },
    ] });
  });

  it('reads both actual transport hops and the unchanged item after real phase recording', () => {
    const world = fixture();
    world.npcs.bez!.schedule = [
      { days: 'all', from: 0, to: 30, venue: 'square' },
      { days: 'all', from: 30, to: 1439, venue: 'backroom' },
    ];
    const held = hold(world); held.route = ['bez', 'you']; queueUnqueuedFieldReports(world);
    world.tick = 15; runUntil(world, 31, RULES);
    const packet = fieldReportThreads(world).find((row) => row.rootFingerprint === held.rootFingerprint)!.packets[0]!;
    expect(packet.transport).toBe('delivered');
    expect(packet.stages.map((row) => [row.tick, row.status, row.changes])).toEqual([
      [15, 'spoken', null], [30, 'spoken', []],
    ]);
    expect(packet.stages[1]!.heardBy).toContainEqual({ id: 'you', addressed: true });
  });
});
