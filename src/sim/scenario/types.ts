import type { ClaimId, EntityId, RumorId, VenueId } from '../rumors/claim';

/** The seed-dealt principals. Council = the town's keystones wearing robes (gen §11). */
export interface ScenarioCast { usurper: EntityId; council: EntityId[] }

/** Win when `quorum` council members hold an act-tier damaging belief about the usurper. */
export interface CouncilTurnsCondition { kind: 'council-turns'; quorum: number }
/** Single-member union on purpose — the referee switches exhaustively and default-throws. */
export type WinCondition = CouncilTurnsCondition;

/** Injected like Rules/GenContent — never stored in WorldState (only its data fields are copied). */
export interface ScenarioDef {
  id: string;
  name: string;
  /** Doom clock: playable days are 0..days-1; the coronation dawns on day `days`. */
  days: number;
  /** Term-registry id (Task 10) for the objective line the day-0 UI shows. */
  objectiveTerm: string;
  win: WinCondition;
}

/** Fair-cop on endings: every resolution carries evidence that resolves against world records. */
export interface TurnEvidence { npc: EntityId; family: RumorId; claimId: ClaimId; credence: number }
export interface SketchEvidence { featureId: string; subject: EntityId }

export type Resolution =
  | { kind: 'won'; day: number; turned: TurnEvidence[] }
  | { kind: 'lost-clock'; day: number; turned: TurnEvidence[] }      // partial progress — debrief material
  | { kind: 'lost-exposed'; day: number; features: SketchEvidence[] }
  // Caught in the act: a guard's feed captured the avatar as the speaker of an utterance. `heardBy`
  // is that guard, `venue` where the words were spoken — the fair-cop evidence for the arrest.
  | { kind: 'lost-caught'; day: number; heardBy: EntityId; venue: VenueId };

export type ScenarioStatus = 'running' | 'won' | 'lost-clock' | 'lost-exposed' | 'lost-caught';

/** Pure data (WinCondition is data): serializable, hashWorld-covered, replay-stable. */
export interface ScenarioState {
  defId: string;
  days: number;
  win: WinCondition;
  cast: ScenarioCast;
  status: ScenarioStatus;
  resolution: Resolution | null;
}
