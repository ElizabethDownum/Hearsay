import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import {
  applyGoTo, applyHost, applyInject, applyMeet, applyTell, type InjectSpec,
  RENDEZVOUS_MAX_LEAD, RENDEZVOUS_MAX_SPAN,
} from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { circlesAt, positionOf } from '../../src/sim/agents';
import { runUntil, step } from '../../src/sim/step';
import { dispositionOf, payWagesNightly } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import { hashWorld } from '../../src/sim/hash';
import { at, dayOf } from '../../src/core/time';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import type { TownFixture, WorldState } from '../../src/sim/types';

const RULES = STANDARD_RULES;

/** An NPC pinned all day to `venue` — a literalist (inert firmware) grocer with no edges. */
const npc = (id: string, venue: string) => ({
  id, name: id, home: venue, occupation: 'grocer', faction: 'none' as const,
  traits: ['literalist' as const], rivals: [], edges: [],
  schedule: [{ days: 'all' as const, from: 0, to: 1439, venue }],
});

/**
 * A hand-built town with the avatar's own private safehouse, a noble salon, a lowlife back-room, a
 * public tavern, and a guard post. Civilians live at the tavern (public) — never at the salon unless
 * INVITED, so a hosted circle is exactly the guests. `greg` keeps the guard post (the un-invited
 * observer of the never-caught test / the invited one of its control).
 */
const hostFixture = (): TownFixture => ({
  venues: [
    { id: 'safehouse', district: 'd0', access: 'private' },
    { id: 'salon', district: 'd0', access: 'invitational' },
    { id: 'back-room-d0', district: 'd0', access: 'invitational' },
    { id: 'tavern', district: 'd0', access: 'public' },
    { id: 'guard-post', district: 'd0', access: 'invitational' },
  ],
  npcs: [
    npc('ann', 'tavern'), npc('bri', 'tavern'), npc('cy', 'tavern'), npc('dot', 'tavern'),
    npc('eve', 'tavern'), npc('fin', 'tavern'), npc('gus', 'tavern'), npc('greg', 'guard-post'),
  ],
});

/** Avatar enrolled at the safehouse with the given standing (the access law's input). */
function world(seed: string, station: WorldState['station']): WorldState {
  const w = buildWorld(hostFixture(), seed, RULES);
  enrollPlayer(w, { home: 'safehouse' });
  w.station = station;
  return w;
}

/** Force `id` onto the roster with a disposition edge (the direct-construct idiom): a money asset,
 *  recruited-by:player on the record, trust `trust` toward the avatar. */
function makeAsset(w: WorldState, id: EntityId, trust = 0.8): void {
  w.network.assets.push({
    id, mice: 'money', wagePaidThroughDay: 0, strikes: 0,
    facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }],
  });
  w.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust });
}

/** Keep the selected people in the avatar's one real tavern circle and move every fixture-only
 * bystander away for the offer day. This stages physical speech without depending on seeded
 * partitioning of an overcrowded venue. */
function stageOfferedCircle(w: WorldState, tick: number, members: readonly EntityId[]): void {
  applyGoTo(w, 'tavern');
  const kept = new Set(members);
  for (const id of Object.keys(w.npcs)) {
    if (id === w.playerId || kept.has(id)) continue;
    w.scheduleOverrides[id] = [{
      fromDay: dayOf(tick), toDay: dayOf(tick) + 1, from: 0, to: 1440,
      venue: 'guard-post', source: 'vignette', sourceRef: `test-offer:${tick}:${id}`,
    }, ...(w.scheduleOverrides[id] ?? [])];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rung 3 — the safehouse meet
// ─────────────────────────────────────────────────────────────────────────────
describe('meet — pull one asset to the safehouse from the next beat (rung 3)', () => {
  it('queues locally, then writes the two-beat sourced override and fact only at actual attendance', () => {
    const w = world('meet-override', 'noble');
    makeAsset(w, 'ann');
    stageOfferedCircle(w, 0, ['ann']);
    applyMeet(w, 'ann', 0); // planned at tick 0 → the NEXT beat is minute 15
    const directiveId = w.network.directiveState!.records[0]!.id;
    expect(w.scheduleOverrides['ann']).toBeUndefined();
    expect(compartmentOf(w, 'player', 'ann').some((f) => f.kind === 'met-asset')).toBe(false);
    step(w, RULES); // the offered-circle handoff is spoken at tick 0
    applyGoTo(w, 'safehouse');
    runUntil(w, 16, RULES);

    const own = w.scheduleOverrides['ann']!.filter((o) => o.source === 'player');
    expect(own).toHaveLength(1);
    expect(own[0]!).toEqual({ fromDay: 0, toDay: 1, from: 15, to: 45, venue: 'safehouse',
      source: 'player', sourceRef: `rendezvous:${directiveId}` });
    // 15-aligned and exactly two beats long (R38): the application installs the row DURING the tick of
    // its first beat, after that tick's frame froze, so the second beat is the first one a player's
    // frozen offer can see the asset in.
    expect(own[0]!.from % 15).toBe(0);
    expect(own[0]!.to - own[0]!.from).toBe(30);
    // The visit is on the record — contact tracing's handle.
    expect(compartmentOf(w, 'player', 'ann')).toContainEqual({ tick: 15, kind: 'met-asset', ref: 'you' });
  });

  it('an accepted meet forms a real 2-person circle only when the avatar attends', () => {
    const w = world('meet-circle', 'noble');
    makeAsset(w, 'ann');
    // ann is a tavern regular — proving the pull, not a coincidence of schedule.
    expect(positionOf(w, w.npcs['ann']!, 15)).toBe('tavern');
    stageOfferedCircle(w, 0, ['ann']);
    applyMeet(w, 'ann', 0);
    step(w, RULES);
    applyGoTo(w, 'safehouse');

    // Every question below is asked LIVE, with the world standing AT the tick it asks about (R38). An
    // after-the-fact `circlesAt(w, 15)` from tick 16 reads the override table as it is THEN, and so
    // reported a circle no frame at beat 15 ever contained.
    runUntil(w, 15, RULES);
    // The application beat (15), before it runs: the override does not exist yet — ann is still a regular.
    expect(positionOf(w, w.npcs['ann']!, 15)).toBe('tavern');
    expect(circlesAt(w, 15).find((c) => c.members.includes('you'))!.members).not.toContain('ann');

    // The second beat (30): avatar (home = safehouse) + ann, and NOBODY else (private, no regulars).
    runUntil(w, 30, RULES);
    const circle = circlesAt(w, 30).find((c) => c.members.includes('you'))!;
    expect(circle.venue).toBe('safehouse');
    expect([...circle.members].sort()).toEqual(['ann', 'you']);

    // The beat after (45): the two-beat window is spent — ann is back at the tavern, off the avatar.
    runUntil(w, 45, RULES);
    expect(positionOf(w, w.npcs['ann']!, 45)).toBe('tavern');
    expect(circlesAt(w, 45).find((c) => c.members.includes('you'))!.members).not.toContain('ann');
  });

  it('a meet makes a LIVE debrief possible through the real tick loop (R38)', () => {
    const spec: InjectSpec = { subject: 'dot', predicate: 'stole', object: null, count: 3, severity: 3, place: null, attribution: SOMEONE };
    const build = (): WorldState => {
      const w = world('meet-debrief', 'noble');
      makeAsset(w, 'ann');
      applyInject(w, 'ann', spec); // something in her belief store to give up
      stageOfferedCircle(w, 0, ['ann']);
      return w;
    };
    const meetLog: Action[] = [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: 1, kind: 'goTo', venue: 'safehouse' },
    ];
    // The debrief rides the same frozen offers a player's does: `runLogOn` validates it against the
    // frame prepared for tick 30, never against a live or after-the-fact circle.
    const w = runLogOn(build(), RULES, [...meetLog, { tick: 30, kind: 'debrief', asset: 'ann' }], 46);
    const answers = w.intel.log.filter((row) => row.tick === 30 && row.via === 'ann' && row.mode === 'answer');
    expect(answers).toHaveLength(1);
    expect(answers[0]!.venue).toBe('safehouse');
    expect(w.network.assets.find((a) => a.id === 'ann')!.strikes).toBe(1);
    expect(compartmentOf(w, 'player', 'ann')).toContainEqual({ tick: 15, kind: 'met-asset', ref: 'you' });
    expect(w.network.invitations!.find((row) => row.kind === 'rendezvous')!.status).toBe('attended');

    // The window is still a window: by beat 45 she has gone, and the same verb refuses.
    expect(() => runLogOn(build(), RULES, [...meetLog, { tick: 45, kind: 'debrief', asset: 'ann' }], 46))
      .toThrow(/not with you at the safehouse this beat/);
    // CONTROL: without the meet, the same debrief at the same beat refuses — the meet is what put her there.
    expect(() => runLogOn(build(), RULES, [
      { tick: 1, kind: 'goTo', venue: 'safehouse' }, { tick: 30, kind: 'debrief', asset: 'ann' },
    ], 46)).toThrow(/not with you at the safehouse this beat/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // R39 — the record, the authored window and the spent rows
  // ───────────────────────────────────────────────────────────────────────────
  const meetWorld = (seed: string): WorldState => {
    const w = world(seed, 'noble');
    makeAsset(w, 'ann');
    applyInject(w, 'ann', { subject: 'dot', predicate: 'stole', object: null, count: 3, severity: 3, place: null, attribution: SOMEONE });
    stageOfferedCircle(w, 0, ['ann']);
    return w;
  };
  const outcomesOf = (w: WorldState): { tick: number; outcome: string; reason: string | null }[] =>
    (w.network.directiveState!.records[0]!.outcomes ?? [])
      .map((row) => ({ tick: row.tick, outcome: row.result.outcome, reason: row.result.reason ?? null }));

  it('an attended meet completes its directive as attended, never as refused (R39)', () => {
    const w = runLogOn(meetWorld('meet-record-attended'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: 1, kind: 'goTo', venue: 'safehouse' },
    ], 46);
    const record = w.network.directiveState!.records[0]!;
    // Settled when the two first stand in the room (R39b), as a posting is when it is first occupied:
    // the window only says how long she waits. The invitation itself still closes with the window.
    expect(record.execution).toMatchObject({ state: 'completed', changedAt: 15 });
    expect(outcomesOf(w)).toMatchObject([{ tick: 15, outcome: 'rendezvous attended' }]);
    expect(w.network.invitations![0]!).toMatchObject({ status: 'attended', attendedAt: 15, closedAt: 45 });
    // So the word that it happened is handed over AT the meeting, on its second beat, not after it.
    expect(record.receivedReports.map((row) => ({ at: row.receivedAt, outcome: row.report.outcome })))
      .toEqual([{ at: 30, outcome: 'rendezvous attended' }]);
  });

  it('a player who arrives only for the second beat settles the record then; she still waits out the window (R39b)', () => {
    const w = runLogOn(meetWorld('meet-record-second-beat'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: 16, kind: 'goTo', venue: 'safehouse' },
    ], 31);
    expect(w.network.directiveState!.records[0]!.execution).toMatchObject({ state: 'completed', changedAt: 30 });
    expect(w.network.invitations![0]!).toMatchObject({ status: 'accepted', attendedAt: 30, closedAt: null });
    // Completing the record releases nothing: the rows hold her until the invitation closes.
    expect(w.scheduleOverrides['ann']!.some((row) => row.sourceRef?.startsWith('rendezvous:'))).toBe(true);
    expect(positionOf(w, w.npcs['ann']!, 44)).toBe('safehouse');
    runUntil(w, 46, RULES);
    expect(w.network.invitations![0]!).toMatchObject({ status: 'attended', closedAt: 45 });
    expect(w.scheduleOverrides['ann']).toBeUndefined();
    expect(outcomesOf(w)).toMatchObject([{ tick: 30, outcome: 'rendezvous attended' }]);
  });

  it('a meet the player never turns up for aborts as missed when its window closes, not before (R39)', () => {
    const w0 = meetWorld('meet-record-missed');
    const w = runLogOn(w0, RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
    ], 31);
    // The brief's active window ended at 15; the accepted rendezvous keeps the record open until it closes.
    expect(w.network.directiveState!.records[0]!.execution).toMatchObject({ state: 'attempted' });
    runUntil(w, 46, RULES);
    expect(w.network.directiveState!.records[0]!.execution).toMatchObject({ state: 'aborted', changedAt: 45 });
    expect(outcomesOf(w)).toEqual([{ tick: 45, outcome: 'refused', reason: 'rendezvous window missed' }]);
    expect(w.network.invitations![0]!).toMatchObject({ status: 'missed', attendedAt: null, closedAt: 45 });
  });

  it('the spent rendezvous rows leave the schedule when the invitation closes; other rows stay (R39)', () => {
    const w0 = meetWorld('meet-prune');
    const standing = { fromDay: 0, toDay: null, from: 960, to: 1200, venue: 'tavern', source: 'player' as const };
    w0.scheduleOverrides['ann'] = [standing];
    const w = runLogOn(w0, RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: 1, kind: 'goTo', venue: 'safehouse' },
    ], 45);
    expect(w.scheduleOverrides['ann']!.some((row) => row.sourceRef?.startsWith('rendezvous:'))).toBe(true);
    runUntil(w, 46, RULES);
    expect(w.scheduleOverrides['ann']).toEqual([standing]);

    // With nothing else on her schedule the key itself goes, as it was before the meet.
    const bare = runLogOn(meetWorld('meet-prune-bare'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: 1, kind: 'goTo', venue: 'safehouse' },
    ], 46);
    expect(bare.scheduleOverrides['ann']).toBeUndefined();
  });

  it('a meet is a face handoff: off the beat it refuses with zero residue (R39)', () => {
    const w = meetWorld('meet-offbeat');
    w.tick = 7;
    const before = hashWorld(w);
    expect(() => applyMeet(w, 'ann', 7)).toThrow(/meet: a face handoff happens on conversation beats/);
    expect(hashWorld(w)).toBe(before);
  });

  const composedRendezvous = (from: number, until: number): Action => ({
    tick: 0, kind: 'directive', recipient: 'ann', handoff: { outboundVia: [], reportVia: [] },
    brief: {
      mission: { kind: 'learn', target: { kind: 'venue', id: 'safehouse' } },
      priority: 'urgent', authority: 'relationship', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 15, until: at(0, 5) }, report: 'outcome', reportBy: 15, purpose: null,
    },
    application: { kind: 'rendezvous', venue: 'safehouse', from, until },
  });

  it('execution honours the authored rendezvous window: a later start is kept, and one beat then suffices (R39)', () => {
    const w = runLogOn(meetWorld('meet-authored-later'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      composedRendezvous(45, 60),
      { tick: 1, kind: 'goTo', venue: 'safehouse' },
      { tick: 45, kind: 'debrief', asset: 'ann' },
    ], 46);
    // Accepted at beat 15 for a window that opens at 45: the row exists two beats early, so the frame
    // frozen for 45 already holds her and the single authored beat is a real, usable window.
    expect(w.network.invitations![0]!).toMatchObject({
      requested: { from: 45, until: 60 }, scheduled: { from: 45, until: 60 }, attendedAt: 45,
    });
    const own = w.scheduleOverrides['ann']!.filter((row) => row.sourceRef?.startsWith('rendezvous:'));
    expect(own.map(({ fromDay, toDay, from, to }) => ({ fromDay, toDay, from, to })))
      .toEqual([{ fromDay: 0, toDay: 1, from: 45, to: 60 }]);
    expect(w.intel.log.filter((row) => row.tick === 45 && row.via === 'ann' && row.mode === 'answer')).toHaveLength(1);
    runUntil(w, 61, RULES);
    expect(outcomesOf(w).map((row) => row.outcome)).toEqual(['rendezvous attended']);
  });

  it('a window authored to open on the beat the asset acts is widened to the two-beat floor, and says so (R39)', () => {
    const w = runLogOn(meetWorld('meet-authored-floor'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      composedRendezvous(15, 30),
    ], 16);
    expect(w.network.invitations![0]!).toMatchObject({
      requested: { from: 15, until: 30 }, scheduled: { from: 15, until: 45 },
    });
  });

  it('a longer authored window is kept whole (R39)', () => {
    const w = runLogOn(meetWorld('meet-authored-long'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      composedRendezvous(15, 90),
    ], 16);
    expect(w.network.invitations![0]!).toMatchObject({
      requested: { from: 15, until: 90 }, scheduled: { from: 15, until: 90 },
    });
  });

  // R40: since R39 honours the authored window, an unbounded one could pin an asset for weeks, or hold
  // the record of a far-future meeting `attempted` throughout. The window is capped at issue: at most
  // RENDEZVOUS_MAX_SPAN long, opening no later than RENDEZVOUS_MAX_LEAD after the tick it is issued.
  const issueComposed = (w: WorldState, from: number, until: number): void => {
    applyAction(w, { tick: 0, kind: 'goTo', venue: 'tavern' }, RULES);
    applyAction(w, composedRendezvous(from, until), RULES);
  };

  it('the caps are the ones the owner chose: four hours long, opening within a day (R40)', () => {
    expect(RENDEZVOUS_MAX_SPAN).toBe(16 * 15);
    expect(RENDEZVOUS_MAX_LEAD).toBe(at(1, 0));
  });

  it.each([
    ['a window one beat longer than the span cap', 15, 15 + RENDEZVOUS_MAX_SPAN + 15,
      /directive: rendezvous window may run at most four hours/],
    ['a window opening one beat past the lead cap', RENDEZVOUS_MAX_LEAD + 15, RENDEZVOUS_MAX_LEAD + 45,
      /directive: rendezvous window must open within a day of issue/],
  ])('%s is refused at issue with zero residue (R40)', (_label, from, until, message) => {
    const w = meetWorld(`meet-capped-${from}-${until}`);
    applyAction(w, { tick: 0, kind: 'goTo', venue: 'tavern' }, RULES);
    const before = hashWorld(w);
    expect(() => applyAction(w, composedRendezvous(from, until), RULES)).toThrow(message);
    expect(hashWorld(w)).toBe(before);
  });

  it.each([
    ['exactly the span cap', 15, 15 + RENDEZVOUS_MAX_SPAN],
    ['opening exactly at the lead cap', RENDEZVOUS_MAX_LEAD, RENDEZVOUS_MAX_LEAD + 30],
  ])('a window of %s is accepted and scheduled as authored (R40)', (_label, from, until) => {
    const w = meetWorld(`meet-cap-edge-${from}-${until}`);
    issueComposed(w, from, until);
    runUntil(w, 16, RULES);
    expect(w.network.invitations![0]!).toMatchObject({
      requested: { from, until }, scheduled: { from, until },
    });
  });

  it('the preset authors the window it gets: requested equals scheduled (R39)', () => {
    const w = runLogOn(meetWorld('meet-authored-preset'), RULES, [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
    ], 16);
    expect(w.network.directiveState!.records[0]!.authored.brief.application)
      .toEqual({ kind: 'rendezvous', venue: 'safehouse', from: 15, until: 45 });
    expect(w.network.invitations![0]!).toMatchObject({
      requested: { from: 15, until: 45 }, scheduled: { from: 15, until: 45 },
    });
  });

  // A schedule override is a (day range x minute-of-day range) row, never a tick interval, so a window
  // that touches midnight needs its own arithmetic (R38b). 1395 -> first beat 1410: the window ends
  // exactly at midnight, and a wrapped `to: 0` would match no minute. 1410 -> first beat 1425: the
  // window straddles midnight, which no single row can say.
  it.each([
    ['whose window ends exactly at midnight', 1395,
      [{ fromDay: 0, toDay: 1, from: 1410, to: 1440 }]],
    ['whose window straddles midnight', 1410,
      [{ fromDay: 0, toDay: 1, from: 1425, to: 1440 }, { fromDay: 1, toDay: 2, from: 0, to: 15 }]],
  ])('a meet %s still pulls the asset, and the live debrief works (R38b)', (_label, plan, rows) => {
    const spec: InjectSpec = { subject: 'dot', predicate: 'stole', object: null, count: 3, severity: 3, place: null, attribution: SOMEONE };
    const first = plan + 15;
    const second = plan + 30;
    const w0 = world(`meet-midnight-${plan}`, 'noble');
    makeAsset(w0, 'ann');
    w0.tick = plan;
    applyInject(w0, 'ann', spec);
    stageOfferedCircle(w0, plan, ['ann']);
    const w = runLogOn(w0, RULES, [
      { tick: plan, kind: 'goTo', venue: 'tavern' },
      { tick: plan, kind: 'meet', asset: 'ann' },
      { tick: plan + 1, kind: 'goTo', venue: 'safehouse' },
      { tick: second, kind: 'debrief', asset: 'ann' },
    ], second + 1);

    // Read while the invitation is still open: the rows leave the schedule when it closes (R39).
    const own = w.scheduleOverrides['ann']!.filter((o) => o.source === 'player');
    expect(own.map(({ fromDay, toDay, from, to }) => ({ fromDay, toDay, from, to }))).toEqual(rows);
    expect(own.every((o) => o.venue === 'safehouse' && o.from < o.to)).toBe(true);
    runUntil(w, second + 16, RULES);
    expect(compartmentOf(w, 'player', 'ann')).toContainEqual({ tick: first, kind: 'met-asset', ref: 'you' });
    expect(w.network.invitations!.find((row) => row.kind === 'rendezvous')!.status).toBe('attended');
    expect(w.intel.log.filter((row) => row.tick === second && row.via === 'ann' && row.mode === 'answer')).toHaveLength(1);
    // Live at the end of the run (one beat past the window): she has gone home.
    expect(positionOf(w, w.npcs['ann']!, w.tick)).toBe('tavern');
  });

  it('the meet override WINS over a standing player posting during its beat, and the posting resumes after', () => {
    const w = world('meet-precedence', 'noble');
    makeAsset(w, 'ann');
    // A standing player posting keeps ann at the tavern 960–1200 every day (the assignInformant shape).
    w.scheduleOverrides['ann'] = [{ fromDay: 0, toDay: null, from: 960, to: 1200, venue: 'tavern', source: 'player' }];
    w.tick = 960;
    stageOfferedCircle(w, 960, ['ann']);
    applyMeet(w, 'ann', 960); // plan the meet at 960 → next beat 975, inside the posting window
    step(w, RULES);
    applyGoTo(w, 'safehouse');
    // Asked live at each beat (R38), never after the fact.
    runUntil(w, 990, RULES);
    expect(positionOf(w, w.npcs['ann']!, 990)).toBe('safehouse'); // the transient pull wins
    runUntil(w, 1005, RULES);
    expect(positionOf(w, w.npcs['ann']!, 1005)).toBe('tavern');   // the posting resumes once the window is spent
  });

  it('refuses a non-asset and a headless world with zero residue', () => {
    const w = world('meet-nonasset', 'noble');
    const before = hashWorld(w);
    expect(() => applyMeet(w, 'ann', 0)).toThrow(/not one of your assets/);
    expect(hashWorld(w)).toBe(before);

    const headless = buildWorld(hostFixture(), 'meet-headless', RULES);
    expect(() => applyMeet(headless, 'ann', 0)).toThrow(/no player/);
  });

  it('meet joins the Action union (needs no rules); live ≡ replay', () => {
    const build = (): WorldState => {
      const w = world('meet-replay', 'noble');
      makeAsset(w, 'ann');
      stageOfferedCircle(w, 0, ['ann']);
      return w;
    };
    const log: Action[] = [
      { tick: 0, kind: 'goTo', venue: 'tavern' },
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: 1, kind: 'goTo', venue: 'safehouse' },
    ];
    const a = runLogOn(build(), RULES, log, at(0, 2));
    const b = runLogOn(build(), RULES, log, at(0, 2));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(compartmentOf(a, 'player', 'ann').some((f) => f.kind === 'met-asset')).toBe(true);
    // an unknown kind still throws (the union's default-throw is preserved).
    expect(() => applyAction(build(), { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rung 4 — the hosted room
// ─────────────────────────────────────────────────────────────────────────────
describe('host — the controlled room (rung 4)', () => {
  it('queues invitations locally; accepted replies schedule, and facts wait for actual attendance', () => {
    const w = world('host-blocks', 'noble');
    makeAsset(w, 'ann'); makeAsset(w, 'bri');
    const coin0 = w.coin;
    w.tick = at(0, 10); // the applyAction invariant (world.tick === action.tick): the fact stamps this tick
    stageOfferedCircle(w, at(0, 10), ['ann', 'bri']);

    applyHost(w, 'salon', ['ann', 'bri'], at(0, 10), RULES);
    expect(w.scheduleOverrides['ann']).toBeUndefined();
    expect(compartmentOf(w, 'player', 'ann').some((f) => f.kind === 'attended-hosting')).toBe(false);
    step(w, RULES);

    for (const id of ['ann', 'bri']) {
      const own = w.scheduleOverrides[id]!.filter((o) => o.source === 'player');
      expect(own).toHaveLength(1);
      expect(own[0]!).toMatchObject({ fromDay: 1, toDay: 2, from: 1080, to: 1200,
        venue: 'salon', source: 'player' });
      expect(compartmentOf(w, 'player', id).some((f) => f.kind === 'attended-hosting')).toBe(false);
    }
    expect(w.coin).toBe(coin0 - STANDARD_ECONOMY.salonEvent);
    runUntil(w, at(1, 20, 1), RULES);
    for (const id of ['ann', 'bri']) {
      expect(compartmentOf(w, 'player', id).some((f) => f.kind === 'attended-hosting')).toBe(true);
    }
  });

  it('a LOWLIFE hosts the back-room and debits the back-room cost', () => {
    const w = world('host-lowlife', 'lowlife');
    makeAsset(w, 'ann');
    const coin0 = w.coin;
    w.tick = at(0, 10);
    applyGoTo(w, 'tavern');
    applyHost(w, 'back-room-d0', ['ann'], at(0, 10), RULES);
    step(w, RULES);
    expect(w.scheduleOverrides['ann']!.some((o) => o.venue === 'back-room-d0' && o.source === 'player')).toBe(true);
    expect(w.coin).toBe(coin0 - STANDARD_ECONOMY.backRoomEvent);
  });

  it('refuses the wrong room for the standing (validate-before-mutate, zero residue)', () => {
    const noble = world('host-noble-room', 'noble'); makeAsset(noble, 'ann');
    const before = hashWorld(noble);
    expect(() => applyHost(noble, 'back-room-d0', ['ann'], at(0, 10), RULES)).toThrow(/room|standing|salon/i);
    expect(() => applyHost(noble, 'tavern', ['ann'], at(0, 10), RULES)).toThrow(/room|standing|salon/i);
    expect(() => applyHost(noble, 'safehouse', ['ann'], at(0, 10), RULES)).toThrow(/room|standing|salon/i);
    expect(hashWorld(noble)).toBe(before);

    const low = world('host-low-room', 'lowlife'); makeAsset(low, 'ann');
    expect(() => applyHost(low, 'salon', ['ann'], at(0, 10), RULES)).toThrow(/room|standing|back-room/i);
  });

  it('relationship is evaluated by the physical invitation response, not by applyHost', () => {
    const w = world('host-gate', 'noble');
    makeAsset(w, 'ann', 0.5);      // a coercion-floor disposition
    w.coin = 0; payWagesNightly(w, RULES); // one missed wage: strike + slide −0.05 → 0.45 (push them under)
    expect(dispositionOf(w, 'ann')).toBeCloseTo(0.45, 10);
    w.coin = STANDARD_ECONOMY.salonEvent;

    w.tick = at(0, 10);
    stageOfferedCircle(w, at(0, 10), ['ann']);
    applyHost(w, 'salon', ['ann'], at(0, 10), RULES);
    step(w, RULES);
    expect(w.network.invitations![0]!.status).toBe('refused');
    expect(w.scheduleOverrides['ann']).toBeUndefined();

    // Control: a strong relationship survives the crowded offer's witness penalty.
    const ok = world('host-gate-ok', 'noble');
    makeAsset(ok, 'bri', 0.75);
    expect(dispositionOf(ok, 'bri')).toBe(0.75);
    ok.tick = at(0, 10);
    stageOfferedCircle(ok, at(0, 10), ['bri']);
    applyHost(ok, 'salon', ['bri'], at(0, 10), RULES);
    step(ok, RULES);
    expect(ok.scheduleOverrides['bri']!.some((o) => o.venue === 'salon')).toBe(true);
  });

  it('enforces the invitee cap of 6 before physical-presence validation; a full offered circle is accepted', () => {
    const w = world('host-cap', 'noble');
    const seven = ['ann', 'bri', 'cy', 'dot', 'eve', 'fin', 'gus'];
    for (const id of seven) makeAsset(w, id);
    const before = hashWorld(w);
    expect(() => applyHost(w, 'salon', seven, at(0, 10), RULES)).toThrow(/cap|6|six|too many/i);
    expect(hashWorld(w)).toBe(before);
    w.tick = at(0, 10);
    stageOfferedCircle(w, at(0, 10), seven.slice(0, 3));
    // Six clears the cap check and reaches the newly binding physical-circle check. A player plus
    // three invitees is the largest lawful CIRCLE_SIZE=4 offer and is accepted.
    const beforePresenceRefusal = hashWorld(w);
    expect(() => applyHost(w, 'salon', seven.slice(0, 6), at(0, 10), RULES))
      .toThrow(/offered circle/);
    expect(hashWorld(w)).toBe(beforePresenceRefusal);
    expect(() => applyHost(w, 'salon', seven.slice(0, 3), at(0, 10), RULES)).not.toThrow();
  });

  it('refuses when the treasury cannot cover the event (zero residue)', () => {
    const w = world('host-broke', 'noble');
    makeAsset(w, 'ann');
    w.coin = STANDARD_ECONOMY.salonEvent - 1;
    w.tick = at(0, 10);
    applyGoTo(w, 'tavern');
    const before = hashWorld(w);
    expect(() => applyHost(w, 'salon', ['ann'], at(0, 10), RULES)).toThrow(/treasury|cover/);
    expect(hashWorld(w)).toBe(before);
  });

  it('host joins the Action union; applyAction refuses host without rules (economy prices)', () => {
    const w = world('host-route', 'noble'); makeAsset(w, 'ann');
    expect(() => applyAction(w, { tick: 0, kind: 'host', venue: 'salon', invitees: ['ann'] })).toThrow(/rules/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The point — the hosted room is a circle you control (no overhear)
// ─────────────────────────────────────────────────────────────────────────────
describe('the hosted tell — no guard invited is NEVER caught, by mechanism', () => {
  const spec: InjectSpec = { subject: 'ann', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE };
  const EVENT_TICK = at(1, 18); // day 1, 18:00 = minute 1080 — inside the [1080,1200) event block

  it('an observer EXISTS but is not in the event circle → captureEvidence yields nothing on the avatar', () => {
    const w = world('host-safe', 'noble');
    w.enemy.observers.push({ id: 'greg', vigilance: 1 }); // a real guard, kept at his post — NOT invited
    w.network.spymaster = 'greg'; // embodied handler is real but remains outside the event circle
    makeAsset(w, 'ann');
    w.tick = at(0, 10);
    applyGoTo(w, 'tavern');
    applyHost(w, 'salon', ['ann'], at(0, 10), RULES);
    step(w, RULES);

    // Jump to the event beat (no nightly stepped → the demonstration is purely the hosting mechanism).
    w.tick = EVENT_TICK;
    applyGoTo(w, 'salon'); // the avatar attends their own room — the access law opens the salon for a noble

    // By construction: the event circle is exactly avatar + ann; greg is at the guard post, elsewhere.
    const circle = circlesAt(w, EVENT_TICK).find((c) => c.members.includes('you'))!;
    expect([...circle.members].sort()).toEqual(['ann', 'you']);
    expect(positionOf(w, w.npcs['greg']!, EVENT_TICK)).toBe('guard-post');

    applyTell(w, 'ann', spec, EVENT_TICK);
    const evBefore = w.enemy.evidence.length;
    step(w, RULES);

    // NON-VACUOUS: the tell really fired (so the test could have caught it) ...
    expect(w.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);
    // ... yet no observer shared the circle → the enemy captured NOTHING naming the avatar. The point.
    const onAvatar = w.enemy.evidence.slice(evBefore).filter((e) => e.kind === 'utterance' && e.speaker === 'you');
    expect(onAvatar).toHaveLength(0);
  });

  it('CONTROL (fair-cop): invite the guard-observer → the same tell IS captured (the test can fail)', () => {
    const w = world('host-caught', 'noble');
    w.enemy.observers.push({ id: 'greg', vigilance: 1 });
    w.network.spymaster = 'greg'; // the invited guard is also the embodied receiving principal
    makeAsset(w, 'greg'); // trust-edged so he clears the host gate — a guard at your salon is a blunder
    w.tick = at(0, 10);
    w.playerVenue = 'guard-post';
    applyHost(w, 'salon', ['greg'], at(0, 10), RULES);
    step(w, RULES);

    w.tick = EVENT_TICK;
    applyGoTo(w, 'salon');
    const circle = circlesAt(w, EVENT_TICK).find((c) => c.members.includes('you'))!;
    expect(circle.members).toContain('greg'); // the guard is IN the room this time

    applyTell(w, 'greg', spec, EVENT_TICK); // addressed to the guard → not overheard → surely noticed
    const evBefore = w.enemy.evidence.length;
    step(w, RULES);

    const onAvatar = w.enemy.evidence.slice(evBefore).filter((e) => e.kind === 'utterance' && e.speaker === 'you');
    expect(onAvatar.length).toBeGreaterThan(0); // the guard heard the avatar — caught in the act
  });
});
