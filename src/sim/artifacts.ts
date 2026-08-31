import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { localityFor, offeredVenueFor, type InjectSpec } from './actions';
import type { Circle } from './agents';
import { cloneSerializable } from './hash';
import { canAfford, debitCoin } from './network/roster';
import type { Rules } from './rules';
import { mintClaim, type EntityId, type VenueId } from './rumors/claim';
import { CONVERSATION_BEAT, ingestEvidence } from './rumors/propagation';
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

/**
 * ONE VIEWING of a document, shared by show, hand-over, pickup and re-show — every way a pair of eyes
 * reaches a forged page runs through exactly this.
 *
 * The document's FIXED text is minted as a FRESH family (`parent: null` — a root, never a retelling),
 * so no trait chain ever touches it: documents don't mutate. It then enters the mind through the REAL
 * ingestion path (`ingestEvidence`, rumors/propagation.ts) at ARTIFACT_CREDENCE, with the document's
 * own attribution as the apparent source. What the viewer holds afterwards is an ORDINARY belief that
 * merely arrived at evidence weight — so their later talk about it is ordinary, ceiling-capped
 * hearsay, which is precisely the plan's split between the paper and its interpretations.
 */
function deliverDocument(
  world: WorldState, artifact: Artifact, shower: EntityId, viewer: EntityId, tick: Tick,
): void {
  const family = `f${world.claimCounter}`;
  const claim = mintClaim(world, { ...artifact.spec, family, parent: null });
  world.claims[claim.id] = claim;
  ingestEvidence(world, viewer, { tick, speaker: shower, claim }, ARTIFACT_CREDENCE);
}

/** The shared preconditions of both paper-in-hand verbs: a real, dry document the avatar holds. */
function heldDocument(world: WorldState, verb: string, artifactId: string, tick: Tick): Artifact {
  const playerId = world.playerId;
  if (playerId === null) throw new Error(`${verb}: no player is enrolled`);
  if (world.playerVenue === null) throw new Error(`${verb}: the avatar is nowhere`);
  const artifact = artifactById(world, artifactId);
  if (artifact === null) throw new Error(`${verb}: unknown artifact '${artifactId}'`);
  if (artifact.heldBy !== playerId) {
    throw new Error(`${verb}: you do not hold '${artifactId}' — a document can only be shown from the hand that has it`);
  }
  if (!isUsable(artifact, tick)) {
    throw new Error(`${verb}: '${artifactId}' was forged today — a forgery needs a day before it can be used`);
  }
  return artifact;
}

/** The circle-mate check every beat-circle act makes, read from the OFFERED frame when one exists. */
function circleMate(
  world: WorldState, verb: string, to: EntityId, tick: Tick, offered?: readonly Circle[],
): void {
  if (!world.npcs[to]) throw new Error(`${verb}: unknown npc '${to}'`);
  if (to === world.playerId) throw new Error(`${verb}: the avatar is not their own audience`);
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) {
    throw new Error(`${verb}: paper is shown on conversation beats`);
  }
  const circle = localityFor(world, tick, offered)
    .find((candidate) => candidate.members.includes(world.playerId!));
  if (!circle || !circle.members.includes(to)) {
    throw new Error(`${verb}: '${to}' is not in the avatar's circle this beat`);
  }
}

/**
 * SHOW — hold the paper up to one circle-mate and keep it (Plan 9 Task 1).
 *
 * A BEAT-CIRCLE ACT under the frame law (P11-18 + docket A6): locality is validated through the
 * shared `localityFor` seam against the frozen offered circles, exactly as tell/host/meet do, so an
 * earlier same-tick `goTo` can never move the answer out from under an offer already composed.
 *
 * VALIDATE-BEFORE-MUTATE: an unknown/unheld/still-wet document, an off-beat flourish, or an audience
 * the offer never contained REFUSES before anything is minted or ingested (zero residue).
 */
export function applyShow(
  world: WorldState, artifactId: string, to: EntityId, tick: Tick, offered?: readonly Circle[],
): void {
  const artifact = heldDocument(world, 'show', artifactId, tick);
  circleMate(world, 'show', to, tick, offered);

  // --- Effects (all validation passed) — the paper stays in the shower's hand. ---
  const shower = world.playerId!;
  deliverDocument(world, artifact, shower, to, tick);
  world.chronicle.push({
    kind: 'artifact', tick, act: 'show', artifact: artifact.id, by: shower, to,
  });
}

/**
 * PLANT — put the document where it will be read: `venue` XOR `to`.
 *
 *  - HAND-OVER (`to`): a beat-circle act with the tell-shaped validation `show` uses; the recipient
 *    becomes the holder AND ingests exactly as a show, so a letter given away is also a letter read.
 *  - VENUE PLANT (`venue`): frameless in the circle sense — leaving a page on a table needs no
 *    conversation, so no circle precondition applies (the same posture `setDrop` and `forge` take).
 *    It still answers the SECOND locality question through the frozen frame (`offeredVenueFor`, the
 *    dead-drop courier precedent): the avatar must be standing in the room the offer was composed at.
 *    Nobody reads it yet — the first NPC in that room at the NEXT beat picks it up (see
 *    `resolveArtifacts`).
 *
 * VALIDATE-BEFORE-MUTATE: the XOR, the held/dry document, and both locality questions all throw
 * before any state change.
 */
export function applyPlant(
  world: WorldState, artifactId: string, venue: VenueId | null, to: EntityId | null,
  tick: Tick, offered?: readonly Circle[],
): void {
  if ((venue === null) === (to === null)) {
    throw new Error('plant: name exactly one of a venue to leave it at or a pair of hands to give it to');
  }
  const artifact = heldDocument(world, 'plant', artifactId, tick);
  const playerId = world.playerId!;

  if (to !== null) {
    circleMate(world, 'plant', to, tick, offered);

    // --- Effects (all validation passed) — the paper changes hands AND is read. ---
    artifact.heldBy = to;
    artifact.plantedAt = null;
    deliverDocument(world, artifact, playerId, to, tick);
    world.chronicle.push({
      kind: 'artifact', tick, act: 'plant', artifact: artifact.id, by: playerId, to,
    });
    return;
  }

  if (!world.venues[venue!]) throw new Error(`plant: unknown venue '${venue}'`);
  if (offeredVenueFor(world, offered) !== venue) {
    throw new Error(`plant: the avatar must be at '${venue}' to leave the document there`);
  }

  // --- Effects (all validation passed) — it waits for whoever walks in. ---
  artifact.heldBy = null;
  artifact.plantedAt = venue;
  world.chronicle.push({
    kind: 'artifact', tick, act: 'plant', artifact: artifact.id, by: playerId, to: venue,
  });
}
