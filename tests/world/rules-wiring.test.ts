import { worldFromTown } from '../../src/world/attach';
import { runCampaign } from '../../src/sim/campaign';
import { runBotCampaign } from '../../src/bots/runner';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { blitzCrier } from '../../src/bots/archetypes';
import type { GeneratedTown } from '../../src/world/types';

const START = STANDARD_ECONOMY.startingCoin; // 20
const townFor = (seed: string): GeneratedTown =>
  generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES).town;

/**
 * Controller rider: Rules threaded through the production buildWorld call sites so live campaigns
 * start at STANDARD_ECONOMY.startingCoin (20), not the 2-arg fallback 0. Engine modules never import
 * content — rules are PASSED IN from composition roots — so worldFromTown gains an optional rules
 * param, and the campaign/bot entries forward the rules already in scope.
 */
describe('Rules wired through production buildWorld call sites → live campaigns start at coin 20', () => {
  it('worldFromTown(town, seed, STANDARD_RULES) seeds the treasury at 20', () => {
    expect(worldFromTown(townFor('rw-1'), 'rw-1', STANDARD_RULES).coin).toBe(START);
  });

  it('worldFromTown without rules still falls back to 0 (hand-built fixture tests stay unbroken)', () => {
    expect(worldFromTown(townFor('rw-2'), 'rw-2').coin).toBe(0);
  });

  it('runCampaign forwards its rules → coin 20 at tick 0', () => {
    const world = runCampaign(TESTFORD, STANDARD_RULES, { seed: 'rw-3', log: [] }, 0);
    expect(world.coin).toBe(START);
  });

  it('runBotCampaign forwards its rules → coin 20 (day 0 is pre-stipend)', () => {
    const { world } = runBotCampaign(TESTFORD, STANDARD_RULES, 'rw-4', blitzCrier, 1);
    expect(world.coin).toBe(START);
  });
});
