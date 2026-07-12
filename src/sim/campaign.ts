import type { Tick } from '../core/time';
import {
  applyAsk, applyAssignInformant, applyCard, applyCodex, applyCourier, applyDebrief, applyGoTo, applyHost,
  applyInject, applyMeet, applyRecruit, applySell, applySetDrop, applyTag, applyTell,
  type InjectSpec,
} from './actions';
import type { InquiryKey } from './perception';
import type { Rules } from './rules';
import { isTerminal } from './scenario/referee';
import { step } from './step';
import type { TownFixture, WorldState } from './types';
import type { EntityId, RumorId, VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import type { Mice } from './network/types';
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

export interface RecruitAction {
  tick: Tick;
  kind: 'recruit';
  target: EntityId;
  mice: Mice;
  /** Only read for coercion — the damaging family (about the target) you hold in your intel log. */
  leverageFamily: RumorId | null;
}

export interface SetDropAction {
  tick: Tick;
  kind: 'setDrop';
  id: string;
  /** Public venues only — the drop is placed and known by the avatar implicitly. */
  venue: VenueId;
}

export interface CourierAction {
  tick: Tick;
  kind: 'courier';
  /** One of YOUR assets — the carrier whose schedule does the walking. */
  asset: EntityId;
  spec: InjectSpec;
  target: EntityId;
  /** null = face handoff (co-locate now); a drop id = via the dead drop (no co-location). */
  viaDrop: string | null;
}

export interface MeetAction {
  tick: Tick;
  kind: 'meet';
  /** One of YOUR assets — pulled to the safehouse for the next beat (a private 2-person circle). */
  asset: EntityId;
}

export interface HostAction {
  tick: Tick;
  kind: 'host';
  /** The standing's own room: salon (noble) or a back-room (lowlife). */
  venue: VenueId;
  /** ≤ 6 NPCs, each trusting the player ≥ 0.5 — the circle you pick. */
  invitees: EntityId[];
}

export interface DebriefAction {
  tick: Tick;
  kind: 'debrief';
  /** One of YOUR assets, present at the safehouse this beat — no family field (Amendment #4b's
   *  typed interface): the asset's own belief store picks the ONE family (oldest firstHeardAt). */
  asset: EntityId;
}

export interface SellAction {
  tick: Tick;
  kind: 'sell';
  /** The family you hold intel on — price and the buyer's belief-entry both read your OWN
   *  intel log's best (highest-severity) version, never world truth. */
  family: RumorId;
  /** Must be in the avatar's circle THIS beat — the UI offers circle-mates only (the tell shape). */
  buyer: EntityId;
}

/** The player's recorded verbs — the entire save-relevant intent surface. */
export type Action =
  | InjectAction | GoToAction | TellAction | AskAction | AssignInformantAction | CodexAction | CardAction
  | TagAction | RecruitAction | SetDropAction | CourierAction | MeetAction | HostAction | DebriefAction
  | SellAction;
export type ActionLog = Action[];

/** A complete campaign: the world regrows from these two values alone. */
export interface Save {
  seed: string;
  log: ActionLog;
}

/**
 * `rules` is optional so the existing verb call sites (tell/ask/goTo/... in tests and harnesses)
 * stay untouched. `recruit` is the one verb that needs it — economy prices + predicate valence —
 * and REFUSES loudly if applied without rules (never silently no-ops an untrusted save). runLogOn,
 * the app session, and the bot runner all forward the rules already in their scope.
 */
export function applyAction(world: WorldState, action: Action, rules?: Rules): void {
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
    case 'recruit':
      if (!rules) throw new Error('applyAction: recruit requires rules (economy prices + predicate valence)');
      applyRecruit(world, action.target, action.mice, action.leverageFamily, action.tick, rules);
      break;
    case 'setDrop':
      if (!rules) throw new Error('applyAction: setDrop requires rules (economy prices)');
      applySetDrop(world, action.id, action.venue, rules);
      break;
    case 'courier':
      if (!rules) throw new Error('applyAction: courier requires rules (economy prices + predicate valence)');
      applyCourier(world, action.asset, action.spec, action.target, action.viaDrop, action.tick, rules);
      break;
    case 'meet':
      // A meet is FREE (the walk is the price) — no rules needed, like tell/goTo.
      applyMeet(world, action.asset, action.tick);
      break;
    case 'host':
      if (!rules) throw new Error('applyAction: host requires rules (economy prices)');
      applyHost(world, action.venue, action.invitees, action.tick, rules);
      break;
    case 'debrief':
      // Not priced in coin (the meet precedent) — but the ideology refusal reads predicate valence
      // and the intel entry rides reportThrough's trait chain, so rules is required all the same.
      if (!rules) throw new Error('applyAction: debrief requires rules (predicate valence + reportThrough traits)');
      applyDebrief(world, action.asset, action.tick, rules);
      break;
    case 'sell':
      if (!rules) throw new Error('applyAction: sell requires rules (economy prices)');
      applySell(world, action.buyer, action.family, action.tick, rules);
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
    if (isTerminal(world)) break;
    while (i < log.length && log[i]!.tick === world.tick) {
      applyAction(world, log[i]!, rules);
      i += 1;
    }
    step(world, rules);
    if (isTerminal(world)) break;
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
