import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer, trustBetween } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { attachScenario } from '../../src/sim/scenario/referee';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { applyInject, applyRecruit, type InjectSpec } from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { circlesAt } from '../../src/sim/agents';
import { runUntil, step } from '../../src/sim/step';
import { reportThrough } from '../../src/sim/reporting';
import { dispositionOf, findAsset, payWagesNightly } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import { hashWorld } from '../../src/sim/hash';
import { blankIntel } from '../../src/sim/fieldwork';
import { TRAITS } from '../../src/content/traits';
import { at, dayOf } from '../../src/core/time';
import { SOMEONE, type Claim, type EntityId, type RumorId } from '../../src/sim/rumors/claim';
import type { TraitContext } from '../../src/sim/rumors/traits';
import type { WorldState } from '../../src/sim/types';
import type { GeneratedTown } from '../../src/world/types';

const RULES = STANDARD_RULES;
const CFG = STANDARD_GEN_CONFIG;
const CONTENT = STANDARD_GEN_CONTENT;

/** Procgen staging: valid town → live world (coin 20 from rules) → avatar (+ referee by default). */
function stage(seed: string, opts: { scenario: boolean } = { scenario: true }): { world: WorldState; town: GeneratedTown } {
  const { town } = generateValidTown(seed, CFG, CONTENT, RULES);
  const world = worldFromTown(town, seed, RULES);
  attachPlayer(world, town);
  if (opts.scenario) attachScenario(world, town, CORONATION);
  return { world, town };
}

/** Pin an NPC to the safehouse for all of day 0 — the enemy-source override idiom (NOT a save-log write). */
function pinTo(world: WorldState, id: EntityId, venue: string): void {
  world.scheduleOverrides[id] = [{ fromDay: 0, toDay: null, from: 0, to: 1440, venue, source: 'enemy' }];
}

const asClaim = (spec: InjectSpec): Claim => ({ id: 'probe', family: 'probe', parent: null, ...spec });
const pick7 = (c: Claim | InjectSpec): Pick<Claim, 'subject' | 'predicate' | 'object' | 'count' | 'severity' | 'place' | 'attribution'> => {
  const { subject, predicate, object, count, severity, place, attribution } = c;
  return { subject, predicate, object, count, severity, place, attribution };
};

/** Pin `id` alone to the safehouse and return the first day-0 beat sharing the avatar's circle. */
function pinnedCircleMate(world: WorldState, id: EntityId): number {
  pinTo(world, id, 'safehouse');
  for (let h = 0; h < 24; h++) {
    const t = at(0, h);
    const c = circlesAt(world, t).find((circle) => circle.members.includes('you'));
    if (c && c.members.includes(id)) return t;
  }
  throw new Error(`pinnedCircleMate: ${id} never shared the avatar's circle`);
}

/** The alphabetically-first NPC recruitable in principle: not the avatar, a guard, cast, or an asset. */
function civilian(world: WorldState, town: GeneratedTown): EntityId {
  const guardIds = new Set(world.enemy.observers.map((o) => o.id));
  const assetIds = new Set(world.network.assets.map((a) => a.id));
  const id = Object.keys(world.npcs).sort().find((n) =>
    n !== 'you' && !guardIds.has(n) && n !== town.cast!.usurper
    && !town.cast!.council.includes(n) && !assetIds.has(n));
  if (!id) throw new Error('civilian: none found');
  return id;
}

describe('MICE recruit — money: coin buys fast', () => {
  it('recruits an in-circle civilian: 0.6 friend edge, roster + informant + recruited-by fact, coin debited', () => {
    const { world, town } = stage('rec-money');
    const target = civilian(world, town);
    const t = pinnedCircleMate(world, target);
    runUntil(world, t, RULES);
    const coin0 = world.coin;

    applyAction(world, { tick: t, kind: 'recruit', target, mice: 'money', leverageFamily: null }, RULES);

    const rec = findAsset(world, target)!;
    expect(rec.mice).toBe('money');
    expect(rec.strikes).toBe(0);
    expect(rec.wagePaidThroughDay).toBe(dayOf(t));
    expect(compartmentOf(world, target)).toEqual([{ tick: t, kind: 'recruited-by', ref: 'player' }]);
    expect(dispositionOf(world, target)).toBe(0.6);
    expect(trustBetween(world, target, 'you')).toBe(0.6);
    expect(world.intel.informants.some((i) => i.id === target)).toBe(true);
    expect(world.coin).toBe(coin0 - STANDARD_ECONOMY.recruitCost.money);
  });

  it('insufficient coin REFUSES with zero residue (validate-before-mutate)', () => {
    const { world, town } = stage('rec-broke');
    const target = civilian(world, town);
    const t = pinnedCircleMate(world, target);
    world.coin = STANDARD_ECONOMY.recruitCost.money - 1; // one short
    const before = hashWorld(world);

    expect(() => applyAction(world, { tick: t, kind: 'recruit', target, mice: 'money', leverageFamily: null }, RULES))
      .toThrow(/treasury/);

    expect(hashWorld(world)).toBe(before); // no asset, no informant, no edge, no fact, coin untouched
    expect(findAsset(world, target)).toBeNull();
    expect(world.intel.informants.some((i) => i.id === target)).toBe(false);
  });
});

describe('MICE recruit — ideology: loyal to the cause', () => {
  /** A civilian who does NOT yet hold a damaging conviction about the usurper (so the RED half is real). */
  function unconvinced(world: WorldState, town: GeneratedTown): EntityId {
    const guardIds = new Set(world.enemy.observers.map((o) => o.id));
    const assetIds = new Set(world.network.assets.map((a) => a.id));
    const leans = (id: EntityId): boolean => Object.values(world.beliefs[id] ?? {}).some((b) =>
      b.claim.subject === town.cast!.usurper && RULES.predicates[b.claim.predicate]?.valence === 'damaging' && b.credence >= 0.5);
    const id = Object.keys(world.npcs).sort().find((n) =>
      n !== 'you' && !guardIds.has(n) && n !== town.cast!.usurper
      && !town.cast!.council.includes(n) && !assetIds.has(n) && !leans(n));
    if (!id) throw new Error('unconvinced: none found');
    return id;
  }

  it('refuses a target with no damaging conviction about the usurper; recruits one who leans your way (0.7)', () => {
    const { world, town } = stage('rec-ideo');
    const target = unconvinced(world, town);
    const t = pinnedCircleMate(world, target);

    // RED: they hold nothing against the usurper yet — the cause has no purchase.
    expect(() => applyAction(world, { tick: t, kind: 'recruit', target, mice: 'ideology', leverageFamily: null }, RULES))
      .toThrow(/ideology/);

    // They now hold a damaging belief about the usurper at >= REPEAT (0.85 credence from inject).
    applyInject(world, target, {
      subject: town.cast!.usurper, predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
    });
    applyAction(world, { tick: t, kind: 'recruit', target, mice: 'ideology', leverageFamily: null }, RULES);

    expect(findAsset(world, target)!.mice).toBe('ideology');
    expect(dispositionOf(world, target)).toBe(0.7);
    expect(world.coin).toBe(20 - STANDARD_ECONOMY.recruitCost.ideology);
  });
});

describe('MICE recruit — coercion: dirt you hold (0.5, they do not love you)', () => {
  it('checks the PLAYER INTEL LOG, not world truth: needs a damaging family about the target', () => {
    const { world, town } = stage('rec-coerce');
    const target = civilian(world, town);
    const t = pinnedCircleMate(world, target);

    // RED: no leverage named.
    expect(() => applyAction(world, { tick: t, kind: 'recruit', target, mice: 'coercion', leverageFamily: null }, RULES))
      .toThrow(/coercion|leverage/);

    // RED: a family in the log, but NOT about the target.
    world.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'safehouse', via: 'self', kind: 'utterance', overheard: false, family: 'lev-other',
      reported: { subject: 'not-the-target', predicate: 'stole', object: null, count: 1, severity: 4, place: null, attribution: SOMEONE },
    });
    expect(() => applyAction(world, { tick: t, kind: 'recruit', target, mice: 'coercion', leverageFamily: 'lev-other' }, RULES))
      .toThrow(/coercion|leverage/);

    // GREEN: damaging dirt ABOUT the target in your intel log (it may even be a lie you believe).
    world.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'safehouse', via: 'self', kind: 'utterance', overheard: false, family: 'lev-1',
      reported: { subject: target, predicate: 'stole', object: null, count: 1, severity: 4, place: null, attribution: SOMEONE },
    });
    applyAction(world, { tick: t, kind: 'recruit', target, mice: 'coercion', leverageFamily: 'lev-1' }, RULES);

    expect(findAsset(world, target)!.mice).toBe('coercion');
    expect(dispositionOf(world, target)).toBe(0.5);
    expect(world.coin).toBe(20 - STANDARD_ECONOMY.recruitCost.coercion);
  });
});

describe('MICE recruit — ego: no gate, chronic exaggeration overlay (one mechanic)', () => {
  /** An NPC lacking the exaggerator trait whose own firmware leaves a counted claim's count intact. */
  function egoTarget(world: WorldState, town: GeneratedTown, spec: InjectSpec): EntityId {
    const guardIds = new Set(world.enemy.observers.map((o) => o.id));
    const assetIds = new Set(world.network.assets.map((a) => a.id));
    const id = Object.keys(world.npcs).sort().find((n) =>
      n !== 'you' && !guardIds.has(n) && n !== town.cast!.usurper && !town.cast!.council.includes(n)
      && !assetIds.has(n) && !world.npcs[n]!.traits.includes('exaggerator')
      && reportThrough(world, n, asClaim(spec), RULES).count === spec.count);
    if (!id) throw new Error('egoTarget: none found');
    return id;
  }

  const dirt2: InjectSpec = { subject: SOMEONE, predicate: 'stole', object: null, count: 2, severity: 2, place: null, attribution: SOMEONE };

  it('ego is the priced ordering coercion < ego < money, and adds an exaggerator pass AFTER real traits', () => {
    const { world, town } = stage('rec-ego');
    expect(STANDARD_ECONOMY.recruitCost.coercion).toBeLessThan(STANDARD_ECONOMY.recruitCost.ego);
    expect(STANDARD_ECONOMY.recruitCost.ego).toBeLessThan(STANDARD_ECONOMY.recruitCost.money);

    const target = egoTarget(world, town, dirt2);
    expect(world.npcs[target]!.traits).not.toContain('exaggerator'); // the canary: they are NOT natural exaggerators
    const t = pinnedCircleMate(world, target);
    const base = reportThrough(world, target, asClaim(dirt2), RULES);
    expect(base.count).toBe(dirt2.count); // their real traits leave the count untouched

    applyAction(world, { tick: t, kind: 'recruit', target, mice: 'ego', leverageFamily: null }, RULES);
    expect(findAsset(world, target)!.mice).toBe('ego');
    expect(dispositionOf(world, target)).toBe(0.6);
    expect(world.coin).toBe(20 - STANDARD_ECONOMY.recruitCost.ego);

    const after = reportThrough(world, target, asClaim(dirt2), RULES);
    // Report diff: the count doubles and severity climbs by one even though they lack exaggerator.
    expect(after.count).toBe(base.count! * 2);
    expect(after.severity).toBe(Math.min(5, base.severity + 1));
    // BY MECHANISM: the overlay is EXACTLY the registered exaggerator transform composed onto their real output.
    const ctx: TraitContext = {
      ownerId: target, faction: world.npcs[target]!.faction, rivals: world.npcs[target]!.rivals,
      factionOf: (e) => world.npcs[e]?.faction ?? null,
    };
    const overlaid = { ...base, ...TRAITS['exaggerator']!.transform({ id: 'x', family: 'x', parent: null, ...base } as Claim, ctx) };
    expect(after).toEqual(pick7(overlaid as Claim));
  });

  it('control: a non-ego (money) recruit adds NO overlay — the exaggeration is ego-specific', () => {
    const { world, town } = stage('rec-ego-ctrl');
    const target = egoTarget(world, town, dirt2);
    const t = pinnedCircleMate(world, target);
    const base = reportThrough(world, target, asClaim(dirt2), RULES);

    applyAction(world, { tick: t, kind: 'recruit', target, mice: 'money', leverageFamily: null }, RULES);

    expect(reportThrough(world, target, asClaim(dirt2), RULES)).toEqual(base);
  });
});

describe('MICE recruit — preconditions refuse (identity + conversation shape)', () => {
  it('refuses guards, the usurper, council members, and existing assets', () => {
    {
      const { world } = stage('rec-guard');
      const guard = world.enemy.observers[0]!.id;
      expect(() => applyAction(world, { tick: 0, kind: 'recruit', target: guard, mice: 'money', leverageFamily: null }, RULES)).toThrow(/guard/);
    }
    {
      const { world, town } = stage('rec-usurper');
      expect(() => applyAction(world, { tick: 0, kind: 'recruit', target: town.cast!.usurper, mice: 'money', leverageFamily: null }, RULES)).toThrow(/usurper|council/);
    }
    {
      const { world, town } = stage('rec-council');
      expect(() => applyAction(world, { tick: 0, kind: 'recruit', target: town.cast!.council[0]!, mice: 'money', leverageFamily: null }, RULES)).toThrow(/usurper|council/);
    }
    {
      const { world } = stage('rec-existing');
      const existing = world.network.assets[0]!.id; // a dossier freebie — already on the roster
      expect(() => applyAction(world, { tick: 0, kind: 'recruit', target: existing, mice: 'money', leverageFamily: null }, RULES)).toThrow(/already an asset/);
    }
  });

  it('refuses no-player, off-beat, and non-circle targets', () => {
    const headless = buildWorld(TESTFORD, 'rec-headless', RULES);
    expect(() => applyRecruit(headless, 'mara', 'money', null, 0, RULES)).toThrow(/no player/);

    const { world, town } = stage('rec-shape');
    const target = civilian(world, town);
    pinnedCircleMate(world, target);
    // Off-beat: tick 7 is not a conversation beat.
    expect(() => applyRecruit(world, target, 'money', null, 7, RULES)).toThrow(/beat/);

    // Non-circle: an unpinned civilian is not in the avatar's (safehouse) circle at tick 0.
    const { world: w2, town: town2 } = stage('rec-noncircle');
    const civ2 = civilian(w2, town2);
    expect(() => applyAction(w2, { tick: 0, kind: 'recruit', target: civ2, mice: 'money', leverageFamily: null }, RULES)).toThrow(/circle/);
  });
});

describe('recruit routing — save = seed + action log', () => {
  it('joins the Action union; applyAction refuses recruit without rules; unknown kinds still throw', () => {
    const { world, town } = stage('rec-route');
    const target = civilian(world, town);
    pinTo(world, target, 'safehouse');
    // recruit needs rules threaded through applyAction (economy prices + predicate valence).
    expect(() => applyAction(world, { tick: 0, kind: 'recruit', target, mice: 'money', leverageFamily: null })).toThrow(/rules/);
    // The union's default-throw is preserved.
    expect(() => applyAction(world, { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });

  it('live ≡ replay: a recruit in the log regrows byte-identically over 3 days', () => {
    const { town } = generateValidTown('rec-replay', CFG, CONTENT, RULES);
    const build = (): WorldState => {
      const w = worldFromTown(town, 'rec-replay', RULES);
      attachPlayer(w, town);
      return w;
    };
    // Pre-compute a natural money recruit (public venue + beat + target) from a throwaway build.
    const probe = build();
    const guardIds = new Set(probe.enemy.observers.map((o) => o.id));
    const assetIds = new Set(probe.network.assets.map((a) => a.id));
    let found: { venue: string; t: number; target: EntityId } | null = null;
    for (let h = 0; h < 48 && !found; h++) {
      const t = at(Math.floor(h / 24), h % 24);
      for (const v of Object.values(probe.venues)) {
        if (v.access !== 'public') continue;
        probe.playerVenue = v.id;
        const c = circlesAt(probe, t).find((cc) => cc.members.includes('you'));
        if (!c) continue;
        const target = c.members.find((m) => m !== 'you' && !guardIds.has(m)
          && m !== probe.scenario?.cast.usurper && !(probe.scenario?.cast.council ?? []).includes(m)
          && m !== town.cast!.usurper && !town.cast!.council.includes(m) && !assetIds.has(m));
        if (target) { found = { venue: v.id, t, target }; break; }
      }
    }
    if (!found) throw new Error('replay: no natural money recruit found in 2 days');

    const log: Action[] = [
      { tick: 0, kind: 'goTo', venue: found.venue },
      { tick: found.t, kind: 'recruit', target: found.target, mice: 'money', leverageFamily: null as RumorId | null },
    ];
    const a = runLogOn(build(), RULES, log, at(3, 0));
    const b = runLogOn(build(), RULES, log, at(3, 0));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(findAsset(a, found.target)!.mice).toBe('money');
  });
});

describe('wages — auto-debit on the rest-day nightly (never a refusal)', () => {
  it('stipend credits FIRST, then payroll: a treasury zeroed before the nightly still covers wages that night', () => {
    const { world } = stage('wage-order', { scenario: false });
    const n = world.network.assets.length; // the two dossier freebies draw wages too (uniform rule)
    expect(n).toBeGreaterThan(0);

    runUntil(world, at(6, 23, 59), RULES); // up to (not through) day 6's nightly beat
    world.coin = 0;                        // if wages ran BEFORE the stipend, both would miss
    const strikesBefore = world.network.assets.map((a) => a.strikes);

    step(world, RULES); // day-6 nightly: stipend +12, THEN wages -2 each

    const wage = STANDARD_ECONOMY.wagePerInformantPerWeek;
    expect(world.coin).toBe(STANDARD_ECONOMY.weeklyStipend - n * wage); // 12 - 2*2 = 8
    expect(world.network.assets.map((a) => a.strikes)).toEqual(strikesBefore); // nobody missed → no strikes
    for (const a of world.network.assets) expect(a.wagePaidThroughDay).toBe(6);
  });

  it('an unpaid asset takes a strike and its disposition slides −0.05 (deterministic id order)', () => {
    const world = buildWorld(TESTFORD, 'wage-miss', RULES);
    enrollPlayer(world, { home: 'market' });
    const wage = STANDARD_ECONOMY.wagePerInformantPerWeek;
    world.coin = wage; // exactly one wage — anselm (id-first) is paid, mara misses
    for (const id of ['anselm', 'mara']) {
      world.network.assets.push({ id, mice: 'money', wagePaidThroughDay: 0, strikes: 0, facts: [] });
      world.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust: 0.6 });
    }

    payWagesNightly(world, RULES);

    expect(world.coin).toBe(0);
    expect(findAsset(world, 'anselm')!.strikes).toBe(0);
    expect(dispositionOf(world, 'anselm')).toBe(0.6);
    expect(findAsset(world, 'mara')!.strikes).toBe(1);
    expect(dispositionOf(world, 'mara')).toBeCloseTo(0.55, 10);
  });
});
