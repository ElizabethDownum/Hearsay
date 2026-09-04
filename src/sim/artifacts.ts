import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { localityFor, offeredVenueFor, type InjectSpec } from './actions';
import type { Circle } from './agents';
import { blankIntel } from './fieldwork';
import { cloneSerializable } from './hash';
import { canAfford, debitCoin } from './network/roster';
import type { Rules } from './rules';
import { CLAIM_FIELDS, mintClaim, type Claim, type EntityId, type VenueId } from './rumors/claim';
import { CONVERSATION_BEAT, ingestEvidence, stanceOf } from './rumors/propagation';
import type { Belief, WorldState } from './types';

/**
 * THE EVIDENCE HIERARCHY (spec, and this plan's global constraint): artifacts/witnessed >> hearsay.
 * `HEARSAY_CEILING` (0.95, rumors/propagation.ts) caps corroborated hearsay; a document IN HAND
 * anchors at 0.97 — the ONLY credence in the game above that ceiling. No other constant may cross it,
 * and that is not left to a comment: `tests/lint/evidence-hierarchy-law.test.ts` parses every
 * credence write in `src/` and fails if a second number ever climbs above the ceiling.
 *
 * LIFETIME — DOCKET P9-2 (controller adjudication, binding). The plan's global clause says a document
 * anchors at 0.97 "only while the holder physically holds it", and its own exact SHOW physics
 * simultaneously anchors a NON-holder at 0.97 while "the artifact stays with the shower". The clause
 * is read as constraining WHICH EVENTS MAY MINT an anchor — a paper-present viewing, and nothing else
 * (see `deliverDocument`, the single mint site, and the four acts that call it) — never as demoting an
 * anchor once minted. A shown belief therefore persists at 0.97 after the page leaves the room. The
 * demote-on-release reading is not merely unsupported, it is unsatisfiable: the plan's own Task-8
 * victory condition wants a council member left "anchored ≥ 0.97" by circulation, which no longer puts
 * paper in that hand. A memory-fades-without-the-proof mechanic needs a decay rule the plan does not
 * provide, so it is a later design pass rather than a reading. Docket P9-3 closes the same principle
 * from the other side (rumors/propagation.ts): corroborating talk ABOUT the page never drags the
 * page's own weight down. Both halves are pinned in `tests/sim/artifacts.test.ts`.
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

// ── THE BEAT TAIL: a planted letter is found, and a convinced holder passes the sight of it on ────

/** Whether a mind's version of a story IS the document's text, field for field. */
function saysTheSame(claim: Claim, spec: InjectSpec): boolean {
  return CLAIM_FIELDS.every((field) => claim[field] === spec[field]);
}

/**
 * The belief this mind holds that is the DOCUMENT'S text — the strongest one where a mind holds
 * several versions of the same words (their paper copy outranks any rumour copy by construction, so
 * the strongest is the one the document put there). Ties break to the first family in sorted order.
 *
 * Derived rather than stored: the plan pins `Artifact` to six fields and `WorldState` to two, so
 * "does this holder believe the page?" is answered from the belief store instead of from a
 * per-artifact family index that would have to be invented outside the pinned interfaces.
 */
function documentBelief(world: WorldState, mind: EntityId, artifact: Artifact): Belief | null {
  const store = world.beliefs[mind];
  if (store === undefined) return null;
  let best: Belief | null = null;
  for (const family of Object.keys(store).sort()) {
    const belief = store[family]!;
    if (!saysTheSame(belief.claim, artifact.spec)) continue;
    if (best === null || belief.credence > best.credence) best = belief;
  }
  return best;
}

/**
 * The one person a holder would show it to: their LITERAL highest-trust edge (ties → lexicographic),
 * the avatar included (review finding I-2). Production informants carry ordinary trust edges to the
 * avatar, so excluding them silently substituted a weaker confidant for the person the plan names —
 * a holder trusting the avatar 0.75 and a neighbour 0.4 held the paper up to the 0.4 edge.
 *
 * The avatar being a lawful answer does not make the avatar a mind: the player's knowledge substrate
 * is `intel`, not `beliefs` (`recordAndIngest`, phases.ts, refuses to write into the avatar's belief
 * store). `resolveArtifacts` therefore routes an avatar-targeted viewing through that substrate
 * instead of through ingestion — the difference is the delivery mechanism, not the edge.
 */
function topEdge(world: WorldState, holder: EntityId): EntityId | null {
  const npc = world.npcs[holder];
  if (npc === undefined) return null;
  let best: { id: EntityId; trust: number } | null = null;
  for (const edge of npc.edges) {
    if (edge.to === holder) continue;
    if (best === null || edge.trust > best.trust
      || (edge.trust === best.trust && edge.to < best.id)) {
      best = { id: edge.to, trust: edge.trust };
    }
  }
  return best?.id ?? null;
}

/**
 * A holder holds the page up to THE AVATAR — the forgery comes home. The player has no belief store to
 * anchor, so the viewing lands where the player's knowledge actually lives: one observable `intel` row
 * saying who showed them what, and where. That is the whole point of the finding — the player learns
 * their letter circulated, from the person carrying it.
 *
 * `kind: 'hint'` is a controller ruling (LOCAL, this wave): `IntelEntry.kind` is a closed union in
 * `src/intel/entry.ts`, and `'hint'` is the precedented inert kind (dossier hints, sketch tips) that no
 * existing consumer filters on. Whether "your paper came back to you" earns a kind and a surface of its
 * own is a later ship-shape decision. `reported` carries the page's own seven fields — the document is
 * not mutating into a claim, it is being recorded as what the player saw.
 */
function showToAvatar(
  world: WorldState, artifact: Artifact, holder: EntityId, venue: VenueId, tick: Tick,
): void {
  const { subject, predicate, object, count, severity, place, attribution } = artifact.spec;
  world.intel.log.push({
    ...blankIntel(), tick, venue, via: 'self', kind: 'hint', overheard: false,
    speaker: holder, addressedTo: world.playerId,
    reported: { subject, predicate, object, count, severity, place, attribution },
  });
}

/** ONCE PER HOLDER, whatever else changes around them — the plan's law, read from its own record. */
function hasReshown(world: WorldState, artifactId: string, holder: EntityId): boolean {
  return world.chronicle.some((entry) => entry.kind === 'artifact' && entry.act === 'reshow'
    && entry.artifact === artifactId && entry.by === holder);
}

/**
 * Has THIS PAGE already been in front of this pair of eyes? IDENTITY, not content: two forged
 * documents can carry byte-identical text and are still two separate pieces of paper, each owed its
 * own viewing. Read from the chronicle's own records, which carry the artifact id — the belief store
 * cannot answer it, because a belief remembers what a page SAID and not which page said it.
 *
 * A reader is named `to` on a show, a hand-over and a re-show, and `by` on a pickup (the finder is
 * their own source). The one shape that is not a reading is a VENUE plant, whose `to` is the room the
 * page waits in: a room is not a reader, so a `to` that names a venue is excluded. Where an id belongs
 * to both a venue and an npc — which world-gen's `ids-unique` invariant checks only WITHIN each
 * namespace — this errs toward granting an extra viewing rather than suppressing a lawful one.
 */
function hasSeen(world: WorldState, artifactId: string, viewer: EntityId): boolean {
  return world.chronicle.some((entry) => {
    if (entry.kind !== 'artifact' || entry.artifact !== artifactId) return false;
    if (entry.act === 'pickup') return entry.by === viewer;
    if (entry.act === 'forge') return false;
    return entry.to === viewer && world.venues[viewer] === undefined;
  });
}

/**
 * Documents that changed hands EARLIER IN THIS TICK. A short suffix scan (chronicle ticks are
 * monotone, so this-tick records are the tail), never a whole-chronicle walk.
 */
function changedHandsThisTick(world: WorldState, tick: Tick): Set<string> {
  const settled = new Set<string>();
  for (let i = world.chronicle.length - 1; i >= 0; i -= 1) {
    const entry = world.chronicle[i]!;
    if (entry.tick !== tick) break;
    if (entry.kind === 'artifact' && entry.act !== 'show' && entry.act !== 'reshow') {
      settled.add(entry.artifact);
    }
  }
  return settled;
}

/**
 * THE BEAT-TAIL ARTIFACT HOOK (Plan 9 Task 1).
 *
 * PLACEMENT. The plan asked for a hook in `step()`, which is stale: `step()` is a compatibility
 * wrapper production never enters (P11-9). This runs inside the tick transaction instead
 * (`finishTickInternal`, phases.ts), AFTER phase 4's autonomous NPC speech has been recorded and
 * ingested and BEFORE phase 5's environment pass. Finding a letter and holding one out to a friend
 * are physical acts on the same simultaneous semantic tier as phase-4 autonomous action, so they
 * resolve at the TAIL of that tier: no artifact effect can change what was said during the beat, and
 * the paper lands last — which is the plan's "outranks every mouth" ordering made structural.
 *
 * DETERMINISTIC ORDER (the plan requires it documented here):
 *  1. Nothing happens off a conversation beat, or in a world that has never forged.
 *  2. Documents are walked in FORGE order — `artifacts` insertion order, i.e. ascending
 *     `artifactCounter`. Never lexicographic id order, which would put `a10` ahead of `a2`.
 *  3. Anything that changed hands earlier in THIS tick is skipped: the plan's "the NEXT beat" for a
 *     pickup, and "their NEXT shared beat" for a re-show.
 *  4. PICKUPS resolve before RE-SHOWS, and the re-show candidates are snapshotted BEFORE the first
 *     pickup runs — so a letter found this beat is read this beat, but passed on no earlier than the
 *     next one.
 *  5. A pickup's finder is the LEXICOGRAPHICALLY FIRST non-avatar member of the circles standing at
 *     that venue (the plan's rule, verbatim). An empty room simply leaves the letter waiting.
 *  6. A re-show fires only on conviction (stance BELIEVE), only to the holder's highest-trust edge,
 *     and only once per holder. The paper stays with the shower — a re-show is a showing, never a
 *     hand-over — so circulation costs the letter one more face, not its position.
 *
 * Two latches, both keyed on ARTIFACT IDENTITY and both read from the chronicle (review finding I-1):
 * has this AUDIENCE already had this page in front of them (`hasSeen`), and has this HOLDER already
 * had their one turn with it (`hasReshown`). The audience check runs first and deliberately does not
 * consume the holder's turn — an audience who has already read the page is a non-event, not a spent
 * chance. Neither question can be answered from the belief store: a belief remembers what a page said,
 * and two documents may say exactly the same thing while remaining two separate pieces of paper.
 * `documentBelief` stays content-keyed for the one question that really is about words — whether this
 * holder believes them (the conviction gate above).
 */
export function resolveArtifacts(
  world: WorldState, tick: Tick, circles: readonly Circle[],
): void {
  const artifacts = world.artifacts;
  if (artifacts === undefined || artifacts.length === 0) return;
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) return;
  const settled = changedHandsThisTick(world, tick);

  // Order rule 4: the circulation snapshot is taken before any pickup can add to it.
  const circulating = artifacts
    .filter((artifact) => artifact.heldBy !== null && artifact.heldBy !== world.playerId
      && !settled.has(artifact.id))
    .map((artifact) => artifact.id);

  for (const artifact of artifacts) {
    const venue = artifact.plantedAt;
    if (venue === null || settled.has(artifact.id)) continue;
    const finder = [...new Set(circles
      .filter((circle) => circle.venue === venue)
      .flatMap((circle) => circle.members))]
      .filter((id) => id !== world.playerId)
      .sort()[0];
    if (finder === undefined) continue;

    artifact.heldBy = finder;
    artifact.plantedAt = null;
    // The finder is their own source: nobody handed it over, and nobody is their own corroborator.
    deliverDocument(world, artifact, finder, finder, tick);
    world.chronicle.push({
      kind: 'artifact', tick, act: 'pickup', artifact: artifact.id, by: finder, to: null,
    });
  }

  for (const id of circulating) {
    const artifact = artifactById(world, id);
    if (artifact === null) continue;
    const holder = artifact.heldBy;
    if (holder === null) continue;
    const conviction = documentBelief(world, holder, artifact);
    if (conviction === null || stanceOf(conviction) !== 'believing') continue;
    const audience = topEdge(world, holder);
    if (audience === null) continue;
    const circle = circles.find((candidate) => candidate.members.includes(holder));
    if (circle === undefined || !circle.members.includes(audience)) continue;
    if (hasSeen(world, id, audience)) continue;
    if (hasReshown(world, id, holder)) continue;

    // The edge is the edge either way; only the substrate the viewing lands in differs.
    if (audience === world.playerId) showToAvatar(world, artifact, holder, circle.venue, tick);
    else deliverDocument(world, artifact, holder, audience, tick);
    world.chronicle.push({
      kind: 'artifact', tick, act: 'reshow', artifact: id, by: holder, to: audience,
    });
  }
}
