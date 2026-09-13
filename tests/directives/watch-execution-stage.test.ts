import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { settleDirectiveApplications } from '../../src/sim/directives/execution';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { runUntil } from '../../src/sim/step';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const town = miniTown();
  town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) {
    npc.traits = ['literalist'];
    npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
  }
  const world = buildWorld(town, 'watch-execution-stage', RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [],
    watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
  const record = world.network.directiveState!.records[0]!;
  const message = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
  expect(realizeNetworkForward(world, message.id, { venue: 'square', members: ['ada', 'bez'] }, 0, RULES)).not.toBeNull();
  expect(record.received).not.toBeNull();
  return { world, record };
}

describe('a watch completion belongs to an attempted watch', () => {
  it.each(['pending', 'deferred'] as const)('does not count a %s order as performed attention', (state) => {
    const { world, record } = fixture();
    record.execution = { state, changedAt: 0, dueAt: null, waiting: null };
    settleDirectiveApplications(world, 2400, RULES);
    expect(record.execution.workedDays ?? []).toEqual([]);
    expect(world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report')).toEqual([]);
  });

  it('still records an attempted watch when the guard physically occupies the post', () => {
    const { world, record } = fixture();
    record.execution = { state: 'attempted', changedAt: 2385, dueAt: null, waiting: null, workedDays: [] };
    settleDirectiveApplications(world, 2400, RULES);
    expect(record.execution.workedDays).toEqual([1]);
    const reports = world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report');
    expect(reports).toHaveLength(1);
    settleDirectiveApplications(world, 2415, RULES);
    expect(world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report')).toHaveLength(1);
  });

  it('the complete first watch window produces one real work report after execution starts', () => {
    const { world, record } = fixture();
    runUntil(world, 2581, RULES);
    expect(record.execution?.workedDays).toEqual([1]);
    const reports = world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report'
      && row.payload.directiveId === record.id && row.payload.enemyAction?.kind === 'watch-worked');
    expect(reports).toHaveLength(1);
    if (reports[0]!.payload.kind !== 'directive-report') throw new Error('watch fixture');
    expect(reports[0]!.payload.enemyAction!.occurredAt).toBeGreaterThan(record.execution!.changedAt);
  });
});
