import type { Tick } from '../core/time';
import type { Bot } from '../bots/archetypes';
import { runBotCampaignOn } from '../bots/runner';
import type { Rules } from '../sim/rules';
import type { TownFixture, WorldState } from '../sim/types';
import { buildWorld } from '../sim/world';
import { campaignMetrics, playerFamiliesOf, type CampaignMetrics } from './metrics';

export interface Aggregate { mean: number; min: number; max: number }

export interface McSeedResult {
  seed: string;
  families: CampaignMetrics[];
  /** Every claim minted this seed (registry growth) — the standing pre-saturation metric. */
  claimsTotal: number;
  /** world.enemy.sketch.length; null when this seed's world had no observers. */
  sketchCount: number | null;
  /** Nightly enemy digests that ran this seed (0 without observers) — proves the machinery fired. */
  decisions: number;
}

export interface McResult {
  bot: string;
  perSeed: McSeedResult[];
  reach: Aggregate;
  believers: Aggregate;
  /** Total claims minted per seed. */
  claims: Aggregate;
  /** Per-seed mean halfTownTick over families that crossed; null if none crossed anywhere. */
  halfTown: Aggregate | null;
  /** Per-seed world.enemy.sketch.length; null when no seed had observers. */
  sketchFeatures: Aggregate | null;
}

const aggregate = (values: number[]): Aggregate => ({
  mean: values.reduce((a, b) => a + b, 0) / values.length,
  min: Math.min(...values),
  max: Math.max(...values),
});

/**
 * Metrics are always taken over playerFamiliesOf — the campaign's OWN stories. Secrets
 * (genesis roots) and counter-spin (NPC roots) are real families but not the player's, and
 * must never inflate reach/pacing. Exactly one of `fixture` / `makeWorld`: `fixture` builds a
 * fresh world per seed (no enemy); `makeWorld` seeds an arbitrary world (e.g. worldFromTown,
 * enemy roster wired) that the bot then drives via runBotCampaignOn.
 */
export function runMonteCarlo(config: {
  fixture?: TownFixture;
  makeWorld?: (seed: string) => WorldState;
  rules: Rules; bot: Bot; seeds: string[]; days: number;
}): McResult {
  if (config.seeds.length === 0) throw new Error('runMonteCarlo: empty seed list');
  if ((config.fixture === undefined) === (config.makeWorld === undefined)) {
    throw new Error('runMonteCarlo: pass exactly one of fixture / makeWorld');
  }

  const perSeed: McSeedResult[] = config.seeds.map((seed) => {
    // Controller rider: the fixture path forwards rules so MC worlds start at the real startingCoin
    // (the makeWorld path is caller-composed and passes its own rules to worldFromTown).
    const world0 = config.makeWorld ? config.makeWorld(seed) : buildWorld(config.fixture!, seed, config.rules);
    const { world } = runBotCampaignOn(world0, config.rules, config.bot, config.days);
    return {
      seed,
      families: playerFamiliesOf(world).map((f) => campaignMetrics(world, f)),
      claimsTotal: Object.keys(world.claims).length,
      sketchCount: world.enemy.observers.length === 0 ? null : world.enemy.sketch.length,
      decisions: world.enemy.decisions.length,
    };
  });

  const perSeedMean = (pick: (m: CampaignMetrics) => number): number[] =>
    perSeed.map((s) =>
      s.families.length === 0 ? 0 : s.families.map(pick).reduce((a, b) => a + b, 0) / s.families.length,
    );

  // Per-seed mean halfTownTick over the families that actually crossed half the town;
  // seeds where nothing crossed contribute nothing. Null when no seed had a crossing.
  const crossings = perSeed
    .map((s): number | null => {
      const ticks = s.families
        .map((f) => f.halfTownTick)
        .filter((t): t is Tick => t !== null);
      return ticks.length === 0 ? null : ticks.reduce((a, b) => a + b, 0) / ticks.length;
    })
    .filter((v): v is number => v !== null);

  const sketchCounts = perSeed.map((s) => s.sketchCount);

  return {
    bot: config.bot.name,
    perSeed,
    reach: aggregate(perSeedMean((m) => m.reach)),
    believers: aggregate(perSeedMean((m) => m.believers)),
    claims: aggregate(perSeed.map((s) => s.claimsTotal)),
    halfTown: crossings.length === 0 ? null : aggregate(crossings),
    sketchFeatures: sketchCounts.every((n) => n === null)
      ? null
      : aggregate(sketchCounts.map((n) => n ?? 0)),
  };
}
