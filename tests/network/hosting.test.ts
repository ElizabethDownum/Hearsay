import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import {
  applyGoTo, applyHost, applyMeet, applyTell, type InjectSpec,
} from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { circlesAt, positionOf } from '../../src/sim/agents';
import { step } from '../../src/sim/step';
import { dispositionOf, payWagesNightly } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import { hashWorld } from '../../src/sim/hash';
import { at } from '../../src/core/time';
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
function makeAsset(w: WorldState, id: EntityId, trust = 0.6): void {
  w.network.assets.push({
    id, mice: 'money', wagePaidThroughDay: 0, strikes: 0,
    facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }],
  });
  w.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rung 3 — the safehouse meet
// ─────────────────────────────────────────────────────────────────────────────
describe('meet — pull one asset to the safehouse for the next beat (rung 3)', () => {
  it('writes exactly a one-beat, 15-aligned, safehouse, source-player override + a met-asset fact', () => {
    const w = world('meet-override', 'noble');
    makeAsset(w, 'ann');
    applyMeet(w, 'ann', 0); // planned at tick 0 → the NEXT beat is minute 15

    const own = w.scheduleOverrides['ann']!.filter((o) => o.source === 'player');
    expect(own).toHaveLength(1);
    expect(own[0]!).toEqual({ fromDay: 0, toDay: 1, from: 15, to: 30, venue: 'safehouse', source: 'player' });
    // 15-aligned and exactly one beat long.
    expect(own[0]!.from % 15).toBe(0);
    expect(own[0]!.to - own[0]!.from).toBe(15);
    // The visit is on the record — contact tracing's handle.
    expect(compartmentOf(w, 'ann')).toContainEqual({ tick: 0, kind: 'met-asset', ref: 'you' });
  });

  it('a GUARANTEED 2-person circle forms at the meet beat, and the asset RETURNS to schedule after', () => {
    const w = world('meet-circle', 'noble');
    makeAsset(w, 'ann');
    // ann is a tavern regular — proving the pull, not a coincidence of schedule.
    expect(positionOf(w, w.npcs['ann']!, 15)).toBe('tavern');
    applyMeet(w, 'ann', 0);

    // The meet beat (15): avatar (home = safehouse) + ann, and NOBODY else (private, no regulars).
    const circle = circlesAt(w, 15).find((c) => c.members.includes('you'))!;
    expect(circle.venue).toBe('safehouse');
    expect([...circle.members].sort()).toEqual(['ann', 'you']);

    // The very next beat (30): the one-beat window is spent — ann is back at the tavern, off the avatar.
    expect(positionOf(w, w.npcs['ann']!, 30)).toBe('tavern');
    expect(circlesAt(w, 30).find((c) => c.members.includes('you'))!.members).not.toContain('ann');
  });

  it('the meet override WINS over a standing player posting during its beat, and the posting resumes after', () => {
    const w = world('meet-precedence', 'noble');
    makeAsset(w, 'ann');
    // A standing player posting keeps ann at the tavern 960–1200 every day (the assignInformant shape).
    w.scheduleOverrides['ann'] = [{ fromDay: 0, toDay: null, from: 960, to: 1200, venue: 'tavern', source: 'player' }];
    applyMeet(w, 'ann', 960); // plan the meet at 960 → next beat 975, inside the posting window

    expect(positionOf(w, w.npcs['ann']!, 975)).toBe('safehouse'); // the transient pull wins
    expect(positionOf(w, w.npcs['ann']!, 990)).toBe('tavern');    // the posting resumes the next beat
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
    const build = (): WorldState => { const w = world('meet-replay', 'noble'); makeAsset(w, 'ann'); return w; };
    const log: Action[] = [{ tick: 0, kind: 'meet', asset: 'ann' }];
    const a = runLogOn(build(), RULES, log, at(0, 2));
    const b = runLogOn(build(), RULES, log, at(0, 2));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(compartmentOf(a, 'ann').some((f) => f.kind === 'met-asset')).toBe(true);
    // an unknown kind still throws (the union's default-throw is preserved).
    expect(() => applyAction(build(), { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rung 4 — the hosted room
// ─────────────────────────────────────────────────────────────────────────────
describe('host — the controlled room (rung 4)', () => {
  it('writes the next-evening event blocks + attended-hosting facts on every invitee, and debits the salon cost', () => {
    const w = world('host-blocks', 'noble');
    makeAsset(w, 'ann'); makeAsset(w, 'bri');
    const coin0 = w.coin;
    w.tick = at(0, 10); // the applyAction invariant (world.tick === action.tick): the fact stamps this tick

    applyHost(w, 'salon', ['ann', 'bri'], at(0, 10), RULES);

    for (const id of ['ann', 'bri']) {
      const own = w.scheduleOverrides[id]!.filter((o) => o.source === 'player');
      expect(own).toHaveLength(1);
      expect(own[0]!).toEqual({ fromDay: 1, toDay: 2, from: 1080, to: 1200, venue: 'salon', source: 'player' });
      expect(compartmentOf(w, id)).toContainEqual({ tick: at(0, 10), kind: 'attended-hosting', ref: 'salon' });
    }
    expect(w.coin).toBe(coin0 - STANDARD_ECONOMY.salonEvent);
  });

  it('a LOWLIFE hosts the back-room and debits the back-room cost', () => {
    const w = world('host-lowlife', 'lowlife');
    makeAsset(w, 'ann');
    const coin0 = w.coin;
    applyHost(w, 'back-room-d0', ['ann'], at(0, 10), RULES);
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

  it('the ≥0.5 acceptance gate: a strike-slid asset at 0.45 REFUSES; a 0.5 asset accepts', () => {
    const w = world('host-gate', 'noble');
    makeAsset(w, 'ann', 0.5);      // a coercion-floor disposition
    w.coin = 0; payWagesNightly(w, RULES); // one missed wage: strike + slide −0.05 → 0.45 (push them under)
    expect(dispositionOf(w, 'ann')).toBeCloseTo(0.45, 10);

    const before = hashWorld(w);
    expect(() => applyHost(w, 'salon', ['ann'], at(0, 10), RULES)).toThrow(/0\.5|trust|summon|stranger|accept/i);
    expect(hashWorld(w)).toBe(before); // zero residue — no block, no fact, no debit

    // Control: exactly 0.5 accepts (dossier freebies at 0.75 and every recruit 0.5–0.7 clear this).
    const ok = world('host-gate-ok', 'noble');
    makeAsset(ok, 'bri', 0.5);
    expect(dispositionOf(ok, 'bri')).toBe(0.5);
    applyHost(ok, 'salon', ['bri'], at(0, 10), RULES);
    expect(ok.scheduleOverrides['bri']!.some((o) => o.venue === 'salon')).toBe(true);
  });

  it('enforces the invitee cap of 6 (zero residue on refusal); six is accepted', () => {
    const w = world('host-cap', 'noble');
    const seven = ['ann', 'bri', 'cy', 'dot', 'eve', 'fin', 'gus'];
    for (const id of seven) makeAsset(w, id);
    const before = hashWorld(w);
    expect(() => applyHost(w, 'salon', seven, at(0, 10), RULES)).toThrow(/cap|6|six|too many/i);
    expect(hashWorld(w)).toBe(before);
    applyHost(w, 'salon', seven.slice(0, 6), at(0, 10), RULES); // six is fine
  });

  it('refuses when the treasury cannot cover the event (zero residue)', () => {
    const w = world('host-broke', 'noble');
    makeAsset(w, 'ann');
    w.coin = STANDARD_ECONOMY.salonEvent - 1;
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
    makeAsset(w, 'ann');
    applyHost(w, 'salon', ['ann'], at(0, 10), RULES);

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
    makeAsset(w, 'greg'); // trust-edged so he clears the host gate — a guard at your salon is a blunder
    applyHost(w, 'salon', ['greg'], at(0, 10), RULES);

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
