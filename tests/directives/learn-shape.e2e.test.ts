import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { hashWorld } from '../../src/sim/hash';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { circlesAt } from '../../src/sim/agents';
import { miniTown } from '../sim/helpers/minitown';

const STORY_CLAIM = {
  id: 'c-story-source', family: 'f-story', parent: null, subject: 'cyn', predicate: 'stole',
  object: null, count: 1, severity: 3, place: null, attribution: 'cyn',
} as const;

function storyDeadlineFixture(seed: string, answered: boolean) {
  const fixture = miniTown();
  const kept = new Set(['ada', 'bez', 'cyn']);
  fixture.npcs = fixture.npcs.filter((npc) => kept.has(npc.id)).map((npc) => ({
    ...npc,
    schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: 'square' }],
    edges: npc.edges.filter((edge) => kept.has(edge.to)),
  }));
  const world = buildWorld(fixture, seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  if (answered) {
    world.beliefs.bez!['f-story'] = {
      claim: { ...STORY_CLAIM }, credence: 0.8, heardFrom: 'cyn', heardAt: 0,
      firstHeardAt: 0, timesHeard: 1, apparentSources: ['cyn'], discretion: false,
      counterSpun: false,
    };
  }
  return world;
}

const STORY_DEADLINE_ACTION: Action = {
  tick: 0, kind: 'directive', recipient: 'ada', handoff: { outboundVia: [], reportVia: [] },
  brief: {
    mission: { kind: 'learn', target: { kind: 'story', family: 'f-story' } },
    priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
    guidance: [], active: { from: 0, until: 30 }, report: 'full', reportBy: 30,
    purpose: 'learn the story before the deadline',
  },
};

function driveStoryDeadlineLive(seed: string, answered: boolean) {
  const world = storyDeadlineFixture(seed, answered);
  while (world.tick < 46) {
    const frame = prepareTick(world, STANDARD_RULES);
    finishTick(world, STANDARD_RULES, frame, world.tick === 0 ? () => {
      const offered = circlesAt(world, world.tick)
        .find((circle) => circle.members.includes(world.playerId!));
      expect(offered?.members).toContain('ada');
      applyAction(world, STORY_DEADLINE_ACTION, STANDARD_RULES);
    } : undefined);
  }
  return world;
}

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

  it.each([
    ['the exact-deadline answer', true, 'completed'],
    ['exact non-day-aligned silence', false, 'aborted'],
  ] as const)('runs story learn through the tick transaction for %s once in live and replay',
    (_label, answered, expectedState) => {
      const seed = answered ? 'story-deadline-answered' : 'story-deadline-silent';
      const live = driveStoryDeadlineLive(seed, answered);
      const record = live.network.directiveState!.records[0]!;
      const askings = live.chronicle.filter((entry) => entry.kind === 'asking'
        && entry.speaker === 'ada' && 'family' in entry.about && entry.about.family === 'f-story');
      const answers = live.chronicle.filter((entry): entry is Extract<
        (typeof live.chronicle)[number], { kind: 'telling' }
      > => entry.kind === 'telling' && entry.mode === 'answer' && entry.addressedTo === 'ada');
      const reports = live.network.directiveState!.messages.filter((message) =>
        message.payload.kind === 'directive-report');

      expect(askings).toHaveLength(1);
      expect(askings[0]!.tick).toBe(30);
      expect(record.execution).toMatchObject({ state: expectedState, changedAt: 30, waiting: null });
      expect(live.inquiries.ada).toBeUndefined();
      expect(reports).toHaveLength(1);
      expect(record.receivedReports).toHaveLength(1);
      if (answered) {
        expect(answers).toHaveLength(1);
        expect(answers[0]!.tick).toBe(30);
        const claimId = answers[0]!.claimId;
        expect(reports[0]!.payload).toMatchObject({ kind: 'directive-report', report: {
          outcome: 'answer heard', evidence: [expect.objectContaining({ kind: 'claim', claimId })],
        } });
      } else {
        expect(answers).toHaveLength(0);
        expect(reports[0]!.payload).toMatchObject({ kind: 'directive-report', report: {
          outcome: 'refused',
        } });
      }

      const replay = runLogOn(storyDeadlineFixture(seed, answered), STANDARD_RULES,
        [STORY_DEADLINE_ACTION], 46);
      expect(hashWorld(replay)).toBe(hashWorld(live));
      expect(replay.network.directiveState!.records[0]!.receivedReports).toHaveLength(1);
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
