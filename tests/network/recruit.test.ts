import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer, trustBetween } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { applyInject, applyRecruit, type InjectSpec } from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { runUntil, step } from '../../src/sim/step';
import { reportThrough } from '../../src/sim/reporting';
import { assetFor, dispositionOf, payWagesNightly } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import {
  evaluateRecruitment, handleFitFor, isLinkedTo, isProtectedRole, recruitmentHistoryView,
  shouldReportApproach, type RecruitmentInput,
} from '../../src/sim/network/recruitment';
import { hashWorld } from '../../src/sim/hash';
import { blankIntel } from '../../src/sim/fieldwork';
import { TRAITS } from '../../src/content/traits';
import { at, dayOf } from '../../src/core/time';
import { SOMEONE, type Claim, type EntityId, type RumorId } from '../../src/sim/rumors/claim';
import type { TraitContext } from '../../src/sim/rumors/traits';
import type { RecruitmentResponse } from '../../src/sim/directives/types';
import type { WorldState } from '../../src/sim/types';
import { makePlayerAsset, pin, recruitWorld, trust } from './helpers/recruit-town';
import { callArgCounts, forbiddenReached, operatorsFrom, parseModule } from '../helpers/callgraph';

const RULES = STANDARD_RULES;
const RECRUITMENT_PATH = 'src/sim/network/recruitment.ts';
const SOURCE = readFileSync(join(process.cwd(), RECRUITMENT_PATH), 'utf8');

/** The two pure decision functions the plan forbids any hidden lottery inside. */
const EVALUATORS = ['evaluateRecruitment', 'shouldReportApproach'];
/** Seed, clock, identity hash and ambient entropy — every non-contextual cause, by name. */
const LOTTERY_NAMES = [
  'seed', 'tick', 'Rng', 'random', 'Math', 'Date', 'now', 'fnv1a', 'hashWorld', 'charCodeAt',
  'stableStringify', 'localeCompare',
];
/** Roster / observer / turncoat / enemy state — forbidden inputs to protected pressure. */
const HIDDEN_ROLE_NAMES = [
  'rosterFor', 'assetFor', 'isLinkedTo', 'isTurnedAgainst', 'ensureAssetRecord', 'observers',
  'enemyAssets', 'assets', 'turned', 'network', 'enemy', 'spymaster', 'directiveState',
];

/** Splice a statement in at the top of a named function body — the enforcement-scan injection idiom. */
function inject(anchor: string, replacement: string, statement: string): string {
  const start = SOURCE.indexOf(anchor);
  expect(start, `the injection anchor '${anchor}' exists`).toBeGreaterThanOrEqual(0);
  const open = SOURCE.indexOf('{', SOURCE.indexOf(')', start + anchor.length));
  return SOURCE.slice(0, start) + replacement + SOURCE.slice(start + anchor.length, open + 1)
    + '\n' + statement + SOURCE.slice(open + 1);
}

const asClaim = (spec: InjectSpec): Claim => ({ id: 'probe', family: 'probe', parent: null, ...spec });
const pick7 = (c: Claim | InjectSpec): Pick<Claim, 'subject' | 'predicate' | 'object' | 'count' | 'severity' | 'place' | 'attribution'> => {
  const { subject, predicate, object, count, severity, place, attribution } = c;
  return { subject, predicate, object, count, severity, place, attribution };
};

// ─────────────────────────────────────────────────────────────────────────────
// The pure response formula: contextual causes, never a hidden lottery.

const CATEGORIES = [
  { id: 'civilian', target: 'cass' },
  { id: 'guard', target: 'gil' },
  { id: 'council', target: 'cora' },
  { id: 'spymaster', target: 'sly' },
  { id: 'enemy-asset', target: 'ewan' },
  { id: 'protected-role', target: 'vane' },
] as const;

describe('evaluateRecruitment — every hidden category shares one outward response union', () => {
  it('lawful context reaches accept, refuse AND hesitate for all six categories', () => {
    for (const category of CATEGORIES) {
      const world = recruitWorld(`table-${category.id}`);
      const responses = new Set<RecruitmentResponse>();
      const reached = new Map<RecruitmentResponse, string>();
      for (const relationship of [0.1, 0.3, 0.6, 0.8]) {
        for (const handleFit of [-2, 0, 2] as const) {
          for (const localWitnesses of [0, 3]) {
            for (const perceivedScrutiny of [0, 0.8]) {
              const input: RecruitmentInput = {
                relationship, handleFit,
                traits: [...world.npcs[category.target]!.traits],
                protectedRole: isProtectedRole(world, RULES, category.target),
                enemyLinked: isLinkedTo(world, 'enemy', category.target),
                localWitnesses, perceivedScrutiny, stage: 'initial',
              };
              const response = evaluateRecruitment(input);
              responses.add(response);
              if (!reached.has(response)) reached.set(response, JSON.stringify(input));
            }
          }
        }
      }
      expect([...responses].sort(), `${category.id}: ${[...reached.values()].join(' | ')}`)
        .toEqual(['accept', 'hesitate', 'refuse']);
    }
  });

  it('every category is structurally distinguishable ONLY through lawful context fields', () => {
    const world = recruitWorld('table-shape');
    expect(isProtectedRole(world, RULES, 'gil')).toBe(true);       // watch occupation
    expect(isProtectedRole(world, RULES, 'cora')).toBe(true);      // council
    expect(isProtectedRole(world, RULES, 'vane')).toBe(true);      // usurper
    expect(isProtectedRole(world, RULES, 'cass')).toBe(false);
    expect(isProtectedRole(world, RULES, 'ewan')).toBe(false);     // enemy roster is NOT a role
    expect(isProtectedRole(world, RULES, 'sly')).toBe(false);      // the spymaster is deliberately unprotected
    expect(isLinkedTo(world, 'enemy', 'sly')).toBe(true);
    expect(isLinkedTo(world, 'enemy', 'ewan')).toBe(true);
    expect(isLinkedTo(world, 'enemy', 'gil')).toBe(true);
    expect(isLinkedTo(world, 'enemy', 'cass')).toBe(false);
  });

  it('pins the exact score algebra, including the later stage and the enemy-linkage flip', () => {
    const base: RecruitmentInput = {
      relationship: 0.8, handleFit: 0, traits: [], protectedRole: false,
      enemyLinked: false, localWitnesses: 0, perceivedScrutiny: 0, stage: 'initial',
    };
    expect(evaluateRecruitment(base)).toBe('accept');                                  // 2
    expect(evaluateRecruitment({ ...base, relationship: 0.6 })).toBe('hesitate');       // 1
    expect(evaluateRecruitment({ ...base, relationship: 0.3 })).toBe('hesitate');       // 0
    expect(evaluateRecruitment({ ...base, relationship: 0.1 })).toBe('refuse');         // -2
    expect(evaluateRecruitment({ ...base, traits: ['skeptic'] })).toBe('hesitate');     // 2-1
    expect(evaluateRecruitment({ ...base, localWitnesses: 2 })).toBe('accept');         // >2 only
    expect(evaluateRecruitment({ ...base, localWitnesses: 3 })).toBe('hesitate');
    expect(evaluateRecruitment({ ...base, perceivedScrutiny: 0.69 })).toBe('accept');
    expect(evaluateRecruitment({ ...base, perceivedScrutiny: 0.70 })).toBe('hesitate');
    expect(evaluateRecruitment({ ...base, protectedRole: true })).toBe('hesitate');
    expect(evaluateRecruitment({ ...base, enemyLinked: true })).toBe('hesitate');       // initial: -1
    // The later stage is a two-way branch that never hesitates, and enemy linkage now HELPS.
    expect(evaluateRecruitment({ ...base, relationship: 0.3, stage: 'later' })).toBe('accept');   // 0
    expect(evaluateRecruitment({ ...base, relationship: 0.1, stage: 'later' })).toBe('refuse');   // -2
    expect(evaluateRecruitment({
      ...base, relationship: 0.1, enemyLinked: true, stage: 'later',
    })).toBe('accept');                                                                 // -2 + 2
  });

  // ── ENFORCEMENT SCAN 1: no hidden lottery, anywhere the two evaluators can reach ──────────────
  it('call-graph scan: nothing reachable from either evaluator reads seed, clock, hash or entropy', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    expect(forbiddenReached(graph, EVALUATORS, LOTTERY_NAMES)).toEqual([]);
    expect([...operatorsFrom(graph, EVALUATORS)], 'no parity arithmetic').not.toContain('%');

    // FIRING PROOF (a): a lottery written straight into the evaluator.
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, inject(
      'export function evaluateRecruitment(',
      'export function evaluateRecruitment(',
      '  if (new Rng(world.seed, `x`).next() > 0.5) return \'accept\';\n',
    )), EVALUATORS, LOTTERY_NAMES)).toContain('Rng');

    // FIRING PROOF (b): the reviewer's bypass — the same lottery moved one HELPER deep.
    const viaHelper = SOURCE
      .replace('export function evaluateRecruitment(',
        'function rollLottery(world: { seed: string }): number {\n'
        + '  return new Rng(world.seed, `lottery`).next();\n}\n'
        + 'export function evaluateRecruitment(')
      .replace(/(export function evaluateRecruitment\([^)]*\)[^{]*\{)/,
        '$1\n  if (rollLottery(world) > 0.5) return \'accept\';');
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, viaHelper), EVALUATORS, LOTTERY_NAMES),
      'a helper lottery is inside the evaluator\'s closure').toContain('Rng');

    // FIRING PROOF (c): parity on the entity id, which names none of the forbidden identifiers.
    const parity = SOURCE.replace(/(export function evaluateRecruitment\([^)]*\)[^{]*\{)/,
      '$1\n  if (input.traits.length % 2 === 0) return \'accept\';');
    expect([...operatorsFrom(parseModule(RECRUITMENT_PATH, parity), EVALUATORS)]).toContain('%');
  });

  // ── ENFORCEMENT SCAN 2: isProtectedRole knows only its own PUBLIC role ────────────────────────
  it('call-graph scan: nothing reachable from isProtectedRole reads roster, observer or turned state', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    expect(forbiddenReached(graph, ['isProtectedRole'], HIDDEN_ROLE_NAMES)).toEqual([]);

    // FIRING PROOF (a): a direct hidden-state read.
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, inject(
      'export function isProtectedRole(', 'export function isProtectedRole(',
      '  if (world.network.enemyAssets.length > 0) return true;\n',
    )), ['isProtectedRole'], HIDDEN_ROLE_NAMES)).toContain('enemyAssets');

    // FIRING PROOF (b): the same read one helper deep — `isLinkedTo` already exists in the module.
    const viaHelper = SOURCE.replace(/(export function isProtectedRole\([^)]*\)[^{]*\{)/,
      '$1\n  if (isLinkedTo(world, \'enemy\', id)) return true;');
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, viaHelper), ['isProtectedRole'],
      HIDDEN_ROLE_NAMES), 'a helper hop still reaches the roster').toContain('isLinkedTo');
  });
});

describe('shouldReportApproach — a candidate reports only for context reasons', () => {
  it('needs a real handler, then either real linkage or a warmer edge to that handler', () => {
    const base = {
      enemyHandler: 'sly' as string | null, enemyLinked: false,
      relationshipToRecruiter: 0.6, relationshipToEnemyHandler: 0.2,
    };
    expect(shouldReportApproach({ ...base, enemyHandler: null })).toBe(false);
    expect(shouldReportApproach(base)).toBe(false);
    expect(shouldReportApproach({ ...base, enemyLinked: true })).toBe(true);
    expect(shouldReportApproach({ ...base, relationshipToEnemyHandler: 0.9 })).toBe(true);
    expect(shouldReportApproach({ ...base, relationshipToRecruiter: 0.2 })).toBe(false); // ties do not report
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// handleFit — exact, and the only place a MICE handle enters the response.

describe('handleFit — the exact per-handle table', () => {
  it('money, ideology, coercion, ego and the null cooperation handle', () => {
    const world = recruitWorld('fit');
    expect(handleFitFor(world, RULES, 'player', 'cass', null, null)).toBe(0);
    expect(handleFitFor(world, RULES, 'player', 'cass', 'money', null)).toBe(1);
    // A wage-strike context on the record takes money's edge away.
    makePlayerAsset(world, 'nell', 'money');
    assetFor(world, 'player', 'nell')!.strikes = 1;
    expect(handleFitFor(world, RULES, 'player', 'nell', 'money', null)).toBe(0);

    expect(handleFitFor(world, RULES, 'player', 'cass', 'ideology', null)).toBe(-1);
    applyInject(world, 'cass', {
      subject: 'vane', predicate: 'stole', object: null, count: 1, severity: 3,
      place: null, attribution: SOMEONE,
    });
    expect(handleFitFor(world, RULES, 'player', 'cass', 'ideology', null)).toBe(2);

    expect(handleFitFor(world, RULES, 'player', 'cass', 'coercion', null)).toBe(-2);
    world.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'square', via: 'self', kind: 'utterance', overheard: false,
      family: 'lev-1',
      reported: { subject: 'cass', predicate: 'stole', object: null, count: 1, severity: 4, place: null, attribution: SOMEONE },
    });
    expect(handleFitFor(world, RULES, 'player', 'cass', 'coercion', 'lev-1')).toBe(2);

    expect(handleFitFor(world, RULES, 'player', 'cass', 'ego', null)).toBe(0);
    world.npcs['cass']!.traits = ['literalist', 'name-dropper'];
    expect(handleFitFor(world, RULES, 'player', 'cass', 'ego', null)).toBe(1);
    world.npcs['cass']!.traits = ['dramatist'];
    expect(handleFitFor(world, RULES, 'player', 'cass', 'ego', null)).toBe(1);
    world.npcs['cass']!.traits = ['exaggerator'];
    expect(handleFitFor(world, RULES, 'player', 'cass', 'ego', null)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Public validation reads only player/action facts.

/** Run exactly one tick with the given player actions applied in its player phase. */
function runTick(world: WorldState, log: Action[], untilTick = world.tick + 1): void {
  runLogOn(world, RULES, log, untilTick);
}

describe('recruit validation — public facts only, never a hidden category', () => {
  it('opens an approach against EVERY hidden category with an identical (empty) refusal set', () => {
    for (const category of CATEGORIES) {
      const world = recruitWorld(`validate-${category.id}`);
      pin(world, 'square', 'you', category.target);
      const coin0 = world.coin;
      expect(() => applyRecruit(world, category.target, 'money', null, 0, RULES),
        `${category.id} must not be refused for what they are`).not.toThrow();
      expect(world.network.directiveState!.recruitmentApproaches, category.id).toHaveLength(1);
      expect(world.coin).toBe(coin0 - STANDARD_ECONOMY.recruitCost.money);
    }
  });

  it('refuses only public-fact failures, each with zero residue', () => {
    const headless = buildWorld(TESTFORD, 'rec-headless', RULES);
    expect(() => applyRecruit(headless, 'mara', 'money', null, 0, RULES)).toThrow(/no player/);

    const world = recruitWorld('rec-shape');
    pin(world, 'square', 'you', 'cass');
    expect(() => applyRecruit(world, 'ghost', 'money', null, 0, RULES)).toThrow(/unknown npc/);
    expect(() => applyRecruit(world, 'you', 'money', null, 0, RULES)).toThrow(/avatar/);
    expect(() => applyRecruit(world, 'cass', 'money', null, 7, RULES)).toThrow(/beat/);
    expect(() => applyRecruit(world, 'nell', 'money', null, 0, RULES)).toThrow(/circle/);
    expect(() => applyRecruit(world, 'cass', 'coercion', null, 0, RULES)).toThrow(/leverage/);
    world.coin = STANDARD_ECONOMY.recruitCost.money - 1;
    expect(() => applyRecruit(world, 'cass', 'money', null, 0, RULES)).toThrow(/treasury/);
    expect(hashWorld(world)).toBe(hashWorld(world)); // sanity for the residue comparisons below
  });

  it('every refusal leaves ZERO residue (validate-before-mutate)', () => {
    const cases: { setup: (world: WorldState) => void; run: (world: WorldState) => void }[] = [
      { setup: () => {}, run: (w) => applyRecruit(w, 'nell', 'money', null, 0, RULES) },
      { setup: () => {}, run: (w) => applyRecruit(w, 'cass', 'coercion', null, 0, RULES) },
      { setup: (w) => { w.coin = 0; }, run: (w) => applyRecruit(w, 'cass', 'money', null, 0, RULES) },
      { setup: (w) => makePlayerAsset(w, 'cass'), run: (w) => applyRecruit(w, 'cass', 'money', null, 0, RULES) },
    ];
    for (const { setup, run } of cases) {
      const world = recruitWorld('rec-residue');
      pin(world, 'square', 'you', 'cass');
      setup(world);
      const before = hashWorld(world);
      expect(() => run(world)).toThrow();
      expect(hashWorld(world)).toBe(before);
    }
  });

  it('an existing PLAYER roster row is public bookkeeping and says so; a second open approach refuses', () => {
    const world = recruitWorld('rec-existing');
    pin(world, 'square', 'you', 'cass');
    makePlayerAsset(world, 'cass');
    expect(() => applyRecruit(world, 'cass', 'money', null, 0, RULES))
      .toThrow('recruit: this person is already on your roster');

    const second = recruitWorld('rec-open');
    pin(second, 'square', 'you', 'cass');
    applyRecruit(second, 'cass', 'money', null, 0, RULES);
    expect(() => applyRecruit(second, 'cass', 'money', null, 0, RULES)).toThrow(/already open/);
  });

  it('no refusal string names guard, spymaster, council, usurper, or enemy-asset status', () => {
    const messages: string[] = [];
    for (const target of ['gil', 'sly', 'ewan', 'vane']) {
      const world = recruitWorld(`rec-oracle-${target}`);
      pin(world, 'square', 'you', target);
      try {
        applyRecruit(world, target, 'coercion', null, 0, RULES); // refused for a PUBLIC reason only
      } catch (error) { messages.push((error as Error).message); }
    }
    expect(messages).toHaveLength(4);
    for (const message of messages) {
      expect(message).toMatch(/leverage/);
      expect(message).not.toMatch(/guard|spymaster|council|usurper|asset|cannot be recruited/i);
    }
  });
});

describe('recruit cost — debited once on the approach, never refunded', () => {
  it('drops once for accept, refuse AND hesitate alike', () => {
    // money fit is +1 and ideology's is −1 with no conviction behind it, so the three bands are
    // reachable with only lawful context: 0.8→2 accept · 0.3→1 hesitate · 0.1 with ideology→−3 refuse.
    const wanted: { expected: RecruitmentResponse; relationship: number; mice: 'money' | 'ideology' }[] = [
      { expected: 'accept', relationship: 0.8, mice: 'money' },
      { expected: 'hesitate', relationship: 0.3, mice: 'money' },
      { expected: 'refuse', relationship: 0.1, mice: 'ideology' },
    ];
    for (const { expected, relationship, mice } of wanted) {
      const world = recruitWorld(`cost-${expected}`);
      pin(world, 'square', 'you', 'cass');
      trust(world, 'cass', 'you', relationship);
      const coin0 = world.coin;
      const cost = STANDARD_ECONOMY.recruitCost[mice];
      runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice, leverageFamily: null }]);
      const approach = world.network.directiveState!.recruitmentApproaches[0]!;
      expect(approach.initial, expected).toBe(expected);
      expect(world.coin, expected).toBe(coin0 - cost);
      runUntil(world, at(3, 0), RULES);
      expect(world.coin, `${expected} never refunds`).toBeLessThanOrEqual(coin0 - cost);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATED from the pre-Task-11 suite: the four handles still price and dispose the same way,
// but enrollment is now the ANSWER's physical receipt, not the action.

describe('MICE recruit — the handles still buy the same disposition on acceptance', () => {
  const floors: Record<string, number> = { money: 0.6, ideology: 0.7, coercion: 0.5, ego: 0.6 };

  it('money: roster + informant + recruited-by fact + the 0.6 friend edge, coin debited once', () => {
    const world = recruitWorld('rec-money');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.8);
    const coin0 = world.coin;
    runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null }]);

    const record = assetFor(world, 'player', 'cass')!;
    expect(record.mice).toBe('money');
    expect(record.strikes).toBe(0);
    expect(record.wagePaidThroughDay).toBe(dayOf(0));
    expect(record.turned).toBeUndefined();
    expect(compartmentOf(world, 'player', 'cass')).toEqual([{ tick: 0, kind: 'recruited-by', ref: 'player' }]);
    expect(dispositionOf(world, 'cass')).toBe(floors['money']);
    expect(trustBetween(world, 'cass', 'you')).toBe(floors['money']);
    expect(world.intel.informants.some((i) => i.id === 'cass')).toBe(true);
    expect(world.coin).toBe(coin0 - STANDARD_ECONOMY.recruitCost.money);
  });

  it('ideology, coercion and ego each land their own disposition floor', () => {
    {
      const world = recruitWorld('rec-ideo');
      pin(world, 'square', 'you', 'cass');
      trust(world, 'cass', 'you', 0.8);
      applyInject(world, 'cass', {
        subject: 'vane', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
      });
      runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice: 'ideology', leverageFamily: null }]);
      expect(assetFor(world, 'player', 'cass')!.mice).toBe('ideology');
      expect(dispositionOf(world, 'cass')).toBe(floors['ideology']);
    }
    {
      const world = recruitWorld('rec-coerce');
      pin(world, 'square', 'you', 'cass');
      trust(world, 'cass', 'you', 0.8);
      world.intel.log.push({
        ...blankIntel(), tick: 0, venue: 'square', via: 'self', kind: 'utterance', overheard: false,
        family: 'lev-1',
        reported: { subject: 'cass', predicate: 'stole', object: null, count: 1, severity: 4, place: null, attribution: SOMEONE },
      });
      runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice: 'coercion', leverageFamily: 'lev-1' }]);
      expect(assetFor(world, 'player', 'cass')!.mice).toBe('coercion');
      expect(dispositionOf(world, 'cass')).toBe(floors['coercion']);
    }
    {
      const world = recruitWorld('rec-ego');
      pin(world, 'square', 'you', 'cass');
      trust(world, 'cass', 'you', 0.8);
      runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice: 'ego', leverageFamily: null }]);
      expect(assetFor(world, 'player', 'cass')!.mice).toBe('ego');
      expect(dispositionOf(world, 'cass')).toBe(floors['ego']);
    }
  });

  it('the priced ordering coercion < ego < money holds, and ego adds an exaggerator report pass', () => {
    expect(STANDARD_ECONOMY.recruitCost.coercion).toBeLessThan(STANDARD_ECONOMY.recruitCost.ego);
    expect(STANDARD_ECONOMY.recruitCost.ego).toBeLessThan(STANDARD_ECONOMY.recruitCost.money);

    const world = recruitWorld('rec-ego-report');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.8);
    const dirt2: InjectSpec = { subject: SOMEONE, predicate: 'stole', object: null, count: 2, severity: 2, place: null, attribution: SOMEONE };
    expect(world.npcs['cass']!.traits).not.toContain('exaggerator'); // NOT a natural exaggerator
    const base = reportThrough(world, 'cass', asClaim(dirt2), RULES, 'player');
    expect(base.count).toBe(dirt2.count);

    runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice: 'ego', leverageFamily: null }]);
    const after = reportThrough(world, 'cass', asClaim(dirt2), RULES, 'player');
    expect(after.count).toBe(base.count! * 2);
    expect(after.severity).toBe(Math.min(5, base.severity + 1));
    const ctx: TraitContext = {
      ownerId: 'cass', faction: world.npcs['cass']!.faction, rivals: world.npcs['cass']!.rivals,
      factionOf: (e) => world.npcs[e]?.faction ?? null,
    };
    const overlaid = { ...base, ...TRAITS['exaggerator']!.transform({ id: 'x', family: 'x', parent: null, ...base } as Claim, ctx) };
    expect(after).toEqual(pick7(overlaid as Claim));
  });

  it('control: a money recruit adds NO report overlay — the exaggeration is ego-specific', () => {
    const world = recruitWorld('rec-ego-ctrl');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.8);
    const dirt2: InjectSpec = { subject: SOMEONE, predicate: 'stole', object: null, count: 2, severity: 2, place: null, attribution: SOMEONE };
    const base = reportThrough(world, 'cass', asClaim(dirt2), RULES, 'player');
    runTick(world, [{ tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null }]);
    expect(reportThrough(world, 'cass', asClaim(dirt2), RULES, 'player')).toEqual(base);
  });
});

// ── O2 (Ellie ruling 2026-07-08(2), KEEP; T4-M2): ego × natural-exaggerator stacking ──────────────
describe('MICE recruit — ego × natural-exaggerator stacking (O2)', () => {
  it('an ego-recruited NATURAL exaggerator double-exaggerates — EXACTLY exaggerator ∘ (real chain)', () => {
    const world = buildWorld(TESTFORD, 'o2-stack', RULES);
    const target = 'mara';
    expect(world.npcs[target]!.traits).toContain('exaggerator');

    const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 2, severity: 2, place: null, attribution: 'seth' };
    const claim = asClaim(spec);

    world.network.assets = [{ id: target, mice: 'money', wagePaidThroughDay: 0, strikes: 0, facts: [] }];
    const r0 = reportThrough(world, target, claim, RULES, 'player');
    world.network.assets = [{ id: target, mice: 'ego', wagePaidThroughDay: 0, strikes: 0, facts: [] }];
    const rE = reportThrough(world, target, claim, RULES, 'player');

    const ctx: TraitContext = {
      ownerId: target, faction: world.npcs[target]!.faction, rivals: world.npcs[target]!.rivals,
      factionOf: (e) => world.npcs[e]?.faction ?? null,
    };
    const exag = TRAITS['exaggerator']!;
    const r0Claim = { id: 'x', family: 'x', parent: null, ...r0 } as Claim;
    const overlaid = exag.appliesTo(r0Claim, ctx) ? { ...r0, ...exag.transform(r0Claim, ctx) } : r0;
    expect(rE).toEqual(overlaid);

    expect(r0.count).toBe(spec.count! * 2);
    expect(rE.count).toBe(spec.count! * 4);
    expect(rE.severity).toBe(Math.min(5, spec.severity + 2));
    expect(r0.severity).toBe(spec.severity + 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Offer/execution identity: the approach binds to the OFFERED frame, so validation and the phase-2
// delivery snapshot can never disagree — including across same-tick multi-action logs (T11 I-4).

describe('recruit binds to the offered frame — one snapshot for validation and speech', () => {
  it('goTo then recruit REFUSES under the offered frame, with zero residue (no spent coin)', () => {
    const world = recruitWorld('frame-goto-recruit');
    pin(world, 'annex', 'you');
    pin(world, 'square', 'cass');
    trust(world, 'cass', 'you', 0.8);
    const coin0 = world.coin;

    // Live circles say the avatar is standing with cass; the offered frame — the one the approach
    // would actually be spoken into — still has them in different venues.
    expect(() => runLogOn(world, RULES, [
      { tick: 0, kind: 'goTo', venue: 'square' },
      { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null },
    ], 1)).toThrow(/circle/);

    expect(world.coin, 'a refusal never spends coin').toBe(coin0);
    expect(world.network.directiveState?.recruitmentApproaches ?? []).toEqual([]);
  });

  it('every PRODUCTION path hands the prepared frame to applyAction (P11-9 reachability)', () => {
    // The frame argument is optional so direct unit-test verb calls stay untouched; these three are
    // the only paths a real campaign runs through, and none of them may drop it.
    for (const path of ['src/sim/campaign.ts', 'src/bots/runner.ts', 'app/src/loop/session.ts']) {
      const counts = callArgCounts(parseModule(path), 'applyAction');
      expect(counts.length, `${path} applies actions`).toBeGreaterThan(0);
      expect(counts.every((count) => count === 4), `${path} forwards the frame (${counts.join(',')})`)
        .toBe(true);
    }
  });

  it('recruit then goTo speaks in the offered circle — the frame is not rug-pulled', () => {
    const world = recruitWorld('frame-recruit-goto');
    pin(world, 'square', 'you', 'cass');
    trust(world, 'cass', 'you', 0.8);
    const coin0 = world.coin;

    runLogOn(world, RULES, [
      { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null },
      { tick: 0, kind: 'goTo', venue: 'annex' },
    ], 1);

    expect(world.playerVenue, 'goTo stays immediate').toBe('annex');
    expect(recruitmentHistoryView(world).map((row) => `${row.venue}:${row.stage}:${row.response}`))
      .toEqual(['square:approach:null', 'square:answer:accept']);
    expect(assetFor(world, 'player', 'cass')!.mice).toBe('money');
    expect(world.coin).toBe(coin0 - STANDARD_ECONOMY.recruitCost.money);
  });
});

describe('recruit routing — save = seed + action log', () => {
  it('joins the Action union; applyAction refuses recruit without rules; unknown kinds still throw', () => {
    const world = recruitWorld('rec-route');
    pin(world, 'square', 'you', 'cass');
    expect(() => applyAction(world, { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null })).toThrow(/rules/);
    expect(() => applyAction(world, { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });

  it('live ≡ replay: an accepted recruit in the log regrows byte-identically over 3 days', () => {
    const build = (): WorldState => {
      const world = recruitWorld('rec-replay');
      pin(world, 'square', 'you', 'cass', 'nell');
      trust(world, 'cass', 'you', 0.8);
      return world;
    };
    const log: Action[] = [
      { tick: 0, kind: 'recruit', target: 'cass', mice: 'money', leverageFamily: null as RumorId | null },
    ];
    const a = runLogOn(build(), RULES, log, at(3, 0));
    const b = runLogOn(build(), RULES, log, at(3, 0));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(assetFor(a, 'player', 'cass')!.mice).toBe('money');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATED verbatim: the wage payroll is untouched by Task 11.

describe('wages — auto-debit on the rest-day nightly (never a refusal)', () => {
  const CFG = STANDARD_GEN_CONFIG;
  const CONTENT = STANDARD_GEN_CONTENT;

  it('stipend credits FIRST, then payroll: a treasury zeroed before the nightly still covers wages', () => {
    const { town } = generateValidTown('wage-order', CFG, CONTENT, RULES);
    const world = worldFromTown(town, 'wage-order', RULES);
    attachPlayer(world, town);
    const n = world.network.assets.length;
    expect(n).toBeGreaterThan(0);

    runUntil(world, at(6, 23, 59), RULES);
    world.coin = 0;
    const strikesBefore = world.network.assets.map((a) => a.strikes);

    step(world, RULES);

    const wage = STANDARD_ECONOMY.wagePerInformantPerWeek;
    expect(world.coin).toBe(STANDARD_ECONOMY.weeklyStipend - n * wage);
    expect(world.network.assets.map((a) => a.strikes)).toEqual(strikesBefore);
    for (const a of world.network.assets) expect(a.wagePaidThroughDay).toBe(6);
  });

  it('an unpaid asset takes a strike and its disposition slides −0.05 (deterministic id order)', () => {
    const world = buildWorld(TESTFORD, 'wage-miss', RULES);
    enrollPlayer(world, { home: 'market' });
    const wage = STANDARD_ECONOMY.wagePerInformantPerWeek;
    world.coin = wage;
    for (const id of ['anselm', 'mara']) {
      world.network.assets.push({ id, mice: 'money', wagePaidThroughDay: 0, strikes: 0, facts: [] });
      world.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust: 0.6 });
    }

    payWagesNightly(world, RULES);

    expect(world.coin).toBe(0);
    expect(assetFor(world, 'player', 'anselm')!.strikes).toBe(0);
    expect(dispositionOf(world, 'anselm')).toBe(0.6);
    expect(assetFor(world, 'player', 'mara')!.strikes).toBe(1);
    expect(dispositionOf(world, 'mara')).toBeCloseTo(0.55, 10);
  });
});

/** A stray `EntityId` import guard so the fixture roster stays typed at the call sites above. */
const _typed: EntityId = 'cass';
void _typed;
