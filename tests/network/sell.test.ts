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
import { finishTick, prepareTick } from '../../src/sim/phases';
import type { ReportedClaim } from '../../src/sim/enemy/state';
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

/** R42: seed intel whose RECEIVED version differs from the underlying claim, as a transforming
 *  channel (an exaggerator's retelling, a report's filtering) leaves it. The world holds count 2 /
 *  severity 3 / place null; the player only ever heard count 4 / severity 4 / at the tavern. */
const RECEIVED: ReportedClaim = {
  subject: 'mallory', predicate: 'stole', object: null, count: 4, severity: 4, place: 'tavern', attribution: SOMEONE,
};
function seedTransformedIntel(world: WorldState, family: string, claimId: string): void {
  world.claims[claimId] = {
    id: claimId, family, parent: null, subject: 'mallory', predicate: 'stole',
    object: null, count: 2, severity: 3, place: null, attribution: SOMEONE,
  };
  world.intel.log.push({
    ...blankIntel(), tick: 0, venue: 'tavern', via: 'self', kind: 'utterance', overheard: false,
    speaker: 'buyer', addressedTo: 'you', mode: 'telling', claimId, family, reported: { ...RECEIVED },
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

describe('applySell — the buyer\'s hop-zero ingest (the SAME family; the SAME claim when that is what you heard)', () => {
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
    expect(belief!.timesHeard).toBe(1);               // R42-1: one sale is heard once
    expect(belief!.discretion).toBe(false);
  });

  it('R42-1: a sold story naming its source is heard once, from that source, at the sale weight', () => {
    const w = sellWorld('sell-named');
    seedIntel(w, 'f-named', 'c-named', 4);
    w.claims['c-named'] = { ...w.claims['c-named']!, attribution: 'mallory' };
    w.intel.log.at(-1)!.reported = { ...w.intel.log.at(-1)!.reported!, attribution: 'mallory' };
    applySell(w, 'buyer', 'f-named', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-named']!;
    expect(belief.timesHeard).toBe(1);
    expect(belief.apparentSources).toEqual(['mallory']); // the hearsay rule: the claim's own source
    expect(belief.credence).toBe(0.85);                  // not corroborated by its own echo (0.95)
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

describe('applySell — you can only sell what reached you (R42, Astra I2)', () => {
  it('a transformed received version is what is spoken and believed, never the unreceived original', () => {
    const w = sellWorld('sell-received');
    seedTransformedIntel(w, 'f-rx', 'c-rx');
    const coin0 = w.coin;
    applySell(w, 'buyer', 'f-rx', 0, RULES);
    runUntil(w, 1, RULES);

    expect(w.coin).toBe(coin0 + 4 * RULES.economy.brokerSaleBase); // priced on the received version
    const sale = w.chronicle.find((c) => c.kind === 'telling' && c.speaker === 'you');
    if (sale?.kind !== 'telling') throw new Error('the sale spoke no telling');
    const spoken = w.claims[sale.claimId]!;
    const believed = w.beliefs['buyer']!['f-rx']!.claim;
    for (const claim of [spoken, believed]) {
      expect(claim.id).not.toBe('c-rx');
      expect(claim).toMatchObject({ ...RECEIVED, family: 'f-rx', parent: 'c-rx' });
    }
    expect(believed.id).toBe(spoken.id);
    // The world's original is untouched: selling mints a version, it never rewrites history.
    expect(w.claims['c-rx']).toMatchObject({ count: 2, severity: 3, place: null });
  });
});

describe('applySell — a sale is hearsay to a mind that already holds the family (R42, Astra I3)', () => {
  const held = (w: WorldState, family: string, credence: number) => {
    const claim: Claim = {
      id: `c-held-${family}`, family, parent: null, subject: 'mallory', predicate: 'stole',
      object: null, count: 1, severity: 2, place: null, attribution: 'third',
    };
    w.claims[claim.id] = claim;
    w.beliefs['buyer']![family] = {
      claim, credence, heardFrom: 'third', heardAt: 0, firstHeardAt: 0, timesHeard: 1,
      apparentSources: ['third'], discretion: false, counterSpun: false,
    };
    return claim;
  };

  it('a document-anchored belief (0.97) keeps its credence, its version and its history', () => {
    const w = sellWorld('sell-anchor');
    const claim = held(w, 'f-anc', 0.97);
    seedIntel(w, 'f-anc', 'c-anc', 4);
    const coin0 = w.coin;
    applySell(w, 'buyer', 'f-anc', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-anc']!;
    expect(belief.credence).toBe(0.97);
    expect(belief.claim).toBe(claim);            // first version sticks
    expect(belief.firstHeardAt).toBe(0);
    expect(belief.heardFrom).toBe('third');
    expect(belief.apparentSources).toEqual(['third', 'you']); // ordinary corroboration records you
    expect(w.coin).toBe(coin0 + 4 * RULES.economy.brokerSaleBase); // the sale itself still happened
    expect(w.network.sales).toContainEqual({ family: 'f-anc', buyer: 'buyer' });
  });

  // R42-1: the sale's persuasion is a FLOOR, not a replacement. Knowing a little of a story never
  // leaves a buyer less persuaded than knowing nothing (Plan 8 Task 10: the buyer now retells it).
  it('a weaker held belief keeps its version and history but is lifted to the sale weight', () => {
    const w = sellWorld('sell-weak');
    const claim = held(w, 'f-weak', 0.3);
    seedIntel(w, 'f-weak', 'c-weak', 4);
    applySell(w, 'buyer', 'f-weak', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-weak']!;
    expect(belief.claim).toBe(claim);
    expect(belief.heardFrom).toBe('third');
    expect(belief.apparentSources).toEqual(['third', 'you']);
    expect(belief.timesHeard).toBe(2);
    expect(belief.credence).toBe(0.85);
  });

  it('a holder who first heard it from the player is still persuaded by paying for it', () => {
    const w = sellWorld('sell-repeat');
    const claim = held(w, 'f-rep', 0.3);
    w.beliefs['buyer']!['f-rep']!.apparentSources = ['you'];
    seedIntel(w, 'f-rep', 'c-rep', 4);
    applySell(w, 'buyer', 'f-rep', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-rep']!;
    expect(belief.claim).toBe(claim);
    expect(belief.apparentSources).toEqual(['you']); // a repeat origin corroborates nothing...
    expect(belief.credence).toBe(0.85);              // ...but the sale's floor still applies
  });
});

describe('applySell — the sale floor is a fresh telling (R42-1 re-check m1, m2, n1)', () => {
  /** A damaging story about `subject`, from `third`, held by the buyer at `credence` since tick 0. */
  const heldFromThird = (w: WorldState, family: string, subject: string, credence: number) => {
    const claim: Claim = {
      id: `c-held-${family}`, family, parent: null, subject, predicate: 'stole',
      object: null, count: 1, severity: 2, place: null, attribution: 'third',
    };
    w.claims[claim.id] = claim;
    w.beliefs['buyer']![family] = {
      claim, credence, heardFrom: 'third', heardAt: 0, firstHeardAt: 0, timesHeard: 1,
      apparentSources: ['third'], discretion: false, counterSpun: false,
    };
    return claim;
  };

  // m1: ordinary corroboration refreshes the freshness clock only for a NEW apparent source, so a
  // sold story naming a source the buyer had already credited was floored to 0.85 and still never
  // retold once it was three days old. A paid telling is a telling at that tick: the floor refreshes
  // `heardAt`, as the pre-R42 hop-zero entry did.
  it('a stale holder whose sale source repeats is revived: heardAt is the sale tick and the buyer retells', () => {
    const w = sellWorld('sell-stale');
    const claim = heldFromThird(w, 'f-stale', 'mallory', 0.3);
    seedIntel(w, 'f-stale', 'c-stale', 4);
    w.claims['c-stale'] = { ...w.claims['c-stale']!, attribution: 'third' };
    w.intel.log.at(-1)!.reported = { ...w.intel.log.at(-1)!.reported!, attribution: 'third' };
    const sale = at(4, 0);
    runUntil(w, sale, RULES);
    expect(w.beliefs['buyer']!['f-stale']!.heardAt).toBe(0); // three days stale: freshness 0
    applySell(w, 'buyer', 'f-stale', sale, RULES);
    runUntil(w, sale + 1, RULES);

    const belief = w.beliefs['buyer']!['f-stale']!;
    expect(belief.claim).toBe(claim);                 // first version sticks
    expect(belief.apparentSources).toEqual(['third']); // a repeat origin corroborates nothing...
    expect(belief.credence).toBe(0.85);               // ...the floor applies...
    expect(belief.heardAt).toBe(sale);                // ...and the paid telling is fresh news
    expect(belief.firstHeardAt).toBe(0);

    runUntil(w, sale + CONVERSATION_BEAT * 2, RULES);
    const retold = w.chronicle.find((c) => c.kind === 'telling' && c.speaker === 'buyer'
      && w.claims[c.claimId]?.family === 'f-stale');
    expect(retold).toBeDefined();
  });

  // R42-3 (R42-2 re-check m1): the floor is the BUYER's persuasion. R42-2 moved it into the
  // per-hearer loop, where "buyer only" is a single clause; without it every circle member who
  // hears the sale would be floored to 0.85 and have their clock refreshed. A bystander who held
  // the story stale keeps it stale; a bystander hearing it fresh merely overhears.
  it('the sale floors the buyer only: a stale bystander keeps their belief and clock, a fresh one merely overhears', () => {
    const w = sellWorld('sell-bystander');
    const claim = heldFromThird(w, 'f-aside', 'mallory', 0.3);
    w.beliefs['watchman']![claim.family] = { ...w.beliefs['buyer']![claim.family]! };
    seedIntel(w, 'f-aside', 'c-aside', 4);
    w.claims['c-aside'] = { ...w.claims['c-aside']!, attribution: 'third' };
    w.intel.log.at(-1)!.reported = { ...w.intel.log.at(-1)!.reported!, attribution: 'third' };
    const sale = at(1, 0);
    runUntil(w, sale, RULES);
    expect(w.beliefs['third']?.[claim.family]).toBeUndefined();
    applySell(w, 'buyer', 'f-aside', sale, RULES);
    runUntil(w, sale + 1, RULES);

    expect(w.beliefs['buyer']![claim.family]).toMatchObject({ credence: 0.85, heardAt: sale });
    expect(w.beliefs['watchman']![claim.family]).toMatchObject({ credence: 0.3, heardAt: 0 }); // not his sale
    const fresh = w.beliefs['third']![claim.family]!;
    expect(fresh.heardAt).toBe(sale);                 // overheard in the circle...
    expect(fresh.credence).toBeLessThan(0.85);        // ...at hearsay weight, not the buyer's price
  });

  // m2: the buyer who is the story's subject reacts to what they hold AFTER the sale's persuasion,
  // not to the pre-floor corroboration. A weakly held damaging self-rumor sold to its subject is a
  // corroborated, BELIEVED self-rumor, and the subject counter-spins it as they would any other.
  it('a buyer who is the subject reacts to the floored credence: a weakly held self-rumor is counter-spun', () => {
    const w = sellWorld('sell-self');
    heldFromThird(w, 'f-self', 'buyer', 0.3);
    w.claims['c-self'] = {
      id: 'c-self', family: 'f-self', parent: null, subject: 'buyer', predicate: 'stole',
      object: null, count: 2, severity: 4, place: null, attribution: SOMEONE,
    };
    w.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'tavern', via: 'self', kind: 'utterance', overheard: false,
      speaker: 'third', addressedTo: 'you', mode: 'telling', claimId: 'c-self', family: 'f-self',
      reported: { subject: 'buyer', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: SOMEONE },
    });
    const families0 = Object.keys(w.beliefs['buyer']!).length;
    applySell(w, 'buyer', 'f-self', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-self']!;
    expect(belief.credence).toBe(0.85);
    expect(belief.timesHeard).toBe(2);
    expect(belief.counterSpun).toBe(true);                        // reacted to the floored belief
    expect(Object.keys(w.beliefs['buyer']!).length).toBe(families0 + 1); // the counter-story exists
  });

  // n1: the floor is a floor. A fresh buyer who trusts the avatar and dislikes the subject lands
  // ABOVE 0.85 by ordinary hearsay physics, and the sale keeps it; 0.85 is "at least", not "exactly".
  it('a fresh trusting buyer who dislikes the subject lands above the floor and keeps it', () => {
    const w = sellWorld('sell-trusting');
    // The avatar exists only after enrolment, so the trust edge is attached the way an informant's is.
    w.npcs['buyer']!.edges.push({ to: 'you', kind: 'friend', trust: 0.75 });
    w.npcs['buyer']!.rivals.push('mallory');
    seedIntel(w, 'f-trust', 'c-trust', 4);
    applySell(w, 'buyer', 'f-trust', 0, RULES);
    runUntil(w, 1, RULES);

    const belief = w.beliefs['buyer']!['f-trust']!;
    expect(belief.timesHeard).toBe(1);
    expect(belief.credence).toBeCloseTo((0.35 + 0.45 * 0.75) * 1.3, 10); // 0.89375
    expect(belief.credence).toBeGreaterThan(0.85);
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
    expect(w.pendingSell).toEqual({
      buyer: 'buyer', family: 'f-route', price: 3 * RULES.economy.brokerSaleBase, claimId: 'c-route',
      reported: { subject: 'mallory', predicate: 'stole', object: null, count: 2, severity: 3, place: null, attribution: SOMEONE },
    });
  });

  it('an unknown kind still throws (the union default-throw is preserved)', () => {
    const w = sellWorld('sell-route2');
    expect(() => applyAction(w, { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });

  // R42 correction (Astra): this test used to run `runLogOn` twice, which proves determinism, not
  // live == replay, over a fixture whose received version equalled the claim (masking I2). Now the
  // live side is stepped frame by frame the way a session plays, and the version sold is transformed.
  it('live == replay: a sell of a transformed version, stepped live, regrows byte-identically', () => {
    const build = (): WorldState => {
      const w = sellWorld('sell-replay');
      seedTransformedIntel(w, 'f-replay', 'c-replay');
      return w;
    };
    const log: Action[] = [{ tick: 0, kind: 'sell', buyer: 'buyer', family: 'f-replay' }];
    const until = at(0, 3);
    const live = build();
    while (live.tick < until) {
      const frame = prepareTick(live, RULES);
      finishTick(live, RULES, frame, () => {
        for (const action of log.filter((candidate) => candidate.tick === live.tick)) {
          applyAction(live, action, RULES, frame);
        }
      });
    }
    const replay = runLogOn(build(), RULES, log, until);
    expect(live.beliefs['buyer']!['f-replay']!.claim).toMatchObject({ ...RECEIVED, parent: 'c-replay' });
    expect(hashWorld(replay)).toBe(hashWorld(live));
    expect(replay.coin).toBe(live.coin);
  });
});
