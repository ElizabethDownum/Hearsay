import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { networkThreads, spokenCopyChanges } from '../../src/sim/debrief/network';
import { allocateNetworkMessage, ensureDirectiveState } from '../../src/sim/directives/state';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import type { SpokenNetworkPayload } from '../../src/sim/directives/types';
import { hashWorld } from '../../src/sim/hash';
import type { NetworkSpeechRecord } from '../../src/sim/types';
import { runUntil } from '../../src/sim/step';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const report = (roots: string[]): Extract<SpokenNetworkPayload, { kind: 'field-report' }> => ({
  kind: 'field-report', onwardTo: null,
  items: roots.map((id) => ({ observation: { kind: 'presence', observedAt: 3,
    venue: 'square', actor: id }, factRefs: [] })),
});
function speech(messageId: string, tick: number, roots?: string[]): NetworkSpeechRecord {
  return { kind: 'network-speech', tick, venue: 'square', speaker: 'ada', addressedTo: 'bez',
    heardBy: [{ id: 'bez', addressed: true }, { id: 'cyn', addressed: false }],
    messageId, spoken: report(roots ?? ['unlinked']), cause: null,
    ...(roots === undefined ? {} : { reportRoots: [...roots] }) };
}
const fixture = () => buildWorld(miniTown(), 'network-debrief-thread', RULES);

describe('network debrief threads retain actual speaking history', () => {
  it('leaves an untouched world untouched and returns no invented operations', () => {
    const world = fixture(); const before = hashWorld(world);
    expect(networkThreads(world)).toEqual([]);
    expect(hashWorld(world)).toBe(before);
    expect(world.network.directiveState).toBeUndefined();
  });

  it('a queued route has no invented stage or receipt', () => {
    const world = fixture();
    allocateNetworkMessage(world, 'player', 'ada', ['bez', 'cyn'],
      { kind: 'invitation-response', invitationId: 'i0', response: 'accept' }, 15, null, null);
    expect(networkThreads(world)[0]).toMatchObject({ plannedRoute: ['bez', 'cyn'],
      transport: 'in-transit', transportAt: null, stages: [] });
  });

  it('keeps orphan legacy speech with unknown transport metadata', () => {
    const world = fixture(); world.chronicle.push(speech('missing', 30));
    expect(networkThreads(world)[0]).toMatchObject({ messageId: 'missing', principal: null,
      createdAt: null, origin: null, plannedRoute: null, carriedCopy: null,
      transport: 'unrecorded', transportAt: null,
      stages: [{ tick: 30, heardBy: [{ id: 'bez', addressed: true }, { id: 'cyn', addressed: false }],
        reportRoots: null, changes: null }] });
  });

  it('distinguishes actual failed delivery from an untraversed planned leg', () => {
    const world = fixture(); const state = ensureDirectiveState(world);
    const id = allocateNetworkMessage(world, 'enemy', 'ada', ['bez', 'cyn'],
      { kind: 'invitation-response', invitationId: 'i0', response: 'refuse' }, 15, null, null);
    state.messages[0]!.failedAt = 60;
    world.chronicle.push(speech(id, 15, ['r0']));
    expect(networkThreads(world)[0]).toMatchObject({ transport: 'failed', transportAt: 60,
      plannedRoute: ['bez', 'cyn'], stages: [{ tick: 15 }] });
    expect(networkThreads(world)[0]!.stages).toHaveLength(1);
  });

  it('uses the actual transmission tick instead of a reported observation date', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 1440, ['r0']));
    const stage = networkThreads(world)[0]!.stages[0]!;
    expect(stage.tick).toBe(1440);
    expect(stage.copy).toMatchObject({ items: [{ observation: { observedAt: 3 } }] });
  });

  it('orders equal-tick copies by original chronicle position and preserves identical occurrences', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 45, ['r0']), speech('m0', 30, ['r0']), speech('m0', 30, ['r0']));
    expect(networkThreads(world)[0]!.stages.map((row) => row.chronicleIndex)).toEqual([1, 2, 0]);
    expect(networkThreads(world)[0]!.stages[1]!.changes).toEqual([]);
  });

  it('identifies omitted roots without guessing from shifted item positions', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 15, ['r0', 'r1']), speech('m0', 30, ['r1']));
    const stages = networkThreads(world)[0]!.stages;
    expect(stages[1]!.reportRoots).toEqual(['r1']);
    expect(stages[1]!.omittedRoots).toEqual(['r0']);
    expect(stages[1]!.copy).toEqual(report(['r1']));
  });

  it('an explicitly empty spoken report proves omission of its prior known items', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 15, ['r0']), speech('m0', 30, []));
    expect(networkThreads(world)[0]!.stages[1]).toMatchObject({ reportRoots: [], omittedRoots: ['r0'] });
  });

  it.each(['missing', 'wrong-count', 'duplicate'] as const)('keeps %s association unknown rather than inventing an item match', (kind) => {
    const world = fixture(); const row = speech('m0', 30, ['r0', 'r1']);
    if (kind === 'missing') delete row.reportRoots;
    if (kind === 'wrong-count') row.reportRoots = ['r0'];
    if (kind === 'duplicate') row.reportRoots = ['r0', 'r0'];
    world.chronicle.push(speech('m0', 15, ['r0']), row, speech('m0', 45, []));
    const stages = networkThreads(world)[0]!.stages;
    expect(stages[1]!.reportRoots).toBeNull();
    expect(stages[1]!.omittedRoots).toBeNull();
    expect(stages[2]!.omittedRoots).toBeNull();
    expect(stages[1]!.copy).toEqual(row.spoken);
  });

  it('returns deep-owned copies without changing the source or shared audiences', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 15, ['r0']), speech('m0', 30, []));
    const before = hashWorld(world); const threads = networkThreads(world);
    threads[0]!.stages[0]!.heardBy[0]!.id = 'changed';
    threads[0]!.stages[0]!.reportRoots!.push('changed');
    threads[0]!.stages[0]!.copy.onwardTo = 'elsewhere';
    const diff = threads[0]!.stages[1]!.changes!.find((row) => row.path === '/items')!;
    (diff.before as unknown[]).length = 0;
    expect(hashWorld(world)).toBe(before);
    expect(threads[0]!.stages[0]!.copy).toMatchObject({ items: [{ observation: { actor: 'r0' } }] });
  });

  it('describes nested copy changes without calling every changed field a lie', () => {
    const before: SpokenNetworkPayload = { kind: 'directive-response', directiveId: 'd0',
      response: 'refuse', onwardTo: 'cyn', report: null };
    const after = { ...before, onwardTo: null, response: 'attempt' as const };
    expect(spokenCopyChanges(before, after)).toEqual([
      { path: '/onwardTo', beforePresent: true, afterPresent: true, before: 'cyn', after: null },
      { path: '/response', beforePresent: true, afterPresent: true, before: 'refuse', after: 'attempt' },
    ]);
  });

  it('reads real two-hop field-report speech with stable roots and an actual addressed audience', () => {
    const town = miniTown();
    town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
    const world = buildWorld(town, 'real-network-debrief', RULES);
    enrollPlayer(world, { home: 'square' });
    world.playerVenue = 'backroom';
    world.enemy.observers = [];
    world.npcs.bez!.schedule = [
      { days: 'all', from: 0, to: 30, venue: 'square' },
      { days: 'all', from: 30, to: 1439, venue: 'backroom' },
    ];
    holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: {
      kind: 'presence', tick: 0, venue: 'square', actor: 'bez',
    } }, null, ['bez', 'you'], null, []);
    queueUnqueuedFieldReports(world);
    const held = world.network.directiveState!.heldObservations[0]!;
    const id = held.queuedIn!;
    expect(id).not.toBeNull();
    world.tick = 15;
    runUntil(world, 31, RULES);
    const thread = networkThreads(world).find((row) => row.messageId === id)!;
    expect(thread.transport).toBe('delivered');
    expect(thread.transportAt).toBe(30);
    expect(thread.stages.map((row) => row.tick)).toEqual([15, 30]);
    expect(thread.stages.map((row) => row.reportRoots)).toEqual([[held.rootFingerprint], [held.rootFingerprint]]);
    expect(thread.stages[1]!.heardBy).toContainEqual({ id: 'you', addressed: true });
    expect(thread.stages[1]!.omittedRoots).toEqual([]);
  });
});
