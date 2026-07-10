import { describe, expect, it } from 'vitest';
import { newSession, loadSession } from '../../app/src/loop/session';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { hashWorld } from '../../src/sim/hash';
import { at, minuteOfDay, TICKS_PER_DAY, type Tick } from '../../src/core/time';
import { venueAt, CIRCLE_SIZE } from '../../src/sim/agents';
import { canEnter } from '../../src/sim/actions';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';
import type { InjectSpec } from '../../src/sim/actions';

const SEED = 'cor-1';

/** The gravest dirt in the game, aimed at the usurper — a valid tell payload. */
const poison = (subject: EntityId): InjectSpec => ({
  subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE,
});

/**
 * Deterministically find a beat (venue, tick) on day 0 where the avatar, if it goes to `venue`, is
 * GUARANTEED co-circled with `npcs` (and NO enemy observer is present, so the tell cannot get the
 * avatar caught). The guarantee: total occupancy (avatar + these npcs) <= CIRCLE_SIZE means the
 * whole venue is one conversation circle — circle membership is then certain regardless of shuffle.
 * Escalation license: this fixes the PROBE (finding a legal speech setup), never the physics.
 */
function findCoCircle(world: WorldState, minNpcs: number): { venue: string; tick: Tick; npcs: EntityId[] } {
  const guardIds = new Set(world.enemy.observers.map((o) => o.id));
  const others = Object.values(world.npcs).filter((n) => n.id !== world.playerId);
  // Skip the midnight beat (t=0) so the mid-beat sub-tests always have a valid t-1 to submit at.
  for (let t = CONVERSATION_BEAT; t < TICKS_PER_DAY; t += CONVERSATION_BEAT) {
    const byVenue = new Map<string, EntityId[]>();
    for (const n of others) {
      const v = venueAt(n, t, world.scheduleOverrides[n.id] ?? []);
      (byVenue.get(v) ?? byVenue.set(v, []).get(v)!).push(n.id);
    }
    for (const [venue, ids] of [...byVenue].sort(([a], [b]) => a.localeCompare(b))) {
      if (!world.venues[venue]) continue;                 // must be a real, goTo-able venue
      if (!canEnter(world, venue)) continue;              // ...that the avatar's standing opens (P8 access law)
      if (ids.some((id) => guardIds.has(id))) continue;   // no observer in earshot
      if (ids.length >= minNpcs && ids.length + 1 <= CIRCLE_SIZE) {
        return { venue, tick: t, npcs: [...ids].sort() };
      }
    }
  }
  throw new Error(`probe: no co-circle venue with >=${minNpcs} non-observer npcs found on day 0`);
}

const advanceTo = (session: ReturnType<typeof newSession>, tick: Tick): void =>
  session.advance(tick - session.world.tick);

// ── (a) newSession stages a running Coronation with dossier intel ─────────────────────────
describe('newSession — a running Coronation world with dossier intel', () => {
  it('attaches the referee running, enrolls the avatar, seeds the day-0 dossier', () => {
    const session = newSession(SEED);
    expect(session.seed).toBe(SEED);
    expect(session.world.tick).toBe(0);
    expect(session.log).toEqual([]);

    expect(session.world.scenario!.status).toBe('running');
    expect(session.world.scenario!.defId).toBe(CORONATION.id);
    expect(session.world.scenario!.days).toBe(CORONATION.days);

    expect(session.world.playerId).toBe('you');
    expect(session.world.intel.log.length).toBeGreaterThan(0);
    expect(session.world.intel.log.every((e) => e.via === 'dossier')).toBe(true);
  });

  it('stages the treasury at STANDARD_ECONOMY.startingCoin (20) — Rules wired through stageWorld (controller rider)', () => {
    const session = newSession(SEED);
    expect(session.world.coin).toBe(STANDARD_ECONOMY.startingCoin);
    expect(session.world.coin).toBe(20);
  });
});

// ── (b) THE load-bearing test: the browser game IS the replay ─────────────────────────────
describe('submit + advance reproduces runLogOn exactly — live ≡ replay', () => {
  it('a session that queues {goTo, tag, tell} + advances 2 days hashes equal to a fresh loadSession', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    // Two tick-0 verbs (goTo, tag), then ONE beat-aligned speech verb at the co-circle beat. (This
    // test used to queue a tell AND an ask in the SAME beat; note 9's one-speech-act-per-beat law
    // now refuses the second at the session boundary — I-1 below. Mixed tell+ask replay across
    // DISTINCT beats keeps its coverage in tests/sim/determinism.test.ts, tick 0 vs tick 15.)
    session.submit({ kind: 'goTo', venue: spot.venue });
    session.submit({ kind: 'tag', op: 'add', id: 'note-1', target: `npc:${target}`, text: 'watch this one' });
    advanceTo(session, spot.tick);
    const tell = session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    expect(tell.queuedFor).toBe(spot.tick);

    // Fire the beat: the tell speaks (a chronicle 'telling').
    session.advance(spot.tick + 1 - session.world.tick);
    expect(session.world.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);

    session.advance(at(2, 0) - session.world.tick); // finish out 2 sim-days
    // The window stays live (no terminal mid-batch) — the probe invariant this test rests on.
    expect(session.world.scenario!.status).toBe('running');
    expect(session.world.tick).toBe(at(2, 0));

    const save = session.save();
    expect(save.log.map((a) => a.kind)).toEqual(['goTo', 'tag', 'tell']);

    const replay = loadSession(save, at(2, 0));
    expect(hashWorld(replay.world)).toBe(hashWorld(session.world));
  });
});

// ── (c) beat alignment + validation is deferred to advance-time, failures DROP from the save ─
describe('submit beat-alignment + advance-time validation', () => {
  it('a tell submitted mid-beat queues for the NEXT beat and validates + fires there', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick - 1); // land one tick BEFORE the beat (mid-beat)
    expect(minuteOfDay(session.world.tick) % CONVERSATION_BEAT).not.toBe(0);

    const { queuedFor } = session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    expect(queuedFor).toBe(spot.tick);                  // rolled forward to the next beat
    expect(queuedFor).toBeGreaterThan(session.world.tick); // strictly future
    expect(minuteOfDay(queuedFor) % CONVERSATION_BEAT).toBe(0);

    session.advance(at(1, 0) - session.world.tick);
    expect(session.save().log.some((a) => a.kind === 'tell')).toBe(true);
    expect(session.world.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);
  });

  it('a tell that fails validation surfaces the throw at advance-time and DROPS from the log', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    // The avatar sits alone in its private safehouse; the usurper is never co-circled there.
    session.submit({ kind: 'tell', to: usurper, spec: poison(usurper) });
    expect(() => session.advance(CONVERSATION_BEAT + 1)).toThrow(/circle/);
    expect(session.save().log).toHaveLength(0); // failed action never enters the save
  });

});

// ── (I-1) one speech act per beat — enforced at the SESSION QUEUE BOUNDARY (note 9) ────────────────
// tell, ask, and sell are mutually exclusive within a conversation beat. The sim guards only
// tell-vs-tell and sell-vs-sell (per-verb pending flags), never cross-verb — so a mode-toggle in the
// composer let submit tell → toggle → submit sell queue BOTH for one beat (review I-1). The fix
// latches the speech slot in the session's own queue: once a speech verb is queued for a beat, any
// further speech verb for that beat is refused BEFORE it enters the queue (and thus before the sim
// ever validates it). The latch clears only when the beat is stepped (the queued verb drains) —
// never on pause/unpause or a composer remount, since the queue lives in the session, not the panel.
describe('I-1 — the speech-act latch: at most one avatar speech verb per beat, refused at the queue', () => {
  it('a second TELL for the same beat is refused at submit — the sim one-per-beat guard is never even reached', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 2); // two co-circled targets for two distinct tells
    const [n1, n2] = spot.npcs;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick); // pause ON the beat — the composer's intended usage
    const first = session.submit({ kind: 'tell', to: n1!, spec: poison(usurper) });
    const second = session.submit({ kind: 'tell', to: n2!, spec: poison(usurper) });
    expect(first.refused).toBeFalsy();
    expect(first.queuedFor).toBe(spot.tick);
    expect(second.refused).toBe(true); // the second never entered the queue

    // Advancing the beat therefore fires EXACTLY ONE telling and never throws — the sim's own
    // 'one telling per beat' guard stays as defense-in-depth for hand-built log replays, unreached.
    expect(() => session.advance(CONVERSATION_BEAT + 1)).not.toThrow();
    expect(session.world.chronicle.filter((e) => e.kind === 'telling' && e.speaker === 'you')).toHaveLength(1);
    expect(session.save().log.filter((a) => a.kind === 'tell')).toHaveLength(1);
  });

  it('the exact defeat: submit tell → (toggle) → submit SELL for the same beat — the sell is refused, never reaching the sim', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick);
    session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    // The toggle-then-resubmit that defeated the mode-toggle gate on 1e59034: a DIFFERENT speech verb
    // for the SAME beat. It is refused at the queue boundary BEFORE any sim validation — the family
    // need not even be held; the point is that the second speech act never queues.
    const sell = session.submit({ kind: 'sell', family: 'f-unheld', buyer: target });
    expect(sell.refused).toBe(true);

    // Because the sell never queued, advancing cannot surface a sell-side throw and fires exactly one
    // avatar speech act — the tell. (On 1e59034 the sell queued and reached applySell → a throw.)
    expect(() => session.advance(CONVERSATION_BEAT + 1)).not.toThrow();
    expect(session.world.chronicle.filter((e) => e.kind === 'telling' && e.speaker === 'you')).toHaveLength(1);
    expect(session.save().log.filter((a) => a.kind === 'sell')).toHaveLength(0);
  });

  it('ASK is a speech act too (note 9): tell then a same-beat ask — the ask is refused, so no self-inquiry is placed', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick);
    session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    const ask = session.submit({ kind: 'ask', to: target, about: { subject: usurper } });
    expect(ask.refused).toBe(true);

    session.advance(spot.tick + 1 - session.world.tick);
    // The tell fired; the ask never placed its 'self' inquiry. On 1e59034 BOTH applied — the sim
    // guards tell-vs-tell and sell-vs-sell but NEVER tell-vs-ask, so nothing stopped the second act.
    expect(session.world.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);
    expect((session.world.inquiries['you'] ?? []).some((t) => t.from === 'self')).toBe(false);
  });

  it('a NON-speech verb is never latched — recruit/goTo/tag queue freely alongside a queued speech act', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick);
    session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    // Only the three SPEECH verbs share the per-beat slot; a tag (bookkeeping) is untouched by it.
    const tag = session.submit({ kind: 'tag', op: 'add', id: 'note-x', target: `npc:${target}`, text: 'still watching' });
    expect(tag.refused).toBeFalsy();
  });

  it('the latch clears on beat ADVANCE (not on remount/pause): a speech act queues again in the NEXT beat', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick);
    session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    expect(session.speechQueuedForBeat(session.world.tick)).toBe(true); // slot taken for this beat

    session.advance(CONVERSATION_BEAT); // step a whole beat forward — the queued tell drains
    expect(session.speechQueuedForBeat(session.world.tick)).toBe(false); // slot free again

    // A fresh speech verb for the NEW beat is accepted (the latch was beat-scoped, not permanent).
    const again = session.submit({ kind: 'ask', to: target, about: { subject: usurper } });
    expect(again.refused).toBeFalsy();
  });
});

// ── (11R) the avatar ask is a speech act: live ≡ replay with an ask in the log ─────────────
describe('11R — an ask in the log replays byte-identically (live ≡ replay)', () => {
  it('(t5) a session that queues an ask + advances 2 days hashes equal to a fresh loadSession', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick);
    const ask = session.submit({ kind: 'ask', to: target, about: { subject: usurper } });
    expect(ask.queuedFor).toBe(spot.tick);

    // Fire the beat: the ask is a speech act, addressed to exactly the named person (11R).
    session.advance(spot.tick + 1 - session.world.tick);
    expect(session.world.chronicle.some(
      (e) => e.kind === 'asking' && e.speaker === 'you' && e.addressedTo === target,
    )).toBe(true);

    session.advance(at(2, 0) - session.world.tick);
    expect(session.world.scenario!.status).toBe('running');

    const save = session.save();
    expect(save.log.some((a) => a.kind === 'ask')).toBe(true);

    const replay = loadSession(save, at(2, 0));
    expect(hashWorld(replay.world)).toBe(hashWorld(session.world));
  });
});

// ── (T11 carry (i)) sell joins the beat-align branch — a mid-beat sell rolls forward ────────
describe('T11 carry (i) — a mid-beat SELL submission beat-aligns like tell/ask', () => {
  it('rolls a mid-beat sell forward to the next beat, and its queued tick latches the TARGET beat', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const buyer = spot.npcs[0]!;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick - 1); // land one tick BEFORE the beat (mid-beat)
    expect(minuteOfDay(session.world.tick) % CONVERSATION_BEAT).not.toBe(0);

    // Family need not be held: submit defers validation, and this test never advances to applySell.
    const { queuedFor } = session.submit({ kind: 'sell', family: 'f-any', buyer });
    expect(queuedFor).toBe(spot.tick);                        // rolled forward to the next beat
    expect(queuedFor).toBeGreaterThan(session.world.tick);    // strictly future
    expect(minuteOfDay(queuedFor) % CONVERSATION_BEAT).toBe(0);

    // The rolled-forward sell latches the TARGET beat, not the submission beat (the speech-latch keys
    // off the queued tick): speechQueuedForBeat sees it, and a same-beat tell is refused.
    expect(session.speechQueuedForBeat(session.world.tick)).toBe(true);
    const tell = session.submit({ kind: 'tell', to: buyer, spec: poison(usurper) });
    expect(tell.refused).toBe(true);
  });
});

// ── (d) endings pause: advance stops at a terminal status change, death tick exact ────────
describe('advance halts at a terminal status change — the death tick is exact, never overshot', () => {
  it('a hands-off Coronation stops at lost-clock on the coronation dawn, not one tick past', { timeout: 30000 }, () => {
    const session = newSession(SEED);
    const deathTick = at(CORONATION.days, 0); // day (days-1) nightly latches; world lands on day `days` dawn

    session.advance(at(CORONATION.days + 5, 0)); // ask for far more than the campaign can run
    expect(session.world.scenario!.status).toBe('lost-clock');
    expect(session.world.tick).toBe(deathTick); // stopped exactly, never overshot

    // Already terminal — a further advance is a no-op (never steps a resolved campaign).
    session.advance(TICKS_PER_DAY);
    expect(session.world.tick).toBe(deathTick);
  });
});
