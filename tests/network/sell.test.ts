import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyGoTo, applySell } from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { runUntil } from '../../src/sim/step';
import { blankIntel } from '../../src/sim/fieldwork';
import { attachScenario } from '../../src/sim/scenario/referee';
import { hashWorld } from '../../src/sim/hash';
import { at } from '../../src/core/time';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import type { TownFixture, WorldState } from '../../src/sim/types';
import type { GeneratedTown } from '../../src/world/types';
import { captureEvidence } from '../../src/sim/counterintel';
import { realizeNetworkForward } from '../../src/sim/directives/transport';

/**
 * Task 10 — the brokerage. `SellAction { tick, kind:'sell', family, buyer }`: buyer must be
 * in the avatar's circle, price = severity x brokerSaleBase from the family's BEST intel
 * version (the player's own knowledge, never world truth), and the sale is an ordinary hop-zero
 * into the buyer's mind — the SAME family entering their belief store (never a re-mint), so
 * they now retell it by ordinary tellability. Selling info leaks it: the sale's conversation
 * IS a telling, capturable exactly like any other (the existing caught-in-the-act path).
 */
const RULES = STANDARD_RULES;

/** A literalist NPC pinned all day to `venue` (predictable reportThrough content). */
const npc = (id: string, venue: string, edges: { to: string; kind: 'friend'; trust: number }[] = []) => ({
  id, name: id, home: venue, occupation: 'grocer', faction: 'none' as const,
  traits: ['literalist' as const], rivals: [], edges,
  schedule: [{ days: 'all' as const, from: 0, to: 1439, venue }],
});

/** safehouse (avatar's private home) + tavern (public — buyer/third/watchman live there all day).
 *  buyer trusts third (0.6) so a sold story has somewhere to go on retell. */
const sellFixture = (): TownFixture => ({
  venues: [
    { id: 'safehouse', district: 'd0', access: 'private' },
    { id: 'tavern', district: 'd0', access: 'public' },
  ],
  npcs: [
    npc('buyer', 'tavern', [{ to: 'third', kind: 'friend', trust: 0.6 }]),
    npc('third', 'tavern'),
    npc('watchman', 'tavern'),
    npc('handler', 'safehouse'),
  ],
});

/** Avatar enrolled at the safehouse, then walked to the tavern (goTo has no beat requirement) —
 *  circlesAt(world, 0) already puts buyer/third/watchman and the avatar in one circle. */
function sellWorld(seed: string): WorldState {
  const w = buildWorld(sellFixture(), seed, RULES);
  enrollPlayer(w, { home: 'safehouse' });
  applyGoTo(w, 'tavern');
  return w;
}

/** Hand-seed the player's intel log with ONE version of `family` at `severity` — the recruit
 *  coercion test's own idiom (tests/network/recruit.test.ts): a real Claim in world.claims plus
 *  a matching intel.log row. subject is an OFFSTAGE figure (never buyer/third themselves), so
 *  retelling it is never blocked by the self-subject refusal or an accidental self-address. */
function seedIntel(world: WorldState, family: string, claimId: string, severity: 1 | 2 | 3 | 4 | 5, tick = 0): void {
  const claim: Claim = {
    id: claimId, family, parent: null, subject: 'mallory', predicate: 'stole',
    object: null, count: 2, severity, place: null, attribution: SOMEONE,
  };
  world.claims[claimId] = claim;
  world.intel.log.push({
    ...blankIntel(), tick, venue: 'tavern', via: 'self', kind: 'utterance', overheard: false,
    speaker: 'buyer', addressedTo: 'you', mode: 'telling', claimId, family,
    reported: { subject: 'mallory', predicate: 'stole', object: null, count: 2, severity, place: null, attribution: SOMEONE },
  });
}

describe('applySell — validate-before-mutate refusals', () => {
  it('refuses when the buyer is not in the avatar circle this beat', () => {
    const w = sellWorld('sell-noncircle');
    seedIntel(w, 'f-x', 'c-x', 3);
    applyGoTo(w, 'safehouse'); // avatar leaves — buyer stays at the tavern
    const before = hashWorld(w);
    expect(() => applySell(w, 'buyer', 'f-x', 0, RULES)).toThrow(/circle/);
    expect(hashWorld(w)).toBe(before);
  });

  it("refuses when the player holds no intel on the family — you can't sell what you don't hold", () => {
    const w = sellWorld('sell-nointel');
    const before = hashWorld(w);
    expect(() => applySell(w, 'buyer', 'f-none', 0, RULES)).toThrow(/hold|intel/);
    expect(hashWorld(w)).toBe(before);
  });

  it('refuses off a conversation beat', () => {
    const w = sellWorld('sell-offbeat');
    seedIntel(w, 'f-y', 'c-y', 3);
    const before = hashWorld(w);
    expect(() => applySell(w, 'buyer', 'f-y', 7, RULES)).toThrow(/beat/);
    expect(hashWorld(w)).toBe(before);
  });

  it('refuses an unknown buyer', () => {
    const w = sellWorld('sell-unknown');
    seedIntel(w, 'f-z', 'c-z', 3);
    expect(() => applySell(w, 'ghost', 'f-z', 0, RULES)).toThrow(/unknown npc/);
  });

  it('refuses a second sell logged in the SAME beat (one sale per beat — the tell idiom)', () => {
    const w = sellWorld('sell-samebeat');
    seedIntel(w, 'f-a', 'c-a', 3);
    seedIntel(w, 'f-b', 'c-b', 3);
    applySell(w, 'buyer', 'f-a', 0, RULES);
    expect(() => applySell(w, 'third', 'f-b', 0, RULES)).toThrow(/one sale per beat/);
  });
});

describe('applySell — price and coin credit (the family\'s BEST intel version)', () => {
  it('prices severity x brokerSaleBase and credits the treasury on the sale beat', () => {
    const w = sellWorld('sell-price');
    seedIntel(w, 'f-price', 'c-price', 4);
    const coin0 = w.coin;

    applySell(w, 'buyer', 'f-price', 0, RULES);
    expect(w.coin).toBe(coin0); // deferred to step() — no residue before the beat consumes it
    runUntil(w, 1, RULES);

    expect(w.coin).toBe(coin0 + 4 * RULES.economy.brokerSaleBase);
  });

  it("'best' means highest severity among your OWN intel versions, not the earliest or the world truth", () => {
    const w = sellWorld('sell-best');
    seedIntel(w, 'f-best', 'c-lo', 2, 0);      // a low-severity version, heard first
    seedIntel(w, 'f-best', 'c-hi', 5, 0);      // a LATER, higher-severity version — this one prices it
    const coin0 = w.coin;

    applySell(w, 'buyer', 'f-best', 0, RULES);
    runUntil(w, 1, RULES);

    expect(w.coin).toBe(coin0 + 5 * RULES.economy.brokerSaleBase); // the high-severity version won
    expect(w.beliefs['buyer']!['f-best']!.claim.id).toBe('c-hi');  // and it's what the buyer now holds
  });

  it('ties break to the EARLIEST tick, not log order', () => {
    const w = sellWorld('sell-tie');
    seedIntel(w, 'f-tie', 'c-later', 3, 10); // pushed FIRST in the log, but a LATER tick
    seedIntel(w, 'f-tie', 'c-earlier', 3, 5); // pushed SECOND in the log, but an EARLIER tick
    applySell(w, 'buyer', 'f-tie', 0, RULES);
    runUntil(w, 1, RULES);
    expect(w.beliefs['buyer']!['f-tie']!.claim.id).toBe('c-earlier');
  });
});

describe('applySell — dedupe (one sale per family per buyer, on network state)', () => {
  it('the second sale of the same family to the same buyer refuses', () => {
    const w = sellWorld('sell-dedupe');
    seedIntel(w, 'f-dup', 'c-dup', 3);
    applySell(w, 'buyer', 'f-dup', 0, RULES);
    runUntil(w, CONVERSATION_BEAT, RULES);
    expect(w.network.sales).toEqual([{ family: 'f-dup', buyer: 'buyer' }]);

    expect(() => applySell(w, 'buyer', 'f-dup', CONVERSATION_BEAT, RULES)).toThrow(/already.*sold|sold.*already/i);
  });

  it('the SAME family sold to a DIFFERENT buyer is a separate sale (dedupe keys on the pair)', () => {
    const w = sellWorld('sell-dedupe-otherbuyer');
    seedIntel(w, 'f-multi', 'c-multi', 3);
    applySell(w, 'buyer', 'f-multi', 0, RULES);
    runUntil(w, CONVERSATION_BEAT, RULES);
    expect(() => applySell(w, 'third', 'f-multi', CONVERSATION_BEAT, RULES)).not.toThrow();
  });
});

describe('applySell — the buyer\'s hop-zero ingest (the SAME family, never a re-mint)', () => {
  it('the buyer\'s belief store gets the EXISTING claim, apparentSource = the avatar, ordinary hop-zero credence', () => {
    const w = sellWorld('sell-ingest');
    seedIntel(w, 'f-ingest', 'c-ingest', 4);
    applySell(w, 'buyer', 'f-ingest', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-ingest'];
    expect(belief).toBeDefined();
    expect(belief!.claim.id).toBe('c-ingest');      // the SAME claim — never re-minted
    expect(belief!.heardFrom).toBe('you');           // the avatar's own id
    expect(belief!.apparentSources).toEqual(['you']); // apparentSource = the avatar
    expect(belief!.credence).toBe(0.85);              // applyInject's hop-zero credence
    expect(belief!.discretion).toBe(false);
  });

  it('the sold story propagates: the buyer retells it on the very next beat by ordinary tellability', () => {
    const w = sellWorld('sell-retell');
    seedIntel(w, 'f-sold', 'c-sold', 4);
    applySell(w, 'buyer', 'f-sold', 0, RULES);
    runUntil(w, CONVERSATION_BEAT, RULES);       // consumes the pendingSell
    expect(w.beliefs['buyer']!['f-sold']).toBeDefined();

    runUntil(w, CONVERSATION_BEAT * 2, RULES);   // one more beat for chooseTelling to fire
    const retold = w.chronicle.find((c) => c.kind === 'telling' && c.speaker === 'buyer'
      && w.claims[c.claimId]?.family === 'f-sold');
    expect(retold).toBeDefined();
  });
});

describe('applySell — selling within guard earshot is caught (the existing capture path)', () => {
  it('the sale is an Utterance like any telling — a guard in circle captures it, and the campaign ends caught', () => {
    const w = sellWorld('sell-caught');
    w.enemy.observers = [{ id: 'watchman', vigilance: 1 }]; // certain capture — isolates the assertion
    w.network.spymaster = 'handler';
    const townStub = { cast: { usurper: 'nobody', council: [] } } as unknown as GeneratedTown;
    attachScenario(w, townStub, {
      id: 'sell-scn', name: 'Sell Scenario', days: 40,
      objectiveTerm: 'objective-topple', win: { kind: 'council-turns', quorum: 99 },
    });
    seedIntel(w, 'f-caught', 'c-caught', 4);

    applySell(w, 'buyer', 'f-caught', 0, RULES);
    runUntil(w, 1, RULES); // the ONE step that processes the sale + capture + the caught check

    expect(w.enemy.evidence.some((e) => e.kind === 'utterance' && e.speaker === w.playerId)).toBe(false);
    expect(w.scenario!.status).toBe('lost-caught');
    const arrest = w.chronicle.find((c) => c.kind === 'institution' && c.action === 'arrest');
    expect(arrest).toBeDefined();
    expect((arrest as { subject: string }).subject).toBe(w.playerId);

    const held = w.network.directiveState!.heldObservations.find((row) =>
      row.principal === 'enemy' && row.observer === 'watchman'
      && row.content.kind === 'raw' && row.content.observation.kind === 'utterance'
      && row.content.observation.speaker === w.playerId);
    expect(held).toBeDefined();
    expect(held!.deliveredAt).toBeNull();
    const message = w.network.directiveState!.messages.find((candidate) =>
      candidate.payload.kind === 'field-report'
      && candidate.payload.sourceObservationIds.includes(held!.id))!;
    const speech = realizeNetworkForward(w, message.id, {
      venue: 'safehouse', members: ['watchman', 'handler'],
    }, message.availableAfter, RULES)!;
    captureEvidence(w, {
      tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
    }, RULES);
    expect(w.enemy.evidence.some((entry) =>
      entry.kind === 'utterance' && entry.observer === 'watchman'
      && entry.speaker === w.playerId)).toBe(true);
  });
});

describe('sell joins the Action union — save = seed + action log', () => {
  it('applyAction dispatches sell and refuses without rules', () => {
    const w = sellWorld('sell-route');
    seedIntel(w, 'f-route', 'c-route', 3);
    expect(() => applyAction(w, { tick: 0, kind: 'sell', buyer: 'buyer', family: 'f-route' }))
      .toThrow(/rules/);
    applyAction(w, { tick: 0, kind: 'sell', buyer: 'buyer', family: 'f-route' }, RULES);
    expect(w.pendingSell).toEqual({ buyer: 'buyer', family: 'f-route', price: 3 * RULES.economy.brokerSaleBase, claimId: 'c-route' });
  });

  it('an unknown kind still throws (the union default-throw is preserved)', () => {
    const w = sellWorld('sell-route2');
    expect(() => applyAction(w, { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });

  it('live == replay: a sell in the log regrows byte-identically', () => {
    const build = (): WorldState => {
      const w = sellWorld('sell-replay');
      seedIntel(w, 'f-replay', 'c-replay', 4);
      return w;
    };
    const log: Action[] = [{ tick: 0, kind: 'sell', buyer: 'buyer', family: 'f-replay' }];
    const a = runLogOn(build(), RULES, log, at(0, 3));
    const b = runLogOn(build(), RULES, log, at(0, 3));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.coin).toBe(b.coin);
  });
});
