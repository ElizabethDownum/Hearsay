import { describe, expect, it } from 'vitest';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyInject, applyRecruit } from '../../src/sim/actions';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { runUntil } from '../../src/sim/step';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { networkView } from '../../src/sim/fieldwork';
import { assetFor } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import { recruitmentHistoryView } from '../../src/sim/network/recruitment';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import type { NetworkMessage } from '../../src/sim/directives/types';
import type { ScheduleOverride, WorldState } from '../../src/sim/types';
import { pin, recruitWorld, trust } from './helpers/recruit-town';

const RULES = STANDARD_RULES;
const VISIBLE_ROW_KEYS = ['recruiter', 'response', 'stage', 'target', 'tick', 'venue', 'via'];
const FORBIDDEN_IN_VIEWS = [
  'protectedRole', 'enemyLinked', 'enemyLinkedAtDecision', 'turned', 'reason', 'eligible', 'compromised',
];

/** Prepend a day-0 window override so a pinned person steps out for exactly that hour block. */
function excursion(world: WorldState, id: EntityId, venue: string, from: number, to: number): void {
  const row: ScheduleOverride = {
    fromDay: 0, toDay: 1, from, to, venue, source: 'player', sourceRef: `test:excursion:${id}`,
  };
  world.scheduleOverrides[id] = [row, ...(world.scheduleOverrides[id] ?? [])];
}

function messagesOf(world: WorldState, kind: NetworkMessage['payload']['kind']): NetworkMessage[] {
  return (world.network.directiveState?.messages ?? []).filter((m) => m.payload.kind === kind);
}

const RECRUIT_CASS: Action[] = [
  { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null },
];

/** Apply the verb straight onto the world (its own tick's step then delivers what it queued). */
function applyRecruitAt(world: WorldState, target: EntityId, tick: number): void {
  world.tick = tick;
  applyRecruit(world, target, 'money', null, tick, RULES);
}

/**
 * The hesitate staging: cass trusts the avatar at 0.3 (bucket 0) so money's +1 lands the score on 1 —
 * the hesitate band — and trusts the spymaster more than the avatar, so her initial profile reports
 * the approach. `handlerContact` decides only whether that physical report ever reaches sly.
 */
function stageHesitation(seed: string, handlerContact: boolean): WorldState {
  const world = recruitWorld(seed);
  pin(world, 'square', 'you', 'cass');
  pin(world, 'annex', 'sly');
  trust(world, 'cass', 'you', 0.3);
  trust(world, 'cass', 'sly', 0.9);
  if (handlerContact) excursion(world, 'cass', 'annex', 60, 120);
  return world;
}

describe('the visible recruitment record carries no hidden category', () => {
  it('an immediate acceptance produces exactly one approach row and one answer row, both via self', () => {
    const world = recruitWorld('visible-accept');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.8);
    runLogOn(world, RULES, RECRUIT_CASS, 1);

    const rows = recruitmentHistoryView(world);
    expect(rows).toEqual([
      { tick: 0, venue: 'square', recruiter: 'you', target: 'cass', stage: 'approach', response: null, via: 'self' },
      { tick: 0, venue: 'square', recruiter: 'you', target: 'cass', stage: 'answer', response: 'accept', via: 'self' },
    ]);
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(VISIBLE_ROW_KEYS);
    expect(assetFor(world, 'player', 'cass')!.mice).toBe('money');
  });

  it('a hesitate lifecycle reads as three rows for every hidden category identically', () => {
    for (const compromised of [false, true]) {
      const world = stageHesitation(`visible-hesitate-${compromised}`, compromised);
      runLogOn(world, RULES, RECRUIT_CASS, TICKS_PER_DAY + 1);
      const rows = recruitmentHistoryView(world);
      expect(rows.map((row) => `${row.tick}:${row.stage}:${row.response}`), String(compromised)).toEqual([
        '0:approach:null', '0:answer:hesitate', `${TICKS_PER_DAY}:answer:accept`,
      ]);
      const serialized = stableStringify({ history: rows, network: networkView(world) });
      for (const banned of FORBIDDEN_IN_VIEWS) expect(serialized, banned).not.toContain(banned);
    }
  });

  it('honest and compromised hesitate→accept twins are byte-identical to the player, and differ in truth', () => {
    const honest = stageHesitation('twin-honest', false);
    const compromised = stageHesitation('twin-compromised', true);
    runLogOn(honest, RULES, RECRUIT_CASS, TICKS_PER_DAY + 1);
    runLogOn(compromised, RULES, RECRUIT_CASS, TICKS_PER_DAY + 1);

    const facing = (world: WorldState): string => stableStringify({
      history: recruitmentHistoryView(world),
      network: networkView(world),
      intelNetwork: world.intel.network ?? [],
      informants: world.intel.informants,
    });
    expect(facing(compromised)).toBe(facing(honest));

    // …and the hidden truth is genuinely different (non-vacuous).
    expect(assetFor(honest, 'player', 'cass')!.turned).toBeUndefined();
    expect(assetFor(honest, 'enemy', 'cass')).toBeNull();
    expect(assetFor(compromised, 'player', 'cass')!.turned).toBe(true);
    expect(assetFor(compromised, 'enemy', 'cass')).not.toBeNull();
    expect(hashWorld(compromised)).not.toBe(hashWorld(honest));
  });
});

describe('an approach that was never physically spoken', () => {
  it('costs the coin, produces no answer, and does not lock the recruiter out of a later attempt', () => {
    const world = recruitWorld('unspoken');
    pin(world, 'square', 'you', 'cass');
    const coin0 = world.coin;
    applyRecruitAt(world, 'cass', 0);
    pin(world, 'annex', 'cass');   // she is gone before the frozen frame ever says the words
    runUntil(world, 31, RULES);

    expect(world.coin).toBe(coin0 - 10);                    // priced probing never refunds
    expect(recruitmentHistoryView(world)).toEqual([]);
    expect(messagesOf(world, 'recruitment-response')).toHaveLength(0);
    expect(world.network.directiveState!.recruitmentApproaches[0]!.status).toBe('closed');
    // …and the recruiter is free to try again once they really share a circle.
    pin(world, 'square', 'cass');
    trust(world, 'cass', 'you', 0.8);
    expect(() => applyRecruitAt(world, 'cass', 45)).not.toThrow();
  });
});

describe('compromise happens at a physical handler meeting, never at queue time', () => {
  it('separated candidate and handler leave NO enemy record; the first real meeting creates it', () => {
    const world = stageHesitation('handler-timing', true);
    runLogOn(world, RULES, RECRUIT_CASS, 1);
    // The report exists as a queued physical message and has changed nothing.
    expect(messagesOf(world, 'recruitment-approach').filter((m) => m.principal === 'enemy')).toHaveLength(1);
    expect(assetFor(world, 'enemy', 'cass')).toBeNull();

    runUntil(world, 60, RULES);         // still apart (cass leaves for the annex AT 60)
    expect(assetFor(world, 'enemy', 'cass')).toBeNull();

    runUntil(world, 76, RULES);         // the meeting beat has now passed
    const enemyRecord = assetFor(world, 'enemy', 'cass');
    expect(enemyRecord).not.toBeNull();
    expect(enemyRecord!.facts).toEqual([]);          // never a fabricated 'recruited-by' meeting
    expect(enemyRecord!.mice).toBeNull();
    expect(assetFor(world, 'player', 'cass')).toBeNull(); // no roster yet — she has not answered

    runUntil(world, TICKS_PER_DAY + 1, RULES);
    expect(assetFor(world, 'player', 'cass')!.turned).toBe(true);
  });

  it('a separated pair never compromises even after the later acceptance lands', () => {
    const world = stageHesitation('handler-never', false);
    runLogOn(world, RULES, RECRUIT_CASS, TICKS_PER_DAY + 1);
    expect(assetFor(world, 'enemy', 'cass')).toBeNull();
    expect(assetFor(world, 'player', 'cass')!.turned).toBeUndefined();
    expect(messagesOf(world, 'recruitment-approach').filter((m) => m.principal === 'enemy'
      && m.deliveredAt !== null)).toHaveLength(0);
  });
});

describe('protected role shapes the answer; it never creates an enemy record', () => {
  it('a council member who accepts becomes a LOYAL player asset with no enemy record', () => {
    const world = recruitWorld('protected-accept');
    pin(world, 'square', 'you', 'cora');
    trust(world, 'cora', 'you', 0.8);
    runLogOn(world, RULES, [
      { tick: 0, kind: 'recruit', target: 'cora', mice: 'money', leverageFamily: null },
    ], 1);
    const record = assetFor(world, 'player', 'cora')!;
    expect(record.turned).toBeUndefined();
    expect(assetFor(world, 'enemy', 'cora')).toBeNull();
    expect(compartmentOf(world, 'player', 'cora')).toEqual([
      { tick: 0, kind: 'recruited-by', ref: 'player' },
    ]);
  });

  it('control: a REAL pre-existing enemy observer who accepts is compromised, with empty enemy facts', () => {
    const world = recruitWorld('observer-accept');
    pin(world, 'square', 'you', 'gil');
    trust(world, 'gil', 'you', 0.8);
    applyInject(world, 'gil', {
      subject: 'vane', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
    });
    runLogOn(world, RULES, [
      { tick: 0, kind: 'recruit', target: 'gil', mice: 'ideology', leverageFamily: null },
    ], 1);
    expect(assetFor(world, 'player', 'gil')!.turned).toBe(true);
    expect(assetFor(world, 'enemy', 'gil')!.facts).toEqual([]);
    // The player's own view still shows an ordinary roster row.
    expect(networkView(world).assets.map((a) => a.id)).toContain('gil');
    expect(stableStringify(networkView(world))).not.toContain('turned');
  });
});

describe('embodied principals — the self-route law', () => {
  it('avatar→spymaster: rows appear via self, no report is queued to him, and he knows at the speech', () => {
    const world = recruitWorld('self-route');
    pin(world, 'square', 'you', 'sly');
    trust(world, 'sly', 'you', 0.8);
    const evidence0 = world.enemy.evidence.length;
    runLogOn(world, RULES, [
      { tick: 0, kind: 'recruit', target: 'sly', mice: 'money', leverageFamily: null },
    ], 1);

    expect(recruitmentHistoryView(world).map((row) => [row.stage, row.via, row.response])).toEqual([
      ['approach', 'self', null], ['answer', 'self', 'accept'],
    ]);
    // The candidate IS the opposite principal's actor: his own hearing is that knowledge already.
    expect(messagesOf(world, 'recruitment-approach').filter((m) => m.principal === 'enemy')).toHaveLength(0);
    const captured = world.enemy.evidence.slice(evidence0).filter((row) => row.kind === 'network');
    expect(captured.length).toBeGreaterThan(0);
    expect(captured.every((row) => row.tick === 0)).toBe(true);
    expect(assetFor(world, 'player', 'sly')!.turned).toBe(true);
  });

  it('never queues a recruitment answer as a self-hop', () => {
    const world = recruitWorld('self-hop');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.8);
    runLogOn(world, RULES, RECRUIT_CASS, 1);
    for (const message of messagesOf(world, 'recruitment-response')) {
      expect(message.route).not.toContain(message.origin);
      expect(message.route).toEqual(['you']);
    }
  });
});

describe('a later answer becomes player knowledge only through presence or delivery', () => {
  it('waits in transit while the avatar is away, then lands at the first real meeting — never a stop', () => {
    const world = stageHesitation('absent-avatar', false);
    runLogOn(world, RULES, RECRUIT_CASS, 1);
    world.playerVenue = 'safehouse';           // the avatar walks away before the decision day
    const rowsBefore = recruitmentHistoryView(world).length;

    runUntil(world, TICKS_PER_DAY + 16, RULES);
    const approach = world.network.directiveState!.recruitmentApproaches[0]!;
    expect(approach.status).toBe('answer-in-transit');
    expect(assetFor(world, 'player', 'cass')).toBeNull();
    expect(recruitmentHistoryView(world)).toHaveLength(rowsBefore); // nothing appeared while absent
    expect(world.scenario!.status).toBe('running');                 // no session stop

    world.playerVenue = 'square';              // the avatar comes back into her circle
    runUntil(world, TICKS_PER_DAY + 46, RULES);
    expect(assetFor(world, 'player', 'cass')!.mice).toBe('money');
    const rows = recruitmentHistoryView(world);
    expect(rows).toHaveLength(rowsBefore + 1);
    expect(rows.at(-1)).toMatchObject({ stage: 'answer', response: 'accept', via: 'self' });
    expect(rows.at(-1)!.tick).toBeGreaterThan(TICKS_PER_DAY);
  });
});

describe('live ≡ replay across all three direct-recruitment paths', () => {
  it('immediate, hesitant-honest and hesitant-compromised all regrow byte-identically', () => {
    const builders: { name: string; build: () => WorldState }[] = [
      {
        name: 'immediate',
        build: () => {
          const world = recruitWorld('replay-immediate');
          pin(world, 'square', 'you', 'cass');
          trust(world, 'cass', 'you', 0.8);
          return world;
        },
      },
      { name: 'hesitant-honest', build: () => stageHesitation('replay-honest', false) },
      { name: 'hesitant-compromised', build: () => stageHesitation('replay-compromised', true) },
    ];
    for (const { name, build } of builders) {
      const a = runLogOn(build(), RULES, RECRUIT_CASS, at(2, 0));
      const b = runLogOn(build(), RULES, RECRUIT_CASS, at(2, 0));
      expect(hashWorld(a), name).toBe(hashWorld(b));
      expect(assetFor(a, 'player', 'cass'), name).not.toBeNull();
    }
  });
});
