import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { hashWorld } from '../../src/sim/hash';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { circlesAt } from '../../src/sim/agents';
import { miniTown } from '../sim/helpers/minitown';

describe('learn/shape directive integration', () => {
  it('direct refusal emits one phase-3 response and never queues a second refusal report', () => {
    const world = buildWorld(miniTown(), 'directive-direct-refusal', STANDARD_RULES);
    enrollPlayer(world, { home: 'backroom' });
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    world.network.assets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    const offered = circlesAt(world, 0).find((circle) => circle.members.includes('you'));
    expect(offered?.members).toEqual(expect.arrayContaining(['you', 'bez']));
    const frame = prepareTick(world, STANDARD_RULES);
    const action: Action = { tick: 0, kind: 'directive', recipient: 'bez',
      handoff: { outboundVia: [], reportVia: [] }, brief: {
        mission: { kind: 'learn', target: { kind: 'person', id: 'ada' } },
        priority: 'routine', authority: 'request', discretion: 'open', specificity: 'guided',
        guidance: [], active: { from: 0, until: 120 }, report: 'outcome', reportBy: 120,
        purpose: null,
      } };
    const events = finishTick(world, STANDARD_RULES, frame,
      () => applyAction(world, action, STANDARD_RULES));
    expect(events.networkSpeeches?.map((speech) => speech.spoken.kind))
      .toEqual(['directive', 'directive-response']);
    expect(world.network.directiveState!.records[0]!.receivedReports).toHaveLength(1);
    expect(world.network.directiveState!.messages.filter((message) =>
      message.payload.kind === 'directive-report')).toHaveLength(0);
  });

  it('direct refusal with report-none still speaks once but appends no ledger report', () => {
    const world = buildWorld(miniTown(), 'directive-direct-refusal-none', STANDARD_RULES);
    enrollPlayer(world, { home: 'backroom' });
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    world.network.assets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    const offered = circlesAt(world, 0).find((circle) => circle.members.includes('you'));
    expect(offered?.members).toEqual(expect.arrayContaining(['you', 'bez']));
    const frame = prepareTick(world, STANDARD_RULES);
    const action: Action = { tick: 0, kind: 'directive', recipient: 'bez',
      handoff: { outboundVia: [], reportVia: [] }, brief: {
        mission: { kind: 'learn', target: { kind: 'person', id: 'ada' } },
        priority: 'routine', authority: 'request', discretion: 'open', specificity: 'guided',
        guidance: [], active: { from: 0, until: 120 }, report: 'none', reportBy: null, purpose: null,
      } };
    const events = finishTick(world, STANDARD_RULES, frame,
      () => applyAction(world, action, STANDARD_RULES));
    expect(events.networkSpeeches?.map((speech) => speech.spoken.kind))
      .toEqual(['directive', 'directive-response']);
    expect(world.network.directiveState!.records[0]!.receivedReports).toEqual([]);
    expect(world.network.directiveState!.messages[1]!.payload).toMatchObject({
      kind: 'directive-response', report: null,
    });
  });

  it('direct, relayed, deferred, completed, and missed-deadline records replay exactly', () => {
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.map((npc) => ({ ...npc, schedule: [{ days: 'all' as const,
      from: 0, to: 1439, venue: npc.id === 'cyn' ? 'backroom' : 'square' }] }));
    const build = () => {
      const world = buildWorld(fixture, 'directive-replay', STANDARD_RULES);
      enrollPlayer(world, { home: 'square' });
      world.network.assets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
      world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
      world.npcs.ada!.traits = ['literalist'];
      world.npcs.bez!.edges.push({ to: 'you', kind: 'friend', trust: 0.4 });
      return world;
    };
    const log: Action[] = [
      { tick: 0, kind: 'directive', recipient: 'bez', handoff: { outboundVia: [], reportVia: [] }, brief: {
        mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
        priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
        guidance: [], active: { from: 0, until: 60 }, report: 'outcome', reportBy: 60,
        purpose: null,
      } },
      { tick: 15, kind: 'directive', recipient: 'bez', handoff: { outboundVia: ['ada'], reportVia: ['ada'] }, brief: {
        mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
        priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
        guidance: [], active: { from: 15, until: 120 }, report: 'outcome', reportBy: 120,
        purpose: null,
      } },
      { tick: 30, kind: 'directive', recipient: 'bez', handoff: { outboundVia: [], reportVia: [] }, brief: {
        mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
        priority: 'important', authority: 'request', discretion: 'open', specificity: 'guided',
        guidance: [], active: { from: 30, until: 1600 }, report: 'none', reportBy: null,
        purpose: null,
      } },
      { tick: 45, kind: 'directive', recipient: 'bez', handoff: { outboundVia: [], reportVia: [] }, brief: {
        mission: { kind: 'learn', target: { kind: 'person', id: 'cyn' } },
        priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'detailed',
        guidance: [], active: { from: 45, until: 60 }, report: 'outcome', reportBy: 60,
        purpose: null,
      } },
    ];
    const live = build();
    while (live.tick < 1601) {
      const frame = prepareTick(live, STANDARD_RULES);
      finishTick(live, STANDARD_RULES, frame, () => {
        for (const action of log.filter((candidate) => candidate.tick === live.tick)) {
          const offered = circlesAt(live, live.tick)
            .find((circle) => circle.members.includes(live.playerId!));
          if (action.kind !== 'directive') throw new Error('expected directive replay fixture');
          const firstHop = action.handoff.outboundVia[0] ?? action.recipient;
          expect(offered?.members).toContain(firstHop);
          applyAction(live, action, STANDARD_RULES);
        }
      });
    }
    const states = live.network.directiveState!.records.map((record) => record.execution?.state);
    expect(states.filter((state) => state === 'completed')).toHaveLength(2);
    expect(states.filter((state) => state === 'aborted')).toHaveLength(2);
    expect(live.network.directiveState!.records[1]!.received?.handoffFrom).toBe('ada');
    const replay = runLogOn(build(), STANDARD_RULES, log, 1601);
    expect(hashWorld(replay)).toBe(hashWorld(live));
  });
});
