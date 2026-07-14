import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { circlesAt } from './agents';
import { observationsFor, type Observation, type TickEvents } from './perception';
import { CONVERSATION_BEAT } from './rumors/propagation';
import type { Rules } from './rules';
import type { IntelEntry, WorldState } from './types';
import type { Claim, EntityId, VenueId } from './rumors/claim';
import type { Mice } from './network/types';
import type { TownMap } from './enemy/state';
import type { ScenarioStatus } from './scenario/types';
import { buildTownMap } from './world';
import { stableStringify } from './hash';
import {
  holdFieldObservation, holdObservedFieldReportItems, ingestObservedFieldReport,
} from './directives/field-reports';
import type { NetworkSpeech } from './directives/types';
import type { CourierPlanningMark } from '../intel/entry';

/** The nulled-out fields of one intel row — the parts that identify a row (tick/venue/via/
 *  kind/overheard) are always supplied by the caller. A FACTORY (fresh object per call) so no
 *  consumer can mutate a shared template; Task 3's dossier dispatch builds its trait-read/
 *  edge-read/hint rows from this same seam. */
export function blankIntel(): Omit<IntelEntry, 'tick' | 'venue' | 'via' | 'kind' | 'overheard'> {
  return {
    speaker: null, addressedTo: null, mode: null, authority: false, claimId: null, family: null,
    reported: null, about: null, actor: null, npc: null, trait: null,
    edgeFrom: null, edgeTo: null, edgeKind: null, hintAbout: null, hintWitness: null,
  };
}

const rawReported = ({ subject, predicate, object, count, severity, place, attribution }: Claim) =>
  ({ subject, predicate, object, count, severity, place, attribution });

function appendOwnNetwork(world: WorldState, speech: NetworkSpeech): void {
  const rows = world.intel.network ?? (world.intel.network = []);
  if (rows.some((row) => row.messageId === speech.messageId && row.tick === speech.tick
    && row.speaker === speech.speaker && row.addressedTo === speech.addressedTo)) return;
  rows.push({
    tick: speech.tick, venue: speech.venue, via: 'self',
    overheard: speech.speaker === world.playerId ? false : speech.addressedTo !== world.playerId,
    speaker: speech.speaker, addressedTo: speech.addressedTo,
    messageId: speech.messageId, spoken: JSON.parse(stableStringify(speech.spoken)),
  });
  if (speech.spoken.kind === 'sketch-tip') {
    world.intel.log.push({
      ...blankIntel(), tick: speech.tick, venue: speech.venue, via: speech.speaker,
      kind: 'hint', overheard: speech.addressedTo !== world.playerId,
      hintAbout: speech.spoken.subject, hintWitness: speech.spoken.asset,
    });
  }
  if (speech.spoken.kind === 'directive-report') {
    const known = world.intel.knownAssetFacts ?? (world.intel.knownAssetFacts = []);
    for (const ref of speech.spoken.factRefs) {
      if (!known.some((row) => row.asset === ref.asset && row.factIndex === ref.factIndex)) {
        known.push({ asset: ref.asset, factIndex: ref.factIndex, receivedAt: speech.tick });
      }
    }
  }
  ingestObservedFieldReport(world, 'player', speech);
}

function appendOwnObservation(world: WorldState, observation: Observation, rules: Rules): void {
  if (observation.kind === 'utterance') {
    world.intel.log.push({
      ...blankIntel(), tick: observation.tick, venue: observation.venue, via: 'self',
      kind: 'utterance', overheard: observation.overheard,
      speaker: observation.speaker, addressedTo: observation.addressedTo,
      mode: observation.mode, claimId: observation.claim.id, family: observation.claim.family,
      reported: rawReported(observation.claim),
    });
  } else if (observation.kind === 'asking') {
    world.intel.log.push({
      ...blankIntel(), tick: observation.tick, venue: observation.venue, via: 'self',
      kind: 'asking', overheard: observation.overheard,
      speaker: observation.speaker, addressedTo: observation.addressedTo,
      authority: observation.authority, about: observation.about,
      family: 'family' in observation.about ? observation.about.family : null,
    });
  } else if (observation.kind === 'presence') {
    if (!new Set(rules.intel.watchOccupations).has(world.npcs[observation.actor]?.occupation ?? '')) return;
    const duplicate = world.intel.log.some((entry) => entry.kind === 'presence'
      && entry.actor === observation.actor && entry.venue === observation.venue
      && dayOf(entry.tick) === dayOf(observation.tick));
    if (duplicate) return;
    world.intel.log.push({
      ...blankIntel(), tick: observation.tick, venue: observation.venue, via: 'self',
      kind: 'presence', overheard: true, actor: observation.actor,
    });
  } else {
    appendOwnNetwork(world, {
      tick: observation.tick, venue: observation.venue, circleMembers: [],
      speaker: observation.speaker, addressedTo: observation.addressedTo,
      messageId: observation.messageId, spoken: observation.spoken, cause: null,
    });
  }
}

/**
 * The player's senses: the avatar (unfiltered, `via: 'self'`) plus every recruited informant
 * immediately. Operationally posted informants read the SAME perception feeds every other actor
 * reads, but their remote observations remain held until physically reported. Self-guards: no
 * sources → no-op, so player-free worlds are untouched. Presence is retained only for
 * (actor, venue, day) — the Counter-Sketch's countermeasure-watching feed.
 */
export function captureIntel(world: WorldState, events: TickEvents, rules: Rules): void {
  const playerId = world.playerId;
  if (playerId !== null && world.npcs[playerId]) {
    for (const observation of observationsFor(playerId, events).observations) {
      appendOwnObservation(world, observation, rules);
    }
    for (const speech of events.networkSpeeches ?? []) {
      if (speech.speaker === playerId) appendOwnNetwork(world, speech);
    }
  }
  if (playerId === null) return;

  const watch = new Set(rules.intel.watchOccupations);
  const candidates: { observer: EntityId; observation: Observation }[] = [];
  for (const informant of [...world.intel.informants].sort((a, b) => a.id.localeCompare(b.id))) {
    // Operational ownership only: accepted assignment + actual event position gate remote holds.
    // The three player-facing selectors below never read this field or turn it into live occupancy.
    if (!world.npcs[informant.id] || informant.assignedVenue === null) continue;
    if (events.positions[informant.id] !== informant.assignedVenue) continue;
    for (const observation of observationsFor(informant.id, events).observations) {
      if (observation.kind === 'presence'
        && !watch.has(world.npcs[observation.actor]?.occupation ?? '')) continue;
      candidates.push({ observer: informant.id, observation });
    }
  }
  candidates.sort((a, b) => a.observer.localeCompare(b.observer)
    || stableStringify(a.observation).localeCompare(stableStringify(b.observation)));
  for (const { observer, observation } of candidates) {
    if (observation.kind === 'network-speech'
      && holdObservedFieldReportItems(world, 'player', observer, observation, [playerId])) continue;
    holdFieldObservation(
      world, 'player', observer, { kind: 'raw', observation }, null,
      [playerId], null, [],
    );
  }
}

/**
 * THE epistemic selector every rendering surface consumes: what the player is allowed to see.
 * Presence law — occupants are listed only for the avatar's own live venue; every remote venue
 * stays unlisted even when an informant is operationally posted there. Reads only the campaign
 * referee's public tally (current status, the day, and the total
 * length of play) — never its verdict machinery or the evidence behind a verdict — and only the
 * street-knowledge map, never the enemy's private mind.
 */
export interface PlayerView {
  tick: Tick;
  avatar: { id: EntityId; venue: VenueId | null; circleMembers: EntityId[] };
  informants: { id: EntityId; requestedVenue: VenueId | null }[];
  /** Presence law: occupants listed ONLY for venues where you have live eyes. */
  occupantsByVenue: Record<VenueId, EntityId[]>;
  map: TownMap;
  /**
   * The avatar's OWN societal standing (Plan 8 Task 11): the player's to know — it decides which
   * venue doors the planner may offer (the access law) and which room they host in. Not the enemy's
   * mind, not a verdict — just where the seed seated you. `null` in a headless / pre-station world.
   */
  station: 'noble' | 'lowlife' | null;
  scenario: { status: ScenarioStatus; day: number; daysTotal: number } | null;
}

/** Street knowledge never goes missing: a world whose enemy roster was never wired still owes
 *  the player a map. Rebuilt through the SAME public-facts helper the enemy side uses, from the
 *  world's own venue/npc rosters — never inferred from anyone's schedule. */
function townMapFor(world: WorldState): TownMap {
  if (world.enemy.map.venues.length > 0 || world.enemy.map.directory.length > 0) return world.enemy.map;
  return buildTownMap({ venues: Object.values(world.venues), npcs: Object.values(world.npcs) });
}

export function playerView(world: WorldState): PlayerView {
  const tick = world.tick;
  const playerId = world.playerId;
  const onBeat = minuteOfDay(tick) % CONVERSATION_BEAT === 0;
  const circleMembers = playerId !== null && world.playerVenue !== null && onBeat
    ? (circlesAt(world, tick).find((c) => c.members.includes(playerId))?.members
        .filter((m) => m !== playerId) ?? [])
    : [];

  const occupantsByVenue: Record<VenueId, EntityId[]> = {};
  if (world.playerVenue !== null && onBeat) {
    const local = circlesAt(world, tick)
      .filter((circle) => circle.venue === world.playerVenue)
      .flatMap((circle) => circle.members)
      .filter((id, index, all) => all.indexOf(id) === index)
      .sort();
    occupantsByVenue[world.playerVenue] = local;
  }

  const latestRequested = new Map<EntityId, { venue: VenueId | null; authoredAt: Tick }>();
  for (const row of world.intel.requestedPosts ?? []) {
    const current = latestRequested.get(row.informant);
    if (!current || row.authoredAt >= current.authoredAt) {
      latestRequested.set(row.informant, { venue: row.venue, authoredAt: row.authoredAt });
    }
  }

  return {
    tick,
    avatar: { id: playerId ?? '', venue: world.playerVenue, circleMembers },
    informants: world.intel.informants.map((i) => ({
      id: i.id, requestedVenue: latestRequested.get(i.id)?.venue ?? null,
    })),
    occupantsByVenue,
    map: townMapFor(world),
    station: world.station,
    scenario: world.scenario
      ? { status: world.scenario.status, day: dayOf(tick), daysTotal: world.scenario.days }
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The NETWORK surface (Plan 8 Task 11). Two more epistemic selectors, same fence as playerView:
// they read ONLY what the player's own actions put on the record and NEVER the secret flip flag
// (turncoat invisibility is a pillar law — the player catches a turncoat by diffing channels, never
// a roster tell). No selector here reads the flip predicate, the enemy roster, or a raw trust edge.

/** Each strike shaves this much off an asset's verdigris bar — the ONE disclosed bar formula. */
export const STRIKE_BAR_PENALTY = 0.2;

/** One roster row, in PLAYER-KNOWN bookkeeping only: the recruit handle you chose, the weekly wage
 *  cursor, the strikes you have run up (missed wages + debriefs), where you requested they post,
 *  and how MANY compartment indexes have reached you — never raw remote contents. */
export interface NetworkAssetView {
  id: EntityId;
  mice: Mice | null;
  strikes: number;
  wagePaidThroughDay: number;
  requestedVenue: VenueId | null;
  factsCount: number;
  /** A 0..1 morale bar derived from `strikes` alone (STRIKE_BAR_PENALTY) — bookkeeping you can see,
   *  NEVER the hidden trust edge. Trust isn't directly visible; this is the honest proxy for it. */
  dispositionBar: number;
}

export interface NetworkDropView { id: string; venue: VenueId }

export interface NetworkView {
  assets: NetworkAssetView[];
  drops: NetworkDropView[];
}

/**
 * The roster panel's feed: your PLAYER-SIDE assets (never the enemy roster) with only the bookkeeping
 * your own actions authored — wages, strikes, requested posts, drops, a known-facts COUNT. The secret flip flag is
 * absent by construction (this function never touches it), so flipping every asset changes nothing
 * here — the structural-invisibility the turncoat pillar demands.
 */
export function networkView(world: WorldState): NetworkView {
  const postOf = new Map<EntityId, { venue: VenueId | null; authoredAt: Tick }>();
  for (const row of world.intel.requestedPosts ?? []) {
    const current = postOf.get(row.informant);
    if (!current || row.authoredAt >= current.authoredAt) {
      postOf.set(row.informant, { venue: row.venue, authoredAt: row.authoredAt });
    }
  }
  const known = new Set((world.intel.knownAssetFacts ?? []).map((row) => `${row.asset}\0${row.factIndex}`));
  const assets = [...world.network.assets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({
      id: a.id,
      mice: a.mice,
      strikes: a.strikes,
      wagePaidThroughDay: a.wagePaidThroughDay,
      requestedVenue: postOf.get(a.id)?.venue ?? null,
      factsCount: [...known].filter((key) => key.startsWith(`${a.id}\0`)).length,
      dispositionBar: Math.max(0, 1 - STRIKE_BAR_PENALTY * a.strikes),
    }));
  const drops = [...world.network.drops]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => ({ id: d.id, venue: d.venue }));
  return { assets, drops };
}

/** A courier's planning mark on the surveyor's plate: where it sets out, where it is bound. */
export interface CourierRoute {
  asset: EntityId;
  target: EntityId;
  from: VenueId;
  to: VenueId;
}

/** The venue the player LAST logged `id` at in their OWN intel (max-tick row naming id as speaker,
 *  addressee, or watched actor, with a venue) — or null if the player has never seen them. Reads the
 *  intel record ONLY, never positionOf/world truth: the courier overlay's epistemic fence. */
export function latestPlayerKnownVenue(world: WorldState, id: EntityId): VenueId | null {
  let requested: { venue: VenueId | null; authoredAt: Tick } | null = null;
  for (const row of world.intel.requestedPosts ?? []) {
    if (row.informant !== id) continue;
    if (requested === null || row.authoredAt >= requested.authoredAt) {
      requested = { venue: row.venue, authoredAt: row.authoredAt };
    }
  }
  if (requested?.venue !== null && requested?.venue !== undefined) return requested.venue;
  let best: IntelEntry | null = null;
  for (const e of world.intel.log) {
    if (e.speaker !== id && e.addressedTo !== id && e.actor !== id) continue;
    if (best === null || e.tick > best.tick) best = e;
  }
  return best ? best.venue : null;
}

/**
 * The town-view courier overlays: one route per open player-authored planning mark. Endpoints were
 * snapshotted from requested posts, known drops, and the player's timestamped intel when authored;
 * this selector never reads pending task state or schedule truth. A mark remains until an outcome is
 * witnessed or physically reported and its `acknowledgedAt` is set.
 */
export function courierRouteView(world: WorldState): CourierRoute[] {
  const routes: CourierRoute[] = [];
  for (const plan of world.intel.courierPlans ?? []) {
    if (plan.acknowledgedAt !== null || plan.from === null || plan.to === null) continue;
    routes.push({ asset: plan.asset, target: plan.target, from: plan.from, to: plan.to });
  }
  return routes;
}

export function appendCourierPlan(
  world: WorldState,
  mark: Omit<CourierPlanningMark, 'id'>,
): string {
  const rows = world.intel.courierPlans ?? (world.intel.courierPlans = []);
  const id = `plan-${rows.length}`;
  if (rows.some((row) => row.id === id)) throw new Error(`courier plan: duplicate id '${id}'`);
  rows.push({ id, ...mark });
  return id;
}
