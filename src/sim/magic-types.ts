import type { Tick } from '../core/time';
import type { ReportedClaim } from './enemy/state';
import type { ClaimId, EntityId, VenueId } from './rumors/claim';
import type { Edge } from './types';

export interface DepartedEdge { from: EntityId; to: EntityId; kind: Edge['kind'] }
export interface DepartedWitness {
  id: string; name: string; secretId: string;
  reported: ReportedClaim; edge: DepartedEdge;
}
export interface RuntimeDeparted extends DepartedWitness { claimId: ClaimId }
export interface SeanceRecord {
  kind: 'seance'; tick: Tick; operation: string; venue: VenueId;
  departedId: string; claimId: ClaimId; edge: DepartedEdge;
}
export interface NightVisitRecord {
  kind: 'night-visit'; tick: Tick; venue: VenueId; observer: EntityId; actor: EntityId;
}
