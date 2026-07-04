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
    default: {
      // Saves are untrusted JSON — an unknown kind must fail loudly, never silently no-op.
      const kind = (action as { kind: string }).kind;
      throw new Error(`applyAction: unknown action kind '${kind}'`);
    }
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
 * before that tick steps, in log order. Same world + same log + same untilTick = same world.
 * The seam enemy-attached worlds (worldFromTown) replay through.
 */
export function runLogOn(
  world: WorldState, rules: Rules, log: ActionLog, untilTick: Tick,
): WorldState {
  validateLog(log);
  let i = 0;
  while (world.tick < untilTick) {
    while (i < log.length && log[i]!.tick === world.tick) {
      applyAction(world, log[i]!);
      i += 1;
    }
    step(world, rules);
  }
  return world;
}

export function runCampaign(
  fixture: TownFixture, rules: Rules, save: Save, untilTick: Tick,
): WorldState {
  return runLogOn(buildWorld(fixture, save.seed), rules, save.log, untilTick);
}
