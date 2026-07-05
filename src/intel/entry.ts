import type { Tick } from '../core/time';
import type { ClaimId, EntityId, RumorId, VenueId } from '../sim/rumors/claim';
import type { TraitId } from '../sim/rumors/traits';
import type { InquiryKey } from '../sim/perception';
import type { ReportedClaim } from '../sim/enemy/state';

/** A recruited informant and where the player has posted them (null = unassigned). */
export interface InformantSpec { id: EntityId; assignedVenue: VenueId | null }

/** A player-authored hypothesis on the Evidence Board. */
export interface HypothesisCard {
  id: string;
  text: string;
  confidence: number;
  links: string[];
  createdTick: Tick;
  updatedTick: Tick;
}

/** A player guess that an NPC carries a trait — the Codex's working notes. */
export interface CodexHypothesis { npc: EntityId; trait: TraitId; proposedAt: Tick }

/**
 * One captured observation, wide-and-flat with nulls for absence — the single row shape
 * the whole board stack shares. `reported` reuses the enemy's ReportedClaim (7 content
 * fields as heard/reported), not because intel is enemy-specific but because that IS the
 * "claim as filtered by an observer" shape.
 */
export interface IntelEntry {
  tick: Tick; venue: VenueId;
  via: 'self' | 'dossier' | EntityId;   // EntityId = the reporting informant
  kind: 'utterance' | 'asking' | 'presence' | 'trait-read' | 'edge-read' | 'hint';
  overheard: boolean;
  speaker: EntityId | null; addressedTo: EntityId | null;
  mode: 'telling' | 'answer' | null; authority: boolean;
  claimId: ClaimId | null; family: RumorId | null;
  reported: ReportedClaim | null;       // as heard (self) / as reported (informant-filtered)
  about: InquiryKey | null;
  actor: EntityId | null;                                   // presence
  npc: EntityId | null; trait: TraitId | null;              // trait-read
  edgeFrom: EntityId | null; edgeTo: EntityId | null; edgeKind: string | null; // edge-read
  hintAbout: EntityId | null; hintWitness: EntityId | null; // hint
}

/** The player's private knowledge substrate: informants, captured feed, and board notes. */
export interface IntelState {
  informants: InformantSpec[];
  log: IntelEntry[];
  cards: HypothesisCard[];
  codex: CodexHypothesis[];
}
