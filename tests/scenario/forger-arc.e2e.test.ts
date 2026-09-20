import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { type Action, runLogOn } from '../../src/sim/campaign';
import { ARTIFACT_CREDENCE, artifactById } from '../../src/sim/artifacts';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { councilTurns, attachScenario } from '../../src/sim/scenario/referee';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import { runUntil, step } from '../../src/sim/step';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import type { EnemyDecision } from '../../src/sim/enemy/state';
import type { Belief, NetworkSpeechRecord, WorldState } from '../../src/sim/types';
import type { GeneratedTown } from '../../src/world/types';
import { miniTown } from '../sim/helpers/minitown';

/**
 * PLAN 9 TASK 8 — the forger arc, end to end: paper beats mouths.
 *
 * Archived arc (docs/plans/archive/2026-07-05-plan-9.md:167-174) with acceptance amendment R11
 * (docs/review/current.md): forge a coronation-axis page, put it into a council-adjacent carrier's
 * hands, let ordinary conviction circulate it, take TWO DISTINCT council turns at the existing
 * evidence value, and let the referee — not the test — latch the win. The mirror proves the same
 * page is a liability: a real interrogation of that carrier yields a `forged-document` feature and
 * raises exposure.
 *
 * R11 bans only a PLAYER `tell` in guard earshot; NPC retellings and paper shows are ordinary
 * physics. This route queues no `tell` at all (asserted below).
 *
 * ── DECLARED INPUTS (option 2 of task-8-route-preparation-addendum-2026-09-13.md) ──────────────
 * Both routes start from the existing `miniTown()` fixture — a DETERMINISTIC NON-OUTCOME starting
 * context (cast, occupations, traits, schedules, trust edges, venues, starting coin). Nothing in
 * either starting world encodes the asserted result: `primaryInitial()` is asserted to hold no
 * artifact, no artifact chronicle row, no council turn and a `running` scenario before the log
 * runs. Every belief, viewing, re-show, council turn, institution row, enemy feature and terminal
 * status below is produced by the shipped mechanics from the logged player actions.
 *
 * The only fixture edits are stated initial conditions, never results:
 *   · primary — the usurper is scheduled at home so the avatar, the carrier and the two council
 *     members form one real four-person circle in the square;
 *   · mirror — the usurper is removed and the remaining NPCs are given neutral interpretation with
 *     no incidental rumor route (edges/traits/rivals cleared, copied from the existing forensics
 *     fixtures), one NPC is a real guard, and the carrier keeps a backroom window so the
 *     interrogation the enemy orders can physically happen.
 *
 * Measured first as probe `task8-forger-route-probe-attempt-001.test.ts` at 78ff1c2 (runner 006);
 * re-measured here at 9d6cd86.
 */

const PRIMARY_SEED = 'task8-forger-fixed-primary-001';
const MIRROR_SEED = 'task8-forger-fixed-mirror-001';
const CARRIER = 'ada';
const CIRCULATED_COUNCIL = 'bez';
const DIRECT_COUNCIL = 'cyn';
const USURPER = 'dov';

const poison = (subject: EntityId) => ({
  subject,
  predicate: 'poisoned',
  object: SOMEONE,
  count: null,
  severity: 5 as const,
  place: null,
  attribution: SOMEONE,
});

function primaryInitial(): WorldState {
  const fixture = miniTown();
  // Declared non-outcome setup: keep the existing fixture graph/traits, but place the usurper at
  // home so the avatar, carrier and two council members form one real four-person square circle.
  fixture.npcs.find((npc) => npc.id === USURPER)!.schedule = [
    { days: 'all', from: 0, to: 1439, venue: 'home-0' },
  ];
  const town: GeneratedTown = {
    fixture,
    districts: [{ id: 'd0', venueIds: fixture.venues.map((venue) => venue.id),
      npcIds: fixture.npcs.map((npc) => npc.id) }],
    keystones: [CIRCULATED_COUNCIL, DIRECT_COUNCIL],
    guards: [],
    secrets: [],
    dossier: null,
    cast: { usurper: USURPER, council: [CIRCULATED_COUNCIL, DIRECT_COUNCIL] },
  };
  const world = buildWorld(fixture, PRIMARY_SEED, RULES);
  enrollPlayer(world, { home: 'square' });
  attachScenario(world, town, CORONATION);
  return world;
}

const primarySpec = poison(USURPER);
const primaryLog: Action[] = [
  { tick: 0, kind: 'forge', spec: primarySpec },
  // This lawful direct paper action supplies one council turn while the avatar still holds a0.
  { tick: at(1, 8), kind: 'show', artifact: 'a0', to: DIRECT_COUNCIL },
  // The council-adjacent carrier receives and reads the same page at the next offered beat.
  { tick: at(1, 8, 15), kind: 'plant', artifact: 'a0', venue: null, to: CARRIER },
];

/** The CONTROL: the same forgery, shown twice by the avatar and never handed to anyone. */
const directOnlyControlLog: Action[] = [
  { tick: 0, kind: 'forge', spec: primarySpec },
  { tick: at(1, 8), kind: 'show', artifact: 'a0', to: DIRECT_COUNCIL },
  { tick: at(1, 8, 15), kind: 'show', artifact: 'a0', to: CIRCULATED_COUNCIL },
];

function artifactActs(world: WorldState) {
  return world.chronicle.filter((row) => row.kind === 'artifact');
}

function artifactBelief(world: WorldState, viewer: EntityId, act: 'show' | 'plant' | 'reshow'): Belief {
  const row = artifactActs(world).find((candidate) => candidate.act === act && candidate.to === viewer);
  if (!row || row.claimId === undefined) throw new Error(`missing ${act} viewing for ${viewer}`);
  const claim = world.claims[row.claimId];
  if (!claim) throw new Error(`missing claim ${row.claimId}`);
  const belief = world.beliefs[viewer]?.[claim.family];
  if (!belief) throw new Error(`missing ${viewer} belief for ${claim.family}`);
  return belief;
}

/** The arc predicate the control is built to fail: real carrier possession AND a sim re-show. */
function hasFullCarrierArc(world: WorldState): boolean {
  const acts = artifactActs(world);
  return acts.some((row) => row.act === 'plant' && row.to === CARRIER)
    && acts.some((row) => row.act === 'reshow' && row.by === CARRIER
      && row.to === CIRCULATED_COUNCIL);
}

function mirrorInitial(): WorldState {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id !== USURPER);
  for (const npc of fixture.npcs) {
    // Declared branch inputs copied from the existing forensics fixture: neutral interpretation,
    // no incidental rumor route, a real guard role, and carrier presence in the interrogation window.
    npc.edges = [];
    npc.traits = [];
    npc.rivals = [];
  }
  fixture.npcs.find((npc) => npc.id === CIRCULATED_COUNCIL)!.occupation = 'guard';
  fixture.npcs.find((npc) => npc.id === CARRIER)!.schedule.unshift({
    days: 'all', from: 900, to: 1020, venue: 'backroom',
  });

  const world = buildWorld(fixture, MIRROR_SEED, RULES);
  world.enemy.map = buildTownMap(fixture);
  world.enemy.observers = [{ id: CIRCULATED_COUNCIL, vigilance: 1 }];
  world.network.spymaster = DIRECT_COUNCIL;
  enrollPlayer(world, { home: 'square' });
  return world;
}

const mirrorLog: Action[] = [
  { tick: 0, kind: 'forge', spec: poison(USURPER) },
  { tick: at(1, 8), kind: 'plant', artifact: 'a0', venue: null, to: CARRIER },
];

function executeMirror() {
  const world = runLogOn(mirrorInitial(), RULES, mirrorLog, at(1, 8) + 1);
  const plant = artifactActs(world).find((row) => row.act === 'plant' && row.to === CARRIER);
  if (!plant || plant.claimId === undefined) throw new Error('mirror: carrier did not receive a0');
  const family = world.claims[plant.claimId]!.family;
  const beforeExposure = exposureStatus(world);
  const order: EnemyDecision = {
    day: 1,
    features: [],
    inquiries: [],
    watches: [],
    interrogations: [{
      target: CARRIER,
      guard: CIRCULATED_COUNCIL,
      day: 1,
      about: { family },
      venue: 'backroom',
    }],
  };

  // The order is a declared branch precondition, not an inserted result. The directive must still
  // travel, be accepted, install the guard schedule, produce a real asking/answer, return a spoken
  // field report, and reach the nightly digest before a forged-document feature can exist.
  applyEnemyDecision(world, cloneSerializable(order));
  const record = world.network.directiveState!.records.at(-1)!;
  while (record.received === null && world.tick < at(1, 9)) step(world, RULES);
  if (record.received === null) throw new Error('mirror: embodied interrogation order never arrived');
  runUntil(world, at(2, 0), RULES);

  const asking = world.chronicle.find((row) => row.kind === 'asking'
    && row.speaker === CIRCULATED_COUNCIL && row.addressedTo === CARRIER && row.authority);
  const answer = world.enemy.evidence.find((row) => row.kind === 'utterance'
    && row.mode === 'answer' && row.speaker === CARRIER && row.document === true);
  const report = world.chronicle.find((row): row is NetworkSpeechRecord => row.kind === 'network-speech'
    && row.spoken.kind === 'field-report'
    && row.spoken.items.some((item) => item.observation.kind === 'utterance'
      && item.observation.claimId === answer?.claimId));
  const feature = world.enemy.sketch.find((row) => row.kind === 'forged-document'
    && row.subject === world.playerId);
  const afterExposure = exposureStatus(world);
  const withoutFeature = cloneSerializable(world);
  withoutFeature.enemy.sketch = withoutFeature.enemy.sketch.filter((row) => row.id !== feature?.id);
  const counterfactualExposure = exposureStatus(withoutFeature);

  return {
    world, family, order, record, asking, answer, report, feature,
    beforeExposure, afterExposure, counterfactualExposure,
  };
}

describe('PLAN 9 TASK 8 — forger arc: paper beats mouths', () => {
  it('control: a direct double-show can win quorum but never exercises the carrier/circulation arc', () => {
    const control = runLogOn(primaryInitial(), RULES, directOnlyControlLog, at(2, 0));
    expect(control.scenario!.status).toBe('won');
    expect(councilTurns(control, RULES).map((turn) => turn.npc).sort())
      .toEqual([CIRCULATED_COUNCIL, DIRECT_COUNCIL].sort());
    // The control flips exactly the arc predicate the primary asserts: same forgery, same two
    // council members, same win — and no hand-over, no holder, no sim re-show.
    expect(hasFullCarrierArc(control)).toBe(false);
    expect(artifactById(control, 'a0')!.heldBy).toBe('you');
    expect(artifactActs(control).some((row) => row.act === 'reshow')).toBe(false);
    console.log('TASK8_FORGER_DIRECT_ONLY_CONTROL=' + JSON.stringify({
      seed: PRIMARY_SEED,
      log: directOnlyControlLog,
      status: control.scenario!.status,
      turns: councilTurns(control, RULES),
      acts: artifactActs(control),
      fullCarrierArc: hasFullCarrierArc(control),
    }));
  });

  it('forge -> direct council view -> carrier hand-over -> conviction re-show -> two turns -> real win', () => {
    const initial = primaryInitial();
    // Non-outcome starting context: nothing below is pre-written into the fixture.
    expect(initial.scenario).toMatchObject({ status: 'running', resolution: null });
    expect(initial.artifacts).toBeUndefined();
    expect(initial.chronicle.filter((row) => row.kind === 'artifact')).toEqual([]);
    expect(initial.chronicle.filter((row) => row.kind === 'institution')).toEqual([]);
    expect(councilTurns(initial, RULES)).toEqual([]);

    const initialHash = hashWorld(initial);
    const live = runLogOn(cloneSerializable(initial), RULES, primaryLog, at(2, 0));
    const replay = runLogOn(cloneSerializable(initial), RULES, primaryLog, at(2, 0));
    const acts = artifactActs(live);
    const turns = councilTurns(live, RULES);

    // R11: no player tell anywhere on this route, so the guard-earshot ban cannot be reached.
    expect(primaryLog.filter((action) => action.kind === 'tell')).toEqual([]);
    expect(live.chronicle.filter((row) => row.kind === 'telling' && row.speaker === live.playerId)).toEqual([]);

    // The arc, in the order the mechanics produced it. The final row has no logged action behind
    // it: `reshow` is the carrier acting on her own conviction.
    expect(acts.map((row) => ({ act: row.act, by: row.by, to: row.to }))).toEqual([
      { act: 'forge', by: 'you', to: null },
      { act: 'show', by: 'you', to: DIRECT_COUNCIL },
      { act: 'plant', by: 'you', to: CARRIER },
      { act: 'reshow', by: CARRIER, to: CIRCULATED_COUNCIL },
    ]);
    expect(artifactById(live, 'a0')!.heldBy).toBe(CARRIER);
    expect(hasFullCarrierArc(live)).toBe(true);

    // Paper anchors every viewer at the existing evidence value — not a raised one.
    expect(artifactBelief(live, CARRIER, 'plant').credence).toBe(ARTIFACT_CREDENCE);
    expect(artifactBelief(live, DIRECT_COUNCIL, 'show').credence).toBe(ARTIFACT_CREDENCE);
    expect(artifactBelief(live, CIRCULATED_COUNCIL, 'reshow').credence).toBe(ARTIFACT_CREDENCE);

    // R11 quorum: two DISTINCT council members, each at or above the existing anchor.
    expect(turns.map((turn) => turn.npc)).toEqual([CIRCULATED_COUNCIL, DIRECT_COUNCIL]);
    expect(new Set(turns.map((turn) => turn.npc)).size).toBe(2);
    expect(turns).toHaveLength(CORONATION.win.quorum);
    expect(turns.every((turn) => turn.credence >= ARTIFACT_CREDENCE)).toBe(true);

    // The referee latched this, not the test.
    expect(live.scenario!.status).toBe('won');
    expect(live.scenario!.resolution).toMatchObject({ kind: 'won', turned: turns });
    expect(live.chronicle.filter((row) => row.kind === 'institution')).toMatchObject([{
      action: 'denounce', subject: USURPER,
      actors: [CIRCULATED_COUNCIL, DIRECT_COUNCIL],
    }]);

    // Replay identity: the same declared initial world plus the same log regrows the same world.
    expect(hashWorld(replay)).toBe(hashWorld(live));

    console.log('TASK8_FORGER_PRIMARY=' + JSON.stringify({
      candidate: 'fixed deterministic non-outcome setup 1/1',
      seed: PRIMARY_SEED,
      declaredInputs: {
        cast: { usurper: USURPER, council: [CIRCULATED_COUNCIL, DIRECT_COUNCIL] },
        carrier: CARRIER,
        carrierEdges: initial.npcs[CARRIER]!.edges,
        schedules: Object.fromEntries(Object.values(initial.npcs)
          .filter((npc) => npc.id !== 'you').map((npc) => [npc.id, npc.schedule])),
        venues: Object.values(initial.venues),
        startingCoin: RULES.economy.startingCoin,
      },
      initialHash,
      log: primaryLog,
      finalTick: live.tick,
      acts,
      turns,
      resolution: live.scenario!.resolution,
      institutions: live.chronicle.filter((row) => row.kind === 'institution'),
      finalHash: hashWorld(live),
      replayHash: hashWorld(replay),
    }));
  });

  it('mirror: embodied carrier interrogation -> spoken evidence -> forged-document -> exposure +1', () => {
    const measured = executeMirror();
    expect(measured.asking).toMatchObject({
      kind: 'asking', venue: 'backroom', speaker: CIRCULATED_COUNCIL,
      addressedTo: CARRIER, authority: true, about: { family: measured.family },
    });
    expect(measured.answer).toMatchObject({
      kind: 'utterance', mode: 'answer', venue: 'backroom', observer: CIRCULATED_COUNCIL,
      speaker: CARRIER, family: measured.family, document: true,
    });
    expect(measured.report).toMatchObject({
      kind: 'network-speech', spoken: { kind: 'field-report' },
    });
    expect(measured.feature).toMatchObject({
      kind: 'forged-document', subject: 'you', evidence: [{
        tick: measured.report!.tick,
        messageId: measured.report!.messageId,
      }],
    });
    // Causal, not correlational: the same world minus that one feature scores exactly one lower.
    expect(measured.afterExposure.score).toBe(measured.counterfactualExposure.score + 1);
    expect(measured.afterExposure.identified).toBe(false);
    expect(measured.beforeExposure.score).toBe(0);
    expect(measured.world.enemy.actionLedger).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'interrogation', subject: CARRIER }),
    ]));

    const replay = executeMirror();
    expect(hashWorld(replay.world)).toBe(hashWorld(measured.world));
    console.log('TASK8_FORGER_MIRROR=' + JSON.stringify({
      candidate: 'fixed narrow interrogation branch 1/1',
      seed: MIRROR_SEED,
      declaredInputs: {
        carrier: CARRIER,
        guard: CIRCULATED_COUNCIL,
        spymaster: DIRECT_COUNCIL,
        carrierSchedule: mirrorInitial().npcs[CARRIER]!.schedule,
        mirrorActionLog: mirrorLog,
        interrogationOrder: measured.order,
      },
      directive: measured.record,
      asking: measured.asking,
      answer: measured.answer,
      receivedReport: measured.report,
      forgedDocument: measured.feature,
      exposureBeforeOrder: measured.beforeExposure,
      exposureWithoutForgedDocument: measured.counterfactualExposure,
      exposureAfter: measured.afterExposure,
      finalHash: hashWorld(measured.world),
      replayHash: hashWorld(replay.world),
    }));
  });
});
