import type { Tick } from '../../core/time';
import type { ClaimId, EntityId, PredicateId, RumorId, VenueId } from '../rumors/claim';
import { SOMEONE } from '../rumors/claim';

/** An enemy asset: an NPC id + how sharp their sampling is (0..1]. */
export interface ObserverSpec { id: EntityId; vigilance: number }

/** Street knowledge: who lives/works where. NEVER beliefs, traits, edges, or schedules. */
export interface TownMapVenue { id: VenueId; district: string; access: 'public' | 'invitational' | 'private' }
export interface TownMapPerson { id: EntityId; occupation: string; district: string }
export interface TownMap { venues: TownMapVenue[]; directory: TownMapPerson[] }

/** What one observer reported from one observation — post trait-filter (reports lie). */
export interface ReportedClaim {
  subject: EntityId | typeof SOMEONE;
  predicate: PredicateId;
  object: EntityId | typeof SOMEONE | null;
  count: number | null;
  severity: 1 | 2 | 3 | 4 | 5;
  place: VenueId | null;
  attribution: EntityId | typeof SOMEONE;
}

export type InquiryKeyData = { family: RumorId } | { subject: EntityId };

export interface EvidenceEntry {
  tick: Tick;
  venue: VenueId;
  observer: EntityId;
  overheard: boolean;
  speaker: EntityId;
  addressedTo: EntityId;
  kind: 'utterance' | 'asking';
  /** For utterances: was this ordinary gossip or a compelled/queried answer? null for askings. */
  mode: 'telling' | 'answer' | null;
  claimId: ClaimId | null;    // null for askings
  family: RumorId | null;     // null for subject-keyed askings
  reported: ReportedClaim | null;
  about: InquiryKeyData | null; // for askings
  /**
   * Plan 8 Task 8 — a turned player-side asset's WEEKLY leak: one compartment fact handed to the
   * enemy through a lawful in-fiction channel (the turncoat meets their handler; this is inside
   * testimony, not overheard gossip). Present ONLY on leak entries; every capture-sourced entry
   * leaves it undefined (so pre-Task-8 evidence hashes unchanged). The digest is BLIND to it — the
   * fold reads `family`/`reported` (both null on a leak), so the no-omniscience pillar is unmoved.
   */
  leaked?: { from: EntityId; fact: { tick: Tick; kind: string; ref: string } };
}

export interface SketchFeature {
  id: string;
  kind: 'district-activity' | 'entry-point' | 'origin-vague' | 'carrier-profile';
  day: number;
  family: RumorId | null;
  subject: EntityId | null;
  district: string | null;
  detail: string;
  /** Fair-cop law: never empty; each ref resolves to a chronicle entry the observer heard. */
  evidence: { tick: Tick; observer: EntityId; claimId: ClaimId | null }[];
}

export interface InquiryOrder { asker: EntityId; about: InquiryKeyData; expiresDay: number }
/** A guard posted to a specific venue for a district watch. */
export interface WatchPost { guard: EntityId; venue: VenueId }
export interface WatchOrder { district: string; posts: WatchPost[]; startDay: number }
export interface InterrogationOrder { target: EntityId; guard: EntityId; day: number; about: InquiryKeyData; venue: VenueId }

export interface EnemyDecision {
  day: number;
  features: SketchFeature[];
  inquiries: InquiryOrder[];
  watches: WatchOrder[];
  interrogations: InterrogationOrder[];
}

export interface EnemyState {
  observers: ObserverSpec[];
  map: TownMap;
  evidence: EvidenceEntry[];
  /** Evidence index the digest has consumed through — nightly digests read the increment. */
  digestedThrough: number;
  sketch: SketchFeature[];
  watchedDistricts: string[];
  /** Digest output log — debrief substrate and the no-omniscience test surface. */
  decisions: EnemyDecision[];
  featureCounter: number;
  /** `${target}:${key}` interrogations already ordered — never repeated. */
  interrogated: string[];
  /** Inquiry dedupe keys already issued (`f:${family}` / `s:${subject}`). */
  inquiriesIssued: string[];
}

export function emptyEnemyState(): EnemyState {
  return {
    observers: [], map: { venues: [], directory: [] }, evidence: [], digestedThrough: 0,
    sketch: [], watchedDistricts: [], decisions: [], featureCounter: 0,
    interrogated: [], inquiriesIssued: [],
  };
}
