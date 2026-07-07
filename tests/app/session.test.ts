import { describe, expect, it } from 'vitest';
import { newSession, loadSession } from '../../app/src/loop/session';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { hashWorld } from '../../src/sim/hash';
import { at, minuteOfDay, TICKS_PER_DAY, type Tick } from '../../src/core/time';
import { venueAt, CIRCLE_SIZE } from '../../src/sim/agents';
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
});

// ── (b) THE load-bearing test: the browser game IS the replay ─────────────────────────────
describe('submit + advance reproduces runLogOn exactly — live ≡ replay', () => {
  it('a session that queues {goTo, tell, ask, tag} + advances 2 days hashes equal to a fresh loadSession', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 1);
    const target = spot.npcs[0]!;

    // Two tick-0 verbs (goTo, tag), then two beat-aligned speech verbs at the co-circle beat.
    session.submit({ kind: 'goTo', venue: spot.venue });
    session.submit({ kind: 'tag', op: 'add', id: 'note-1', target: `npc:${target}`, text: 'watch this one' });
    advanceTo(session, spot.tick);
    const tell = session.submit({ kind: 'tell', to: target, spec: poison(usurper) });
    const ask = session.submit({ kind: 'ask', to: target, about: { subject: usurper } });
    expect(tell.queuedFor).toBe(spot.tick);
    expect(ask.queuedFor).toBe(spot.tick);

    // Fire the beat: the tell speaks (a chronicle 'telling'), the ask places its self-inquiry. (The
    // ask emits no 'asking' here — a fresh avatar trusts no one, so runAskPhase finds no eligible
    // addressee; the verb still engaged, which is what replay must reproduce.)
    session.advance(spot.tick + 1 - session.world.tick);
    expect(session.world.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);
    expect((session.world.inquiries['you'] ?? []).some((task) => task.from === 'self')).toBe(true);

    session.advance(at(2, 0) - session.world.tick); // finish out 2 sim-days
    // The window stays live (no terminal mid-batch) — the probe invariant this test rests on.
    expect(session.world.scenario!.status).toBe('running');
    expect(session.world.tick).toBe(at(2, 0));

    const save = session.save();
    expect(save.log.map((a) => a.kind)).toEqual(['goTo', 'tag', 'tell', 'ask']);

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

  it('a second tell queued for the same beat throws (one telling per beat) and is dropped', () => {
    const session = newSession(SEED);
    const usurper = session.world.scenario!.cast.usurper;
    const spot = findCoCircle(session.world, 2); // need two co-circled targets
    const [n1, n2] = spot.npcs;

    session.submit({ kind: 'goTo', venue: spot.venue });
    advanceTo(session, spot.tick);
    session.submit({ kind: 'tell', to: n1!, spec: poison(usurper) });
    session.submit({ kind: 'tell', to: n2!, spec: poison(usurper) });

    expect(() => session.advance(CONVERSATION_BEAT + 1)).toThrow(/one telling per beat/);
    expect(session.save().log.filter((a) => a.kind === 'tell')).toHaveLength(1); // only the first survives
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
