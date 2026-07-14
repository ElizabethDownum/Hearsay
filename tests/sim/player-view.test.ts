import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { watchfordWorld } from './helpers/watchford-world';
import { miniTown } from './helpers/minitown';
import { playerView } from '../../src/sim/fieldwork';
import { circlesAt } from '../../src/sim/agents';
import { at } from '../../src/core/time';
import { stableStringify } from '../../src/sim/hash';
import type { ScenarioState } from '../../src/sim/scenario/types';

describe('playerView — the epistemic selector: only avatar-local presence is live', () => {
  // (a) coverage law
  it('remote requested/operational posts never become present-tense occupancy', () => {
    const world = watchfordWorld('pv-a');
    enrollPlayer(world, { home: 'home-gs' });
    world.playerVenue = 'home-gs';
    // hugo is posted (as an informant) to square-w1, a venue its body actually occupies at 10:00 —
    // so the post is LIVE (controller rider: coverage rides the actual post, not all-day assignedVenue).
    world.intel.informants.push({ id: 'hugo', assignedVenue: 'square-w1' });
    world.intel.requestedPosts = [{ informant: 'hugo', venue: 'square-w1', authoredAt: 1 }];
    world.tick = at(0, 10); // 10:00 — both squares are staffed under WATCHFORD's allDay schedules

    const view = playerView(world);

    expect(view.informants).toEqual([{ id: 'hugo', requestedVenue: 'square-w1' }]);
    expect(view.occupantsByVenue['square-w1']).toBeUndefined();
    expect(view.occupantsByVenue['home-gs']).toEqual(['you']);
    // square-w0 is known-occupied (gale, mira, otto, sten all really stand there) but nobody has
    // been posted there and it isn't the avatar's own venue — no key, not even an empty array.
    expect(view.occupantsByVenue['square-w0']).toBeUndefined();
    expect(Object.keys(view.occupantsByVenue).sort()).toEqual(['home-gs']);
  });

  // (b) unassigned informant
  it('an unassigned informant (null venue) contributes no coverage', () => {
    const world = watchfordWorld('pv-b');
    enrollPlayer(world, { home: 'home-gs' });
    world.playerVenue = 'home-gs';
    // sten really stands in square-w0 at this tick, but is posted nowhere.
    world.intel.informants.push({ id: 'sten', assignedVenue: null });
    world.tick = at(0, 10);

    const view = playerView(world);
    expect(view.informants).toEqual([{ id: 'sten', requestedVenue: null }]);
    expect(view.occupantsByVenue['square-w0']).toBeUndefined();
    expect(Object.keys(view.occupantsByVenue)).toEqual(['home-gs']);
  });

  // (c) circleMembers
  it("circleMembers is the avatar's actual circle on a beat; [] off-beat; [] when venue-less", () => {
    const world = buildWorld(miniTown(), 'pv-c');
    enrollPlayer(world, { home: 'square' });
    // world.tick === 0 (a beat: 0 % 15 === 0) and playerVenue === 'square'.
    const circle = circlesAt(world, 0).find((c) => c.members.includes('you'))!;
    const expected = circle.members.filter((m) => m !== 'you').slice().sort();
    expect(playerView(world).avatar.circleMembers.slice().sort()).toEqual(expected);

    world.tick = 7; // off-beat: 7 % 15 !== 0
    expect(playerView(world).avatar.circleMembers).toEqual([]);

    world.tick = 0;
    world.playerVenue = null; // venue-less
    expect(playerView(world).avatar.circleMembers).toEqual([]);
    expect(playerView(world).avatar.venue).toBeNull();
  });

  // (d) scenario block
  it('scenario mirrors status/day/daysTotal, is null with no scenario, and lost-caught flows through automatically', () => {
    const world = buildWorld(miniTown(), 'pv-d');
    expect(playerView(world).scenario).toBeNull();

    const scenario: ScenarioState = {
      defId: 'test-scenario', days: 5,
      win: { kind: 'council-turns', quorum: 2 },
      cast: { usurper: 'ada', council: ['bez', 'cyn'] },
      status: 'running', resolution: null,
    };
    world.scenario = scenario;
    world.tick = at(2, 3);
    expect(playerView(world).scenario).toEqual({ status: 'running', day: 2, daysTotal: 5 });

    // No special-casing needed: 'lost-caught' mirrors through the same status field.
    world.scenario = {
      ...scenario, status: 'lost-caught',
      resolution: { kind: 'lost-caught', day: 2, heardBy: 'bez', venue: 'square' },
    };
    expect(playerView(world).scenario).toEqual({ status: 'lost-caught', day: 2, daysTotal: 5 });
  });

  // (e) determinism
  it('is byte-equal across two identically-built worlds', () => {
    const build = (): ReturnType<typeof watchfordWorld> => {
      const world = watchfordWorld('pv-e');
      enrollPlayer(world, { home: 'home-gs' });
      world.playerVenue = 'square-w0';
      world.intel.informants.push({ id: 'gale', assignedVenue: 'square-w1' });
      world.tick = at(0, 10);
      return world;
    };
    expect(stableStringify(playerView(build()))).toBe(stableStringify(playerView(build())));
  });

  // Premise duty: the empty-map fallback rebuilds street knowledge from the world's own
  // venues/npcs through buildTownMap — never inferred from anyone's schedule.
  it('rebuilds the map via buildTownMap when world.enemy.map was never wired', () => {
    const world = buildWorld(miniTown(), 'pv-map');
    enrollPlayer(world, { home: 'square' });
    expect(world.enemy.map.venues).toHaveLength(0); // buildWorld alone never wires the map

    const view = playerView(world);
    expect(view.map.venues.map((v) => v.id).slice().sort()).toEqual(['backroom', 'home-0', 'square']);
    expect(view.map.directory.map((p) => p.id).slice().sort()).toEqual(['ada', 'bez', 'cyn', 'dov', 'you']);
  });

  it('uses the wired enemy.map as-is when one is already attached (street knowledge, not enemy intel)', () => {
    const world = watchfordWorld('pv-map-2');
    const view = playerView(world);
    expect(view.map).toBe(world.enemy.map);
  });

  // P6 final-review note (binding, plan7-constraints.md): playerView must never read
  // world.scenario internals beyond status/day/daysTotal, never world.enemy.sketch, and never
  // call exposureStatus/councilTurns. A static source guard against regression — scoped to the
  // function's own body (Function.prototype.toString), not the whole module, so it stays a
  // precise probe on playerView itself even as fieldwork.ts grows other exports.
  it('never touches scenario verdict internals, enemy.sketch, or the adjudicator-only functions', () => {
    const src = playerView.toString();
    for (const banned of [
      'exposureStatus', 'councilTurns', 'enemy.sketch',
      'scenario.resolution', 'scenario.cast', 'scenario.win', 'scenario.defId',
    ]) {
      expect(src.includes(banned)).toBe(false);
    }
  });
});
