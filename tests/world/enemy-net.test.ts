import { describe, expect, it } from 'vitest';
import { generateValidTown } from '../../src/world/serve';
import { validateTown } from '../../src/world/validate';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import type { GeneratedTown } from '../../src/world/types';

const CFG = STANDARD_GEN_CONFIG;
const CONTENT = STANDARD_GEN_CONTENT;
const OPTS = { knownTraitIds: Object.keys(TRAITS), knownPredicateIds: Object.keys(STANDARD_RULES.predicates) };
const gen = (seed: string): GeneratedTown => generateValidTown(seed, CFG, CONTENT, STANDARD_RULES, OPTS).town;
const validate = (t: GeneratedTown): ReturnType<typeof validateTown> => validateTown(t, CFG, OPTS);
const failed = (t: GeneratedTown): boolean =>
  validate(t).failures.some((f) => f.invariant === 'enemy-net-sane');

describe('gen §13 — the embodied spymaster and his civilian assets', () => {
  it('designates a crown-faction, non-guard, non-cast spymaster and 3 disjoint civilian assets', () => {
    const t = gen('enet-1');
    const net = t.enemyNet!;
    expect(net).toBeTruthy();

    const byId = new Map(t.fixture.npcs.map((n) => [n.id, n]));
    const guardIds = new Set(t.guards.map((g) => g.id));
    const cast = new Set<string>([t.cast!.usurper, ...t.cast!.council]);
    const informants = new Set(t.dossier!.informants);

    // exist
    expect(byId.has(net.spymaster)).toBe(true);
    for (const a of net.assets) expect(byId.has(a)).toBe(true);
    // spymaster: crown, non-guard
    expect(byId.get(net.spymaster)!.faction).toBe('crown');
    expect(guardIds.has(net.spymaster)).toBe(false);
    // 3 assets, distinct, spymaster ∉ assets, non-guard
    expect(net.assets).toHaveLength(3);
    expect(new Set(net.assets).size).toBe(3);
    expect(net.assets).not.toContain(net.spymaster);
    for (const a of net.assets) expect(guardIds.has(a)).toBe(false);
    // whole enemyNet disjoint from cast + dossier informants
    for (const id of [net.spymaster, ...net.assets]) {
      expect(cast.has(id)).toBe(false);
      expect(informants.has(id)).toBe(false);
    }
  });

  it('is deterministic — the same seed designates the same enemyNet', () => {
    expect(gen('enet-det').enemyNet).toEqual(gen('enet-det').enemyNet);
  });
});

describe('validator — enemy-net-sane', () => {
  it('passes a freshly generated town', () => {
    expect(failed(gen('enet-ok'))).toBe(false);
  });

  it('null enemyNet fails so serve rerolls', () => {
    expect(failed({ ...gen('enet-null'), enemyNet: null })).toBe(true);
  });

  it('undefined enemyNet (a hand-built town) is skipped', () => {
    const t = gen('enet-undef');
    const { enemyNet, ...rest } = t;
    void enemyNet;
    expect(failed(rest as GeneratedTown)).toBe(false);
  });

  it('a spymaster that is a guard fails', () => {
    const t = gen('enet-guard');
    expect(failed({ ...t, enemyNet: { spymaster: t.guards[0]!.id, assets: t.enemyNet!.assets } })).toBe(true);
  });

  it('a non-existent id fails', () => {
    const t = gen('enet-ghost');
    expect(failed({ ...t, enemyNet: { spymaster: 'nobody-xyz', assets: t.enemyNet!.assets } })).toBe(true);
  });

  it('spymaster ∈ assets fails', () => {
    const t = gen('enet-selfasset');
    const s = t.enemyNet!.spymaster;
    expect(failed({ ...t, enemyNet: { spymaster: s, assets: [s, ...t.enemyNet!.assets.slice(1)] } })).toBe(true);
  });

  it('duplicate assets fail (distinct)', () => {
    const t = gen('enet-dup');
    const a = t.enemyNet!.assets;
    expect(failed({ ...t, enemyNet: { spymaster: t.enemyNet!.spymaster, assets: [a[0]!, a[0]!, a[1]!] } })).toBe(true);
  });

  it('an asset that is a cast member fails (disjoint from cast)', () => {
    const t = gen('enet-cast');
    const council0 = t.cast!.council[0]!;
    expect(failed({ ...t, enemyNet: { spymaster: t.enemyNet!.spymaster, assets: [council0, ...t.enemyNet!.assets.slice(1)] } })).toBe(true);
  });

  it('an asset that is a dossier informant fails (the collision class closed at gen-time)', () => {
    const t = gen('enet-informant');
    const informant = t.dossier!.informants[0]!;
    expect(failed({ ...t, enemyNet: { spymaster: t.enemyNet!.spymaster, assets: [informant, ...t.enemyNet!.assets.slice(1)] } })).toBe(true);
  });

  it('a wrong asset count fails', () => {
    const t = gen('enet-count');
    expect(failed({ ...t, enemyNet: { spymaster: t.enemyNet!.spymaster, assets: t.enemyNet!.assets.slice(0, 2) } })).toBe(true);
  });
});
