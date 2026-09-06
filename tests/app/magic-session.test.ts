import { describe, expect, it } from 'vitest';
import { newSession, loadSession } from '../../app/src/loop/session';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';

describe('scry through the real app session', () => {
  it('saves only the paid action and deterministically recreates its live window and trace', () => {
    const session = newSession('cor-1');
    const venue = Object.keys(session.world.venues).sort()[0]!;
    const initialCoin = session.world.coin;
    expect(session.submit({ kind: 'scry', venue, day: 1, from: 0, to: 60 })).toEqual({ queuedFor: 0 });
    expect(session.log).toEqual([]);
    expect(session.save().log).toEqual([]); // queued intents are not successful actions
    expect(session.localOffer()).toBeNull();
    expect(session.advance(1)).toEqual({ advanced: 1, stopped: 'complete' });
    expect(session.world.coin).toBe(initialCoin - 15);
    expect(session.log).toEqual([{ tick: 0, kind: 'scry', venue, day: 1, from: 0, to: 60 }]);
    const save = cloneSerializable(session.save());
    const restored = loadSession(save, session.world.tick);
    expect(stableStringify(restored.world)).toBe(stableStringify(session.world));
    const until = 1501;
    expect(session.advance(until - session.world.tick).stopped).toBe('complete');
    expect(restored.advance(until - restored.world.tick).stopped).toBe('complete');
    expect(session.world.tick).toBe(until);
    expect(session.world.magic!.traces).toHaveLength(1);
    expect(stableStringify(restored.world)).toBe(stableStringify(session.world));
    const replay = loadSession(cloneSerializable(session.save()), until);
    expect(stableStringify(replay.world)).toBe(stableStringify(session.world));
    expect(replay.log).toEqual(session.log);
  });

  it('a rejected paid action never enters save/log and leaves no magic state or debit', () => {
    const session = newSession('cor-1');
    const control = newSession('cor-1');
    const venue = Object.keys(session.world.venues).sort()[0]!;
    session.submit({ kind: 'scry', venue, day: 0, from: 0, to: 60 });
    expect(() => session.advance(1)).toThrow('scry: choose the next day');
    control.advance(1); // the session advances its ordinary tick even after an action rejects
    expect(session.log).toEqual([]);
    expect(session.save().log).toEqual([]);
    expect(Object.hasOwn(session.world, 'magic')).toBe(false);
    expect(stableStringify(session.world)).toBe(stableStringify(control.world));
    expect(stableStringify(loadSession(cloneSerializable(session.save()), session.world.tick).world))
      .toBe(stableStringify(session.world));
  });
});
