import type { Tick } from '../core/time';
import { applyInject, type InjectSpec } from './actions';
import type { Rules } from './rules';
import { step } from './step';
import type { TownFixture, WorldState } from './types';
import type { EntityId } from './rumors/claim';
import { buildWorld } from './world';

export interface InjectAction {
  tick: Tick;
  kind: 'inject';
  target: EntityId;
  spec: InjectSpec;
}

/** The player's recorded verbs. Union grows in later plans (assign informant, …). */
export type Action = InjectAction;
export type ActionLog = Action[];

/** A complete campaign: the world regrows from these two values alone. */
export interface Save {
  seed: string;
  log: ActionLog;
}

export function applyAction(world: WorldState, action: Action): void {
  if (action.tick !== world.tick) {
    throw new Error(`applyAction: action tick ${action.tick} != world tick ${world.tick}`);
  }
  switch (action.kind) {
    case 'inject':
      applyInject(world, action.target, action.spec);
      break;
  }
}

function validateLog(log: ActionLog): void {
  log.forEach((a, i) => {
    if (a.tick < 0) throw new Error(`runCampaign: negative tick at index ${i}`);
    if (i > 0 && a.tick < log[i - 1]!.tick) {
      throw new Error(`runCampaign: log out of order at index ${i} (${a.tick} < ${log[i - 1]!.tick})`);
    }
  });
}

/**
 * Deterministic replay: actions with tick === world.tick apply immediately
 * before that tick steps, in log order. Same save + same untilTick = same world.
 */
export function runCampaign(
  fixture: TownFixture, rules: Rules, save: Save, untilTick: Tick,
): WorldState {
  validateLog(save.log);
  const world = buildWorld(fixture, save.seed);
  let i = 0;
  while (world.tick < untilTick) {
    while (i < save.log.length && save.log[i]!.tick === world.tick) {
      applyAction(world, save.log[i]!);
      i += 1;
    }
    step(world, rules);
  }
  return world;
}
