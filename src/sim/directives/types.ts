import type { Tick } from '../../core/time';
import type { InjectSpec } from '../actions';
import type { ReportedClaim } from '../enemy/state';
import type { CompartmentFact, Mice, Principal } from '../network/types';
import type { InquiryKey, Observation } from '../perception';
import type { ClaimId, EntityId, RumorId, VenueId, SOMEONE } from '../rumors/claim';

export type DirectiveId = string;
export type MessageId = string;

export type DirectiveTarget =
  | { kind: 'person'; id: EntityId }
  | { kind: 'venue'; id: VenueId }
  | { kind: 'story'; family: RumorId };

export interface ShapePayload {
  family: RumorId | null;
  parent: ClaimId | null;
  claim: InjectSpec;
}

export type DirectiveMission =
  | { kind: 'learn'; target: DirectiveTarget }
  | {
      kind: 'shape';
      operation: 'spread' | 'suppress';
      payload: ShapePayload;
      audience: Exclude<DirectiveTarget, { kind: 'story' }>;
      redirectTo: null;
    }
  | {
      kind: 'shape';
      operation: 'redirect';
      payload: ShapePayload;
      audience: Exclude<DirectiveTarget, { kind: 'story' }>;
      redirectTo: EntityId;
    }
  | {
      kind: 'sound-out';
      target: EntityId;
      topic: 'recruitment' | 'cooperation';
      handle: Mice | null;
      meeting: { venue: VenueId; from: Tick; until: Tick } | null;
    };

export type DirectivePriority = 'routine' | 'important' | 'urgent';
export type DirectiveAuthority = 'request' | 'relationship' | 'office' | 'compel';
export type DirectiveDiscretion = 'open' | 'quiet' | 'compartmented';
export type DirectiveSpecificity = 'outcome-only' | 'guided' | 'detailed';
export type ReportExpectation = 'none' | 'outcome' | 'reasoned' | 'full';

export type AdvisoryGuidance =
  | { kind: 'expected-presence'; person: EntityId; venue: VenueId; at: Tick }
  | { kind: 'avoid-person'; person: EntityId }
  | { kind: 'avoid-venue'; venue: VenueId }
  | { kind: 'not-before'; tick: Tick }
  | { kind: 'not-after'; tick: Tick }
  | { kind: 'note'; text: string };

export interface DirectiveBrief {
  mission: DirectiveMission;
  priority: DirectivePriority;
  authority: DirectiveAuthority;
  discretion: DirectiveDiscretion;
  specificity: DirectiveSpecificity;
  guidance: AdvisoryGuidance[];
  active: { from: Tick; until: Tick };
  report: ReportExpectation;
  reportBy: Tick | null;
  purpose: string | null;
}

export interface BriefChange { field: string; from: unknown; to: unknown }

export interface BriefVersion {
  id: string;
  parent: string | null;
  directiveId: DirectiveId;
  brief: DirectiveBrief;
  claimedIssuer: EntityId | typeof SOMEONE;
  /** The return path as this version communicates it; final element is the intended handler. */
  replyRoute: EntityId[] | null;
  changedBy: EntityId | null;
  changes: BriefChange[];
}

export interface DirectiveHandoff {
  outboundVia: EntityId[];
  reportVia: EntityId[];
}

export type DirectiveCommitment = 'refuse' | 'defer' | 'attempt';
export type DirectiveInitiative = 'literal' | 'adaptive';
export type DirectiveRiskPosture = 'avoidant' | 'measured' | 'bold';
export type DirectiveCandor = 'ordinary' | 'guarded' | 'omissive' | 'doctored';
export type DisclosureField = 'outcome' | 'reason' | 'evidence' | 'source' | 'uncertainty';

export type DirectiveMethod =
  | { kind: 'observe'; target: DirectiveTarget }
  | { kind: 'ask'; target: DirectiveTarget }
  | { kind: 'tell'; audience: Exclude<DirectiveTarget, { kind: 'story' }>; payload: ShapePayload }
  | { kind: 'approach'; target: EntityId }
  | { kind: 'invite-meeting'; target: EntityId; venue: VenueId; from: Tick; until: Tick }
  | { kind: 'hold' };

export interface DirectiveDecisionProfile {
  interpretation: DirectiveMission;
  commitment: DirectiveCommitment;
  initiative: DirectiveInitiative;
  risk: DirectiveRiskPosture;
  method: DirectiveMethod;
  timing: { actAt: Tick | null; reportAt: Tick | null };
  disclosure: Record<DisclosureField, boolean>;
  candor: DirectiveCandor;
}

export type DirectiveReportEvidence =
  | { kind: 'observation'; text: string }
  | { kind: 'claim'; claimId: ClaimId; reported: ReportedClaim };

export interface EnemyActionReport {
  kind: 'inquiry-started' | 'watch-worked' | 'interrogation-asked' | 'watch-cancelled';
  subject: EntityId | null;
  about: InquiryKey | null;
  district: string;
  scheduleStartDay: number;
  guard: EntityId;
  venue: VenueId;
  workedDay: number | null;
  occurredAt: Tick;
}

export interface DirectiveReportPayload {
  outcome: string | null;
  reason: string | null;
  evidence: DirectiveReportEvidence[] | null;
  source: EntityId | typeof SOMEONE | null;
  uncertainty: 'low' | 'medium' | 'high' | null;
}

export type ReportedFieldObservation =
  | {
      kind: 'utterance'; observedAt: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; overheard: boolean; mode: 'telling' | 'answer';
      claimId: ClaimId; family: RumorId; reported: ReportedClaim;
    }
  | {
      kind: 'asking'; observedAt: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; overheard: boolean; authority: boolean; about: InquiryKey;
    }
  | { kind: 'presence'; observedAt: Tick; venue: VenueId; actor: EntityId }
  | {
      kind: 'network-speech'; observedAt: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; overheard: boolean; messageId: MessageId;
      spoken: SpokenNetworkPayload;
    };

export type NetworkPayload =
  | { kind: 'directive'; version: BriefVersion }
  | {
      kind: 'directive-report'; directiveId: DirectiveId; report: DirectiveReportPayload;
      factRefs: { asset: EntityId; factIndex: number }[];
      enemyAction: EnemyActionReport | null;
    }
  | {
      kind: 'directive-response'; directiveId: DirectiveId;
      response: 'refuse' | 'defer' | 'attempt'; report: DirectiveReportPayload | null;
    }
  | { kind: 'handler-brief'; sourceDirectiveId: DirectiveId; version: BriefVersion }
  | {
      kind: 'field-report'; origin: EntityId; sourceDirectiveId: DirectiveId | null;
      sourceObservationIds: string[];
      renderedItems: {
        rootFingerprint: string;
        observation: ReportedFieldObservation;
        factRefs: { asset: EntityId; factIndex: number }[];
      }[] | null;
    }
  | { kind: 'compartment-fact'; principal: Principal; asset: EntityId; factIndex: number; fact: CompartmentFact }
  | {
      kind: 'sketch-tip'; principal: Principal; asset: EntityId;
      /** Internal association/cursor handle only; never spoken. */
      featureId: string;
      /** Knowledge-bearing copy resolved once from the origin's lawful knowledge at queue time. */
      subject: EntityId | null;
      detail: string;
    }
  | {
      kind: 'invitation'; invitationId: string; invitationKind: 'rendezvous' | 'hosting' | 'sound-out';
      inviter: EntityId; counterparty: EntityId; invitee: EntityId; venue: VenueId;
      requested: { from: Tick; until: Tick };
    }
  | { kind: 'invitation-response'; invitationId: string; response: 'accept' | 'refuse' | 'defer' }
  | { kind: 'recruitment-approach'; approachId: string; recruiter: EntityId; target: EntityId }
  | { kind: 'recruitment-response'; approachId: string; response: RecruitmentResponse };

export type SpokenNetworkPayload =
  | {
      kind: 'directive'; directiveId: DirectiveId; brief: DirectiveBrief;
      claimedIssuer: EntityId | typeof SOMEONE; onwardTo: EntityId | null;
      replyRoute: EntityId[] | null;
    }
  | {
      kind: 'directive-report'; directiveId: DirectiveId; report: DirectiveReportPayload;
      enemyAction: EnemyActionReport | null;
      factRefs: { asset: EntityId; factIndex: number }[]; onwardTo: EntityId | null;
    }
  | {
      kind: 'directive-response'; directiveId: DirectiveId;
      response: 'refuse' | 'defer' | 'attempt'; report: DirectiveReportPayload | null;
      onwardTo: EntityId | null;
    }
  | {
      kind: 'handler-brief'; brief: DirectiveBrief; claimedIssuer: EntityId | typeof SOMEONE;
      onwardTo: EntityId | null; replyRoute: EntityId[] | null;
    }
  | {
      kind: 'field-report';
      items: { observation: ReportedFieldObservation; factRefs: { asset: EntityId; factIndex: number }[] }[];
      onwardTo: EntityId | null;
    }
  | { kind: 'compartment-fact'; asset: EntityId; fact: CompartmentFact; onwardTo: EntityId | null }
  | { kind: 'sketch-tip'; asset: EntityId; subject: EntityId | null; detail: string; onwardTo: EntityId | null }
  | {
      kind: 'invitation'; invitationId: string; invitationKind: 'rendezvous' | 'hosting' | 'sound-out';
      inviter: EntityId; counterparty: EntityId; invitee: EntityId; venue: VenueId;
      requested: { from: Tick; until: Tick }; onwardTo: EntityId | null;
    }
  | { kind: 'invitation-response'; invitationId: string; response: 'accept' | 'refuse' | 'defer'; onwardTo: EntityId | null }
  | { kind: 'recruitment-approach'; approachId: string; recruiter: EntityId; target: EntityId; onwardTo: EntityId | null }
  | { kind: 'recruitment-response'; approachId: string; response: RecruitmentResponse; onwardTo: EntityId | null };

export interface NetworkMessage {
  id: MessageId;
  principal: Principal;
  createdAt: Tick;
  origin: EntityId;
  holder: EntityId;
  lastFrom: EntityId;
  route: EntityId[];
  nextHop: number;
  availableAfter: Tick;
  payload: NetworkPayload;
  deliveredAt: Tick | null;
  expiresAt: Tick | null;
  failedAt: Tick | null;
  processedRelayHops: number[];
  cause: NetworkSpeech['cause'];
}

export interface NetworkSpeech {
  tick: Tick;
  venue: VenueId;
  circleMembers: EntityId[];
  speaker: EntityId;
  addressedTo: EntityId;
  messageId: MessageId;
  spoken: SpokenNetworkPayload;
  cause: {
    kind: 'player-action';
    action: 'tell' | 'ask' | 'sell' | 'recruit' | 'debrief'
      | 'assignInformant' | 'courier' | 'meet' | 'host' | 'directive';
    tick: Tick;
  } | null;
}

export interface DirectiveRecord {
  id: DirectiveId;
  principal: Principal;
  principalId: EntityId;
  recipient: EntityId;
  issuedAt: Tick;
  handoff: DirectiveHandoff;
  authored: BriefVersion;
  received: {
    tick: Tick;
    version: BriefVersion;
    handoffFrom: EntityId;
    messageId: MessageId;
  } | null;
  decision: DirectiveDecisionProfile | null;
  execution: {
    state: 'pending' | 'deferred' | 'attempted' | 'adapted'
      | 'awaiting-answer' | 'aborted' | 'completed';
    changedAt: Tick;
    dueAt: Tick | null;
    waiting:
      | { kind: 'story-answer'; taskId: string; expiresAt: Tick }
      | { kind: 'recruitment-answer'; approachId: string; expiresAt: Tick }
      | null;
    workedDays?: number[];
  } | null;
  receivedReports: { receivedAt: Tick; via: EntityId; report: DirectiveReportPayload }[];
}

export type ScrutinyCause =
  | 'questioning' | 'authority-pressure' | 'retasking' | 'exclusion' | 'confrontation';

export interface ScrutinyTrace {
  observer: EntityId;
  principal: EntityId;
  observedAt: Tick;
  cause: ScrutinyCause;
}

export interface HeldFieldObservation {
  id: string;
  fingerprint: string;
  rootFingerprint: string;
  principal: Principal;
  observer: EntityId;
  observedAt: Tick;
  content:
    | { kind: 'raw'; observation: Observation }
    | { kind: 'reported'; observation: ReportedFieldObservation };
  sourceDirectiveId: DirectiveId | null;
  route: EntityId[];
  factRefs: { asset: EntityId; factIndex: number }[];
  queuedIn: MessageId | null;
  deliveredAt: Tick | null;
}

export type RecruitmentResponse = 'accept' | 'refuse' | 'hesitate';
export type RecruitmentStatus = 'approached' | 'waiting' | 'decided' | 'answer-in-transit' | 'closed';

export interface RecruitmentApproach {
  id: string;
  principal: Principal;
  recruiter: EntityId;
  target: EntityId;
  mice: Mice | null;
  leverageFamily: RumorId | null;
  openedAt: Tick;
  resolveAt: Tick | null;
  decisionDueAt: Tick | null;
  status: RecruitmentStatus;
  initial: RecruitmentResponse;
  decided: Exclude<RecruitmentResponse, 'hesitate'> | null;
  sourceDirectiveId: DirectiveId | null;
  enemyLinkedAtDecision: boolean;
}

export interface DirectiveState {
  nextDirective: number;
  nextMessage: number;
  nextVersion: number;
  nextObservation: number;
  records: DirectiveRecord[];
  messages: NetworkMessage[];
  heldObservations: HeldFieldObservation[];
  scrutiny: ScrutinyTrace[];
  recruitmentApproaches: RecruitmentApproach[];
}
