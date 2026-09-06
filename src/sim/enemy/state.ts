import type { Tick } from '../../core/time';
import type { ClaimId, EntityId, PredicateId, RumorId, VenueId } from '../rumors/claim';
import { SOMEONE } from '../rumors/claim';
import type { DirectiveId, MessageId, SpokenNetworkPayload } from '../directives/types';
import type { CompartmentFact } from '../network/types';

// 15-alignment (spec): interrogations 900–1020. Watches retuned to 960–1140 (P6-T8): measured
// against evening gossip flow — the old {1080,1200} sat in a retell-cooldown lull and caught none
// of the 480/720/960/1200 bursts (1200 exclusive), so a watch's first capture arrived a day late.
// {960,1140} straddles the 960 cooldown-burst shoulder: +49% total public-venue utterance exposure
// over 5 procgen seeds, winning on every seed (tests/harness/watch-window.report.test.ts). Both
// bounds 15-aligned. INTERROGATION unchanged.
//
// These live HERE (not in the world-side `counterintel` module that re-exports them) because Task
// 12's runaround rule — a pure fold inside `enemyDigest` — has to know which minutes of a worked
// day its own posted guard was actually standing the post. One source of truth, reachable from the
// no-omniscience side of the fence: `src/sim/counterintel.ts` re-exports both names unchanged.
export const INTERROGATION = { from: 900, to: 1020 } as const;
export const WATCH = { from: 960, to: 1140 } as const;

/**
 * Task 12 v1 implementation pins (constraints: "Two completed unproductive action nights and a
 * two-day tail cooldown are explicit v1 implementation pins, retunable only in Plan 10").
 */
export const RUNAROUND_WASTED_NIGHTS = 2;
export const RUNAROUND_COOLDOWN_DAYS = 2;

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

export interface ResidueEvidenceData {
  id: string; witness: EntityId; observedAt: Tick;
}
export interface PhysicalReceipt {
  tick: Tick; observer: EntityId; messageId: MessageId;
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
      residue?: never; receipt?: never;
      document?: true;
    })
  | (EvidenceBase & {
      kind: 'asking'; mode: null; claimId: null; family: RumorId | null;
      reported: null; about: InquiryKeyData; network?: never; leaked?: never;
      residue?: never; receipt?: never;
    })
  | (EvidenceBase & {
      kind: 'network'; mode: null; claimId: ClaimId | null; family: RumorId | null;
      reported: ReportedClaim | null; about: InquiryKeyData | null;
      network: NetworkEvidence;
      leaked?: { from: EntityId; fact: CompartmentFact };
      residue?: never; receipt?: never;
    })
  | (Omit<EvidenceBase, 'speaker' | 'addressedTo'> & {
      kind: 'arcane-residue'; speaker: null; addressedTo: null; mode: null;
      claimId: null; family: null; reported: null; about: null;
      network?: never; leaked?: never;
      residue: ResidueEvidenceData;
      receipt?: PhysicalReceipt;
    });

/**
 * One fair-cop pointer at something an observer actually heard. A CLAIM ref resolves by
 * `(tick, observer, claimId)`; a NETWORK ref resolves by `(tick, observer, messageId)` against a
 * `network-speech` chronicle row with that id/tick whose `heardBy` names the observer. Exactly one
 * of the two id fields is non-null for any ref the digest mints.
 */
export interface SketchEvidenceRef {
  tick: Tick;
  observer: EntityId;
  claimId: ClaimId | null;
  messageId: MessageId | null;
}

export interface SketchFeature {
  id: string;
  kind: 'district-activity' | 'entry-point' | 'origin-vague' | 'carrier-profile' | 'runaround'
    | 'forged-document';
  day: number;
  family: RumorId | null;
  subject: EntityId | null;
  district: string | null;
  detail: string;
  /** Fair-cop law: never empty; each ref resolves to a chronicle entry the observer heard. */
  evidence: SketchEvidenceRef[];
}

export interface InquiryOrder { asker: EntityId; about: InquiryKeyData; expiresDay: number }
/** A guard posted to a specific venue for a district watch. */
export interface WatchPost { guard: EntityId; venue: VenueId }
export interface WatchOrder {
  district: string;
  posts: WatchPost[];
  startDay: number;
  /** The bound lead's subject — the one person this watch is actually about (Task 12). */
  subject?: EntityId | null;
  about?: InquiryKeyData | null;
  leadFeatureId?: string | null;
}
export interface InterrogationOrder {
  target: EntityId; guard: EntityId; day: number; about: InquiryKeyData; venue: VenueId;
  leadFeatureId?: string | null;
}

/**
 * HQ's decision to stand a tail down: the lead it was bought for, the district/day of the ledger
 * row it believes staffed it, and the day the cooldown on that subject lapses. Travelling the
 * cancellation to each remaining post is `applyEnemyDecision`'s job — orders never teleport.
 */
export interface TailDrop {
  leadFeatureId: string;
  subject: EntityId;
  district: string;
  watchStartDay: number;
  untilDay: number;
}

export interface EnemyDecision {
  day: number;
  features: SketchFeature[];
  inquiries: InquiryOrder[];
  watches: WatchOrder[];
  interrogations: InterrogationOrder[];
  /** Omitted entirely when empty, so a decision without runaround keeps pre-Task-12 bytes. */
  tailDrops?: TailDrop[];
}

export interface PendingEnemyOrder {
  key: string;
  issuedDay: number;
  reconsiderAfterDay: number;
  directiveIds: DirectiveId[];
}

export interface EnemyActionLedgerEntry {
  orderKey: string;
  kind: 'watch' | 'interrogation';
  directiveIds: DirectiveId[];
  leadFeatureId: string | null;
  subject: EntityId | null;
  about: InquiryKeyData | null;
  district: string;
  scheduleStartDay: number;
  posts: { guard: EntityId; venue: VenueId }[];
  workedDays: number[];
  askedAt: Tick | null;
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
  pendingOrders?: PendingEnemyOrder[];
  issuedDirectiveIds?: DirectiveId[];
  actionLedger?: EnemyActionLedgerEntry[];
}

export function emptyEnemyState(): EnemyState {
  return {
    observers: [], map: { venues: [], directory: [] }, evidence: [], digestedThrough: 0,
    sketch: [], watchedDistricts: [], decisions: [], featureCounter: 0,
    interrogated: [], inquiriesIssued: [],
  };
}
