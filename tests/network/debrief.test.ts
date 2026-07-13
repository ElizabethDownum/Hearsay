import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import {
  applyDebrief, applyGoTo, applyInject, applyMeet, type InjectSpec,
} from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { runUntil } from '../../src/sim/step';
import { chooseAnswer } from '../../src/sim/inquiry';
import { reportThrough } from '../../src/sim/reporting';
import { assetFor, dispositionOf } from '../../src/sim/network/roster';
import { hashWorld } from '../../src/sim/hash';
import { at, dayOf } from '../../src/core/time';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { SOMEONE, type Claim, type EntityId } from '../../src/sim/rumors/claim';
import type { SketchFeature } from '../../src/sim/enemy/state';
import type { Belief, TownFixture, WorldState } from '../../src/sim/types';
import type { GeneratedTown } from '../../src/world/types';

const RULES = STANDARD_RULES;

/** A literalist NPC pinned all day to `venue` (inert firmware — the reportThrough content is predictable). */
const npc = (id: string, venue: string, faction: 'guild' | 'crown' | 'none' = 'none') => ({
  id, name: id, home: venue, occupation: 'grocer', faction,
  traits: ['literalist' as const], rivals: [], edges: [],
  schedule: [{ days: 'all' as const, from: 0, to: 1439, venue }],
});

/** A hand-built town with the avatar's own private safehouse and a public tavern where everyone else
 *  lives. `bri`/`cy` share the 'guild' faction (the ideology refusal pair); `dot` is 'crown' (the
 *  other-faction control). */
const debriefFixture = (): TownFixture => ({
  venues: [
    { id: 'safehouse', district: 'd0', access: 'private' },
    { id: 'tavern', district: 'd0', access: 'public' },
  ],
  npcs: [
    npc('ann', 'tavern'),
    npc('bri', 'tavern', 'guild'),
    npc('cy', 'tavern', 'guild'),
    npc('dot', 'tavern', 'crown'),
  ],
});

/** Avatar enrolled at the safehouse (playerVenue starts there — enrollPlayer's own effect). */
function world(seed: string): WorldState {
  const w = buildWorld(debriefFixture(), seed, RULES);
  enrollPlayer(w, { home: 'safehouse' });
  return w;
}

/** Force `id` onto the roster (the courier/hosting-test direct-construct idiom): recorded
 *  recruited-by:player, a trust edge toward the player at `trust`. */
function makeAsset(w: WorldState, id: EntityId, mice: 'money' | 'ideology' | null = 'money', trust = 0.6): void {
  w.network.assets.push({
    id, mice, wagePaidThroughDay: 0, strikes: 0,
    facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }],
  });
  w.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust });
}

const BEAT = CONVERSATION_BEAT; // 15 — the meet's one-beat pull lands exactly here from tick 0

const spec: InjectSpec = { subject: 'dot', predicate: 'stole', object: null, count: 3, severity: 3, place: null, attribution: SOMEONE };

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief — validate-before-mutate refusals (zero residue)', () => {
  it('refuses a non-asset', () => {
    const w = world('debrief-nonasset');
    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'ann', 0, RULES)).toThrow(/not one of your assets/);
    expect(hashWorld(w)).toBe(before);
  });

  it('refuses when the avatar is not at the safehouse', () => {
    const w = world('debrief-wrongvenue');
    makeAsset(w, 'ann');
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);
    applyGoTo(w, 'tavern');
    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'ann', BEAT, RULES)).toThrow(/safehouse/);
    expect(hashWorld(w)).toBe(before);
  });

  it('refuses off a conversation beat', () => {
    const w = world('debrief-offbeat');
    makeAsset(w, 'ann');
    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'ann', 7, RULES)).toThrow(/beat/);
    expect(hashWorld(w)).toBe(before);
  });

  it('refuses when the asset is not co-present at the safehouse this beat', () => {
    const w = world('debrief-notpresent');
    makeAsset(w, 'ann'); // never pulled — still at the tavern all day
    runUntil(w, BEAT, RULES);
    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'ann', BEAT, RULES)).toThrow(/with you|present/i);
    expect(hashWorld(w)).toBe(before);
  });

  it('refuses an asset with nothing in their belief store', () => {
    const w = world('debrief-empty');
    makeAsset(w, 'ann');
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);
    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'ann', BEAT, RULES)).toThrow(/nothing|belief store/i);
    expect(hashWorld(w)).toBe(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief — extraction bypasses discretion exactly once per debrief', () => {
  it('extracts a held-close, low-trust belief a normal ask genuinely refuses (BY MECHANISM)', () => {
    const w = world('debrief-bypass');
    makeAsset(w, 'ann', 'money', 0.3); // well under the 0.7 confide line
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);

    const claim: Claim = { id: 'c-held', family: 'f-held', parent: null, ...spec };
    w.claims[claim.id] = claim;
    w.beliefs['ann']!['f-held'] = {
      claim, credence: 0.9, heardFrom: 'witnessed', heardAt: 0, firstHeardAt: 0,
      timesHeard: 1, apparentSources: [], discretion: true, counterSpun: false,
    };

    // BY MECHANISM: an ordinary (uncompelled) ask really is refused — held-close + trust < 0.7.
    const asking = {
      tick: BEAT, venue: 'safehouse' as const, circleMembers: ['you', 'ann'],
      speaker: 'you', addressedTo: 'ann', about: { family: 'f-held' }, authority: false,
    };
    expect(chooseAnswer(w, 'ann', asking, BEAT, RULES)).toBeNull();

    const logBefore = w.intel.log.length;
    applyDebrief(w, 'ann', BEAT, RULES);
    const added = w.intel.log.slice(logBefore);
    expect(added).toHaveLength(1); // exactly once per debrief

    const entry = added[0]!;
    expect(entry.kind).toBe('utterance');
    expect(entry.mode).toBe('answer');
    expect(entry.via).toBe('ann');
    expect(entry.speaker).toBe('ann');
    expect(entry.addressedTo).toBe('you');
    expect(entry.family).toBe('f-held');
    expect(entry.claimId).toBe('c-held');
    expect(entry.reported).toEqual(reportThrough(w, 'ann', claim, RULES, 'player')); // rides the SAME channel
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief — trust slide exact (zero new constants)', () => {
  it('slides disposition by exactly -0.1 and adds exactly one strike', () => {
    const w = world('debrief-slide');
    makeAsset(w, 'ann', 'money', 0.6);
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);
    applyInject(w, 'ann', spec); // something in their belief store to extract

    expect(dispositionOf(w, 'ann')).toBe(0.6);
    expect(assetFor(w, 'player', 'ann')!.strikes).toBe(0);
    applyDebrief(w, 'ann', BEAT, RULES);
    expect(dispositionOf(w, 'ann')).toBeCloseTo(0.5, 10);
    expect(assetFor(w, 'player', 'ann')!.strikes).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief — ideology refusal (same law as courier)', () => {
  it('REFUSES when the picked family is a damaging claim about their own faction (zero residue)', () => {
    const w = world('debrief-ideology-refuse');
    makeAsset(w, 'bri', 'ideology', 0.6); // bri is faction 'guild'
    applyMeet(w, 'bri', 0);
    runUntil(w, BEAT, RULES);
    const ownSide: InjectSpec = { subject: 'cy', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE }; // cy is guild too
    applyInject(w, 'bri', ownSide);

    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'bri', BEAT, RULES)).toThrow(/ideology|own faction/);
    expect(hashWorld(w)).toBe(before);
  });

  it('answers a damaging claim about ANOTHER faction, and a flattering claim about its own', () => {
    const w1 = world('debrief-ideology-ok-other');
    makeAsset(w1, 'bri', 'ideology', 0.6);
    applyMeet(w1, 'bri', 0);
    runUntil(w1, BEAT, RULES);
    const otherSide: InjectSpec = { subject: 'dot', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE }; // dot is crown
    applyInject(w1, 'bri', otherSide);
    expect(() => applyDebrief(w1, 'bri', BEAT, RULES)).not.toThrow();

    const w2 = world('debrief-ideology-ok-flatter');
    makeAsset(w2, 'bri', 'ideology', 0.6);
    applyMeet(w2, 'bri', 0);
    runUntil(w2, BEAT, RULES);
    const flatterOwn: InjectSpec = { subject: 'cy', predicate: 'blessed-the-harvest', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };
    applyInject(w2, 'bri', flatterOwn);
    expect(() => applyDebrief(w2, 'bri', BEAT, RULES)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief joins the Action union', () => {
  it('applyAction refuses debrief without rules (predicate valence + reportThrough traits)', () => {
    const w = world('debrief-route');
    makeAsset(w, 'ann');
    expect(() => applyAction(w, { tick: 0, kind: 'debrief', asset: 'ann' })).toThrow(/rules/);
  });

  it('an unknown kind still throws (the union default-throw is preserved)', () => {
    const w = world('debrief-route2');
    expect(() => applyAction(w, { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });

  it('live ≡ replay: a meet + debrief in the log regrows byte-identically', () => {
    const build = (): WorldState => {
      const w = world('debrief-replay');
      makeAsset(w, 'ann');
      applyInject(w, 'ann', spec);
      return w;
    };
    const log: Action[] = [
      { tick: 0, kind: 'meet', asset: 'ann' },
      { tick: BEAT, kind: 'debrief', asset: 'ann' },
    ];
    const a = runLogOn(build(), RULES, log, at(0, 2));
    const b = runLogOn(build(), RULES, log, at(0, 2));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(assetFor(a, 'player', 'ann')!.strikes).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief — the compelled-independent floors survive compulsion (self-dirt + DISMISS)', () => {
  /** Directly seat a belief in an asset's store with a precise firstHeardAt (ordering control). */
  function seatBelief(
    w: WorldState, holder: EntityId, family: string, subject: EntityId, predicate: string,
    credence: number, firstHeardAt: number,
  ): void {
    const claim: Claim = {
      id: `c-${family}`, family, parent: null,
      subject, predicate, object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
    };
    w.claims[claim.id] = claim;
    w.beliefs[holder]![family] = {
      claim, credence, heardFrom: 'witnessed', heardAt: firstHeardAt, firstHeardAt,
      timesHeard: 1, apparentSources: [], discretion: false, counterSpun: false,
    };
  }

  it('skips a self-subject damaging OLDEST belief; debriefs the next-oldest answerable one (self-dirt never surfaces)', () => {
    const w = world('debrief-selfdirt');
    makeAsset(w, 'ann', 'money', 0.6);
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);

    seatBelief(w, 'ann', 'f-self', 'ann', 'stole', 0.9, 0);   // OLDEST: dirt on ANN herself (damaging) — floored
    seatBelief(w, 'ann', 'f-other', 'dot', 'stole', 0.9, 5);  // next-oldest: answerable (about someone else)

    const logBefore = w.intel.log.length;
    applyDebrief(w, 'ann', BEAT, RULES);
    const added = w.intel.log.slice(logBefore);
    expect(added).toHaveLength(1);
    expect(added[0]!.family).toBe('f-other');                      // the next-oldest, NOT the self-dirt
    expect(w.intel.log.some((e) => e.family === 'f-self')).toBe(false); // silent non-confirmation, no residue in the log
  });

  it('skips a below-DISMISS OLDEST belief; debriefs the next-oldest above-floor one', () => {
    const w = world('debrief-belowdismiss');
    makeAsset(w, 'ann', 'money', 0.6);
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);

    seatBelief(w, 'ann', 'f-faint', 'dot', 'stole', 0.1, 0);  // OLDEST: credence below STANCE.DISMISS (0.2) — floored
    seatBelief(w, 'ann', 'f-solid', 'dot', 'stole', 0.9, 5);  // next-oldest: above the floor

    const logBefore = w.intel.log.length;
    applyDebrief(w, 'ann', BEAT, RULES);
    const added = w.intel.log.slice(logBefore);
    expect(added).toHaveLength(1);
    expect(added[0]!.family).toBe('f-solid');
    expect(w.intel.log.some((e) => e.family === 'f-faint')).toBe(false);
  });

  it('refuses (zero residue) when EVERY belief is floored (self-dirt and/or below-DISMISS)', () => {
    const w = world('debrief-allfloored');
    makeAsset(w, 'ann', 'money', 0.6);
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);

    seatBelief(w, 'ann', 'f-self', 'ann', 'stole', 0.9, 0);   // self-dirt — floored
    seatBelief(w, 'ann', 'f-faint', 'dot', 'stole', 0.1, 5);  // below DISMISS — floored

    const before = hashWorld(w);
    expect(() => applyDebrief(w, 'ann', BEAT, RULES)).toThrow(/nothing|belief store|compel/i);
    expect(hashWorld(w)).toBe(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('debrief — attribution discloses the asset\'s OWN source (T9 carry / O7)', () => {
  /** Seat a belief with an EXPLICIT heardFrom and stored attribution (the divergence control):
   *  heardFrom is who the asset actually heard it from; claim.attribution is the mutable
   *  propaganda field the story SAYS it came from — the two need not agree. */
  function seatSourced(
    w: WorldState, holder: EntityId, family: string, heardFrom: Belief['heardFrom'],
    attribution: EntityId, subject: EntityId = 'dot', severity: 1 | 2 | 3 | 4 | 5 = 3,
    count: number | null = 3,
  ): Claim {
    const claim: Claim = {
      id: `c-${family}`, family, parent: null,
      subject, predicate: 'stole', object: null, count, severity, place: null, attribution,
    };
    w.claims[claim.id] = claim;
    w.beliefs[holder]![family] = {
      claim, credence: 0.9, heardFrom, heardAt: 0, firstHeardAt: 0,
      timesHeard: 1, apparentSources: [], discretion: false, counterSpun: false,
    };
    return claim;
  }

  // 1. PIN — a NAMED-source belief must report the asset's OWN source (heardFrom), NOT the
  //    story's stored claim.attribution. RED against base (base passes belief.claim through raw).
  it('reports attribution === heardFrom for a named-source belief, not the stored claim.attribution', () => {
    const w = world('debrief-disclose-named');
    makeAsset(w, 'ann', 'money', 0.6);
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);
    // ann HEARD it from bri; the STORY claims it came from cy — the propaganda field diverges.
    const claim = seatSourced(w, 'ann', 'f-named', 'bri', 'cy');

    const logBefore = w.intel.log.length;
    applyDebrief(w, 'ann', BEAT, RULES);
    const added = w.intel.log.slice(logBefore);
    expect(added).toHaveLength(1);
    expect(added[0]!.reported!.attribution).toBe('bri');           // the asset's OWN disclosed source
    expect(added[0]!.reported!.attribution).not.toBe(claim.attribution); // NOT the stored 'cy'
  });

  // 2. CONTROL — injected/witnessed beliefs (every shape the existing suite seats) disclose SOMEONE.
  //    A no-op path: green on base AND fixed, proving the fix never touches the existing suite.
  it('is a no-op for injected/witnessed beliefs — attribution stays SOMEONE', () => {
    const wi = world('debrief-disclose-injected');
    makeAsset(wi, 'ann', 'money', 0.6);
    applyMeet(wi, 'ann', 0);
    runUntil(wi, BEAT, RULES);
    applyInject(wi, 'ann', spec); // heardFrom 'injected', attribution SOMEONE — the existing-suite shape
    let logBefore = wi.intel.log.length;
    applyDebrief(wi, 'ann', BEAT, RULES);
    expect(wi.intel.log.slice(logBefore)[0]!.reported!.attribution).toBe(SOMEONE);

    const ww = world('debrief-disclose-witnessed');
    makeAsset(ww, 'ann', 'money', 0.6);
    applyMeet(ww, 'ann', 0);
    runUntil(ww, BEAT, RULES);
    seatSourced(ww, 'ann', 'f-wit', 'witnessed', SOMEONE); // ground-truth secret — attribution SOMEONE
    logBefore = ww.intel.log.length;
    applyDebrief(ww, 'ann', BEAT, RULES);
    expect(ww.intel.log.slice(logBefore)[0]!.reported!.attribution).toBe(SOMEONE);
  });

  // 3. COMPOSITION GUARD — the disclosure rewrite composes BEFORE the reporting chain, so a turned
  //    asset's named-source debrief is doctored (minimizer) DOWNSTREAM of the rewrite: doctoring
  //    lands on the DISCLOSED claim (attribution = heardFrom), never the stored propaganda one.
  it('composes the disclosure before the reporting chain — a turned asset\'s debrief is doctored downstream of it', () => {
    const w = world('debrief-disclose-turned');
    makeAsset(w, 'ann', 'money', 0.6);
    assetFor(w, 'player', 'ann')!.turned = true; // a player asset CAN be turned (see debrief-flip) — minimizer fires
    applyMeet(w, 'ann', 0);
    runUntil(w, BEAT, RULES);
    const claim = seatSourced(w, 'ann', 'f-turned', 'bri', 'cy', 'dot', 4, 4); // severity 4, count 4

    const logBefore = w.intel.log.length;
    applyDebrief(w, 'ann', BEAT, RULES);
    const reported = w.intel.log.slice(logBefore)[0]!.reported!;

    expect(reported.attribution).toBe('bri'); // disclosed source survives the chain (minimizer leaves it)
    expect(reported.severity).toBe(3);        // minimizer walked 4 -> 3 (doctored downstream of the rewrite)
    expect(reported.count).toBe(2);           // minimizer halved 4 -> 2
    // Exactly reportThrough of the DISCLOSED claim (attribution rewritten to heardFrom)...
    const disclosed: Claim = { ...claim, attribution: 'bri' };
    expect(reported).toEqual(reportThrough(w, 'ann', disclosed, RULES, 'player'));
    // ...and NOT reportThrough of the STORED claim (proves the rewrite ordering, not just doctoring).
    expect(reported).not.toEqual(reportThrough(w, 'ann', claim, RULES, 'player'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("debrief — the strike compounds into Task 8's flip precondition (integration)", () => {
  /** Task 8's own twin-world staging idiom (tests/network/turncoats.test.ts), reused verbatim:
   *  a valid generated town -> a live world (with his enemyNet) -> the avatar (dossier assets). */
  function stage(seed: string): { world: WorldState; town: GeneratedTown } {
    const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, RULES);
    const w = worldFromTown(town, seed, RULES);
    attachPlayer(w, town);
    return { world: w, town };
  }

  /** A GENUINE identification (Task 8's own helper, reused verbatim): a well-formed carrier-profile
   *  feature whose SUBJECT is `id` — exactly the "their id appears as any sketch feature subject"
   *  predicate `enemyIdentified` reads. */
  function identifyFeature(id: EntityId, sfId = 'sf-debrief'): SketchFeature {
    return {
      id: sfId, kind: 'carrier-profile', day: 0, family: null, subject: id, district: 'd0',
      detail: `hop-zero candidate: ${id}`, evidence: [{ tick: 0, observer: id, claimId: null }],
    };
  }

  it('repeated debriefs slide 0.75 -> ... -> <0.4; the nightly flips the debriefed asset, not the undebriefed twin', () => {
    const { world: hot } = stage('debrief-flip');
    const { world: cold } = stage('debrief-flip'); // an independent twin from the SAME seed

    const asset = hot.network.assets[0]!.id;
    expect(cold.network.assets[0]!.id).toBe(asset); // same seed, same roster order
    expect(dispositionOf(hot, asset)).toBe(0.75);   // the dossier freebie floor (attach.ts)
    expect(dispositionOf(cold, asset)).toBe(0.75);

    applyInject(hot, asset, spec);  // something in their belief store to extract, each world
    applyInject(cold, asset, spec);

    // Genuine identification in BOTH worlds — Task 8's own machinery, unmodified.
    hot.enemy.sketch.push(identifyFeature(asset));
    cold.enemy.sketch.push(identifyFeature(asset));

    // Four debriefs on the HOT world only: 0.75 -> 0.65 -> 0.55 -> 0.45 -> 0.35 (< 0.4, the flip line).
    let tick = hot.tick;
    for (let i = 0; i < 4; i++) {
      applyMeet(hot, asset, tick);
      const nextBeat = tick + CONVERSATION_BEAT;
      runUntil(hot, nextBeat, RULES);
      applyDebrief(hot, asset, nextBeat, RULES);
      tick = nextBeat;
    }
    expect(dispositionOf(hot, asset)).toBeCloseTo(0.35, 10);
    expect(assetFor(hot, 'player', asset)!.strikes).toBe(4);
    expect(dispositionOf(cold, asset)).toBe(0.75); // the twin, never debriefed, untouched

    // Cross the next nightly on both worlds — the SAME Task 8 pass, unmodified.
    const nextDayStart = at(dayOf(tick) + 1, 0);
    runUntil(hot, nextDayStart, RULES);
    runUntil(cold, nextDayStart, RULES);

    expect(assetFor(hot, 'player', asset)!.turned).toBe(true);   // eroded by debrief + identified -> flips
    expect(assetFor(cold, 'player', asset)!.turned).toBeFalsy();  // identified but never eroded -> stays loyal
  });
});
