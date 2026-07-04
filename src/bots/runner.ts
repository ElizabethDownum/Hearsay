import { TICKS_PER_DAY } from '../core/time';
import { applyAction, type Action, type Save } from '../sim/campaign';
import type { Rules } from '../sim/rules';
import { step } from '../sim/step';
import type { TownFixture, WorldState } from '../sim/types';
import { buildWorld } from '../sim/world';
import type { Bot } from './archetypes';

export interface BotRun {
  save: Save;      // replaying this regrows .world exactly
  world: WorldState;
}

/** Live-drive a bot day by day; the emitted save must replay to the same world. */
export function runBotCampaign(
  fixture: TownFixture, rules: Rules, seed: string, bot: Bot, days: number,
): BotRun {
  const world = buildWorld(fixture, seed);
  const log: Action[] = [];
  for (let day = 0; day < days; day++) {
    const dayEnd = (day + 1) * TICKS_PER_DAY;
    const actions = bot.decide(world, rules, day);
    for (const a of actions) {
      if (a.tick < world.tick || a.tick >= dayEnd) {
        throw new Error(`bot '${bot.name}': action tick ${a.tick} outside day ${day}`);
      }
    }
    log.push(...actions);
    let i = 0;
    while (world.tick < dayEnd) {
      while (i < actions.length && actions[i]!.tick === world.tick) {
        applyAction(world, actions[i]!);
        i += 1;
      }
      step(world, rules);
    }
  }
  return { save: { seed, log }, world };
}
