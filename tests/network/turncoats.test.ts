import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { WATCHFORD } from '../../src/content/fixtures/watchford';
import { watchfordWorld } from '../sim/helpers/watchford-world';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { runTurncoatPass } from '../../src/sim/network/turncoats';
import { assetFor, dispositionOf, setDispositionEdge } from '../../src/sim/network/roster';
import { recordFact } from '../../src/sim/network/compartment';
import { captureIntel, playerView, networkView, courierRouteView, blankIntel } from '../../src/sim/fieldwork';
import { captureEvidence } from '../../src/sim/counterintel';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { reportThrough } from '../../src/sim/reporting';
import { runUntil } from '../../src/sim/step';
import { STANCE } from '../../src/sim/rumors/propagation';
import { TRAITS } from '../../src/content/traits';
import { at } from '../../src/core/time';
import { SOMEONE, type Claim, type EntityId } from '../../src/sim/rumors/claim';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { enemyDigest } from '../../src/sim/enemy/digest';
import type { TraitContext } from '../../src/sim/rumors/traits';
import type { ReportedClaim, SketchFeature } from '../../src/sim/enemy/state';
import type { Belief, WorldState } from '../../src/sim/types';
import type { GeneratedTown } from '../../src/world/types';
import type { AssetRecord } from '../../src/sim/network/types';
import type { TickEvents } from '../../src/sim/perception';

const RULES = STANDARD_RULES;

/** Procgen staging: a valid town → a live world (with his enemyNet) → the avatar (2 dossier assets). */
function stage(seed: string): { world: WorldState; town: GeneratedTown } {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, RULES);
  const world = worldFromTown(town, seed, RULES);
  attachPlayer(world, town);
  return { world, town };
}

/** A GENUINE identification: a well-formed carrier-profile feature whose SUBJECT is `id` — exactly
 *  the "their id appears as any sketch feature subject" predicate (escalation license: real
 *  precondition, never a weakened threshold). */
function identifyFeature(id: EntityId, sfId = 'sf-id'): SketchFeature {
  return {
    id: sfId, kind: 'carrier-profile', day: 0, family: null, subject: id, district: 'd0',
    detail: `hop-zero candidate: ${id}`, evidence: [{ tick: 0, observer: id, claimId: null }],
  };
}

/** A GENUINE BELIEVE-grade damaging spymaster claim (anti-spymaster rumor landed) held by his asset. */
function damagingSpymasterBelief(spymaster: EntityId, credence: number, family = 'f-anti'): Belief {
  const claim: Claim = {
    id: `c-${family}`, family, parent: null, subject: spymaster, predicate: 'stole',
    object: null, count: null, severity: 4, place: null, attribution: SOMEONE,
  };
  return {
    claim, credence, heardFrom: 'injected', heardAt: 0, firstHeardAt: 0, timesHeard: 2,
    apparentSources: [], discretion: false, counterSpun: false,
  };
}

const pick7 = (r: ReportedClaim): ReportedClaim => {
  const { subject, predicate, object, count, severity, place, attribution } = r;
  return { subject, predicate, object, count, severity, place, attribution };
};

// ─────────────────────────────────────────────────────────────────────────────
describe('turncoat flips — a secret crossing a broken trust edge, both directions', () => {
  it('(a) player-side: disposition < 0.4 AND enemy-identified flips `turned`; the twin without identification does not', () => {
    const { world } = stage('turn-a');
    const { world: control } = stage('turn-a'); // an independent twin from the same seed
    const asset = world.network.assets[0]!.id;

    // Genuine erosion in BOTH worlds — a real slid trust edge under the 0.4 flip line.
    setDispositionEdge(world, asset, 0.3);
    setDispositionEdge(control, asset, 0.3);
    expect(dispositionOf(world, asset)).toBeLessThan(0.4);

    // Only the WITH world gets a genuine identification (a real sketch feature naming them).
    world.enemy.sketch.push(identifyFeature(asset));

    runTurncoatPass(world, RULES);
    runTurncoatPass(control, RULES);

    expect(assetFor(world, 'player', asset)!.turned).toBe(true);        // both conditions met → turned
    expect(assetFor(control, 'player', asset)!.turned).toBeFalsy();     // eroded but not identified → loyal
  });

  it('(a) trust still holding: identified but disposition >= 0.4 stays loyal', () => {
    const { world } = stage('turn-a2');
    const asset = world.network.assets[0]!.id;
    setDispositionEdge(world, asset, 0.55);          // above the flip line
    world.enemy.sketch.push(identifyFeature(asset)); // identified all the same
    runTurncoatPass(world, RULES);
    expect(assetFor(world, 'player', asset)!.turned).toBeFalsy();
  });

  it('(b) his-side: an enemy asset BELIEVING a damaging spymaster claim flips to a walk-in; below BELIEVE does not', () => {
    const { world } = stage('turn-b');
    const spymaster = world.network.spymaster!;
    const hisAsset = world.network.enemyAssets[0]!.id;

    world.beliefs[hisAsset]!['f-anti'] = damagingSpymasterBelief(spymaster, STANCE.BELIEVE); // exactly at BELIEVE
    runTurncoatPass(world, RULES);
    expect(assetFor(world, 'enemy', hisAsset)!.turned).toBe(true);

    const { world: twin } = stage('turn-b');
    twin.beliefs[hisAsset]!['f-anti'] = damagingSpymasterBelief(spymaster, 0.6); // repeating, not believing
    runTurncoatPass(twin, RULES);
    expect(assetFor(twin, 'enemy', hisAsset)!.turned).toBeFalsy();
  });

  it('the flip writes ONLY roster bookkeeping — never a trust edge (Task 4 SET-not-max carry)', () => {
    const { world } = stage('turn-noedge');
    const asset = world.network.assets[0]!.id;
    setDispositionEdge(world, asset, 0.3);
    world.enemy.sketch.push(identifyFeature(asset));
    const edgeBefore = stableStringify(world.npcs[asset]!.edges);
    runTurncoatPass(world, RULES);
    expect(assetFor(world, 'player', asset)!.turned).toBe(true);
    expect(stableStringify(world.npcs[asset]!.edges)).toBe(edgeBefore); // disposition untouched by the flip
    expect(dispositionOf(world, asset)).toBe(0.3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('doctored channel — divergence IS the catchable signature (same events, turned vs loyal)', () => {
  /** Build a Watchford world whose informant `mira` is a player asset with the given `turned` flag. */
  function withMira(seed: string, turned: boolean): WorldState {
    const world = watchfordWorld(seed);
    enrollPlayer(world, { home: 'home-gs' });
    world.intel.informants.push({ id: 'mira', assignedVenue: 'square-w0' });
    world.network.assets.push({ id: 'mira', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned });
    return world;
  }

  const STORY: Claim = {
    id: 'c-story', family: 'f-story', parent: null, subject: 'otto', predicate: 'stole',
    object: null, count: 8, severity: 5, place: null, attribution: SOMEONE,
  };

  function feed(): TickEvents {
    const t = at(0, 8);
    return {
      tick: t,
      positions: { mira: 'square-w0', gale: 'square-w0' }, // gale (guard) co-located → a watch sighting
      utterances: [{
        tick: t, venue: 'square-w0', circleMembers: ['otto', 'sten', 'mira'],
        speaker: 'otto', addressedTo: 'sten', claim: STORY, mode: 'telling',
      }],
      askings: [
        { tick: t, venue: 'square-w0', circleMembers: ['gale', 'mira'], speaker: 'gale', addressedTo: 'mira', about: { family: 'f-story' }, authority: true },
        { tick: t, venue: 'square-w0', circleMembers: ['hugo', 'mira'], speaker: 'hugo', addressedTo: 'mira', about: { family: 'f-story' }, authority: false },
      ],
    };
  }

  it('a turned asset drops watch sightings, omits authority askings, and minimizes stories', () => {
    const loyalW = withMira('doc-loyal', false);
    const turnedW = withMira('doc-turned', true);
    captureIntel(loyalW, feed(), RULES);
    captureIntel(turnedW, feed(), RULES);
    for (const world of [loyalW, turnedW]) {
      queueUnqueuedFieldReports(world);
      const message = world.network.directiveState!.messages[0]!;
      const speech = realizeNetworkForward(world, message.id, {
        venue: 'home-gs', members: ['mira', 'you'],
      }, message.availableAfter, RULES)!;
      captureIntel(world, {
        tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
      }, RULES);
    }

    const loyal = loyalW.intel.log.filter((e) => e.via === 'mira');
    const turned = turnedW.intel.log.filter((e) => e.via === 'mira');

    // watch sighting: present in the loyal channel, DROPPED from the turned one.
    expect(loyal.some((e) => e.kind === 'presence')).toBe(true);
    expect(turned.some((e) => e.kind === 'presence')).toBe(false);

    // authority asking OMITTED; the non-authority asking survives (only authority is enemy-relevant).
    expect(loyal.filter((e) => e.kind === 'asking').map((e) => e.authority).sort()).toEqual([false, true]);
    const turnedAskings = turned.filter((e) => e.kind === 'asking');
    expect(turnedAskings).toHaveLength(1);
    expect(turnedAskings[0]!.authority).toBe(false);

    // story report MINIMIZED (still present, walked down — the content divergence a cross-check catches).
    const lu = loyal.find((e) => e.kind === 'utterance')!.reported!;
    const tu = turned.find((e) => e.kind === 'utterance')!.reported!;
    expect(lu.count).not.toBeNull();
    expect(lu.severity).toBeGreaterThan(1);
    expect(tu.count).toBe(Math.max(1, Math.floor(lu.count! / 2)));
    expect(tu.severity).toBe(lu.severity - 1);
  });

  it('the minimizer is the REGISTERED trait composed AFTER the ego overlay AFTER real traits (disclosed order)', () => {
    const world = buildWorld(WATCHFORD, 'compose');
    const npc = 'otto';
    const claim: Claim = {
      id: 'c', family: 'f', parent: null, subject: 'mira', predicate: 'stole',
      object: null, count: 6, severity: 5, place: null, attribution: SOMEONE,
    };
    const ctx: TraitContext = {
      ownerId: npc, faction: world.npcs[npc]!.faction, rivals: world.npcs[npc]!.rivals,
      factionOf: (e) => world.npcs[e]?.faction ?? null,
    };
    const mini = TRAITS['minimizer']!;
    const applyMini = (r: ReportedClaim): ReportedClaim => {
      const asClaim = { ...claim, ...r };
      return pick7({ ...asClaim, ...(mini.appliesTo(asClaim, ctx) ? mini.transform(asClaim, ctx) : {}) } as ReportedClaim);
    };
    const set = (mice: 'ego' | null, turned: boolean): void => {
      world.network.assets = [{ id: npc, mice, wagePaidThroughDay: 0, strikes: 0, facts: [], turned }];
    };

    // Doctoring after REAL traits: a plain turned asset = minimizer(realTraits(claim)).
    set(null, false); const r0 = pick7(reportThrough(world, npc, claim, RULES, 'player'));
    set(null, true); const rT = pick7(reportThrough(world, npc, claim, RULES, 'player'));
    expect(rT).toEqual(applyMini(r0));

    // Doctoring after the EGO overlay after real traits: turned+ego = minimizer(exaggerator(real)).
    set('ego', false); const rE = pick7(reportThrough(world, npc, claim, RULES, 'player'));
    set('ego', true); const rET = pick7(reportThrough(world, npc, claim, RULES, 'player'));
    expect(rET).toEqual(applyMini(rE));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the weekly leak — a compartment fact travels by physical speech (rest-day cadence)', () => {
  it('queues the oldest fact weekly and changes enemy evidence only when the spymaster hears it', () => {
    const { world } = stage('leak-1');
    const spymaster = world.network.spymaster!;
    const asset = world.network.assets[0]!;
    asset.turned = true;
    // Give the asset a second fact so we can watch the cadence advance oldest-first.
    world.tick = at(2, 0);
    recordFact(world, 'player', asset.id, { kind: 'carried-story', ref: 'f-carried' });
    const facts = [...asset.facts]; // [recruited-by@0, carried-story@day2]
    expect(facts).toHaveLength(2);
    const evBefore = world.enemy.evidence.length;

    // Rest-day nightly (day 6): the oldest fact leaks.
    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence).toHaveLength(evBefore);
    const message1 = world.network.directiveState!.messages.at(-1)!;
    expect(message1.payload).toMatchObject({ kind: 'compartment-fact', fact: facts[0] });
    const enemyBefore = structuredClone(world.enemy);
    const meetingVenue = Object.keys(world.venues)[0]!;
    const speech1 = realizeNetworkForward(world, message1.id, {
      venue: meetingVenue, members: [asset.id, spymaster],
    }, message1.availableAfter, RULES)!;
    captureEvidence(world, {
      tick: speech1.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech1],
    }, RULES);
    const leak1 = world.enemy.evidence.at(-1)!;
    expect(leak1.leaked).toBeTruthy();
    expect(leak1.leaked!.from).toBe(asset.id);
    expect(leak1.leaked!.fact).toEqual(facts[0]); // oldest = recruited-by@0
    expect(leak1.observer).toBe(asset.id);        // existing leak evidence attributes the walk-in source
    expect(leak1.speaker).toBe(asset.id);         // the turncoat is the physical source
    expect(leak1.addressedTo).toBe(spymaster);
    expect(leak1).toMatchObject({
      tick: speech1.tick, venue: meetingVenue, observer: asset.id, overheard: false,
      speaker: asset.id, addressedTo: spymaster,
      kind: 'network', mode: null, claimId: null, family: null,
      reported: null, about: null,
      leaked: { from: asset.id, fact: facts[0] },
      network: { messageId: message1.id, sourceDirectiveId: null, spoken: speech1.spoken },
    });
    expect(stableStringify(enemyDigest(world.enemy, 7, RULES)))
      .toBe(stableStringify(enemyDigest(enemyBefore, 7, RULES)));
    expect(asset.leakedThrough).toBe(1);

    // A NON-rest-day nightly leaks nothing (weekly cadence).
    world.tick = at(7, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence).toHaveLength(evBefore + 1);

    // The next rest-day nightly (day 13) leaks the NEXT fact.
    world.tick = at(13, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence).toHaveLength(evBefore + 1);
    const message2 = world.network.directiveState!.messages.at(-1)!;
    expect(message2.payload).toMatchObject({ kind: 'compartment-fact', fact: facts[1] });
    const speech2 = realizeNetworkForward(world, message2.id, {
      venue: Object.keys(world.venues)[0]!, members: [asset.id, spymaster],
    }, message2.availableAfter, RULES)!;
    captureEvidence(world, {
      tick: speech2.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech2],
    }, RULES);
    expect(world.enemy.evidence.at(-1)!.leaked!.fact).toEqual(facts[1]);
    expect(asset.leakedThrough).toBe(2);

    // Nothing left to give up — a further rest-day week is a no-op.
    world.tick = at(20, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence).toHaveLength(evBefore + 2);
  });

  it('a LOYAL asset never leaks', () => {
    const { world } = stage('leak-loyal');
    world.tick = at(6, 23, 59);
    const evBefore = world.enemy.evidence.length;
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence).toHaveLength(evBefore);
  });

  it('an unheard leak is inert to the digest — no evidence is created by queueing', () => {
    const { world } = stage('leak-inert');
    world.network.assets[0]!.turned = true;
    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence.some((e) => e.leaked)).toBe(false);
    expect(world.network.directiveState!.messages).toHaveLength(1);
  });

  it('without handler contact the leak cursor stays zero and later rest days cannot duplicate it', () => {
    const { world } = stage('leak-pending-cursor');
    const asset = world.network.assets[0]!;
    asset.turned = true;
    recordFact(world, 'player', asset.id, { kind: 'carried-story', ref: 'f-second' });

    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(asset.leakedThrough ?? 0).toBe(0);
    expect(world.network.directiveState!.messages).toHaveLength(1);
    expect(world.network.directiveState!.messages[0]!.payload).toMatchObject({
      kind: 'compartment-fact', asset: asset.id, factIndex: 0,
    });

    world.tick = at(13, 23, 59);
    runTurncoatPass(world, RULES);
    expect(asset.leakedThrough ?? 0).toBe(0);
    expect(world.network.directiveState!.messages).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('walk-ins from his broken ranks — a real sketch feature travels by speech', () => {
  it('queues a tip weekly and creates a hint only after the avatar hears it', () => {
    const { world } = stage('walk-1');
    const walkIn = world.network.enemyAssets[0]!;
    walkIn.turned = true;

    // Two GENUINE subject-bearing features in his sketch (they resolve in enemy.sketch).
    const subjA = world.network.assets[0]!.id;
    const subjB = world.network.assets[1]!.id;
    world.enemy.sketch.push(identifyFeature(subjA, 'sf-a'), identifyFeature(subjB, 'sf-b'));
    const logBefore = world.intel.log.length;

    // Rest-day nightly (day 6): the oldest un-revealed feature is volunteered.
    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.intel.log).toHaveLength(logBefore);
    const message1 = world.network.directiveState!.messages.at(-1)!;
    const speech1 = realizeNetworkForward(world, message1.id, {
      venue: Object.keys(world.venues)[0]!, members: [walkIn.id, world.playerId!],
    }, message1.availableAfter, RULES)!;
    captureIntel(world, {
      tick: speech1.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech1],
    }, RULES);
    expect(world.intel.log).toHaveLength(logBefore + 1);
    const hint = world.intel.log.at(-1)!;
    expect(hint.kind).toBe('hint');
    expect(hint.via).toBe(walkIn.id);
    expect(hint.hintWitness).toBe(walkIn.id);
    expect(hint.hintAbout).toBe(subjA);
    // It reveals a REAL feature: the revealed subject resolves to an actual sketch feature.
    expect(world.enemy.sketch.some((f) => f.subject === hint.hintAbout)).toBe(true);
    expect(walkIn.revealedThrough).toBe(1);

    // A non-rest-day nightly reveals nothing.
    world.tick = at(7, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.intel.log).toHaveLength(logBefore + 1);

    // The next rest-day week reveals the NEXT feature.
    world.tick = at(13, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.intel.log).toHaveLength(logBefore + 1);
    const message2 = world.network.directiveState!.messages.at(-1)!;
    const speech2 = realizeNetworkForward(world, message2.id, {
      venue: Object.keys(world.venues)[0]!, members: [walkIn.id, world.playerId!],
    }, message2.availableAfter, RULES)!;
    captureIntel(world, {
      tick: speech2.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech2],
    }, RULES);
    expect(world.intel.log).toHaveLength(logBefore + 2);
    expect(world.intel.log.at(-1)!.hintAbout).toBe(subjB);
    expect(walkIn.revealedThrough).toBe(2);
  });

  it('a non-flipped enemy asset never volunteers a tip', () => {
    const { world } = stage('walk-loyal');
    world.enemy.sketch.push(identifyFeature(world.network.assets[0]!.id, 'sf-x'));
    world.tick = at(6, 23, 59);
    const logBefore = world.intel.log.length;
    runTurncoatPass(world, RULES);
    expect(world.intel.log).toHaveLength(logBefore);
  });

  it('without avatar contact the reveal cursor stays zero and later rest days cannot duplicate it', () => {
    const { world } = stage('walk-pending-cursor');
    const walkIn = world.network.enemyAssets[0]!;
    walkIn.turned = true;
    const subject = world.network.assets[0]!.id;
    world.enemy.sketch.push(identifyFeature(subject, 'sf-pending'));

    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(walkIn.revealedThrough ?? 0).toBe(0);
    expect(world.network.directiveState!.messages).toHaveLength(1);
    expect(world.network.directiveState!.messages[0]!.payload).toMatchObject({
      kind: 'sketch-tip', asset: walkIn.id, featureId: 'sf-pending', subject,
    });

    world.tick = at(13, 23, 59);
    runTurncoatPass(world, RULES);
    expect(walkIn.revealedThrough ?? 0).toBe(0);
    expect(world.network.directiveState!.messages).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the pass is wired into the nightly — AFTER wages, BEFORE vignettes', () => {
  it('a rest-day WAGE slide pushes an eroded, identified asset under the flip line THIS night (after-wages ordering)', () => {
    // A week the treasury (0) and stipend (0) leave payroll short — the genuine wage-shortfall state
    // that makes the wage→disposition slide the deciding factor, isolating the after-wages ordering.
    const NO_STIPEND = { ...RULES, economy: { ...RULES.economy, weeklyStipend: 0 } };
    const { world } = stage('order-1');
    const asset = world.network.assets[0]!.id;
    world.coin = 0;
    setDispositionEdge(world, asset, 0.42);          // ABOVE the line — would not flip pre-wages
    world.enemy.sketch.push(identifyFeature(asset)); // genuinely identified
    world.tick = at(6, 23, 58);

    runUntil(world, at(7, 0), NO_STIPEND);           // crosses the day-6 rest-day nightly

    // The missed wage slid 0.42 → 0.37 (< 0.4), and the turncoat pass — running AFTER wages — flipped
    // them the SAME night. Had it run before wages, 0.42 would still hold and they'd stay loyal.
    expect(dispositionOf(world, asset)).toBeCloseTo(0.37, 5);
    expect(assetFor(world, 'player', asset)!.turned).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('turncoats are invisible player-side — the flag is not the game', () => {
  it('flipping `turned` on every asset changes NO playerView, networkView, OR courierRouteView output (structural invisibility)', () => {
    for (const seed of ['inv-1', 'inv-2', 'inv-3']) {
      const { world } = stage(seed);
      world.tick = at(1, 8); // a live tick with circles populated

      // M-2: seed a NON-VACUOUS courier route so the flip actually exercises courierRouteView's
      // output. Its input is the player's append-only courier planning substrate
      // — never `turned`; but an empty overlay would make the byte-identity check below prove
      // nothing. A drop-handoff run sets out from the drop's venue; the target's `to` comes from a
      // single intel row placing them — both PLAYER-KNOWN, same fence as the other two selectors.
      const asset = world.network.assets[0]!.id;
      const someVenue = Object.keys(world.venues)[0]!;
      const targetNpc = Object.keys(world.npcs).find((id) => id !== world.playerId && id !== asset)!;
      world.network.drops.push({ id: 'd-flip', venue: someVenue, knownBy: [] });
      world.intel.courierPlans = [{
        id: 'plan-0', asset, target: targetNpc, from: someVenue, to: someVenue,
        authoredAt: world.tick, acknowledgedAt: null,
      }];
      world.intel.log.push({ ...blankIntel(), tick: world.tick, venue: someVenue, via: 'self', kind: 'utterance', overheard: false, speaker: targetNpc });
      expect(courierRouteView(world)).toHaveLength(1); // the route is real — the assertion below is not vacuous

      const before = stableStringify(playerView(world));
      const beforeNet = stableStringify(networkView(world));       // T11: the roster surface is invisible too
      const beforeCourier = stableStringify(courierRouteView(world)); // M-2: …and the courier overlay too
      const assertInvisible = (): void => {
        expect(stableStringify(playerView(world))).toBe(before);
        expect(stableStringify(networkView(world))).toBe(beforeNet);
        expect(stableStringify(courierRouteView(world))).toBe(beforeCourier);
      };
      for (const a of world.network.assets) a.turned = true;
      assertInvisible();
      for (const a of world.network.assets) delete a.turned;
      for (const a of world.network.enemyAssets) a.turned = true;
      assertInvisible();
    }
  });

  it('no player-facing selector or app surface reads the asset `turned` flag (adversarial scan)', () => {
    // playerView (THE epistemic selector) never mentions the flag. T11 obligation MET: networkView +
    // courierRouteView (the Task 11 network-surface selectors) join this scan — they expose only
    // player-known bookkeeping (wages/strikes/facts-count/assignments/drops), never the flip flag.
    const fieldwork = readFileSync(join(process.cwd(), 'src/sim/fieldwork.ts'), 'utf8');
    const pv = fieldwork.slice(fieldwork.indexOf('export function playerView'));
    expect(pv).not.toMatch(/turned/);
    expect(pv).not.toMatch(/isTurnedAsset/);
    // The dedicated networkView slice (to EOF — covers courierRouteView too): same fence, made explicit.
    const nv = fieldwork.slice(fieldwork.indexOf('export function networkView'));
    expect(nv.length).toBeGreaterThan(0);
    expect(nv).not.toMatch(/turned/);
    expect(nv).not.toMatch(/isTurnedAsset/);

    // No app surface reads the roster's turncoat state at all.
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
    for (const file of walk(join(process.cwd(), 'app/src')).filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(file, 'utf8');
      expect(src, `${file} reads network roster`).not.toMatch(/network\.(enemyA|a)ssets/);
      expect(src, `${file} reads isTurnedAsset`).not.toMatch(/isTurnedAsset/);
      expect(src, `${file} reads .turned`).not.toMatch(/\.turned\b/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('principal-aware report channels — dual membership is lawful', () => {
  const STORY: Claim = {
    id: 'c-story', family: 'f-story', parent: null, subject: 'otto', predicate: 'stole',
    object: null, count: 8, severity: 5, place: null, attribution: SOMEONE,
  };
  const asset = (id: EntityId, overrides: Partial<AssetRecord> = {}): AssetRecord => ({
    id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], ...overrides,
  });
  const literalReporterWorld = (): WorldState => buildWorld(WATCHFORD, 'dual-reporter');

  it('a dual-roster player-side turncoat doctors only the player audience', () => {
    const world = literalReporterWorld();
    world.network.assets.push(asset('mira', { turned: true }));
    world.network.enemyAssets.push(asset('mira'));

    const toEnemy = reportThrough(world, 'mira', STORY, RULES, 'enemy');
    const toPlayer = reportThrough(world, 'mira', STORY, RULES, 'player');
    expect(toPlayer.count).toBe(Math.max(1, Math.floor(toEnemy.count! / 2)));
    expect(toPlayer.severity).toBe(toEnemy.severity - 1);
    expect(reportThrough(world, 'mira', STORY, RULES, 'enemy')).toEqual(toEnemy);
  });

  it('a dual-roster enemy-side turncoat doctors only the enemy audience', () => {
    const world = literalReporterWorld();
    world.network.assets.push(asset('mira'));
    world.network.enemyAssets.push(asset('mira', { turned: true }));
    const toPlayer = reportThrough(world, 'mira', STORY, RULES, 'player');
    const toEnemy = reportThrough(world, 'mira', STORY, RULES, 'enemy');
    expect(toEnemy.count).toBe(Math.max(1, Math.floor(toPlayer.count! / 2)));
    expect(toEnemy.severity).toBe(toPlayer.severity - 1);
  });

  it('a dual-roster player-side ego handle exaggerates only for the player audience', () => {
    const world = literalReporterWorld();
    world.network.assets.push(asset('mira', { mice: 'ego' }));
    world.network.enemyAssets.push(asset('mira'));

    const toPlayer = reportThrough(world, 'mira', STORY, RULES, 'player');
    const toEnemy = reportThrough(world, 'mira', STORY, RULES, 'enemy');
    expect(toPlayer.count).toBe(toEnemy.count! * 2);
    expect(toPlayer.severity).toBe(Math.min(5, toEnemy.severity + 1));
    expect(toEnemy.count).toBe(8);
    expect(toEnemy.severity).toBe(5);
  });

  it('a dual-roster enemy-side ego handle exaggerates only for the enemy audience', () => {
    const world = literalReporterWorld();
    world.network.assets.push(asset('mira'));
    world.network.enemyAssets.push(asset('mira', { mice: 'ego' }));

    const toPlayer = reportThrough(world, 'mira', STORY, RULES, 'player');
    const toEnemy = reportThrough(world, 'mira', STORY, RULES, 'enemy');
    expect(toEnemy.count).toBe(toPlayer.count! * 2);
    expect(toEnemy.severity).toBe(Math.min(5, toPlayer.severity + 1));
    expect(toPlayer.count).toBe(8);
    expect(toPlayer.severity).toBe(5);
  });

  it('composes real traits before opposing audience-scoped ego and turned overlays', () => {
    const world = literalReporterWorld();
    world.network.assets.push(asset('gale', { mice: 'ego' }));
    world.network.enemyAssets.push(asset('gale', { turned: true }));

    // STORY 8/5; gale's registered exaggerator => 16/5. Player ego => 32/5.
    // The enemy record has no ego, then its minimizer => 8/4.
    const toPlayer = reportThrough(world, 'gale', STORY, RULES, 'player');
    const toEnemy = reportThrough(world, 'gale', STORY, RULES, 'enemy');
    expect(toPlayer.count).toBe(32);
    expect(toPlayer.severity).toBe(5);
    expect(toEnemy.count).toBe(8);
    expect(toEnemy.severity).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('determinism + replay — turncoat physics are entropy-free', () => {
  it('two identical builds crossing a rest-day nightly hash byte-for-byte, with the leak + walk-in firing', () => {
    const build = (): WorldState => {
      const { world } = stage('det-1');
      // A player-side turncoat (with facts to leak) and a walk-in (with a real feature to reveal).
      world.network.assets[0]!.turned = true;
      const walkIn = world.network.enemyAssets[0]!;
      walkIn.turned = true;
      world.enemy.sketch.push(identifyFeature(world.network.assets[1]!.id, 'sf-det'));
      world.tick = at(6, 23, 58);
      return world;
    };
    const a = build();
    const b = build();
    const evA = a.enemy.evidence.length;
    const logA = a.intel.log.length;
    runUntil(a, at(7, 0), RULES);
    runUntil(b, at(7, 0), RULES);

    expect(hashWorld(a)).toBe(hashWorld(b));                       // byte-identical replay
    expect(a.enemy.evidence).toHaveLength(evA);                   // no speech heard yet
    expect(a.intel.log).toHaveLength(logA);                       // no speech heard yet
    expect(a.network.directiveState!.messages.map((m) => m.payload.kind).sort())
      .toEqual(['compartment-fact', 'sketch-tip']);                // both emissions fired (non-vacuous)
  });
});
