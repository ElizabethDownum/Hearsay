import type { Tick } from '../core/time';
import type { Claim, EntityId, RumorId, VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';

export interface Venue {
  id: VenueId;
  district: 'town' | 'northside';
  access: 'public' | 'invitational' | 'private';
}

export interface Edge {
  to: EntityId;
  kind: 'kin' | 'friend' | 'colleague' | 'rival' | 'lover' | 'debtor';
  trust: number; // 0..1
}

/** Weekly schedule block, minute-of-day, half-open [from, to). */
export interface ScheduleEntry {
  days: 'weekday' | 'restday' | 'all';
  from: number;
  to: number;
  venue: VenueId;
}

export interface Npc {
  id: EntityId;
  name: string;
  home: VenueId;
  occupation: string;
  faction: 'guild' | 'crown' | 'none';
  traits: TraitId[];       // 2-4, fixed application order
  rivals: EntityId[];      // stable order — attributor fills index into this
  schedule: ScheduleEntry[];
  edges: Edge[];           // directional
}

export interface Belief {
  claim: Claim;            // the version THIS mind holds (first version sticks)
  credence: number;        // 0..1
  heardFrom: EntityId | 'injected';
  /** Last NEW-corroboration tick — drives freshness (spec: corroboration revives stale news). */
  heardAt: Tick;
  /** Set once at first hearing; never moves. The debrief timeline reads this. */
  firstHeardAt: Tick;
  timesHeard: number;
  /**
   * Apparent independence — "B only knows what attribution survived": the claim's
   * attribution if named, else the teller. Two tellers citing one origin = one source.
   */
  apparentSources: EntityId[];
}

export type BeliefStore = Record<RumorId, Belief>;

export interface TellingRecord {
  kind: 'telling';
  tick: Tick;
  venue: VenueId;
  speaker: EntityId;
  addressedTo: EntityId;
  claimId: string;
  heardBy: { id: EntityId; addressed: boolean }[];
}
export interface InjectRecord {
  kind: 'inject';
  tick: Tick;
  target: EntityId;
  claimId: string;
}
export type ChronicleEntry = TellingRecord | InjectRecord;

export interface WorldState {
  seed: string;
  tick: Tick;
  claimCounter: number;
  npcs: Record<EntityId, Npc>;
  venues: Record<VenueId, Venue>;
  beliefs: Record<EntityId, BeliefStore>;
  /** Every claim ever minted — lineage walks and the future debrief substrate. */
  claims: Record<string, Claim>;
  /** `${tellerId}:${family}` → tick of last retell (cooldown; no spam). */
  lastTold: Record<string, Tick>;
  /** Every injection and telling ever recorded — the causal-chain debrief substrate. */
  chronicle: ChronicleEntry[];
}

export interface TownFixture {
  venues: Venue[];
  npcs: Npc[];
}
