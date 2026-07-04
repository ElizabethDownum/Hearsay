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
  claim: Claim;            // the version THIS mind holds
  credence: number;        // 0..1
  heardFrom: EntityId | 'injected';
  heardAt: Tick;
  timesHeard: number;
  distinctSources: EntityId[]; // apparent independence — corroboration for skeptic gates
}

export type BeliefStore = Record<RumorId, Belief>;

export interface WorldState {
  seed: string;
  tick: Tick;
  claimCounter: number;
  npcs: Record<EntityId, Npc>;
  venues: Record<VenueId, Venue>;
  beliefs: Record<EntityId, BeliefStore>;
  /** `${tellerId}:${family}` → tick of last retell (cooldown; no spam). */
  lastTold: Record<string, Tick>;
}

export interface TownFixture {
  venues: Venue[];
  npcs: Npc[];
}
