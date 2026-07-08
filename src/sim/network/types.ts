import type { Tick } from '../../core/time';
import type { EntityId, VenueId } from '../rumors/claim';
import type { InjectSpec } from '../actions';

/** The four recruitment handles (spec's MICE). `null` marks a dossier freebie (a legacy loyalist). */
export type Mice = 'money' | 'ideology' | 'coercion' | 'ego';

/**
 * One fact an asset learned through USE — the mechanical compartment interrogation reads back.
 * Facts are the record, never summaries: who recruited them, which drops they know, which ops
 * they carried. The record is only what the player's actions actually exposed.
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
  /** Pending courier runs (Task 5), consumed at the delivery beat and expired at 3 days. */
  pendingCouriers: CourierTasking[];
}

/** A fresh, empty network compartment — the neutral world-init value (buildWorld seeds this). */
export function emptyNetworkState(): NetworkState {
  return { assets: [], drops: [], enemyAssets: [], pendingCouriers: [] };
}
