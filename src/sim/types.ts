import type { Tick } from '../core/time';
import type { Claim, ClaimId, EntityId, RumorId, VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import type { EnemyState, ReportedClaim } from './enemy/state';
import type { InquiryKey } from './perception';

export interface Venue {
  id: VenueId;
  /** Procgen district id (e.g. 'd0'). Firebreak terrain, not sim behavior — the sim reads venues, not districts. */
  district: string;
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
  claim: Claim;            // the version THIS mind holds (first version sticks)
  credence: number;        // 0..1
  /** 'witnessed' = ground truth seeded at world-gen (secrets); chronicle explains it via a genesis inject record. */
  heardFrom: EntityId | 'injected' | 'witnessed';
  /** Last NEW-corroboration tick — drives freshness (spec: corroboration revives stale news). */
  heardAt: Tick;
  /** Set once at first hearing; never moves. The debrief timeline reads this. */
  firstHeardAt: Tick;
  timesHeard: number;
  /**
   * Apparent independence — "B only knows what attribution survived": the claim's
   * attribution if named, else the teller. Two tellers citing one origin = one source.
   */
  apparentSources: EntityId[];
  /** Held close: never volunteered by gossip; direct questions can extract it. */
  discretion: boolean;
  /** Amendment #3: this damaging self-rumor has already been answered with a counter-story. */
  counterSpun: boolean;
}

export type BeliefStore = Record<RumorId, Belief>;

export interface TellingRecord {
  kind: 'telling';
  tick: Tick;
  venue: VenueId;
  speaker: EntityId;
  addressedTo: EntityId;
  claimId: string;
  heardBy: { id: EntityId; addressed: boolean }[];
  mode: 'telling' | 'answer';
}
export interface InjectRecord {
  kind: 'inject';
  tick: Tick;
  target: EntityId;
  claimId: string;
  /** 'player' = the spymaster's hand; 'genesis' = world-gen secret seeding; EntityId = an NPC self-inject (counter-spin). */
  by: 'player' | 'genesis' | EntityId;
}
export interface AskingRecord {
  kind: 'asking';
  tick: Tick;
  venue: VenueId;
  speaker: EntityId;
  addressedTo: EntityId;
  about: InquiryKey;
  /** true iff the question carried the watch's authority (`InquiryTask.from === 'enemy'`). */
  authority: boolean;
  heardBy: { id: EntityId; addressed: boolean }[];
}
export type ChronicleEntry = TellingRecord | InjectRecord | AskingRecord;

export interface InquiryTask {
  about: InquiryKey;
  from: 'self' | 'enemy';
  /** Usable while dayOf(t) < expiresDay; swept at end of day. */
  expiresDay: number;
  asked: EntityId[];
  answersHeard: number;
}

/** One-day-scoped venue override (watches, interrogations). toDay exclusive; null = open-ended. */
export interface ScheduleOverride {
  fromDay: number;
  toDay: number | null;
  from: number;
  to: number;
  venue: VenueId;
  /** Provenance: who placed this override — assignment replaces only its own ('player'). */
  source: 'enemy' | 'player';
}

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

export interface WorldState {
  seed: string;
  tick: Tick;
  claimCounter: number;
  /** The avatar's NPC id, or null in a headless (player-free) world. */
  playerId: EntityId | null;
  /** The avatar's current venue — overrides schedule/venueAt when set. */
  playerVenue: VenueId | null;
  /** The player's private knowledge substrate (informants, captured feed, board notes). */
  intel: IntelState;
  npcs: Record<EntityId, Npc>;
  venues: Record<VenueId, Venue>;
  beliefs: Record<EntityId, BeliefStore>;
  /** Every claim ever minted — lineage walks and the future debrief substrate. */
  claims: Record<string, Claim>;
  /** `${tellerId}:${family}` → tick of last retell (cooldown; no spam). */
  lastTold: Record<string, Tick>;
  /** Every injection and telling ever recorded — the causal-chain debrief substrate. */
  chronicle: ChronicleEntry[];
  /** Pending questions per asker — the one investigation machinery's work queue. */
  inquiries: Record<EntityId, InquiryTask[]>;
  scheduleOverrides: Record<EntityId, ScheduleOverride[]>;
  enemy: EnemyState;
}

export interface TownFixture {
  venues: Venue[];
  npcs: Npc[];
}
