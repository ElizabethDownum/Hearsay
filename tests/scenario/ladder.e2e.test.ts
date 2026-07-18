import { describe, expect, it } from 'vitest';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { attachScenario, councilTurns } from '../../src/sim/scenario/referee';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { applyTell } from '../../src/sim/actions';
import { step } from '../../src/sim/step';
import { runTurncoatPass } from '../../src/sim/network/turncoats';
import { runEnemyDay } from '../../src/sim/counterintel';
import { captureIntel } from '../../src/sim/fieldwork';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { assetFor } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import { at, dayOf } from '../../src/core/time';
import { STANCE } from '../../src/sim/rumors/propagation';
import { stableStringify } from '../../src/sim/hash';
import { SOMEONE, type Claim, type EntityId } from '../../src/sim/rumors/claim';
import type { InjectSpec } from '../../src/sim/actions';
import type { Edge, Npc, WorldState } from '../../src/sim/types';
import type { GeneratedTown } from '../../src/world/types';
import type { Belief } from '../../src/sim/types';
import type { EvidenceEntry, ReportedClaim } from '../../src/sim/enemy/state';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 8 Task 12 — the FULL-LADDER e2e (the plan's crown), hypothesis-flagged.
//
// A seeded campaign climbs the ladder: recruit (money) → set a drop → courier a coronation-axis story
// toward a council-adjacent carrier → host a back-room evening → the anti-spymaster ops (a walk-in, a
// budget lost). Then verify BY MECHANISM: council credence MOVED · his budget lost a night ·
// compartment records complete · coin books balance to the exact expected integer. Every emergent
// expectation carries a STOP path — a step that fails by mechanism is EVIDENCE, never a threshold to
// weaken (escalation license).
//
// The town is HAND-BUILT (a GeneratedTown with controlled schedules) so the rungs fire deterministically
// — the same worldFromTown / attachPlayer / attachScenario staging a generated seed goes through. See
// the report's "Deviations" for the two disclosed staging vehicles (the walk-in / budget belief seatings).
// ─────────────────────────────────────────────────────────────────────────────

const RULES = STANDARD_RULES;
const ECON = STANDARD_ECONOMY;

const N = (s: {
  id: string; venue: string; faction?: Npc['faction']; occupation?: string;
  traits?: string[]; rivals?: string[]; edges?: Edge[];
}): Npc => ({
  id: s.id, name: s.id, home: s.venue, occupation: s.occupation ?? 'grocer', faction: s.faction ?? 'none',
  traits: s.traits ?? ['literalist'], rivals: s.rivals ?? [], edges: s.edges ?? [],
  schedule: [{ days: 'all', from: 0, to: 1439, venue: s.venue }],
});

/**
 * The ladder town. market (public) is the social hub: cass (the recruit + carrier), nell (the
 * council-adjacent carrier) and cora (a council member) all live there, so the courier delivers and
 * nell's retell reaches cora on real schedules. The usurper (vane), the spymaster (sly), his asset
 * (ewan), the other councillor (cyril) and the dossier freebies (ida/obs) sit at the plaza, out of the
 * hub's small circle. The guard (gil) keeps his post. Edges seed the propagation the courier depends on.
 */
function ladderTown(): GeneratedTown {
  const npcs: Npc[] = [
    N({ id: 'cass', venue: 'market' }),                                   // the recruit + courier (literalist → faithful carry)
    N({ id: 'nell', venue: 'market', rivals: ['vane'], edges: [
      { to: 'cass', kind: 'friend', trust: 0.5 },  // believes the carrier's delivery (≥ REPEAT → she retells)
      { to: 'cora', kind: 'friend', trust: 0.5 },  // trusts the councillor (so she addresses cora)
    ] }),
    N({ id: 'cora', venue: 'market', rivals: ['vane'], edges: [
      { to: 'nell', kind: 'friend', trust: 0.5 },              // believes nell's retell
      { to: 'vane', kind: 'rival', trust: 0 },                 // knows the usurper (relevance 1) + dislikes him (plausibility ↑)
    ] }),
    N({ id: 'vane', venue: 'plaza', faction: 'crown' }),                  // usurper
    N({ id: 'cyril', venue: 'plaza' }),                                   // the other councillor (never reached — quorum stays unmet)
    N({ id: 'sly', venue: 'plaza', faction: 'crown' }),                  // spymaster (his trust→you is seeded post-enrol)
    N({ id: 'ewan', venue: 'plaza' }),                                    // his civilian asset (the walk-in candidate)
    N({ id: 'gil', venue: 'guard-post-d0', faction: 'crown', occupation: 'guard' }),
    N({ id: 'ida', venue: 'plaza' }), N({ id: 'obs', venue: 'plaza' }),   // dossier freebies (host invitees)
  ];
  return {
    fixture: {
      venues: [
        { id: 'market', district: 'd0', access: 'public' },
        { id: 'back-room-d0', district: 'd0', access: 'invitational' },
        { id: 'guard-post-d0', district: 'd0', access: 'invitational' },
        { id: 'plaza', district: 'd0', access: 'public' },
      ],
      npcs,
    },
    districts: [{ id: 'd0', venueIds: ['market', 'back-room-d0', 'guard-post-d0', 'plaza'], npcIds: npcs.map((n) => n.id) }],
    keystones: ['cora', 'cyril'],
    guards: [{ id: 'gil', vigilance: 0.5 }],
    secrets: [],
    dossier: { informants: ['ida', 'obs'], traitReads: [], edgeReads: [], secretHint: null },
    stationDeal: 'lowlife',
    cast: { usurper: 'vane', council: ['cora', 'cyril'] },
    enemyNet: { spymaster: 'sly', assets: ['ewan'] },
  };
}

/** Full staging — the exact pipeline a generated seed goes through. */
function stageLadder(seed: string): { world: WorldState; town: GeneratedTown } {
  const town = ladderTown();
  const world = worldFromTown(town, seed, RULES);
  attachPlayer(world, town);            // station 'lowlife', dossier assets ida/obs at 0.75, enrols 'you'
  attachScenario(world, town, CORONATION);
  // The spymaster has been drawn into the avatar's confidence (the anti-spymaster ops premise): seed
  // sly→you trust so a single addressed anti-sly tell lands at REPEAT (budget rung, it-4). Post-enrol —
  // 'you' does not exist at fixture-build time.
  world.npcs['sly']!.edges.push({ to: 'you', kind: 'colleague', trust: 0.5 });
  for (const id of ['ida', 'obs']) {
    world.scheduleOverrides[id] = [{
      fromDay: 7, toDay: 8, from: 0, to: 1440,
      venue: 'safehouse', source: 'vignette', sourceRef: `test-host-offer:${id}`,
    }];
  }
  return { world, town };
}

/** The gravest dirt in the game, aimed at the usurper — the coronation-axis story the courier carries. */
const poison = (subject: EntityId): InjectSpec =>
  ({ subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE });

/** An anti-spymaster rumor (a damaging claim about him) — staged into the town via a tell. */
const antiSly = (spymaster: EntityId): InjectSpec =>
  ({ subject: spymaster, predicate: 'stole', object: null, count: null, severity: 4, place: null, attribution: SOMEONE });

/** A council member's strongest damaging-about-usurper credence (0 if none) — the credence "moved" gauge. */
function usurperCredence(world: WorldState, npc: EntityId, usurper: EntityId): number {
  let best = 0;
  for (const b of Object.values(world.beliefs[npc] ?? {})) {
    if (b.claim.subject !== usurper) continue;
    if (RULES.predicates[b.claim.predicate]?.valence !== 'damaging') continue;
    if (b.credence > best) best = b.credence;
  }
  return best;
}

/** A BELIEVE-grade damaging spymaster claim held by his asset (the walk-in flip's real precondition). */
function damagingSpymasterBelief(spymaster: EntityId, credence: number): Belief {
  const claim: Claim = { id: 'c-anti', family: 'f-anti', parent: null, subject: spymaster, predicate: 'stole',
    object: null, count: null, severity: 4, place: null, attribution: SOMEONE };
  return { claim, credence, heardFrom: 'injected', heardAt: 0, firstHeardAt: 0, timesHeard: 2,
    apparentSources: [], discretion: false, counterSpun: false };
}

/** A carrier-profile feature whose SUBJECT is `id` — a real sketch feature a walk-in can reveal. */
function identifyFeature(id: EntityId) {
  return { id: `sf-${id}`, kind: 'carrier-profile' as const, day: 0, family: null, subject: id,
    district: 'd0', detail: `hop-zero candidate: ${id}`, evidence: [{ tick: 0, observer: id, claimId: null }] };
}

const dmg = (subject: string, attribution: string): ReportedClaim =>
  ({ subject, predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution });

// The campaign script — one seeded action log. Day 0: enter the hub, recruit the carrier (money), set
// a drop, courier the poison to nell via the drop. Day 7 (after the day-6 stipend clears): host the
// back-room evening. runLogOn crosses the day-6 rest-day nightly (stipend + wages) in between.
const CAMPAIGN: Action[] = [
  { tick: 0, kind: 'goTo', venue: 'market' },
  { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null },
  { tick: 0, kind: 'setDrop', id: 'd1', venue: 'market' },
  { tick: 0, kind: 'courier', asset: 'cass', spec: poison('vane'), target: 'nell', viaDrop: 'd1' },
  { tick: at(7, 8) - 1, kind: 'goTo', venue: 'safehouse' },
  { tick: at(7, 8), kind: 'host', venue: 'back-room-d0', invitees: ['ida', 'obs'] },
];

describe('full-ladder e2e — the ladder climbs, the books balance', () => {
  it('every rung fires by mechanism; the compartment is complete; the coin books balance to the exact integer', () => {
    const { world } = stageLadder('ladder-books');
    runLogOn(world, RULES, CAMPAIGN, at(8, 20, 1)); // through the physically attended event

    // ── Rung 1 (recruit, money): cass is on the roster, recruited-by:player, coin debited. ──────────
    const cass = assetFor(world, 'player', 'cass');
    expect(cass, 'cass recruited').toBeTruthy();
    expect(cass!.mice).toBe('money');

    // ── Rung 2 (set drop): d1 lives at the public market, avatar-known. ─────────────────────────────
    expect(world.network.drops.find((d) => d.id === 'd1')?.venue).toBe('market');

    // ── Rung 3 (courier): the payload was DELIVERED to nell — she now holds the coronation-axis family
    //    (the carried-story fact names it; her belief store carries it). Delivery = real schedule work.
    const carried = compartmentOf(world, 'player', 'cass').find((f) => f.kind === 'carried-story');
    expect(carried, 'the courier delivered (carried-story recorded)').toBeTruthy();
    const family = carried!.ref;
    expect(world.beliefs['nell']![family], 'nell received the couriered story').toBeTruthy();
    expect(world.beliefs['nell']![family]!.claim.subject).toBe('vane'); // it IS the poison aimed at the usurper

    // ── Compartment records COMPLETE: recruited-by:player, knows-drop:d1 (the drop leg), carried-story
    //    (the delivery). Exactly the chain interrogation would read — no more, no less. ──────────────
    const facts = compartmentOf(world, 'player', 'cass').map((f) => `${f.kind}:${f.ref}`).sort();
    expect(facts).toEqual([`carried-story:${family}`, 'knows-drop:d1', 'recruited-by:player'].sort());

    // ── Rung 4 (host): the back-room evening seated its invitees for the next evening + an
    //    attended-hosting fact on each — a guest list that is evidence when compartments crack. ──────
    for (const id of ['ida', 'obs']) {
      expect(world.scheduleOverrides[id]!.some((o) => o.venue === 'back-room-d0' && o.source === 'player')).toBe(true);
      expect(compartmentOf(world, 'player', id)).toContainEqual({ tick: at(8, 20), kind: 'attended-hosting', ref: 'back-room-d0' });
    }

    // ── The coin books balance to the EXACT expected integer, DERIVED through the full flow (O4). If
    //    this integer is wrong, the DERIVATION is the hypothesis — STOP and report, never re-fit it. ─
    // start 20 − recruit 10 − drop 5 − courier 3  (+ one weekly stipend 12 − wages for the 3 assets
    // {cass, ida, obs} at 2 each = 6, on the day-6 rest-day nightly)  − back-room event 4.
    const ASSETS_AT_WAGE_NIGHT = 3; // cass + the two dossier freebies (ida, obs)
    const expected = ECON.startingCoin
      - ECON.recruitCost.money - ECON.deadDropSetup - ECON.courierRun
      + ECON.weeklyStipend - ASSETS_AT_WAGE_NIGHT * ECON.wagePerInformantPerWeek
      - ECON.backRoomEvent;
    if (world.coin !== expected) {
      console.log(`[LADDER-BOOKS STOP] coin=${world.coin} expected=${expected} — the hand-derivation is the hypothesis; investigate the flow, do not re-fit.`);
    }
    expect(world.coin).toBe(expected); // = 20 − 10 − 5 − 3 + 12 − 6 − 4 = 4
    expect(expected).toBe(4);          // the concrete integer, pinned
  });

  it('the coronation-axis courier MOVES council credence — nell carries it to cora by propagation', () => {
    const { world } = stageLadder('ladder-council');
    runLogOn(world, RULES, CAMPAIGN, at(8, 0));

    // HYPOTHESIS (escalation license): the couriered poison, retold by nell, should lift cora's
    // damaging-about-usurper credence off zero. A 0 here is a FINDING (the propagation vehicle broke),
    // not a threshold to weaken — STOP and report with the trajectory.
    const cora = usurperCredence(world, 'cora', 'vane');
    if (cora <= 0) {
      console.log(`[LADDER-COUNCIL STOP] cora credence did not move (=${cora}). nell holds: ${JSON.stringify(Object.keys(world.beliefs['nell'] ?? {}))}`);
    }
    expect(cora).toBeGreaterThan(0); // the council credence MOVED — the courier climbed the axis

    // NON-VACUOUS: cyril (isolated at the plaza, never reached) did NOT move — the lift is the courier's.
    expect(usurperCredence(world, 'cyril', 'vane')).toBe(0);
    // …and it did not FALSELY win: only one councillor moved, quorum is 2, the campaign is still running.
    expect(councilTurns(world, RULES).length).toBeLessThan(CORONATION.win.quorum);
    expect(world.scenario!.status).toBe('running');
  });

  it('a walk-in comes in after the anti-spymaster rumor — his asset ewan flips, then volunteers a real tip', () => {
    const { world } = stageLadder('ladder-walkin');
    const spymaster = world.network.spymaster!; // sly
    expect(assetFor(world, 'enemy', 'ewan')!.turned).toBeFalsy(); // his loyal asset, before the rumor lands

    // The anti-spymaster rumor campaign lands on ewan (STAGED to BELIEVE — the flip's real precondition;
    // organic propagation to BELIEVE is out of a bounded campaign's reach; disclosed in the report).
    world.beliefs['ewan']![damagingSpymasterBelief(spymaster, STANCE.BELIEVE).claim.family] =
      damagingSpymasterBelief(spymaster, STANCE.BELIEVE);

    // The nightly turncoat pass: ewan believes damaging-sly at BELIEVE → he volunteers as a walk-in.
    world.tick = at(1, 8);
    runTurncoatPass(world, RULES);
    expect(assetFor(world, 'enemy', 'ewan')!.turned).toBe(true); // the walk-in flipped, by mechanism

    // On the next rest-day he volunteers a REAL tip — a subject-bearing sketch feature arrives as a hint
    // in the PLAYER's own intel (the amendment-#4 infiltration channel), never a fabricated one.
    world.enemy.sketch.push(identifyFeature('cass'));
    const logBefore = world.intel.log.length;
    world.tick = at(6, 23, 59); // a rest-day nightly (the weekly emission cadence)
    runTurncoatPass(world, RULES);
    expect(world.intel.log).toHaveLength(logBefore); // queued truth is not yet player knowledge
    const message = world.network.directiveState!.messages.at(-1)!;
    const speech = realizeNetworkForward(world, message.id, {
      venue: 'safehouse', members: ['ewan', world.playerId!],
    }, message.availableAfter, RULES)!;
    captureIntel(world, {
      tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
    }, RULES);
    const hint = world.intel.log.slice(logBefore).find((e) => e.kind === 'hint' && e.via === 'ewan');
    expect(hint, 'the walk-in volunteered a tip').toBeTruthy();
    expect(hint!.hintAbout).toBe('cass');
    expect(world.enemy.sketch.some((f) => f.subject === hint!.hintAbout)).toBe(true); // it is a REAL feature
  });

  it('his budget loses a night — an anti-spymaster rumor that reaches sly costs him a countermeasure', () => {
    // The staging vehicle is REAL: a single addressed anti-sly tell (he trusts the avatar) lands the
    // scandal at REPEAT, un-counter-spun (timesHeard 1 → investigate only) — proof the tell CAN stage it.
    const viaTell = stageLadder('ladder-budget-tell').world;
    viaTell.scheduleOverrides['sly'] = [{ fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'safehouse', source: 'enemy' }];
    viaTell.playerVenue = 'safehouse';
    viaTell.tick = at(0, 8);
    applyTell(viaTell, 'sly', antiSly('sly'), at(0, 8));
    step(viaTell, RULES); // consume the pendingTell → sly ingests the anti-spymaster rumor
    const held = Object.values(viaTell.beliefs['sly']!).find((b) => b.claim.subject === 'sly');
    expect(held, 'sly heard the rumor via the tell').toBeTruthy();
    expect(held!.credence).toBeGreaterThanOrEqual(STANCE.REPEAT); // reached REPEAT via one addressed tell
    expect(held!.counterSpun).toBe(false);                        // not counter-spun (he only investigates)

    // The twin-diff (a clean no-omniscience boundary): two identical worlds with staged coverage that
    // orders exactly one interrogation; in ONE, sly holds the scandal (seated directly so the evidence
    // logs are byte-identical). The digest can't see his mind; the world-side budget seam can.
    const stageBudget = (seed: string, scandal: boolean): WorldState => {
      const { world } = stageLadder(seed);
      const gilEv = (over: Partial<Extract<EvidenceEntry, { kind: 'utterance' }>>): EvidenceEntry => ({
        tick: 480, venue: 'market', observer: 'gil', overheard: true, speaker: 'cass', addressedTo: 'nell',
        kind: 'utterance', mode: 'telling', claimId: 'e1', family: 'fX', reported: dmg('vane', SOMEONE), about: null, ...over,
      });
      world.enemy.evidence.push(gilEv({}), gilEv({ tick: 905, claimId: 'e2', mode: 'answer', overheard: false, addressedTo: 'gil', reported: dmg('vane', 'nell') }));
      if (scandal) world.beliefs['sly'] = { 'f-anti': damagingSpymasterBelief('sly', 0.6) };
      world.tick = at(1, 23, 59); // the nightly runEnemyDay reads
      return world;
    };
    const control = stageBudget('ladder-budget-ctrl', false);
    const scandal = stageBudget('ladder-budget-scandal', true);

    // BOUNDARY: the scandal lives in HIS beliefs, never the evidence — the raw digest is bit-identical.
    expect(stableStringify(enemyDigest(scandal.enemy, dayOf(scandal.tick), RULES)))
      .toBe(stableStringify(enemyDigest(control.enemy, dayOf(control.tick), RULES)));

    runEnemyDay(control, RULES);
    runEnemyDay(scandal, RULES);
    // Control interrogates; the scandalized spymaster spends the night on his own scandal — one dropped.
    expect(control.enemy.decisions.at(-1)!.interrogations.length).toBeGreaterThan(0);
    expect(scandal.enemy.decisions.at(-1)!.interrogations).toHaveLength(0);
  });
});
