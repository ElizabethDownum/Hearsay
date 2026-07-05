import type { EntityId, VenueId } from '../sim/rumors/claim';
import type { Npc, TownFixture, Venue } from '../sim/types';
import type { ObserverSpec } from '../sim/enemy/state';

/** Everything the generator is allowed to randomize, per town. */
export interface GenConfig {
  /** Spec v1 scale: 60–90. */
  npcCount: number;
  /** ≥1. District 0 hosts the singleton venues (cathedral, docks). */
  districtCount: number;
  /** Scenario-cast placeholders the validator must protect (≥2 independent routes). */
  keystoneCount: number;
  /** Designated cross-district regulars per adjacent district pair. */
  bridgesPerAdjacentPair: number;
  /** Designated guards converted per district — the enemy's organic coverage. */
  guardsPerDistrict: number;
  /** True hidden histories seeded per town — dormant dirt the player must extract. */
  secretCount: number;
  /** Day-0 dossier: informants handed to the avatar (never guards). */
  dossierInformants: number;
  /** Day-0 dossier: cap on truthful trait reads seeded. */
  dossierTraitReadMax: number;
  /** Day-0 dossier: cap on truthful edge reads seeded. */
  dossierEdgeReadMax: number;
  /** Serve-loop reroll budget before generateValidTown throws. */
  maxAttempts: number;
}

/**
 * The day-0 dossier: truthful, validator-capped starting intelligence handed to the avatar.
 * Every read is REAL — a trait the NPC carries, an edge that exists, a hint that names a real
 * secret's real witness. Seeded from a fresh 'gen:dossier' stream so adding it never reshuffles
 * another subsystem's draws.
 */
export interface Dossier {
  /** Exactly config.dossierInformants NPCs, distinct, never guards. */
  informants: EntityId[];
  /** 1..config.dossierTraitReadMax reads over distinct NPCs; each trait is one the NPC carries. */
  traitReads: { npc: EntityId; trait: string }[];
  /** ≤ config.dossierEdgeReadMax reads; each is a real (from, to, kind) edge triple. */
  edgeReads: { from: EntityId; to: EntityId; kind: string }[];
  /** Points at a real secret's subject + one real witness, or null (~half of towns). */
  secretHint: { about: EntityId; witness: EntityId } | null;
}

/**
 * A TRUE claim under the gossip — family = secret id; witnesses hold it with discretion.
 * The seed generates real dirt with real witnesses; it never leaks by itself.
 */
export interface Secret {
  id: string;
  subject: EntityId;
  predicate: string;
  object: EntityId | null;
  place: VenueId | null;
  severity: 1 | 2 | 3 | 4 | 5;
  witnesses: EntityId[];
}

/** A secret template: what the dirt looks like and how likely the generator is to draw it. */
export interface SecretShapeDef {
  predicate: string;
  needsObject: boolean;
  needsPlace: boolean;
  severity: 1 | 2 | 3 | 4 | 5;
  weight: number;
}

/** Fixed grammar: institutional archetypes. Instances are stamped per district (or once, in d0). */
export interface VenueArchetypeDef {
  id: string;
  scope: 'per-district' | 'singleton';
  access: Venue['access'];
}

/** Occupations bind an NPC to a workplace archetype and a weekday shift. */
export interface OccupationDef {
  id: string;
  /** A VenueArchetypeDef id. Singleton workplaces (docks, cathedral) create organic cross-district mixing. */
  workplace: string;
  from: number;
  to: number;
  /** Evening social block at the NPC's own district tavern. */
  eveningTavern: boolean;
  weight: number;
}

/**
 * Injected generator data — engine/content split, same law as Rules:
 * machinery in src/world, tables in src/content, wired by the caller.
 */
export interface GenContent {
  /** Drawn without replacement; must be ≥ npcCount; lowercased names become NPC ids. */
  names: string[];
  venueArchetypes: VenueArchetypeDef[];
  occupations: OccupationDef[];
  traitPool: { id: string; weight: number }[];
  factions: { id: Npc['faction']; weight: number }[];
  /** The occupation designated guards are converted to (workplace must be an archetype id). */
  guardOccupation: OccupationDef;
  /** Secret templates drawn (weighted) to seed the town's true hidden history. */
  secretShapes: SecretShapeDef[];
}

export interface DistrictInfo {
  id: string;
  venueIds: VenueId[];
  npcIds: EntityId[];
}

/** Generator output: the sim-facing fixture plus procgen metadata the sim never reads. */
export interface GeneratedTown {
  fixture: TownFixture;
  districts: DistrictInfo[];
  keystones: EntityId[];
  guards: ObserverSpec[];
  secrets: Secret[];
  /** Day-0 starting intelligence for the avatar. Gen always sets it; enemy-only paths ignore it. */
  dossier: Dossier | null;
}

export interface InvariantFailure { invariant: string; detail: string }
export interface ValidationReport { ok: boolean; failures: InvariantFailure[] }
export interface ValidateOptions {
  /** When provided, every NPC trait must be one of these (pass Object.keys(rules.traits)). */
  knownTraitIds?: string[];
  /** When provided, every secret predicate must be one of these (serve passes Object.keys(rules.predicates)). */
  knownPredicateIds?: string[];
}
