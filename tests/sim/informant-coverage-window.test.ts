import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { applyAssignInformant } from '../../src/sim/actions';
import { captureIntel, playerView } from '../../src/sim/fieldwork';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import { mintClaim, SOMEONE } from '../../src/sim/rumors/claim';
import type { TownFixture, WorldState } from '../../src/sim/types';
import type { TickEvents } from '../../src/sim/perception';

/**
 * CONTROLLER RIDER (Plan 8 Task 2): informant coverage must apply ONLY while the informant is
 * actually posted — the 960–1200 override window that `assignInformant` writes — not all-day via
 * `assignedVenue`. The P7 whole-branch Minor #3 flagged "coverage = assignedVenue independent of
 * the presence window". This suite pins the tightened law.
 *
 * The scout is normally at 'elsewhere' all day; assignInformant posts them to 'post' for the
 * mid-day window (960–1200) on the following day. The bystander 'mark' stands at 'post' all day,
 * so 'post' is ALWAYS occupied — the only thing that changes across the window boundary is whether
 * the player has live eyes on it (whether the scout is actually posted there right now).
 */
const riderFixture = (): TownFixture => ({
  venues: [
    { id: 'safehouse', district: 'd0', access: 'private' },
    { id: 'post', district: 'd0', access: 'public' },
    { id: 'elsewhere', district: 'd0', access: 'public' },
    { id: 'home-scout', district: 'd0', access: 'private' },
    { id: 'home-mark', district: 'd0', access: 'private' },
  ],
  npcs: [
    { id: 'scout', name: 'Scout', home: 'home-scout', occupation: 'grocer', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: [{ days: 'all', from: 0, to: 1439, venue: 'elsewhere' }],
      edges: [{ to: 'mark', kind: 'friend', trust: 0.6 }] },
    { id: 'mark', name: 'Mark', home: 'home-mark', occupation: 'grocer', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: [{ days: 'all', from: 0, to: 1439, venue: 'post' }],
      edges: [{ to: 'scout', kind: 'friend', trust: 0.6 }] },
  ],
});

const OUT_OF_WINDOW = at(1, 8);      // day 1, 08:00 — minute 480, scout on its own schedule
const IN_WINDOW = at(1, 16, 40);     // day 1, 16:40 — minute 1000, inside the 960–1200 post

describe('informant coverage is window-scoped (controller rider)', () => {
  const postedWorld = (): WorldState => {
    const world = buildWorld(riderFixture(), 'rider');
    enrollPlayer(world, { home: 'safehouse' });
    world.intel.informants.push({ id: 'scout', assignedVenue: null });
    applyAssignInformant(world, 'scout', 'post', at(0, 0)); // override: day>=1, minutes [960,1200)
    return world;
  };

  it('playerView: the assigned venue is UNCOVERED outside the post window (scout is elsewhere)', () => {
    const world = postedWorld();
    world.tick = OUT_OF_WINDOW;
    const view = playerView(world);
    // 'post' is genuinely occupied (mark stands there all day) but the scout is not posted right
    // now — so the player has no live eyes on it. No key, not even an empty array.
    expect(view.occupantsByVenue['post']).toBeUndefined();
  });

  it('playerView: the assigned venue IS covered inside the post window (scout is posted there)', () => {
    const world = postedWorld();
    world.tick = IN_WINDOW;
    const view = playerView(world);
    expect(view.occupantsByVenue['post']).toBeDefined();
    expect(view.occupantsByVenue['post']).toContain('mark');
  });

  // Positive control: captureIntel already keys coverage on the informant's ACTUAL position
  // (observationsFor), never on assignedVenue — so it was window-scoped before this task. An event
  // at 'post' with the scout elsewhere is not captured through the scout channel; posted, it is.
  const utteranceAt = (world: WorldState, scoutVenue: string, tick: number): TickEvents => {
    const claim = mintClaim(world, {
      family: 'f0', parent: null, subject: 'mark', predicate: 'stole',
      object: null, count: null, severity: 4, place: null, attribution: SOMEONE,
    });
    world.claims[claim.id] = claim;
    return {
      tick,
      positions: { scout: scoutVenue, mark: 'post' },
      utterances: [{
        tick, venue: 'post', circleMembers: scoutVenue === 'post' ? ['scout', 'mark'] : ['mark'],
        speaker: 'mark', addressedTo: 'mark', claim, mode: 'telling',
      }],
      askings: [],
    };
  };

  it('captureIntel: an event at the assigned venue is NOT captured through the informant when it is off-post', () => {
    const world = buildWorld(riderFixture(), 'rider-cap-out');
    world.intel.informants.push({ id: 'scout', assignedVenue: 'post' });
    captureIntel(world, utteranceAt(world, 'elsewhere', OUT_OF_WINDOW), STANDARD_RULES);
    expect(world.intel.log.filter((e) => e.via === 'scout' && e.kind === 'utterance')).toHaveLength(0);
  });

  it('captureIntel: the same event IS captured through the informant while posted at the venue', () => {
    const world = buildWorld(riderFixture(), 'rider-cap-in');
    world.intel.informants.push({ id: 'scout', assignedVenue: 'post' });
    captureIntel(world, utteranceAt(world, 'post', IN_WINDOW), STANDARD_RULES);
    expect(world.intel.log.filter((e) => e.via === 'scout' && e.kind === 'utterance').length).toBeGreaterThan(0);
  });
});
