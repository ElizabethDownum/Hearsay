import type { Tick } from '../core/time';
import {
  applyAsk, applyAssignInformant, applyCard, applyCodex, applyGoTo, applyInject, applyTag, applyTell,
  type InjectSpec,
} from './actions';
import type { InquiryKey } from './perception';
import type { Rules } from './rules';
import { step } from './step';
import type { TownFixture, WorldState } from './types';
import type { EntityId, VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import { buildWorld } from './world';

export interface InjectAction {
  tick: Tick;
  kind: 'inject';
  target: EntityId;
  spec: InjectSpec;
}

export interface GoToAction {
  tick: Tick;
  kind: 'goTo';
  venue: VenueId;
}

export interface TellAction {
  tick: Tick;
  kind: 'tell';
  /** Must be in the avatar's circle at this beat — the UI offers circle-mates only. */
  to: EntityId;
  spec: InjectSpec;
}

export interface AskAction {
  tick: Tick;
  kind: 'ask';
  to: EntityId;
  about: InquiryKey;
}

export interface AssignInformantAction {
  tick: Tick;
  kind: 'assignInformant';
  informant: EntityId;
  venue: VenueId | null;
}

export interface CodexAction {
  tick: Tick;
  kind: 'codex';
  op: 'propose' | 'retract';
  npc: EntityId;
  trait: TraitId;
}

export interface CardAction {
  tick: Tick;
  kind: 'card';
  op: 'add' | 'update' | 'remove';
  id: string;
  text: string | null;
  confidence: number | null;
  links: string[] | null;
}

export interface TagAction {
  tick: Tick;
  kind: 'tag';
  op: 'add' | 'update' | 'remove';
  id: string;
  target: string | null;
  text: string | null;
}

/** The player's recorded verbs — the entire save-relevant intent surface. */
export type Action =
  | InjectAction | GoToAction | TellAction | AskAction | AssignInformantAction | CodexAction | CardAction
  | TagAction;
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
    case 'goTo':
      applyGoTo(world, action.venue);
      break;
    case 'tell':
      applyTell(world, action.to, action.spec, action.tick);
      break;
    case 'ask':
      applyAsk(world, action.to, action.about, action.tick);
      break;
    case 'assignInformant':
      applyAssignInformant(world, action.informant, action.venue, action.tick);
      break;
    case 'codex':
      applyCodex(world, action.op, action.npc, action.trait, action.tick);
      break;
    case 'card':
      applyCard(world, action.op, action.id, action.text, action.confidence, action.links, action.tick);
      break;
    case 'tag':
      applyTag(world, action.op, action.id, action.target, action.text, action.tick);
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
  // Controller rider: forward the rules already in scope so a live campaign starts at
  // rules.economy.startingCoin (20), not the 2-arg fallback 0.
  return runLogOn(buildWorld(fixture, save.seed, rules), rules, save.log, untilTick);
}
