import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type ActionLog } from '../../src/sim/campaign';
import { hashWorld } from '../../src/sim/hash';
import { at } from '../../src/core/time';

describe('player actions — validation matrix', () => {
  it('goTo: unknown venue throws; no enrolled player throws', () => {
    const noPlayer = buildWorld(miniTown(), 'go-1');
    expect(() => applyAction(noPlayer, { tick: 0, kind: 'goTo', venue: 'square' })).toThrow();

    const world = buildWorld(miniTown(), 'go-2');
    enrollPlayer(world, { home: 'square' });
    expect(() => applyAction(world, { tick: 0, kind: 'goTo', venue: 'nowhere' })).toThrow();
    applyAction(world, { tick: 0, kind: 'goTo', venue: 'backroom' });
    expect(world.playerVenue).toBe('backroom');
  });

  it('assignInformant: non-informant throws; writes one player override; re-assign replaces it; enemy override untouched', () => {
    const world = buildWorld(miniTown(), 'assign');
    enrollPlayer(world, { home: 'square' });

    expect(() => applyAction(world, { tick: 0, kind: 'assignInformant', informant: 'ada', venue: 'square' }))
      .toThrow(); // ada is not yet an informant

    world.intel.informants = [{ id: 'ada', assignedVenue: null }];
    // A pre-existing ENEMY override on the same NPC must survive assignment.
    world.scheduleOverrides['ada'] = [
      { fromDay: 0, toDay: 1, from: 900, to: 1020, venue: 'home-0', source: 'enemy' },
    ];

    applyAction(world, { tick: 0, kind: 'assignInformant', informant: 'ada', venue: 'square' });
    const afterFirst = world.scheduleOverrides['ada']!.filter((o) => o.source === 'player');
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]).toMatchObject({
      fromDay: 1, toDay: null, from: 960, to: 1200, venue: 'square', source: 'player',
    });
    expect(world.scheduleOverrides['ada']!.some((o) => o.source === 'enemy')).toBe(true);
    expect(world.intel.informants[0]!.assignedVenue).toBe('square');

    // Re-assign: exactly one player override remains (replaced, not appended).
    applyAction(world, { tick: 0, kind: 'assignInformant', informant: 'ada', venue: 'backroom' });
    const afterSecond = world.scheduleOverrides['ada']!.filter((o) => o.source === 'player');
    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0]!.venue).toBe('backroom');
    expect(world.scheduleOverrides['ada']!.some((o) => o.source === 'enemy')).toBe(true);

    // Unassign (venue null): the player override is cleared, enemy override kept.
    applyAction(world, { tick: 0, kind: 'assignInformant', informant: 'ada', venue: null });
    expect(world.scheduleOverrides['ada']!.filter((o) => o.source === 'player')).toHaveLength(0);
    expect(world.scheduleOverrides['ada']!.some((o) => o.source === 'enemy')).toBe(true);
    expect(world.intel.informants[0]!.assignedVenue).toBeNull();
  });

  it('assignInformant: unknown non-null venue throws', () => {
    const world = buildWorld(miniTown(), 'assign-2');
    enrollPlayer(world, { home: 'square' });
    world.intel.informants = [{ id: 'ada', assignedVenue: null }];
    expect(() => applyAction(world, { tick: 0, kind: 'assignInformant', informant: 'ada', venue: 'nowhere' }))
      .toThrow();
  });

  it('codex: propose dedupes, retract removes, unknown npc throws', () => {
    const world = buildWorld(miniTown(), 'codex');
    applyAction(world, { tick: 0, kind: 'codex', op: 'propose', npc: 'ada', trait: 'skeptic' });
    applyAction(world, { tick: 0, kind: 'codex', op: 'propose', npc: 'ada', trait: 'skeptic' });
    expect(world.intel.codex.filter((c) => c.npc === 'ada' && c.trait === 'skeptic')).toHaveLength(1);
    expect(world.intel.codex[0]).toMatchObject({ npc: 'ada', trait: 'skeptic', proposedAt: 0 });

    applyAction(world, { tick: 0, kind: 'codex', op: 'retract', npc: 'ada', trait: 'skeptic' });
    expect(world.intel.codex.some((c) => c.npc === 'ada' && c.trait === 'skeptic')).toBe(false);

    expect(() => applyAction(world, { tick: 0, kind: 'codex', op: 'propose', npc: 'ghost', trait: 'skeptic' }))
      .toThrow();
  });

  it('card: add/update/remove happy paths; unknown-id update throws; bad confidence throws; dup id throws', () => {
    const world = buildWorld(miniTown(), 'card');
    applyAction(world, {
      tick: 0, kind: 'card', op: 'add', id: 'k1', text: 'Ada is the leak', confidence: 0.6, links: ['f0'],
    });
    expect(world.intel.cards).toHaveLength(1);
    expect(world.intel.cards[0]).toMatchObject({
      id: 'k1', text: 'Ada is the leak', confidence: 0.6, links: ['f0'], createdTick: 0, updatedTick: 0,
    });

    // update patches non-null fields only, and bumps updatedTick.
    applyAction(world, {
      tick: 0, kind: 'card', op: 'update', id: 'k1', text: null, confidence: 0.9, links: null,
    });
    expect(world.intel.cards[0]!.confidence).toBe(0.9);
    expect(world.intel.cards[0]!.text).toBe('Ada is the leak'); // null = unchanged

    applyAction(world, {
      tick: 0, kind: 'card', op: 'remove', id: 'k1', text: null, confidence: null, links: null,
    });
    expect(world.intel.cards).toHaveLength(0);

    expect(() => applyAction(world, {
      tick: 0, kind: 'card', op: 'update', id: 'ghost', text: 'x', confidence: null, links: null,
    })).toThrow();
    expect(() => applyAction(world, {
      tick: 0, kind: 'card', op: 'add', id: 'k2', text: 'x', confidence: 1.2, links: null,
    })).toThrow();

    applyAction(world, { tick: 0, kind: 'card', op: 'add', id: 'k3', text: 'a', confidence: 0.5, links: null });
    expect(() => applyAction(world, {
      tick: 0, kind: 'card', op: 'add', id: 'k3', text: 'b', confidence: 0.5, links: null,
    })).toThrow();
  });
});

describe('player actions — deterministic replay', () => {
  const log: ActionLog = [
    { tick: 0, kind: 'goTo', venue: 'backroom' },
    { tick: 0, kind: 'assignInformant', informant: 'ada', venue: 'square' },
    { tick: 0, kind: 'codex', op: 'propose', npc: 'bez', trait: 'moralizer' },
    { tick: 0, kind: 'card', op: 'add', id: 'k1', text: 'note', confidence: 0.5, links: [] },
  ];

  function fresh(): ReturnType<typeof buildWorld> {
    const world = buildWorld(miniTown(), 'replay');
    enrollPlayer(world, { home: 'square' });
    world.intel.informants = [{ id: 'ada', assignedVenue: null }];
    return world;
  }

  it('a log with all four verbs replays hash-identical on two fresh worlds', () => {
    const a = runLogOn(fresh(), STANDARD_RULES, log, at(0, 2));
    const b = runLogOn(fresh(), STANDARD_RULES, log, at(0, 2));
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('the log survives a JSON round-trip and replays identically', () => {
    const revived = JSON.parse(JSON.stringify(log)) as ActionLog;
    expect(hashWorld(runLogOn(fresh(), STANDARD_RULES, revived, at(0, 2))))
      .toBe(hashWorld(runLogOn(fresh(), STANDARD_RULES, log, at(0, 2))));
  });
});
