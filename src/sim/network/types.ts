import type { Tick } from '../../core/time';
import type { EntityId, RumorId, VenueId } from '../rumors/claim';
import type { InjectSpec } from '../actions';

export type Principal = 'player' | 'enemy';

/** The four recruitment handles (spec's MICE). `null` marks a dossier freebie (a legacy loyalist). */
export type Mice = 'money' | 'ideology' | 'coercion' | 'ego';

/**
 * One fact an asset learned through USE — the mechanical compartment interrogation reads back.
 * Facts are the record, never summaries: who recruited them, which drops they know, which ops
 * they carried. The record is only what that principal's actions actually exposed.
 */
export interface CompartmentFact {
  tick: Tick;
  kind: 'recruited-by' | 'knows-drop' | 'carried-story' | 'met-asset' | 'paid-at' | 'attended-hosting';
  /** The concrete referent: recruiter id ('player' or cutout), drop id, family, other asset id, venue. */
  ref: string;
}

export interface AssetRecord {
  id: EntityId;
  /** null = the two dossier freebies (legacy loyalists — no MICE handle). */
  mice: Mice | null;
  wagePaidThroughDay: number;
  /**
   * Disposition rides the NPC's ACTUAL trust edge toward the player (amendment #4c: one physics).
   * This record holds only bookkeeping the edge can't: strikes, sweeteners.
   */
  strikes: number;
  facts: CompartmentFact[];
  /**
   * Plan 8 Task 8 — the turncoat flag, HIDDEN from every player-facing selector (structurally
   * invisible: the player catches a turncoat ONLY by diffing their own channels, never a UI tell).
   * On a PLAYER-side asset (`assets`): they secretly serve the enemy — their reports DOCTOR and they
   * LEAK a compartment fact each week. On an ENEMY-side asset (`enemyAssets`): they have flipped to
   * YOU — a walk-in who volunteers a real sketch feature each week. Latched once true (v1: a turncoat
   * never comes back). Undefined = loyal — and `undefined` never enters the state hash, so every
   * pre-Task-8 record hashes exactly as before.
   */
  turned?: boolean;
  /** Player-side turncoat leak bookkeeping: how many compartment facts have already been handed to
   *  the enemy. The weekly leak picks `facts[leakedThrough]` — the oldest unleaked. Undefined = 0. */
  leakedThrough?: number;
  /** Enemy-side walk-in bookkeeping: how many subject-bearing sketch features this walk-in has
   *  already revealed. The weekly reveal picks the next one. Undefined = 0. */
  revealedThrough?: number;
}

export interface DeadDrop { id: string; venue: VenueId; knownBy: EntityId[] }

/**
 * A courier run queued on one of the player's assets (Task 5): the payload, and the target it is
 * bound for. Store-and-forward made purchasable — it waits on the ASSET's own schedule and delivers
 * at their next beat sharing a circle with the target (step's deliverCouriers; the schedule does the
 * walking). Consumed deterministically; expires 3 days after tasking, undelivered, with NO refund.
 */
export interface CourierTasking {
  asset: EntityId;
  spec: InjectSpec;
  target: EntityId;
  /** null = a FACE handoff (the avatar met the courier — a `met-asset` fact); a drop id = the
   *  handoff leg was skipped via a dead drop (no co-location, no `met-asset` — the drop's knownBy
   *  grew instead: the compartmentalization you can point to in the record). */
  viaDrop: string | null;
  /** The tick the run was tasked — origin of the 3-day expiry clock. */
  queuedTick: Tick;
}

export interface NetworkState {
  /** Superset of intel.informants ids — the roster is sim truth, intel is the player's view. */
  assets: AssetRecord[];
  drops: DeadDrop[];
  /** Enemy-side mirror, gen-seeded (Task 7): HIS assets. Same shapes — one machinery. */
  enemyAssets: AssetRecord[];
  /**
   * The embodied enemy spymaster's id, gen-seeded (Task 7) — or `null` in a headless / hand-built
   * world with no enemyNet. World-side state (NEVER digest input): the `runEnemyDay` budget spend
   * reads HIS belief store through this handle, and `applyRecruit` excludes him. The digest signature
   * stays `(EnemyState, day, rules)` and never sees this field.
   */
  spymaster: EntityId | null;
  /** Pending courier runs (Task 5), consumed at the delivery beat and expired at 3 days. */
  pendingCouriers: CourierTasking[];
  /** Plan 8 Task 10 — the brokerage's dedupe key: one sale per (family, buyer) pair, ever. */
  sales: { family: RumorId; buyer: EntityId }[];
}

/** A fresh, empty network compartment — the neutral world-init value (buildWorld seeds this). */
export function emptyNetworkState(): NetworkState {
  return { assets: [], drops: [], enemyAssets: [], spymaster: null, pendingCouriers: [], sales: [] };
}
