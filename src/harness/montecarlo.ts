import type { Bot } from '../bots/archetypes';
import { runBotCampaign } from '../bots/runner';
import type { Rules } from '../sim/rules';
import type { TownFixture } from '../sim/types';
import { campaignMetrics, familiesOf, type CampaignMetrics } from './metrics';

export interface Aggregate { mean: number; min: number; max: number }

export interface McResult {
  bot: string;
  perSeed: { seed: string; families: CampaignMetrics[] }[];
  reach: Aggregate;
  believers: Aggregate;
}

const aggregate = (values: number[]): Aggregate => ({
  mean: values.reduce((a, b) => a + b, 0) / values.length,
  min: Math.min(...values),
  max: Math.max(...values),
});

export function runMonteCarlo(config: {
  fixture: TownFixture; rules: Rules; bot: Bot; seeds: string[]; days: number;
}): McResult {
  if (config.seeds.length === 0) throw new Error('runMonteCarlo: empty seed list');
  const perSeed = config.seeds.map((seed) => {
    const { world } = runBotCampaign(config.fixture, config.rules, seed, config.bot, config.days);
    return { seed, families: familiesOf(world).map((f) => campaignMetrics(world, f)) };
  });
  const perSeedMean = (pick: (m: CampaignMetrics) => number): number[] =>
    perSeed.map((s) =>
      s.families.length === 0 ? 0 : s.families.map(pick).reduce((a, b) => a + b, 0) / s.families.length,
    );
  return {
    bot: config.bot.name,
    perSeed,
    reach: aggregate(perSeedMean((m) => m.reach)),
    believers: aggregate(perSeedMean((m) => m.believers)),
  };
}
