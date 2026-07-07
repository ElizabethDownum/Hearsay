import type { GenConfig, GenContent, OccupationDef, SecretShapeDef, VenueArchetypeDef } from '../../world/types';
import { NAMES } from './names';

export const STANDARD_GEN_CONFIG: GenConfig = {
  npcCount: 72,               // spec v1: 60–90
  districtCount: 3,
  keystoneCount: 3,
  bridgesPerAdjacentPair: 2,  // two designated bridges = two independent routes across each firebreak
  guardsPerDistrict: 2,       // enemy's organic coverage terrain
  secretCount: 6,             // true hidden history — dormant dirt the player must dig out
  dossierInformants: 2,       // day-0 informants handed to the avatar (never guards)
  dossierTraitReadMax: 6,     // cap on truthful trait reads in the dossier
  dossierEdgeReadMax: 8,      // cap on truthful edge reads in the dossier
  maxAttempts: 8,
};

/** Fixed grammar (spec): players learn archetypes, never an answer key. */
export const VENUE_ARCHETYPES: VenueArchetypeDef[] = [
  { id: 'tavern', scope: 'per-district', access: 'public' },
  { id: 'market', scope: 'per-district', access: 'public' },
  { id: 'chapel', scope: 'per-district', access: 'public' },
  { id: 'workshop', scope: 'per-district', access: 'public' },
  { id: 'well', scope: 'per-district', access: 'public' },
  { id: 'guard-post', scope: 'per-district', access: 'invitational' }, // terrain for the enemy AI (Plan 4)
  // Station-hosted rooms (Plan 8 §12): no regulars — no occupation names them a workplace and no
  // schedule reaches them, so they add zero occupancy physics. The access law opens the salon to
  // nobles and the back-rooms to lowlifes; rung-4 hosting (Task 6) fills them on demand.
  { id: 'salon', scope: 'singleton', access: 'invitational' },     // one, in district 0 (noble ground)
  { id: 'back-room', scope: 'per-district', access: 'invitational' }, // one per district (lowlife ground)
  { id: 'cathedral', scope: 'singleton', access: 'public' },
  { id: 'docks', scope: 'singleton', access: 'public' },
];

/** Singleton workplaces (docks, cathedral) pull workers across districts — organic bridges. */
export const OCCUPATIONS: OccupationDef[] = [
  { id: 'grocer',      workplace: 'market',    from: 360, to: 840,  eveningTavern: true,  weight: 3 },
  { id: 'stallholder', workplace: 'market',    from: 360, to: 840,  eveningTavern: false, weight: 3 },
  { id: 'dockworker',  workplace: 'docks',     from: 480, to: 1080, eveningTavern: true,  weight: 4 },
  { id: 'net-mender',  workplace: 'docks',     from: 480, to: 1080, eveningTavern: false, weight: 2 },
  { id: 'joiner',      workplace: 'workshop',  from: 480, to: 1020, eveningTavern: true,  weight: 3 },
  { id: 'smith',       workplace: 'workshop',  from: 480, to: 1020, eveningTavern: false, weight: 2 },
  { id: 'laundress',   workplace: 'well',      from: 420, to: 660,  eveningTavern: false, weight: 2 },
  { id: 'bartender',   workplace: 'tavern',    from: 960, to: 1439, eveningTavern: false, weight: 1 },
  { id: 'priest',      workplace: 'cathedral', from: 420, to: 720,  eveningTavern: false, weight: 1 },
];

/** Guards are DESIGNATED (converted from cast), never weighted-drawn — weight: 0 excludes it from castRng picks. */
export const GUARD_OCCUPATION: OccupationDef =
  { id: 'guard', workplace: 'guard-post', from: 480, to: 600, eveningTavern: false, weight: 0 };

/** The true hidden histories the generator seeds — real dirt, drawn by weight. */
export const SECRET_SHAPES: SecretShapeDef[] = [
  { predicate: 'is-having-an-affair-with', needsObject: true,  needsPlace: false, severity: 4, weight: 3 },
  { predicate: 'stole',                    needsObject: false, needsPlace: true,  severity: 4, weight: 2 },
  { predicate: 'is-bankrupt',              needsObject: false, needsPlace: false, severity: 3, weight: 2 },
  { predicate: 'poisoned',                 needsObject: true,  needsPlace: false, severity: 5, weight: 1 },
  { predicate: 'forged-the-lineage',       needsObject: false, needsPlace: false, severity: 5, weight: 1 },
  { predicate: 'embezzles-guild-funds',    needsObject: false, needsPlace: true,  severity: 4, weight: 2 },
  { predicate: 'fathered-a-bastard',       needsObject: true,  needsPlace: false, severity: 3, weight: 2 },
  { predicate: 'consorts-with-smugglers',  needsObject: false, needsPlace: true,  severity: 3, weight: 2 },
];

export const STANDARD_GEN_CONTENT: GenContent = {
  names: NAMES,
  venueArchetypes: VENUE_ARCHETYPES,
  occupations: OCCUPATIONS,
  traitPool: [
    { id: 'exaggerator', weight: 3 }, { id: 'attributor', weight: 3 },
    { id: 'moralizer', weight: 3 },   { id: 'partisan', weight: 3 },
    { id: 'literalist', weight: 2 },  { id: 'skeptic', weight: 1 }, // gatekeepers rare — they kill rumors
    { id: 'minimizer', weight: 2 },   { id: 'dramatist', weight: 2 },
    { id: 'name-dropper', weight: 2 },{ id: 'vaguener', weight: 2 },
    { id: 'numberer', weight: 2 },    { id: 'peacemaker', weight: 1 },
    { id: 'objectifier', weight: 2 }, { id: 'relocator', weight: 1 },
  ],
  factions: [
    { id: 'guild', weight: 7 }, { id: 'crown', weight: 6 }, { id: 'none', weight: 7 },
  ],
  guardOccupation: GUARD_OCCUPATION,
  secretShapes: SECRET_SHAPES,
};
