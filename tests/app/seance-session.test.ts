import { describe, expect, it } from 'vitest';
import { localParticipants, loadSession, newSession } from '../../app/src/loop/session';
import { VERB_TERM } from '../../app/src/input/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { TERMS } from '../../src/content/terms';
import { boardView } from '../../src/intel/board';
import { stableStringify } from '../../src/sim/hash';

describe('séance through the requested-beat session', () => {
  it('executes from a real offer and regrows identical runtime metadata, intel and latch from the saved log', () => {
    const session = newSession('seance-session');
    expect(session.world.departed).toBeDefined();
    expect(session.world.scenario!.status).toBe('running');
    expect(session.world.network.spymaster).not.toBeNull();
    expect(session.world.venues.cathedral).toMatchObject({ access: 'public' });
    session.submit({ kind: 'goTo', venue: 'cathedral' }); session.advance(1);
    expect(session.requestLocalInteraction()).toEqual({ requestedFor: 15, refused: false });
    expect(session.advance(20).stopped).toBe('local-offer');
    const offer = session.localOffer()!;
    expect(offer).toMatchObject({ tick: 15, venue: 'cathedral' });
    expect(localParticipants({ kind: 'seance' })).toEqual([]);
    const coin = session.world.coin;
    expect(session.chooseLocal(offer.token, { kind: 'seance' })).toEqual({ queuedFor: 15 });
    session.advance(1);
    expect(session.world.coin).toBe(coin - 20);
    expect(session.save().log.filter((action) => action.kind === 'seance')).toEqual([{ kind: 'seance', tick: 15 }]);
    const replay = loadSession(session.save(), session.world.tick);
    expect(stableStringify(replay.world)).toBe(stableStringify(session.world));
    expect(boardView(replay.world.intel.log, 3, STANDARD_RULES))
      .toEqual(boardView(session.world.intel.log, 3, STANDARD_RULES));
    session.requestLocalInteraction(); session.advance(20);
    session.chooseLocal(session.localOffer()!.token, { kind: 'seance' });
    expect(() => session.advance(1)).toThrow(/already spoken/);
    expect(session.save().log.filter((action) => action.kind === 'seance')).toHaveLength(1);
  });
  it('a refused local attempt never becomes a saved action and nonlocal submit is fenced', () => {
    const session = newSession('seance-refusal');
    expect(() => session.submit({ kind: 'seance' } as never)).toThrow(/local actions require/);
    session.requestLocalInteraction(); session.advance(1);
    const coin = session.world.coin;
    session.chooseLocal(session.localOffer()!.token, { kind: 'seance' });
    expect(() => session.advance(1)).toThrow(/chapel/);
    expect(session.world.coin).toBe(coin);
    expect(session.world).not.toHaveProperty('seanceUsed');
    expect(session.save().log).toEqual([]);
  });
  it('registers truthful short vocabulary and the exhaustive verb mapping', () => {
    expect(VERB_TERM.seance).toBe('verb-seance');
    for (const id of ['verb-seance', 'the-departed', 'night-visit']) {
      expect(TERMS[id]).toMatchObject({ id, entry: null });
      expect(TERMS[id]!.short.length).toBeGreaterThan(0);
      expect(TERMS[id]!.short.length).toBeLessThanOrEqual(120);
    }
  });
});
