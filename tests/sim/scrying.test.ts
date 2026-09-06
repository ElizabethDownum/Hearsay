import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { beginScryWindows, captureScryIntel, type ScryAction } from '../../src/sim/magic';
import { prepareTick, finishTick } from '../../src/sim/phases';
import { step, runUntil } from '../../src/sim/step';
import { stableStringify, cloneSerializable } from '../../src/sim/hash';
import { scryWorld } from './helpers/scry-world';

const action: ScryAction = { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 };

describe('scry validates before every mutation', () => {
  it.each([
    { day: 0 }, { day: 2 }, { day: 1.5 }, { from: -15 }, { from: 1 }, { to: 1 },
    { to: 0 }, { from: 60, to: 60 }, { from: 60, to: 45 }, { to: 75 },
    { from: 1380, to: 1455 }, { from: NaN }, { to: Infinity }, { venue: 'missing' }, { venue: 'toString' }, { tick: 1 },
  ])('rejects invalid action %j without changing the world', (over) => {
    const world = scryWorld();
    const before = stableStringify(world);
    expect(() => applyAction(world, { ...action, ...over }, R)).toThrow();
    expect(stableStringify(world)).toBe(before);
    expect(Object.hasOwn(world, 'magic')).toBe(false);
  });
  it('rejects unaffordable/missing-avatar/missing-rules states before allocation', () => {
    for (const mode of ['coin', 'avatar', 'rules'] as const) {
      const world = scryWorld();
      if (mode === 'coin') world.coin = 14;
      if (mode === 'avatar') world.playerId = null;
      const before = stableStringify(world);
      expect(() => applyAction(world, action, mode === 'rules' ? undefined : R)).toThrow();
      expect(stableStringify(world)).toBe(before);
    }
  });
  it.each([-1, 0.5, NaN])('rejects invalid configured price %s before allocating state', (scrying) => {
    const world = scryWorld();
    const before = stableStringify(world);
    expect(() => applyAction(world, action, { ...R, economy: { ...R.economy, scrying } })).toThrow('scry: invalid price');
    expect(stableStringify(world)).toBe(before);
  });
  it.each([{ from: 0, to: 15 }, { from: 1380, to: 1440 }])('accepts the exact valid boundary %j', (window) => {
    const world = scryWorld();
    applyAction(world, { ...action, ...window }, R);
    expect(world.coin).toBe(5);
    expect(world.magic!.scries).toEqual([{ id: 's0', venue: 'hall', day: 1, ...window }]);
    expect(world.magic!.traces).toEqual([]);
    expect(world.enemy.evidence).toEqual([]);
  });
});

describe('the current tick is the purchased scene', () => {
  it('residue begins once at the window start, even at an empty venue, and persists past its end', () => {
    const world = scryWorld();
    applyAction(world, { ...action, venue: 'away' }, R);
    world.playerVenue = 'hq'; // make the purchased venue actually empty
    world.tick = 1439;
    step(world, R);
    expect(world.magic!.traces).toEqual([]);
    const events = step(world, R);
    expect(events.residues).toEqual([{ id: 's0', venue: 'away', createdAt: 1440 }]);
    expect(world.magic!.traces).toHaveLength(1);
    expect(world.intel.log.filter((entry) => entry.provenance)).toEqual([]);
    expect(world.enemy.evidence).toEqual([]);
    beginScryWindows(world, 1440);
    expect(world.chronicle.filter((entry) => entry.kind === 'residue' && entry.act === 'created')).toHaveLength(1);
    runUntil(world, 1501, R);
    expect(world.magic!.traces).toHaveLength(1);
  });
  it('capture reads only the supplied live events, preserving utterance truth and not past chronicle', () => {
    const world = scryWorld();
    applyAction(world, action, R);
    const claim = { id: 'live', family: 'f-live', parent: null, subject: 'citizen', predicate: 'stole',
      object: null, count: 7, severity: 4 as const, place: null, attribution: 'someone' };
    const events = { tick: 1440, positions: { citizen: 'hall', guard: 'hall', boss: 'hq' },
      utterances: [{ tick: 1440, venue: 'hall', circleMembers: ['citizen', 'guard'], speaker: 'citizen',
        addressedTo: 'guard', claim, mode: 'telling' as const }], askings: [] };
    const oldChronicle = world.chronicle;
    Object.defineProperty(world, 'chronicle', { configurable: true, get() { throw new Error('historical read'); } });
    expect(() => captureScryIntel(world, events)).not.toThrow();
    Object.defineProperty(world, 'chronicle', { configurable: true, value: oldChronicle, writable: true });
    expect(world.intel.log.find((entry) => entry.kind === 'utterance')).toMatchObject({
      claimId: 'live', via: 'scrying', provenance: { spell: 'scrying', operation: 's0' },
      reported: { count: 7, severity: 4 }, speaker: 'citizen', addressedTo: 'guard',
    });
    expect(world.intel.log.filter((entry) => entry.kind === 'scene-presence').map((entry) => entry.actor)).toEqual(['citizen', 'guard']);
  });
  it('offered-tick preview is pure; prior activation and same-tick speech capture have the right order', () => {
    const world = scryWorld();
    applyAction(world, action, R);
    world.tick = 1440;
    const before = stableStringify(world);
    const frame = prepareTick(world, R);
    expect(stableStringify(world)).toBe(before);
    const events = finishTick(world, R, frame, () => {
      expect(world.magic!.traces).toHaveLength(1);
      applyAction(world, { tick: 1440, kind: 'inject', target: 'citizen', spec: {
        subject: 'guard', predicate: 'stole', object: null, count: 2, severity: 4,
        place: null, attribution: 'someone',
      } }, R, frame);
    });
    expect(events.utterances.length).toBeGreaterThan(0);
    const expected = events.utterances.filter((utterance) => utterance.venue === 'hall').map((utterance) => utterance.claim.id);
    expect(expected.length).toBeGreaterThan(0);
    expect(world.intel.log.filter((entry) => entry.provenance && entry.kind === 'utterance').map((entry) => entry.claimId)).toEqual(expected);
  });
  it('live application plus steps equals successful-action-log replay, including JSON save state', () => {
    const log: Action[] = [action];
    const live = scryWorld();
    const frame = prepareTick(live, R);
    finishTick(live, R, frame, () => applyAction(live, action, R, frame));
    runUntil(live, 1501, R);
    const replay = runLogOn(scryWorld(), R, cloneSerializable(log), 1501);
    expect(stableStringify(live)).toBe(stableStringify(replay));
    expect(stableStringify(cloneSerializable(live))).toBe(stableStringify(live));
    expect(live.magic!.traces).toHaveLength(1);
    expect(live.intel.log.some((entry) => entry.provenance?.spell === 'scrying')).toBe(true);
  });
  it('untouched worlds keep no magic keys', () => {
    const world = scryWorld();
    runUntil(world, 16, R);
    expect(Object.hasOwn(world, 'magic')).toBe(false);
    expect(world.chronicle.some((row) => row.kind === 'scry' || row.kind === 'residue')).toBe(false);
    expect(world.intel.log.some((row) => Object.hasOwn(row, 'provenance'))).toBe(false);
  });
});
