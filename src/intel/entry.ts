import type { Tick } from '../core/time';
import type { ClaimId, EntityId, RumorId, VenueId } from '../sim/rumors/claim';
import type { TraitId } from '../sim/rumors/traits';
import type { InquiryKey } from '../sim/perception';
import type { ReportedClaim } from '../sim/enemy/state';
import type { MessageId, SpokenNetworkPayload } from '../sim/directives/types';

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

/**
 * A player-authored margin note pinned to a target (amendment #5b). UI-only, fallible by right —
 * existence of the target is never validated, so a hunch may point anywhere, including nowhere.
 * Read by nothing in src/sim/, src/world/, or src/intel model functions: it can never steer a
 * decision (the sim-blind property test in tests/sim/tags.test.ts proves it).
 */
export interface TagNote {
  id: string;
  /** `${kind}:${id}` — kind ∈ npc | entry | cluster | informant | venue. Existence NOT validated: hunches may point anywhere. */
  target: string;
  text: string;
  createdTick: Tick;
  updatedTick: Tick;
}

export interface NetworkIntelEntry {
  tick: Tick;
  venue: VenueId;
  via: 'self' | EntityId;
  overheard: boolean;
  speaker: EntityId;
  addressedTo: EntityId;
  messageId: MessageId;
  spoken: SpokenNetworkPayload;
}

export interface KnownAssetFact { asset: EntityId; factIndex: number; receivedAt: Tick }
export interface RequestedPost { informant: EntityId; venue: VenueId | null; authoredAt: Tick }
export interface CourierPlanningMark {
  id: string;
  asset: EntityId;
  target: EntityId;
  from: VenueId | null;
  to: VenueId | null;
  authoredAt: Tick;
  acknowledgedAt: Tick | null;
}

/** The player's private knowledge substrate: informants, captured feed, board notes, and margin notes. */
export interface IntelState {
  informants: InformantSpec[];
  log: IntelEntry[];
  cards: HypothesisCard[];
  codex: CodexHypothesis[];
  tags: TagNote[];
  network?: NetworkIntelEntry[];
  knownAssetFacts?: KnownAssetFact[];
  requestedPosts?: RequestedPost[];
  courierPlans?: CourierPlanningMark[];
}
