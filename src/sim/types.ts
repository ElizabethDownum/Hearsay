import type { Tick } from '../core/time';
import type { InjectSpec } from './actions';
import type { Claim, ClaimId, EntityId, RumorId, VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import type { EnemyState } from './enemy/state';
import type { InquiryKey } from './perception';
import type { IntelState } from '../intel/entry';
import type { ScenarioState } from './scenario/types';
import type { NetworkState } from './network/types';

export type { IntelEntry, IntelState, InformantSpec, HypothesisCard, CodexHypothesis, TagNote } from '../intel/entry';
export type { ScenarioState, ScenarioStatus, ScenarioDef, ScenarioCast, WinCondition, Resolution } from './scenario/types';

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
export interface InstitutionRecord {
  kind: 'institution';
  tick: Tick;
  /**
   * 'denounce' = the council turns on the usurper (win) · 'coronation' = the clock expired
   * (loss) · 'unmasking' = the enemy's sketch identified the avatar (loss) · 'arrest' = a guard
   * caught the avatar speaking an utterance in earshot (loss — caught in the act).
   */
  action: 'denounce' | 'coronation' | 'unmasking' | 'arrest';
  subject: EntityId;
  actors: EntityId[];
  claimIds: string[];
}
export interface VignetteRecord {
  kind: 'vignette';
  tick: Tick;
  defId: string;
  a: EntityId;
  b: EntityId | null;
}
export type ChronicleEntry = TellingRecord | InjectRecord | AskingRecord | InstitutionRecord | VignetteRecord;

export interface InquiryTask {
  about: InquiryKey;
  from: 'self' | 'enemy';
  /** Usable while dayOf(t) < expiresDay; swept at end of day. */
  expiresDay: number;
  asked: EntityId[];
  answersHeard: number;
  /**
   * Rider 11R: the person a PLAYER ask names. Set ONLY by `applyAsk` — the ask verb is a speech act,
   * so `runAskPhase` addresses exactly this person and consumes the task at the firing beat (never
   * trust-repicked, never a 2-day/2-answer tail). ABSENT on every NPC/enemy dispatch task, whose
   * asking stays sim-internal; that omission keeps their serialization and behavior byte-unchanged
   * (the key never appears in the stable hash for those tasks). Never written as `undefined`.
   */
  addressee?: EntityId;
}

/** One-day-scoped venue override (watches, interrogations). toDay exclusive; null = open-ended. */
export interface ScheduleOverride {
  fromDay: number;
  toDay: number | null;
  from: number;
  to: number;
  venue: VenueId;
  /** Provenance: who placed this override — assignment replaces only its own ('player'). */
  source: 'enemy' | 'player' | 'vignette';
}

export interface WorldState {
  seed: string;
  tick: Tick;
  claimCounter: number;
  /** The treasury — flat integer coin (Plan 8: money prices choices, never a second game). */
  coin: number;
  /**
   * The avatar's societal standing (Plan 8: dealt by the seed, written by attachPlayer). Decides
   * which venue doors `applyGoTo` opens without suspicion. `null` in a headless / pre-station world
   * (the access law is then inert — the P7 pre-station behavior).
   */
  station: 'noble' | 'lowlife' | null;
  /** The avatar's NPC id, or null in a headless (player-free) world. */
  playerId: EntityId | null;
  /** The avatar's current venue — overrides schedule/venueAt when set. */
  playerVenue: VenueId | null;
  /**
   * A telling the avatar logged this beat, awaiting the same tick's step (applyTell sets it,
   * step consumes it — the apply-then-step order makes the handoff replay-exact). Null otherwise.
   */
  pendingTell: { to: EntityId; spec: InjectSpec } | null;
  /**
   * A sale the avatar logged this beat, awaiting the same tick's step (applySell validates +
   * prices; step consumes it — the pendingTell handoff idiom, so the sale becomes an ordinary
   * Utterance and is capturable exactly like any telling). Null otherwise.
   */
  pendingSell: { buyer: EntityId; family: RumorId; price: number; claimId: ClaimId } | null;
  /** The player's private knowledge substrate (informants, captured feed, board notes). */
  intel: IntelState;
  /**
   * The sim-truth roster: what each asset FACTUALLY knows (the compartment interrogation reads),
   * dead drops, and the enemy-side mirror (Task 7). A superset of `intel.informants` — the roster
   * is sim truth, intel is the player's view.
   */
  network: NetworkState;
  /** The campaign referee's state, or null in a scenario-free (headless/probe) world. */
  scenario: ScenarioState | null;
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
  /** Latch keys of vignettes already fired — `${defId}:${a}:${b ?? '-'}` (pillar 7, replay-stable). */
  vignettesFired: string[];
}

export interface TownFixture {
  venues: Venue[];
  npcs: Npc[];
}
