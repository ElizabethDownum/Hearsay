import type { Tick } from '../core/time';
import type { EntityId, FieldChange, RumorId, VenueId } from '../sim/rumors/claim';
import type { TraitId } from '../sim/rumors/traits';
import type { ReportedClaim } from '../sim/enemy/state';
import type { IntelEntry } from './entry';

// The row shape and the player's board notes live in entry.ts; re-export the ones the panels
// render so Task 8 imports the whole board vocabulary from `src/intel/*` alone.
export type { IntelEntry, HypothesisCard } from './entry';

/** How much the Codex has unlocked: 0 = raw feed only, 3 = full route sketch. */
export type AssistLevel = 0 | 1 | 2 | 3;

/** One heard/reported reading of a rumor family, plus every log row that carried it. */
export interface Version { reported: ReportedClaim; firstSeenTick: Tick; entryIndexes: number[] }

/** All versions of one rumor family — the auto-clustered "same structured object". */
export interface Cluster { family: RumorId; versions: Version[]; entryIndexes: number[] }

/** The changed fields between two consecutive versions — the spans the UI highlights. */
export interface VersionDiff { fromVersion: number; toVersion: number; changes: FieldChange[] }

/** One observed hop of a rumor: where it was heard, who said it, through which channel. */
export interface RouteHop {
  tick: Tick; venue: VenueId; speaker: EntityId; addressedTo: EntityId; via: IntelEntry['via'];
}

/**
 * The whole Evidence Board as one serializable snapshot, gated by assist level. Each derived
 * pane is `null` until its level unlocks it, so panels render exactly what the player has earned.
 */
export interface BoardView {
  level: AssistLevel;
  entries: IntelEntry[];
  clusters: Cluster[] | null;                      // level >= 1
  diffs: Record<RumorId, VersionDiff[]> | null;    // level >= 1
  suggestions: Record<RumorId, TraitId[]> | null;  // level >= 2 (Task 5 wires the real fn; null until then)
  routes: Record<RumorId, RouteHop[]> | null;      // level >= 3
}
