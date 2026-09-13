import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { stableStringify } from '../../src/sim/hash';
import { captureNightVisits } from '../../src/sim/night-visits';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { nightVisitWorld } from './helpers/seance-town';

const visits = (world: WorldState) => world.enemy.evidence.filter((row) => row.kind === 'night-visit');
const heldVisits = (world: WorldState) => (world.network.directiveState?.heldObservations ?? [])
  .filter((row) => row.content.kind === 'raw' && row.content.observation.kind === 'presence'
    && row.content.observation.witness !== undefined);
describe('a night visit is seen locally and reported physically', () => {
  it('holds a silent local sighting; remote evidence changes only at the real later meeting', () => {
    const world = nightVisitWorld();
    const digest = stableStringify(enemyDigest(world.enemy, 0, R));
    const events = step(world, R);
    expect(events.utterances).toEqual([]); expect(events.askings).toEqual([]);
    expect(events.networkSpeeches ?? []).toEqual([]);
    expect(events.positions).toMatchObject({ you: 'chapel-d0', guard: 'chapel-d0', boss: 'hq' });
    expect(heldVisits(world)).toHaveLength(1);
    expect(heldVisits(world)[0]).toMatchObject({ observer: 'guard', observedAt: 0, deliveredAt: null,
      content: { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard' } } });
    expect(visits(world)).toEqual([]);
    expect(stableStringify(enemyDigest(world.enemy, 0, R))).toBe(digest);
    runUntil(world, 45, R);
    expect(visits(world)).toEqual([]); expect(heldVisits(world)[0]!.deliveredAt).toBeNull();
    const meeting = step(world, R);
    expect(meeting.positions).toMatchObject({ guard: 'hq', boss: 'hq', you: 'chapel-d0' });
    expect(visits(world)).toHaveLength(1);
    const entry = visits(world)[0]!;
    expect(entry).toMatchObject({ tick: 0, venue: 'chapel-d0', observer: 'guard',
      speaker: null, addressedTo: null, claimId: null, family: null,
      nightVisit: { actor: 'you', witness: 'guard', observedAt: 0 }, receipt: { tick: 45, observer: 'boss' } });
    const speech = meeting.networkSpeeches!.find((row) => row.messageId === entry.receipt!.messageId)!;
    expect(speech).toMatchObject({ speaker: 'guard', addressedTo: 'boss', venue: 'hq' });
    expect(speech.spoken.kind).toBe('field-report');
    if (speech.spoken.kind !== 'field-report') throw new Error('missing report');
    expect(speech.spoken.items.map((item) => item.observation)).toContainEqual({
      kind: 'presence', observedAt: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard',
    });
    expect(heldVisits(world)[0]!.deliveredAt).toBe(45);
    expect(world.enemy.evidence.some((row) => row.kind === 'network' && row.network.messageId === speech.messageId)).toBe(true);
  });
  it('the spymaster can see directly on a silent tick without a fictional report', () => {
    const world = nightVisitWorld(); world.enemy.observers = [];
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
    const events = step(world, R);
    expect(events.networkSpeeches ?? []).toEqual([]);
    expect(visits(world)).toHaveLength(1);
    expect(visits(world)[0]).toMatchObject({ observer: 'boss', nightVisit: { actor: 'you', witness: 'boss', observedAt: 0 } });
    expect(visits(world)[0]).not.toHaveProperty('receipt');
    expect(heldVisits(world)).toEqual([]);
  });
  it.each(['no-observer', 'elsewhere', 'daytime', 'not-chapel', 'no-avatar', 'no-principal'] as const)(
    'does not manufacture a sighting for %s', (fault) => {
      const world = nightVisitWorld();
      if (fault === 'no-observer') world.enemy.observers = [];
      if (fault === 'elsewhere') world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'square' }];
      if (fault === 'daytime') {
        world.tick = 240;
        world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
      }
      if (fault === 'not-chapel') world.playerVenue = 'square';
      if (fault === 'no-avatar') world.playerId = null;
      if (fault === 'no-principal') world.network.spymaster = null;
      step(world, R);
      expect(visits(world)).toEqual([]); expect(heldVisits(world)).toEqual([]);
      expect(world.chronicle.some((row) => row.kind === 'night-visit')).toBe(false);
    });
  it('capture requires event-local physical presence and does not read hidden spell state', () => {
    const world = nightVisitWorld();
    for (const key of ['departed', 'seanceUsed', 'magic'] as const) {
      Object.defineProperty(world, key, { configurable: true, get() { throw new Error('hidden magic read'); } });
    }
    captureNightVisits(world, { tick: 0, positions: { you: 'square', guard: 'chapel-d0', boss: 'hq' }, utterances: [], askings: [] });
    expect(heldVisits(world)).toEqual([]);
    captureNightVisits(world, { tick: 0, positions: { you: 'chapel-d0', guard: 'chapel-d0', boss: 'hq' }, utterances: [], askings: [] });
    expect(heldVisits(world)).toHaveLength(1);
  });
  it('an ordinary visit and a performed ritual create the same physical sighting/report evidence', () => {
    const ordinary = nightVisitWorld(); const ritual = nightVisitWorld();
    const frame = prepareTick(ritual, R);
    finishTick(ritual, R, frame, () => applyAction(ritual, { kind: 'seance', tick: 0 }, R, frame));
    runUntil(ritual, 46, R); runUntil(ordinary, 46, R);
    expect(visits(ritual)).toEqual(visits(ordinary));
    expect(heldVisits(ritual)).toEqual(heldVisits(ordinary));
    expect(ordinary).not.toHaveProperty('seanceUsed');
    expect(ritual.seanceUsed).toBeDefined();
  });
  it('a turned reporter can omit the atom; an empty spoken envelope is no physical evidence', () => {
    const world = nightVisitWorld();
    world.network.enemyAssets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0,
      strikes: 0, facts: [], turned: true });
    runUntil(world, 46, R);
    expect(heldVisits(world)).toHaveLength(1);
    const report = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === 45 && row.speaker === 'guard' && row.spoken.kind === 'field-report');
    expect(report).toBeDefined();
    if (report?.kind !== 'network-speech' || report.spoken.kind !== 'field-report') throw new Error('missing omission envelope');
    expect(report.spoken.items).toEqual([]);
    expect(visits(world)).toEqual([]);
    // Preserve ordinary presence closure, rather than silently extending Task3's residue retry law.
    expect(heldVisits(world)[0]!.deliveredAt).toBe(45);
  });
  it('the avatar overhearing the real report receives scene presence, never a false watch', () => {
    const world = nightVisitWorld(); world.venues.hq!.access = 'public';
    const log: Action[] = [{ kind: 'goTo', tick: 30, venue: 'hq' }];
    runLogOn(world, R, log, 46);
    expect(world.intel.log.some((row) => row.kind === 'scene-presence' && row.actor === 'you'
      && row.venue === 'chapel-d0' && row.via === 'guard')).toBe(true);
    expect(world.intel.log.some((row) => row.kind === 'presence' && row.actor === 'you')).toBe(false);
    expect(visits(world)).toHaveLength(1);
  });
});
