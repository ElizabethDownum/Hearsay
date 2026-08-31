import { dayOf, type Tick } from '../core/time';
import type { InjectSpec } from './actions';
import { cloneSerializable } from './hash';
import { canAfford, debitCoin } from './network/roster';
import type { Rules } from './rules';
import type { EntityId, VenueId } from './rumors/claim';
import type { WorldState } from './types';

/**
 * THE EVIDENCE HIERARCHY (spec, and this plan's global constraint): artifacts/witnessed >> hearsay.
 * `HEARSAY_CEILING` (0.95, rumors/propagation.ts) caps corroborated hearsay; a document IN HAND
 * anchors at 0.97 — the ONLY credence in the game above that ceiling. No other constant may cross it,
 * and that is not left to a comment: `tests/sim/evidence-hierarchy-law.test.ts` parses every credence
 * write in `src/` and fails if a second number ever climbs above the ceiling.
 */
export const ARTIFACT_CREDENCE = 0.97;

/** The forger's craft takes a day: a document authored today is usable from tomorrow's dawn. */
export const FORGERY_LEAD_DAYS = 1;

/**
 * A forged document: a WORLD OBJECT carrying a FIXED claim. Documents don't mutate — `spec` is the
 * text, unchanged for the artifact's whole life, and every viewing hands over exactly that text.
 * Interpretations do mutate: a retelling ABOUT the letter is ordinary hearsay and rides trait physics.
 */
export interface Artifact {
  /** `a${world.artifactCounter}` — replay-stable, like every other minted id. */
  id: string;
  /** The fixed text: documents don't mutate. */
  spec: InjectSpec;
  /** v1; enemy honeytrap artifacts are the staged v1.1 knob. */
  author: 'player';
  forgedTick: Tick;
  /** Exactly one of: held by an NPC/avatar, or planted at a venue awaiting pickup. */
  heldBy: EntityId | null;
  plantedAt: VenueId | null;
}

/** Commission a forgery. Costs `economy.forgery`; a one-day lead means it is usable from next day. */
export interface ForgeAction { tick: Tick; kind: 'forge'; spec: InjectSpec }

/**
 * Put a document somewhere it will be read: `venue` XOR `to` — leave it where someone will find it,
 * or hand it over. The hand-over is a beat-circle act with tell-shaped validation; the venue plant is
 * frameless (see `applyPlant`).
 */
export interface PlantAction {
  tick: Tick; kind: 'plant'; artifact: string; venue: VenueId | null; to: EntityId | null;
}

/** Show the paper to a circle-mate and keep it. A beat-circle act. */
export interface ShowAction { tick: Tick; kind: 'show'; artifact: string; to: EntityId }

/** Every document in play. Empty (never `undefined`) in a world that has forged nothing. */
export function artifactsOf(world: WorldState): readonly Artifact[] {
  return world.artifacts ?? [];
}

/**
 * SERIALIZATION/LAZY-STATE LAW (Plan 11): artifact state is optional and absent until the first
 * forgery, so an untouched world keeps its pre-Plan-9 bytes. Never write `undefined` into present
 * state — the keys either exist with real values or do not exist at all.
 */
function ensureArtifacts(world: WorldState): Artifact[] {
  const existing = world.artifacts;
  if (existing) return existing;
  const fresh: Artifact[] = [];
  world.artifacts = fresh;
  world.artifactCounter = 0;
  return fresh;
}

function nextArtifactId(world: WorldState): string {
  const counter = world.artifactCounter ?? 0;
  world.artifactCounter = counter + 1;
  return `a${counter}`;
}

/** The document this id names, or null — an unknown id is a caller error, never a silent no-op. */
export function artifactById(world: WorldState, id: string): Artifact | null {
  return artifactsOf(world).find((artifact) => artifact.id === id) ?? null;
}

/**
 * The lead time as a predicate: a document is usable from the DAY AFTER it was forged. Exported so
 * the verbs and their tests read the one rule rather than respelling the day arithmetic.
 */
export function isUsable(artifact: Artifact, tick: Tick): boolean {
  return dayOf(tick) >= dayOf(artifact.forgedTick) + FORGERY_LEAD_DAYS;
}

/**
 * Commission a forgery (Plan 9 Task 1). FRAMELESS BY LAW: unlike tell/show/hand-over, forging has no
 * circle precondition — the avatar writes the thing alone, so there is no offered locality to validate
 * against and none is threaded in (the frame law binds beat-circle ACTS; this is not one). The same
 * posture the codebase already discloses for `setDrop`, which is likewise a solitary physical act.
 *
 * VALIDATE-BEFORE-MUTATE: a headless world or an unaffordable commission REFUSES with zero residue —
 * no artifact state is even created, so an untouched world's bytes survive a refused forgery.
 */
export function applyForge(
  world: WorldState, spec: InjectSpec, tick: Tick, rules: Rules,
): void {
  const playerId = world.playerId;
  if (playerId === null) throw new Error('forge: no player is enrolled');
  const cost = rules.economy.forgery;
  if (!canAfford(world, cost)) {
    throw new Error(`forge: the treasury cannot cover this forgery (${cost} needed, ${world.coin} held)`);
  }

  // --- Effects (all validation passed) ---
  debitCoin(world, cost);
  const artifacts = ensureArtifacts(world);
  const id = nextArtifactId(world);
  artifacts.push({
    id, spec: cloneSerializable(spec), author: 'player', forgedTick: tick,
    heldBy: playerId, plantedAt: null,
  });
  world.chronicle.push({ kind: 'artifact', tick, act: 'forge', artifact: id, by: playerId, to: null });
}
