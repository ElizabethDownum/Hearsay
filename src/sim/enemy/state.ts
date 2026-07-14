import type { Tick } from '../../core/time';
import type { ClaimId, EntityId, PredicateId, RumorId, VenueId } from '../rumors/claim';
import { SOMEONE } from '../rumors/claim';
import type { DirectiveId, SpokenNetworkPayload } from '../directives/types';
import type { CompartmentFact } from '../network/types';

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

export interface NetworkEvidence {
  messageId: string;
  sourceDirectiveId: DirectiveId | null;
  spoken: SpokenNetworkPayload;
}

export interface EvidenceBase {
  tick: Tick;
  venue: VenueId;
  observer: EntityId;
  overheard: boolean;
  speaker: EntityId;
  addressedTo: EntityId;
}

export type EvidenceEntry =
  | (EvidenceBase & {
      kind: 'utterance'; mode: 'telling' | 'answer'; claimId: ClaimId; family: RumorId;
      reported: ReportedClaim; about: null; network?: never; leaked?: never;
    })
  | (EvidenceBase & {
      kind: 'asking'; mode: null; claimId: null; family: RumorId | null;
      reported: null; about: InquiryKeyData; network?: never; leaked?: never;
    })
  | (EvidenceBase & {
      kind: 'network'; mode: null; claimId: ClaimId | null; family: RumorId | null;
      reported: ReportedClaim | null; about: InquiryKeyData | null;
      network: NetworkEvidence;
      leaked?: { from: EntityId; fact: CompartmentFact };
    });

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
