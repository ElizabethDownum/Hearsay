/**
 * The speech-only law at the recruitment seam (Task 11 fix wave 1).
 *
 * Three boundaries live here:
 *  - C-1  the candidate answers the handle that was SAID, never the recruiter's private row;
 *  - I-2  handler receipt is principal-asymmetric — player enrollment stays a direct avatar moment;
 *  - I-3  the adjudicated late-delivery timeline: a physically delivered handler report turns an
 *         existing player record at that receipt, and a report that never arrives never does.
 */
import { describe, expect, it } from 'vitest';
import { TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyRecruit } from '../../src/sim/actions';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { runUntil } from '../../src/sim/step';
import { stableStringify } from '../../src/sim/hash';
import { assetFor } from '../../src/sim/network/roster';
import { queueNetworkMessage } from '../../src/sim/directives/transport';
import { openRecruitmentApproach } from '../../src/sim/network/recruitment';
import type { Principal } from '../../src/sim/network/types';
import type { EntityId } from '../../src/sim/rumors/claim';
import type { ScheduleOverride, WorldState } from '../../src/sim/types';
import { makePlayerAsset, pin, recruitWorld, trust } from './helpers/recruit-town';

const RULES = STANDARD_RULES;

const RECRUIT_CASS: Action[] = [
  { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null },
];

const HIDDEN_FIELDS = [
  'protectedRole', 'enemyLinked', 'enemyLinkedAtDecision', 'turned', 'status', 'decided', 'initial',
];

/** Prepend a day-0 window override so a pinned person steps out for exactly that block. */
function excursion(world: WorldState, id: EntityId, venue: string, from: number, to: number): void {
  const row: ScheduleOverride = {
    fromDay: 0, toDay: 1, from, to, venue, source: 'player', sourceRef: `test:excursion:${id}`,
  };
  world.scheduleOverrides[id] = [row, ...(world.scheduleOverrides[id] ?? [])];
}

/** Apply the verb straight onto the world (its own tick's step then delivers what it queued). */
function applyRecruitAt(world: WorldState, target: EntityId, tick: number): void {
  world.tick = tick;
  applyRecruit(world, target, 'money', null, tick, RULES);
}

// ─────────────────────────────────────────────────────────────────────────────
// C-1 — the offer is spoken content.

describe('the offered handle is SPOKEN content, not a row the candidate reads', () => {
  it('the approach speech carries the handle, and a witness capture carries nothing hidden', () => {
    const world = recruitWorld('handle-said');
    pin(world, 'square', 'you', 'cass', 'nell');
    trust(world, 'cass', 'you', 0.8);
    runLogOn(world, RULES, RECRUIT_CASS, 1);

    const entry = (world.intel.network ?? []).find((row) => row.spoken.kind === 'recruitment-approach');
    expect(entry, 'the approach speech was captured').toBeDefined();
    expect(entry!.spoken).toEqual({
      kind: 'recruitment-approach', approachId: 'a0', recruiter: 'you', target: 'cass',
      mice: 'money', leverageFamily: null, onwardTo: null,
    });
    const serialized = stableStringify(entry!);
    for (const banned of HIDDEN_FIELDS) expect(serialized, banned).not.toContain(banned);
  });

  it('the candidate answers the handle that was SAID, even when the recruiter row is doctored', () => {
    const world = recruitWorld('said-not-stored');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.6);            // bucket 1; money's +1 lands the accept band at 2
    applyRecruitAt(world, 'cass', 0);
    // The recruiter's private row is doctored between the words leaving and their arrival. The row
    // belongs to the recruiter's principal — the candidate never reads it.
    world.network.directiveState!.recruitmentApproaches[0]!.mice = 'ideology';
    runUntil(world, 1, RULES);

    expect(world.network.directiveState!.recruitmentApproaches[0]!.initial).toBe('accept');
    expect(assetFor(world, 'player', 'cass'), 'the spoken money offer was accepted').not.toBeNull();
  });

  it('the LATER answer also re-reads the words received, not the doctored row', () => {
    const world = recruitWorld('later-said-not-stored');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.3);            // bucket 0; money's +1 lands the hesitate band at 1
    runLogOn(world, RULES, RECRUIT_CASS, 1);
    expect(world.network.directiveState!.recruitmentApproaches[0]!.initial).toBe('hesitate');

    world.network.directiveState!.recruitmentApproaches[0]!.mice = 'coercion';  // fit −2 if ever read
    runUntil(world, TICKS_PER_DAY + 16, RULES);
    // later stage: relationship 0 + money 1 = 1 ≥ 0 → accept. Coercion would have scored −2 → refuse.
    expect(world.network.directiveState!.recruitmentApproaches[0]!.decided).toBe('accept');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I-2 — handler receipt is principal-asymmetric.

/**
 * A reported approach in flight to `audience`'s own actor: the approach itself belongs to the OTHER
 * principal, and the candidate's profile carried word of it to their handler.
 */
function stageReportedApproach(seed: string, audience: Principal): WorldState {
  const world = recruitWorld(seed);
  const principal: Principal = audience === 'enemy' ? 'player' : 'enemy';
  const recruiter = audience === 'enemy' ? 'you' : 'sly';
  const handler = audience === 'enemy' ? 'sly' : 'you';
  pin(world, 'square', handler, 'cass');
  if (audience === 'enemy') pin(world, 'annex', 'you');
  const approach = openRecruitmentApproach(world, {
    principal, recruiter, target: 'cass', mice: 'money', leverageFamily: null,
    sourceDirectiveId: null, tick: 0,
  });
  queueNetworkMessage(world, audience, 'cass', [handler], {
    kind: 'recruitment-approach', approachId: approach.id, recruiter, target: 'cass',
    mice: 'money', leverageFamily: null,
  }, 0, null, null);
  return world;
}

describe('handler receipt is principal-asymmetric — player enrollment stays a direct avatar moment', () => {
  it('ENEMY-audience receipt ensures the enemy record and turns an existing player record', () => {
    const world = stageReportedApproach('handler-enemy', 'enemy');
    makePlayerAsset(world, 'cass');
    runUntil(world, 1, RULES);

    const enemyRecord = assetFor(world, 'enemy', 'cass');
    expect(enemyRecord, 'the enemy handler gains the ordinary record').not.toBeNull();
    expect(enemyRecord!.facts, 'never a fabricated meeting').toEqual([]);
    expect(enemyRecord!.mice).toBeNull();
    expect(assetFor(world, 'player', 'cass')!.turned).toBe(true);
  });

  it('PLAYER-audience receipt is INTEL ONLY: it creates nothing and turns nothing', () => {
    const world = stageReportedApproach('handler-player', 'player');
    world.network.enemyAssets.push({
      id: 'cass', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
    });
    const informants0 = world.intel.informants.map((row) => row.id);
    runUntil(world, 1, RULES);

    expect(assetFor(world, 'player', 'cass'), 'no player AssetRecord is created').toBeNull();
    expect(world.intel.informants.map((row) => row.id)).toEqual(informants0);
    expect(assetFor(world, 'enemy', 'cass')!.turned, 'nothing is turned').toBeUndefined();
    // …and the report still lands as ordinary, lawful intel.
    const heard = (world.intel.network ?? []).filter((row) => row.spoken.kind === 'recruitment-approach');
    expect(heard, 'the delivered report is lawful intel').toHaveLength(1);
    expect(heard[0]!.spoken).toMatchObject({ recruiter: 'sly', target: 'cass', mice: 'money' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I-3 — the adjudicated timeline (controller ruling: the later handler-receipt clause wins).

/**
 * cass accepts the avatar immediately (0.8 → +2, money → +1) AND is warmer to the enemy handler
 * than to the recruiter, so her initial profile elects to report the approach. `handlerContact`
 * decides only whether that physical report ever reaches sly.
 */
function stageLateReport(seed: string, handlerContact: boolean): WorldState {
  const world = recruitWorld(seed);
  pin(world, 'square', 'you', 'cass');
  pin(world, 'annex', 'sly');
  trust(world, 'cass', 'you', 0.8);
  trust(world, 'cass', 'sly', 0.9);
  if (handlerContact) excursion(world, 'cass', 'annex', 60, 120);
  return world;
}

describe('late handler delivery turns an immediate acceptance — at the receipt, and only then', () => {
  it('accept now, report travels, handler receipt AFTER acceptance flips the existing record', () => {
    const world = stageLateReport('late-turn', true);
    runLogOn(world, RULES, RECRUIT_CASS, 1);

    const record = assetFor(world, 'player', 'cass');
    expect(record, 'she enrolled at acceptance').not.toBeNull();
    expect(record!.mice).toBe('money');
    expect(record!.turned, 'unturned AT acceptance').toBeUndefined();
    expect(assetFor(world, 'enemy', 'cass')).toBeNull();

    runUntil(world, 60, RULES);                       // still apart — she leaves for the annex AT 60
    expect(assetFor(world, 'player', 'cass')!.turned, 'nothing changes in transit').toBeUndefined();
    expect(assetFor(world, 'enemy', 'cass')).toBeNull();

    runUntil(world, 76, RULES);                       // the handler meeting beat has now passed
    expect(assetFor(world, 'player', 'cass')!.turned).toBe(true);
    expect(assetFor(world, 'enemy', 'cass')!.facts).toEqual([]);
  });

  it('control: a report that never physically arrives never turns anybody', () => {
    const world = stageLateReport('late-never', false);
    runLogOn(world, RULES, RECRUIT_CASS, 1);
    runUntil(world, TICKS_PER_DAY + 1, RULES);

    expect(assetFor(world, 'player', 'cass')!.mice).toBe('money');
    expect(assetFor(world, 'player', 'cass')!.turned).toBeUndefined();
    expect(assetFor(world, 'enemy', 'cass')).toBeNull();
  });
});
