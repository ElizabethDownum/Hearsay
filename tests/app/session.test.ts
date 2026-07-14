import { describe, expect, it } from 'vitest';
import { loadSession, newSession } from '../../app/src/loop/session';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { at, minuteOfDay, TICKS_PER_DAY } from '../../src/core/time';
import { canEnter, type InjectSpec } from '../../src/sim/actions';
import { circlesAt } from '../../src/sim/agents';
import { hashWorld } from '../../src/sim/hash';
import { scheduleSetup } from '../../src/sim/phases';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';

const SEED = 'cor-1';
const poison = (subject: EntityId): InjectSpec => ({ subject, predicate: 'poisoned', object: SOMEONE,
  count: null, severity: 5, place: null, attribution: SOMEONE });

/** Drive candidate sessions through the real request/prepare path and use the returned frame.
 * This deliberately does not predict generated schedules or circle partitioning. */
function requestActualOffer() {
  const session = newSession(SEED);
  const venues = Object.values(session.world.venues)
    .filter((venue) => canEnter(session.world, venue.id))
    .map((venue) => venue.id)
    .sort();
  // Start in an ordinary active daypart, then visit venues and trust only each returned offer.
  session.advance(727);
  for (const venue of venues) {
    session.submit({ kind: 'goTo', venue });
    expect(session.requestLocalInteraction().refused).toBe(false);
    expect(session.advance(20).stopped).toBe('local-offer');
    const offer = session.localOffer()!;
    const guards = new Set(session.world.enemy.observers.map((observer) => observer.id));
    const guardFree = offer.circleMembers.every((id) => !guards.has(id));
    const target = guardFree ? offer.circleMembers[0] : undefined;
    const outsider = Object.keys(session.world.npcs)
      .find((id) => id !== session.world.playerId && !offer.circleMembers.includes(id));
    if (target && outsider) return { session, venue, offer, target, outsider };
    session.cancelLocalInteraction();
    expect(session.advance(1).stopped).toBe('complete');
  }
  throw new Error('probe: no actual prepared offer had a safe target plus outsider');
}

/** A deterministic local room for offer/latch tests that do not exercise replay from seed+log. */
function requestStagedOffer(memberCount = 2) {
  const session = newSession(SEED);
  const guardIds = new Set(session.world.enemy.observers.map((observer) => observer.id));
  const members = Object.keys(session.world.npcs)
    .filter((id) => id !== session.world.playerId && !guardIds.has(id))
    .sort()
    .slice(0, memberCount);
  expect(members).toHaveLength(memberCount);
  const venue = 'offer-room';
  session.world.venues[venue] = { id: venue, district: 'd0', access: 'public' };
  for (const id of members) {
    session.world.scheduleOverrides[id] = [{
      fromDay: 0, toDay: 1, from: 0, to: 1440, venue, source: 'vignette',
    }];
  }
  session.submit({ kind: 'goTo', venue });
  session.advance(7);
  expect(session.requestLocalInteraction()).toEqual({ requestedFor: 15, refused: false });
  expect(session.advance(20)).toEqual({ advanced: 8, stopped: 'local-offer' });
  const offer = session.localOffer()!;
  expect(offer.circleMembers).toEqual(members);
  return { session, offer, members, venue };
}

/** Re-stage a discovered actual offer on a fresh standard world, optionally adding the replay tag. */
function freshActualOffer(withTag: boolean) {
  const discovered = requestActualOffer();
  const session = newSession(SEED);
  session.advance(discovered.offer.tick - 1);
  session.submit({ kind: 'goTo', venue: discovered.venue });
  if (withTag) {
    session.submit({ kind: 'tag', op: 'add', id: 'note-1', target: `npc:${discovered.target}`, text: 'watch this one' });
  }
  expect(session.requestLocalInteraction()).toEqual({ requestedFor: discovered.offer.tick, refused: false });
  expect(session.advance(2).stopped).toBe('local-offer');
  const offer = session.localOffer()!;
  const guards = new Set(session.world.enemy.observers.map((observer) => observer.id));
  expect(offer.circleMembers.every((id) => !guards.has(id))).toBe(true);
  expect(offer.circleMembers.length).toBeGreaterThan(0);
  return { session, offer, target: offer.circleMembers[0]! };
}

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
    expect(session.world.intel.log.every((entry) => entry.via === 'dossier')).toBe(true);
  });

  it('stages the treasury at STANDARD_ECONOMY.startingCoin (20) — Rules wired through stageWorld (controller rider)', () => {
    const session = newSession(SEED);
    expect(session.world.coin).toBe(STANDARD_ECONOMY.startingCoin);
    expect(session.world.coin).toBe(20);
  });
});

describe('submit + advance reproduces runLogOn exactly — live ≡ replay', () => {
  it('a session that queues {goTo, tag, tell} + advances 2 days hashes equal to a fresh loadSession', () => {
    const { session, offer, target } = freshActualOffer(true);
    session.chooseLocal(offer.token, {
      kind: 'tell', to: target, spec: poison(session.world.scenario!.cast.usurper),
    });
    session.advance(1);
    expect(session.world.chronicle.some((event) => event.kind === 'telling' && event.speaker === 'you')).toBe(true);
    session.advance(at(2, 0) - session.world.tick);
    expect(session.world.scenario!.status).toBe('running');
    expect(session.world.tick).toBe(at(2, 0));
    expect(session.save().log.map((action) => action.kind)).toEqual(['goTo', 'tag', 'tell']);
    expect(hashWorld(loadSession(session.save(), at(2, 0)).world)).toBe(hashWorld(session.world));
  });
});

describe('offer execution validation and replay pins', () => {
  it('applies due prior setup before validating a queued player action', () => {
    const session = newSession(SEED);
    const target = Object.keys(session.world.npcs).find((id) => id !== session.world.playerId)!;
    const venue = 'setup-room';
    session.world.venues[venue] = { id: venue, district: 'd0', access: 'public' };
    session.world.scheduleOverrides[target] = [{
      fromDay: 0, toDay: 1, from: 0, to: 1440, venue: 'safehouse', source: 'vignette',
    }];
    scheduleSetup(session.world, {
      id: 'session-fuse', due: CONVERSATION_BEAT, kind: 'schedule-override', actor: target, ref: 'test',
      override: { fromDay: 0, toDay: 1, from: 0, to: 1440, venue, source: 'vignette' },
    });
    session.submit({ kind: 'goTo', venue });
    session.advance(7);
    session.requestLocalInteraction();
    expect(session.advance(20).stopped).toBe('local-offer');
    const offer = session.localOffer()!;
    expect(offer.circleMembers).toContain(target);
    session.chooseLocal(offer.token, { kind: 'tell', to: target, spec: poison(session.world.scenario!.cast.usurper) });
    expect(() => session.advance(1)).not.toThrow();
    expect(session.world.chronicle.some(
      (event) => event.kind === 'telling' && event.speaker === 'you' && event.addressedTo === target,
    )).toBe(true);
  });

  it('a chosen local action that fails validation surfaces at advance-time and DROPS from the log', () => {
    const { session, offer, members } = requestStagedOffer(1);
    session.chooseLocal(offer.token, { kind: 'sell', family: 'f-unheld', buyer: members[0]! });
    expect(() => session.advance(1)).toThrow();
    expect(session.save().log.some((action) => action.kind === 'sell')).toBe(false);
  });

  it('(t5) a session that chooses an ask + advances 2 days hashes equal to a fresh loadSession', () => {
    const { session, offer, target } = freshActualOffer(false);
    const usurper = session.world.scenario!.cast.usurper;
    session.chooseLocal(offer.token, { kind: 'ask', to: target, about: { subject: usurper } });
    session.advance(1);
    expect(session.world.chronicle.some(
      (event) => event.kind === 'asking' && event.speaker === 'you' && event.addressedTo === target,
    )).toBe(true);
    session.advance(at(2, 0) - session.world.tick);
    expect(session.world.scenario!.status).toBe('running');
    expect(session.save().log.some((action) => action.kind === 'ask')).toBe(true);
    expect(hashWorld(loadSession(session.save(), at(2, 0)).world)).toBe(hashWorld(session.world));
  });
});

describe('I-1 — one speech choice per requested-beat offer', () => {
  it('a second TELL for the same offer is refused before the sim is reached', () => {
    const { session, offer, members } = requestStagedOffer(2);
    session.chooseLocal(offer.token, { kind: 'tell', to: members[0]!, spec: poison(members[0]!) });
    expect(() => session.chooseLocal(offer.token, { kind: 'tell', to: members[1]!, spec: poison(members[1]!) }))
      .toThrow(/already chosen/i);
    session.advance(1);
    expect(session.world.chronicle.filter((event) => event.kind === 'telling' && event.speaker === 'you')).toHaveLength(1);
    expect(session.save().log.filter((action) => action.kind === 'tell')).toHaveLength(1);
  });

  it('the toggle defeat: choose tell then SELL for the same offer — sell is refused', () => {
    const { session, offer, members } = requestStagedOffer(1);
    session.chooseLocal(offer.token, { kind: 'tell', to: members[0]!, spec: poison(members[0]!) });
    expect(() => session.chooseLocal(offer.token, { kind: 'sell', family: 'f-unheld', buyer: members[0]! }))
      .toThrow(/already chosen/i);
    session.advance(1);
    expect(session.save().log.filter((action) => action.kind === 'sell')).toHaveLength(0);
    expect(session.save().log.filter((action) => action.kind === 'tell')).toHaveLength(1);
  });

  it('ASK is a speech choice too: tell then same-offer ask is refused', () => {
    const { session, offer, members } = requestStagedOffer(1);
    const target = members[0]!;
    session.chooseLocal(offer.token, { kind: 'tell', to: target, spec: poison(target) });
    expect(() => session.chooseLocal(offer.token, { kind: 'ask', to: target, about: { subject: target } }))
      .toThrow(/already chosen/i);
    session.advance(1);
    expect((session.world.inquiries.you ?? []).some((task) => task.from === 'self')).toBe(false);
  });

  it('a NON-speech verb is not permanently latched after the chosen offer advances', () => {
    const { session, offer, members } = requestStagedOffer(1);
    session.chooseLocal(offer.token, { kind: 'tell', to: members[0]!, spec: poison(members[0]!) });
    expect(session.submit({ kind: 'tag', op: 'add', id: 'blocked', target: `npc:${members[0]!}`, text: 'blocked' }).refused).toBe(true);
    session.advance(1);
    expect(session.submit({ kind: 'tag', op: 'add', id: 'free', target: `npc:${members[0]!}`, text: 'free' }).refused).toBeFalsy();
  });

  it('the speech latch clears on offer ADVANCE and a speech choice is available next offer', () => {
    const { session, offer, members } = requestStagedOffer(1);
    const target = members[0]!;
    session.chooseLocal(offer.token, { kind: 'tell', to: target, spec: poison(target) });
    expect(session.speechQueuedForBeat(session.world.tick)).toBe(true);
    session.advance(1);
    expect(session.speechQueuedForBeat(session.world.tick)).toBe(false);
    expect(session.requestLocalInteraction().refused).toBe(false);
    expect(session.advance(CONVERSATION_BEAT).stopped).toBe('local-offer');
    const next = session.localOffer()!;
    expect(next.circleMembers).toContain(target);
    expect(session.chooseLocal(next.token, { kind: 'ask', to: target, about: { subject: target } }).refused).toBeFalsy();
  });
});

describe('requested-beat local offer', () => {
  it('request at minute 7 records only the requested beat and is save-inert', () => {
    const session = newSession(SEED);
    session.advance(7);
    const before = session.save();
    expect(minuteOfDay(session.world.tick)).toBe(7);
    expect(session.requestLocalInteraction()).toEqual({ requestedFor: 15, refused: false });
    expect(session.save()).toEqual(before);
    expect(session.localOffer()).toBeNull();
    session.cancelLocalInteraction();
    expect(session.save()).toEqual(before);
    expect(session.advance(1)).toEqual({ advanced: 1, stopped: 'complete' });
  });

  it('prior setup changes the circle before the offer is composed', () => {
    const session = newSession(SEED);
    const ids = Object.keys(session.world.npcs)
      .filter((id) => id !== session.world.playerId)
      .sort();
    const moved = ids[0]!;
    const replacement = ids[1]!;
    const offerVenue = 'offer-room';
    session.world.venues[offerVenue] = { id: offerVenue, district: 'd0', access: 'public' };
    session.world.venues.elsewhere = { id: 'elsewhere', district: 'd0', access: 'public' };
    session.world.scheduleOverrides[moved] = [{
      fromDay: 0, toDay: 1, from: 0, to: 1440, venue: offerVenue, source: 'vignette',
    }];
    session.world.scheduleOverrides[replacement] = [{
      fromDay: 0, toDay: 1, from: 0, to: 1440, venue: 'elsewhere', source: 'vignette',
    }];
    scheduleSetup(session.world, { id: 'offer-move-out', due: 15, kind: 'schedule-override', actor: moved, ref: 'test',
      override: { fromDay: 0, toDay: 1, from: 0, to: 1440, venue: 'elsewhere', source: 'vignette' } });
    scheduleSetup(session.world, { id: 'offer-move-in', due: 15, kind: 'schedule-override', actor: replacement, ref: 'test',
      override: { fromDay: 0, toDay: 1, from: 0, to: 1440, venue: offerVenue, source: 'vignette' } });
    session.submit({ kind: 'goTo', venue: offerVenue });
    session.advance(7);
    session.requestLocalInteraction();
    expect(session.advance(20).stopped).toBe('local-offer');
    const offer = session.localOffer()!;
    expect(offer.tick).toBe(15);
    expect(offer.venue).toBe(offerVenue);
    expect(offer.circleMembers).not.toContain(moved);
    expect(offer.circleMembers).toContain(replacement);
    expect(offer.circleMembers).toEqual([...offer.circleMembers].sort());
    const saveAtOffer = session.save();
    session.cancelLocalInteraction();
    expect(session.save()).toEqual(saveAtOffer);
    expect(session.localOffer()).toBeNull();
    expect(session.advance(1)).toEqual({ advanced: 1, stopped: 'complete' });
  });

  it('a token-bound present target executes at the offered tick and replays exactly', () => {
    const { session, offer, target } = requestActualOffer();
    const beforeChoice = session.save();
    expect(session.chooseLocal(offer.token, { kind: 'tell', to: target,
      spec: poison(session.world.scenario!.cast.usurper) })).toEqual({ queuedFor: offer.tick });
    expect(session.speechQueuedForBeat(session.world.tick)).toBe(true);
    expect(() => session.chooseLocal(offer.token, { kind: 'ask', to: target, about: { subject: target } }))
      .toThrow(/already chosen/i);
    expect(session.save()).toEqual(beforeChoice);
    expect(session.advance(1)).toEqual({ advanced: 1, stopped: 'complete' });
    expect(session.localOffer()).toBeNull();
    expect(session.log.at(-1)).toMatchObject({ kind: 'tell', tick: offer.tick, to: target });
    expect(hashWorld(loadSession(session.save(), session.world.tick).world)).toBe(hashWorld(session.world));
  });

  it('stale token, non-member target, and local submit throw with zero world/log change', () => {
    const { session, offer, outsider } = requestActualOffer();
    const beforeHash = hashWorld(session.world);
    const beforeSave = session.save();
    const spec = poison(session.world.scenario!.cast.usurper);
    expect(() => session.chooseLocal('offer-stale', { kind: 'tell', to: offer.circleMembers[0]!, spec })).toThrow(/token/i);
    expect(() => session.chooseLocal(offer.token, { kind: 'tell', to: outsider, spec })).toThrow(/circle/i);
    expect(() => session.submit({ kind: 'tell', to: offer.circleMembers[0]!, spec } as never))
      .toThrow('session: local actions require a requested-beat offer');
    expect(hashWorld(session.world)).toBe(beforeHash);
    expect(session.save()).toEqual(beforeSave);
  });

  it('cancel then re-request at the same tick invalidates the canceled offer token', () => {
    const { session, offer: first, members } = requestStagedOffer(1);
    const saveAtFirstOffer = session.save();
    session.cancelLocalInteraction();
    expect(session.save()).toEqual(saveAtFirstOffer);
    expect(session.requestLocalInteraction()).toEqual({ requestedFor: first.tick, refused: false });
    expect(session.advance(1)).toEqual({ advanced: 0, stopped: 'local-offer' });
    const replacement = session.localOffer()!;
    expect(replacement.token).not.toBe(first.token);
    const beforeHash = hashWorld(session.world);
    const beforeSave = session.save();
    expect(() => session.chooseLocal(first.token, {
      kind: 'tell', to: members[0]!, spec: poison(members[0]!),
    })).toThrow(/token/i);
    expect(hashWorld(session.world)).toBe(beforeHash);
    expect(session.save()).toEqual(beforeSave);
  });

  it('refuses an aligned request when goTo already targets that beat, leaving no residue', () => {
    const session = newSession(SEED);
    const venue = Object.values(session.world.venues).find((item) => canEnter(session.world, item.id))!.id;
    expect(session.submit({ kind: 'goTo', venue })).toEqual({ queuedFor: 0 });
    expect(session.requestLocalInteraction()).toEqual({ requestedFor: 0, refused: true });
    expect(session.localOffer()).toBeNull();
    expect(session.advance(1)).toEqual({ advanced: 1, stopped: 'complete' });
    expect(session.world.playerVenue).toBe(venue);
  });

  it('drains a mid-beat goTo before preparing the later offer', () => {
    const session = newSession(SEED);
    session.advance(7);
    const venue = Object.values(session.world.venues).find((item) => canEnter(session.world, item.id))!.id;
    expect(session.submit({ kind: 'goTo', venue })).toEqual({ queuedFor: 7 });
    expect(session.requestLocalInteraction()).toEqual({ requestedFor: 15, refused: false });
    expect(session.advance(20)).toEqual({ advanced: 8, stopped: 'local-offer' });
    const offer = session.localOffer()!;
    expect(session.log).toContainEqual({ tick: 7, kind: 'goTo', venue });
    expect(session.world.playerVenue).toBe(venue);
    expect(offer.venue).toBe(venue);
    const actualCircle = circlesAt(session.world, offer.tick)
      .find((circle) => circle.members.includes(session.world.playerId!));
    expect(offer.circleMembers).toEqual(
      (actualCircle?.members ?? []).filter((id) => id !== session.world.playerId).sort(),
    );
  });

  it('refuses every nonlocal submit while a request or offer is pending', () => {
    const session = newSession(SEED);
    session.advance(7);
    session.requestLocalInteraction();
    expect(session.submit({ kind: 'tag', op: 'add', id: 'x', target: 'npc:probe', text: 'x' }))
      .toEqual({ queuedFor: 15, refused: true });
    session.advance(20);
    expect(session.submit({ kind: 'tag', op: 'add', id: 'y', target: 'npc:probe', text: 'y' }))
      .toEqual({ queuedFor: 15, refused: true });
    expect(session.log).toEqual([]);
  });
});

describe('advance result and remote activity', () => {
  it('an autonomous courier delivery never creates an offer or interruption', () => {
    const session = newSession(SEED);
    let staged = false;
    for (let tick = CONVERSATION_BEAT; tick < TICKS_PER_DAY && !staged; tick += CONVERSATION_BEAT) {
      const pair = circlesAt(session.world, tick)
        .map((candidate) => candidate.members.filter((id) => id !== session.world.playerId))
        .find((members) => members.length >= 2);
      if (!pair) continue;
      const [asset, target] = pair;
      session.world.network.pendingCouriers.push({ planId: 'plan-0', asset: asset!, target: target!, queuedTick: 0, viaDrop: null,
        spec: { subject: target!, predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE } });
      staged = true;
    }
    expect(staged).toBe(true);
    const result = session.advance(TICKS_PER_DAY);
    expect(result.stopped).toBe('complete');
    expect(session.localOffer()).toBeNull();
    expect(session.world.network.pendingCouriers).toHaveLength(0);
  });

  it('a hands-off Coronation stops at lost-clock on the coronation dawn, not one tick past', { timeout: 30000 }, () => {
    const session = newSession(SEED);
    const deathTick = at(CORONATION.days, 0);
    expect(session.advance(at(CORONATION.days + 5, 0)).stopped).toBe('terminal');
    expect(session.world.scenario!.status).toBe('lost-clock');
    expect(session.world.tick).toBe(deathTick);
    expect(session.advance(TICKS_PER_DAY)).toEqual({ advanced: 0, stopped: 'terminal' });
    expect(session.world.tick).toBe(deathTick);
  });

  it('loadSession stops at the same terminal death tick as live advance', { timeout: 30000 }, () => {
    const live = newSession(SEED);
    live.advance(at(CORONATION.days + 5, 0));
    const deathTick = at(CORONATION.days, 0);
    expect(live.world.tick).toBe(deathTick);
    const replay = loadSession(live.save(), at(CORONATION.days + 5, 0));
    expect(replay.world.scenario!.status).toBe('lost-clock');
    expect(replay.world.tick).toBe(deathTick);
    expect(hashWorld(replay.world)).toBe(hashWorld(live.world));
  });
});
