import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { runUntil, step } from '../../src/sim/step';
import { circlesAt } from '../../src/sim/agents';
import { applyInject } from '../../src/sim/actions';
import { applyAction } from '../../src/sim/campaign';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';

// A damaging rumor whose SUBJECT is the avatar — the bait that would, for any NPC,
// enqueue an investigation (reactToSelfRumor). Confirmed by probe to reach the
// avatar's `heardBy` several times/day on seed 'abc'.
const damagingSelf = {
  subject: 'you', predicate: 'stole', object: null,
  count: 1, severity: 4 as const, place: null, attribution: SOMEONE,
};

describe('player groundwork — the avatar under physics', () => {
  // (a)
  it('enrollPlayer puts the avatar in npcs, seeds beliefs, sets playerId/playerVenue', () => {
    const world = buildWorld(miniTown(), 'p-a');
    enrollPlayer(world, { home: 'square' });
    expect(world.playerId).toBe('you');
    expect(world.playerVenue).toBe('square');
    const you = world.npcs['you'];
    expect(you).toBeDefined();
    expect(you!.traits).toEqual([]);
    expect(you!.edges).toEqual([]);
    expect(you!.rivals).toEqual([]);
    expect(you!.schedule).toEqual([]);
    expect(world.beliefs['you']).toEqual({});
  });

  it('double-enroll throws; unknown home throws', () => {
    const world = buildWorld(miniTown(), 'p-a2');
    enrollPlayer(world, { home: 'square' });
    expect(() => enrollPlayer(world, { home: 'square' })).toThrow();
    const w2 = buildWorld(miniTown(), 'p-a3');
    expect(() => enrollPlayer(w2, { home: 'nowhere' })).toThrow();
  });

  // (b)
  it('the avatar joins a circle, never speaks, and never ingests the gossip around it', () => {
    const world = buildWorld(miniTown(), 'abc');
    enrollPlayer(world, { home: 'square' });

    // Physics: the avatar is placed at square among the town's circles.
    const c0 = circlesAt(world, 0).find((c) => c.members.includes('you'));
    expect(c0).toBeDefined();
    expect(c0!.venue).toBe('square');

    // A day of gossip AROUND the avatar (self-rumor seeded into two neighbours).
    applyInject(world, 'ada', damagingSelf);
    applyInject(world, 'bez', damagingSelf);
    runUntil(world, at(1, 0), STANDARD_RULES);

    // Positive control: the avatar really co-heard the gossip.
    expect(world.chronicle.some(
      (e) => e.kind === 'telling' && e.heardBy.some((h) => h.id === 'you'),
    )).toBe(true);
    // Skip-laws: the avatar never appears as a speaker...
    expect(world.chronicle.some(
      (e) => (e.kind === 'telling' || e.kind === 'asking') && e.speaker === 'you',
    )).toBe(false);
    // ...and its belief store stays empty despite co-hearing (skip-ingest law).
    expect(world.beliefs['you']).toEqual({});
  });

  it('the avatar never speaks even when handed a retellable belief (tell-phase skip)', () => {
    const world = buildWorld(miniTown(), 'tell-skip');
    enrollPlayer(world, { home: 'square' });
    // Intent, not physics: give the avatar trust edges + a juicy belief. A normal NPC
    // so equipped speaks ~6x/day (probed); the tell-phase skip must keep it silent.
    world.npcs['you']!.edges = [
      { to: 'ada', kind: 'friend', trust: 0.8 }, { to: 'bez', kind: 'friend', trust: 0.8 },
    ];
    applyInject(world, 'you', {
      subject: 'ada', predicate: 'stole', object: null,
      count: 1, severity: 4, place: null, attribution: SOMEONE,
    });
    runUntil(world, at(1, 0), STANDARD_RULES);
    expect(world.chronicle.some(
      (e) => (e.kind === 'telling' || e.kind === 'asking') && e.speaker === 'you',
    )).toBe(false);
  });

  // (c)
  it('a damaging rumor about the avatar never enqueues an inquiry or counter-spins (reaction skip)', () => {
    const world = buildWorld(miniTown(), 'abc');
    enrollPlayer(world, { home: 'square' });
    applyInject(world, 'ada', damagingSelf);
    applyInject(world, 'bez', damagingSelf);
    runUntil(world, at(1, 0), STANDARD_RULES);

    // Control: the self-rumor reached the avatar's circle.
    expect(world.chronicle.some(
      (e) => e.kind === 'telling' && e.heardBy.some((h) => h.id === 'you') &&
        world.claims[e.claimId]!.subject === 'you',
    )).toBe(true);
    // reactToSelfRumor can never fire for the avatar: no inquiry, no self-inject.
    expect(world.inquiries['you']).toBeUndefined();
    expect(world.chronicle.some((e) => e.kind === 'inject' && e.by === 'you')).toBe(false);
  });

  // (d)
  it('goTo moves the avatar between beats', () => {
    const world = buildWorld(miniTown(), 'p-d');
    enrollPlayer(world, { home: 'square' });
    applyAction(world, { tick: 0, kind: 'goTo', venue: 'backroom' });
    expect(world.playerVenue).toBe('backroom');
    const mine = circlesAt(world, 0).find((c) => c.members.includes('you'));
    expect(mine!.venue).toBe('backroom');
  });

  // (e)
  it('an enemy asking addressed to the avatar gets silence (chooseAnswer player-skip)', () => {
    const world = buildWorld(miniTown(), 'ask-e');
    enrollPlayer(world, { home: 'backroom' });
    // Isolate ada with the avatar at the invitational backroom (circle = {ada, you}).
    world.scheduleOverrides['ada'] = [
      { fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'backroom', source: 'enemy' },
    ];
    // The avatar holds a belief the enemy would compel disclosure of at an invitational venue.
    applyInject(world, 'you', {
      subject: 'cyn', predicate: 'stole', object: null,
      count: 1, severity: 3, place: null, attribution: SOMEONE,
    });
    const fam = Object.keys(world.beliefs['you']!)[0]!;
    world.inquiries['ada'] = [
      { about: { family: fam }, from: 'enemy', expiresDay: 5, asked: [], answersHeard: 0 },
    ];

    const backroomCircle = circlesAt(world, 0).find((c) => c.venue === 'backroom')!;
    expect(new Set(backroomCircle.members)).toEqual(new Set(['ada', 'you']));

    step(world, STANDARD_RULES);

    // The asking is on the record...
    const asking = world.chronicle.find((e) => e.kind === 'asking');
    expect(asking).toMatchObject({ speaker: 'ada', addressedTo: 'you' });
    // ...but the avatar (compelled or not) never answers.
    expect(world.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(false);
  });

  it('the avatar is never selected as an asker even with a usable inquiry (asker skip)', () => {
    const world = buildWorld(miniTown(), 'asker-skip');
    enrollPlayer(world, { home: 'backroom' });
    world.scheduleOverrides['ada'] = [
      { fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'backroom', source: 'enemy' },
    ];
    // A usable enemy inquiry for the avatar with an eligible target present (ada) — a
    // normal asker would fire it; the asker-skip guard must keep the avatar silent.
    world.inquiries['you'] = [
      { about: { subject: 'cyn' }, from: 'enemy', expiresDay: 5, asked: [], answersHeard: 0 },
    ];
    step(world, STANDARD_RULES);
    expect(world.chronicle.some((e) => e.kind === 'asking' && e.speaker === 'you')).toBe(false);
  });

  // Skip-law refinement (Plan 7): the avatar still never auto-asks and is never conscripted by the
  // enemy — but a SELF task (volition the human logged via the ask verb) IS consumed by runAskPhase.
  it('a logged self-inquiry IS consumed — the avatar asks the human’s question', () => {
    const world = buildWorld(miniTown(), 'asker-self');
    enrollPlayer(world, { home: 'backroom' });
    world.npcs['you']!.edges = [{ to: 'ada', kind: 'friend', trust: 0.8 }]; // the avatar must trust to ask
    world.scheduleOverrides['ada'] = [
      { fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'backroom', source: 'enemy' },
    ];
    // A 'self' task, as the logged ask verb enqueues it — the avatar's word opens the beat.
    world.inquiries['you'] = [
      { about: { subject: 'cyn' }, from: 'self', expiresDay: 5, asked: [], answersHeard: 0 },
    ];
    step(world, STANDARD_RULES);
    expect(world.chronicle.some((e) => e.kind === 'asking' && e.speaker === 'you')).toBe(true);
  });
});
