import { describe, expect, it } from 'vitest';
import { watchfordWorld } from './helpers/watchford-world';
import { enrollPlayer } from '../../src/sim/world';
import { captureIntel } from '../../src/sim/fieldwork';
import { applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { runLogOn, type ActionLog } from '../../src/sim/campaign';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import type { TickEvents } from '../../src/sim/perception';

type World = ReturnType<typeof watchfordWorld>;

/** Mint a `stole` claim about otto via a real inject — id/family stay replay-stable, and the
 *  ground truth lands in world.claims so "the true claim is untouched" is checkable. */
function stole(world: World, count: number, severity: 1 | 2 | 3 | 4 | 5): Claim {
  return applyInject(world, 'mira', {
    subject: 'otto', predicate: 'stole', object: null,
    count, severity, place: null, attribution: SOMEONE,
  });
}

/** An enrolled avatar standing in square-w0 — the shared field posture for the unit tests. */
function withAvatar(seed: string): World {
  const world = watchfordWorld(seed);
  enrollPlayer(world, { home: 'home-gs' });
  world.playerVenue = 'square-w0';
  return world;
}

describe('captureIntel — the player senses through its own sources', () => {
  // 1. The avatar is the one unfiltered channel: it reports what it heard, verbatim.
  it('the avatar hears unfiltered — its report equals the true claim (no trait cap)', () => {
    const world = withAvatar('intel-1');
    const claim = stole(world, 2, 3);
    const events: TickEvents = {
      tick: world.tick, positions: {}, askings: [],
      utterances: [{
        tick: world.tick, venue: 'square-w0', circleMembers: ['mira', 'otto', 'you'],
        speaker: 'mira', addressedTo: 'otto', claim, mode: 'telling',
      }],
    };
    captureIntel(world, events, STANDARD_RULES);

    expect(world.intel.log).toHaveLength(1);
    const e = world.intel.log[0]!;
    expect(e.via).toBe('self');
    expect(e.kind).toBe('utterance');
    expect(e.speaker).toBe('mira');
    expect(e.overheard).toBe(true);          // addressed to otto, the avatar merely overhears
    expect(e.reported!.count).toBe(2);       // no exaggerator between the words and the ear
    expect(e.reported!.severity).toBe(3);
  });

  // 2. Remote informants hold first; their traits apply only when a physical report is spoken.
  it('a remote informant holds the observation without changing player intel', () => {
    const world = withAvatar('intel-2');
    world.intel.informants.push({ id: 'gale', assignedVenue: 'square-w0' });
    const claim = stole(world, 2, 3);
    const events: TickEvents = {
      tick: world.tick, positions: { you: 'home-gs', gale: 'square-w0' }, askings: [],
      utterances: [{
        tick: world.tick, venue: 'square-w0', circleMembers: ['gale', 'mira', 'otto'],
        speaker: 'mira', addressedTo: 'otto', claim, mode: 'telling',
      }],
    };
    captureIntel(world, events, STANDARD_RULES);

    expect(world.intel.log).toHaveLength(0);
    expect(world.network.directiveState!.heldObservations).toHaveLength(1);
    expect(world.network.directiveState!.heldObservations[0]).toMatchObject({
      principal: 'player', observer: 'gale', deliveredAt: null,
    });
    expect(world.claims[claim.id]!.count).toBe(2);      // the ground truth never moved
    expect(world.claims[claim.id]!.severity).toBe(3);
  });

  // 3. Feeds only: a telling heard by no player-controlled source captures nothing.
  it('a telling heard by neither the avatar nor an informant captures nothing', () => {
    const world = withAvatar('intel-3');
    world.intel.informants.push({ id: 'gale', assignedVenue: null });
    const claim = stole(world, 2, 3);
    const events: TickEvents = {
      tick: world.tick, positions: {}, askings: [],
      utterances: [{
        tick: world.tick, venue: 'square-w1', circleMembers: ['quill', 'rosa', 'hugo'],
        speaker: 'quill', addressedTo: 'rosa', claim, mode: 'telling',
      }],
    };
    captureIntel(world, events, STANDARD_RULES);
    expect(world.intel.log).toHaveLength(0);
  });

  // 4. Watch presence: one row per (watch-actor, venue, day); civilians never register.
  it('watch presence is captured once per actor/venue/day, and only for watch occupations', () => {
    const world = withAvatar('intel-4');
    for (const t of [at(0, 8, 0), at(0, 8, 15), at(0, 8, 30)]) {
      captureIntel(world, {
        tick: t, positions: { you: 'square-w0', hugo: 'square-w0', otto: 'square-w0' },
        utterances: [], askings: [],
      }, STANDARD_RULES);
    }
    const presence = world.intel.log.filter((e) => e.kind === 'presence');
    expect(presence).toHaveLength(1);                                // deduped across 3 ticks
    expect(presence[0]!).toMatchObject({ actor: 'hugo', venue: 'square-w0', via: 'self', overheard: true });
    expect(world.intel.log.some((e) => e.kind === 'presence' && e.actor === 'otto')).toBe(false); // joiner, not watch
  });

  // 5. No sources → total no-op, both directly and through a full stepped day.
  it('with no player and no informants, capture is a no-op', () => {
    const world = watchfordWorld('intel-5');
    const claim = stole(world, 2, 3);
    captureIntel(world, {
      tick: world.tick, positions: { hugo: 'square-w0', otto: 'square-w0' }, askings: [],
      utterances: [{
        tick: world.tick, venue: 'square-w0', circleMembers: ['mira', 'otto'],
        speaker: 'mira', addressedTo: 'otto', claim, mode: 'telling',
      }],
    }, STANDARD_RULES);
    expect(world.intel.log).toHaveLength(0);
  });

  it('a full day of the enemy testbed with no player leaves the intel log empty', () => {
    const world = watchfordWorld('intel-5b');
    applyInject(world, 'mira', {
      subject: 'otto', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: SOMEONE,
    });
    runUntil(world, at(1, 0), STANDARD_RULES);
    expect(world.intel.log).toHaveLength(0);
  });

  // 6. Determinism: intel is world state; two replays of one campaign day are byte-identical.
  it('an integration day yields a non-empty log identical across two replays', () => {
    const build = (): World => {
      const world = watchfordWorld('intel-int');
      enrollPlayer(world, { home: 'home-gs' });
      world.playerVenue = 'square-w0';
      world.intel.informants.push({ id: 'gale', assignedVenue: null });
      return world;
    };
    const log: ActionLog = [{
      tick: 0, kind: 'inject', target: 'mira',
      spec: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: SOMEONE },
    }];

    const a = runLogOn(build(), STANDARD_RULES, log, at(1, 0));
    const b = runLogOn(build(), STANDARD_RULES, log, at(1, 0));

    expect(a.intel.log.length).toBeGreaterThan(0);                        // existence
    expect(stableStringify(a.intel.log)).toBe(stableStringify(b.intel.log)); // byte-for-byte
    expect(hashWorld(a)).toBe(hashWorld(b));                              // intel lives in world state
  });
});
