import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { circlesAt, positionOf } from './agents';
import { observationsFor, type TickEvents } from './perception';
import { reportThrough } from './reporting';
import { isTurnedAsset } from './network/roster';
import { CONVERSATION_BEAT } from './rumors/propagation';
import type { Rules } from './rules';
import type { IntelEntry, WorldState } from './types';
import type { Claim, EntityId, VenueId } from './rumors/claim';
import type { Mice } from './network/types';
import type { TownMap } from './enemy/state';
import type { ScenarioStatus } from './scenario/types';
import { buildTownMap } from './world';

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

/** How a claim reaches the log: the avatar hears it raw (`self`), an informant reports it
 *  through their traits. The single fork for the two player-controlled channels. */
function heardClaim(world: WorldState, via: 'self' | EntityId, claim: Claim, rules: Rules) {
  return via === 'self'
    ? (({ subject, predicate, object, count, severity, place, attribution }) =>
        ({ subject, predicate, object, count, severity, place, attribution }))(claim)
    : reportThrough(world, via, claim, rules);
}

/**
 * The player's senses: the avatar (unfiltered, `via: 'self'`) plus every recruited informant
 * (trait-filtered, `via: <informant>`), reading the SAME perception feeds every other actor
 * reads — never world state. Self-guards: no sources → no-op, so player-free worlds are
 * untouched. Presence is captured only for watch-occupation actors and deduped per
 * (actor, venue, day) — the Counter-Sketch's countermeasure-watching feed.
 */
export function captureIntel(world: WorldState, events: TickEvents, rules: Rules): void {
  const sources: { id: EntityId; via: 'self' | EntityId }[] = [];
  if (world.playerId !== null) sources.push({ id: world.playerId, via: 'self' });
  for (const inf of world.intel.informants) sources.push({ id: inf.id, via: inf.id });
  if (sources.length === 0) return;

  const day = dayOf(events.tick);
  const watch = new Set(rules.intel.watchOccupations);
  for (const source of sources) {
    // Symmetry with captureEvidence's observer guard: a source with no NPC record can never be
    // perceived (never in a circle or position), so its feed is empty anyway — but skip it here
    // so a malformed informant list degrades to a no-op instead of tripping reportThrough's lookup.
    if (!world.npcs[source.id]) continue;
    // Turncoat doctoring (Plan 8 Task 8): a TURNED asset's channel drops the enemy-relevant rows —
    // watch sightings (kind 'presence' at watch posts) and authority-backed askings — so the enemy's
    // activity goes unreported to the player. Story reports are NOT dropped: they minimize in
    // reportThrough (one mechanic). The DIVERGENCE from a loyal channel is the only tell — no flag.
    const doctored = source.via !== 'self' && isTurnedAsset(world, source.via);
    const feed = observationsFor(source.id, events);
    for (const obs of feed.observations) {
      if (obs.kind === 'utterance') {
        world.intel.log.push({
          ...blankIntel(), tick: obs.tick, venue: obs.venue, via: source.via,
          kind: 'utterance', overheard: obs.overheard, speaker: obs.speaker, addressedTo: obs.addressedTo,
          mode: obs.mode, claimId: obs.claim.id, family: obs.claim.family,
          reported: heardClaim(world, source.via, obs.claim, rules),
        });
      } else if (obs.kind === 'asking') {
        if (doctored && obs.authority) continue;   // authority askings OMITTED from a turned channel
        world.intel.log.push({
          ...blankIntel(), tick: obs.tick, venue: obs.venue, via: source.via,
          kind: 'asking', overheard: obs.overheard, speaker: obs.speaker, addressedTo: obs.addressedTo,
          authority: obs.authority, about: obs.about,
          family: 'family' in obs.about ? obs.about.family : null,
        });
      } else if (obs.kind === 'presence') {
        if (doctored) continue;                     // watch sightings DROPPED from a turned channel
        if (!watch.has(world.npcs[obs.actor]?.occupation ?? '')) continue;
        const dup = world.intel.log.some((e) => e.kind === 'presence' && e.actor === obs.actor
          && e.venue === obs.venue && dayOf(e.tick) === day);
        if (!dup) {
          world.intel.log.push({
            ...blankIntel(), tick: obs.tick, venue: obs.venue, via: source.via,
            kind: 'presence', overheard: true, actor: obs.actor,
          });
        }
      }
    }
  }
}

/**
 * THE epistemic selector every rendering surface consumes: what the player is allowed to see.
 * Presence law — occupants are listed only for venues under live coverage (the avatar's own
 * venue plus each informant's post); every other venue stays unlisted even when NPCs are truly
 * there. Reads only the campaign referee's public tally (current status, the day, and the total
 * length of play) — never its verdict machinery or the evidence behind a verdict — and only the
 * street-knowledge map, never the enemy's private mind.
 */
export interface PlayerView {
  tick: Tick;
  avatar: { id: EntityId; venue: VenueId | null; circleMembers: EntityId[] };
  informants: { id: EntityId; assignedVenue: VenueId | null }[];
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

  // Live coverage: your own venue, plus each informant's post — but ONLY while the informant is
  // actually standing there (controller rider: coverage rides the 960–1200 post window that
  // assignInformant writes, not all-day via assignedVenue). Keyed on the informant's real position,
  // same as captureIntel's feed: outside the post the eyes go with the body, not the assignment.
  const covered = new Set<VenueId>();
  if (world.playerVenue !== null) covered.add(world.playerVenue);
  for (const inf of world.intel.informants) {
    if (inf.assignedVenue === null) continue;
    const npc = world.npcs[inf.id];
    if (npc && positionOf(world, npc, tick) === inf.assignedVenue) covered.add(inf.assignedVenue);
  }

  const occupantsByVenue: Record<VenueId, EntityId[]> = {};
  for (const npc of Object.values(world.npcs).sort((a, b) => a.id.localeCompare(b.id))) {
    const venue = positionOf(world, npc, tick);
    if (!covered.has(venue)) continue;
    (occupantsByVenue[venue] ??= []).push(npc.id);
  }

  return {
    tick,
    avatar: { id: playerId ?? '', venue: world.playerVenue, circleMembers },
    informants: world.intel.informants.map((i) => ({ id: i.id, assignedVenue: i.assignedVenue })),
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
 *  cursor, the strikes you have run up (missed wages + debriefs), where you posted them, and how
 *  MANY facts they carry — never WHICH facts (compartment contents surface at debrief, not here). */
export interface NetworkAssetView {
  id: EntityId;
  mice: Mice | null;
  strikes: number;
  wagePaidThroughDay: number;
  assignedVenue: VenueId | null;
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
 * your own actions authored — wages, strikes, postings, drops, a facts-COUNT. The secret flip flag is
 * absent by construction (this function never touches it), so flipping every asset changes nothing
 * here — the structural-invisibility the turncoat pillar demands.
 */
export function networkView(world: WorldState): NetworkView {
  const postOf = new Map(world.intel.informants.map((i) => [i.id, i.assignedVenue]));
  const assets = [...world.network.assets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({
      id: a.id,
      mice: a.mice,
      strikes: a.strikes,
      wagePaidThroughDay: a.wagePaidThroughDay,
      assignedVenue: postOf.get(a.id) ?? null,
      factsCount: a.facts.length,
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
function lastKnownVenue(world: WorldState, id: EntityId): VenueId | null {
  let best: IntelEntry | null = null;
  for (const e of world.intel.log) {
    if (e.speaker !== id && e.addressedTo !== id && e.actor !== id) continue;
    if (best === null || e.tick > best.tick) best = e;
  }
  return best ? best.venue : null;
}

/**
 * The town-view courier overlays (Ellie-ratified 2026-07-05): one route per pending courier run,
 * built from PLAYER-KNOWN data ONLY — the tasking you issued, the drop's venue, and the target's
 * last-known presence from YOUR intel log. A face handoff sets out from where you posted the asset
 * (or last saw them); a drop run sets out from the drop's venue. A run whose endpoint the player
 * cannot place (a target never yet seen) draws NO mark — you do not get to peek at world truth to
 * aim it. These are your own planning marks, never schedule truth; they clear when the run leaves
 * `pendingCouriers` (delivered or expired), so the overlay is always live by construction.
 */
export function courierRouteView(world: WorldState): CourierRoute[] {
  const postOf = new Map(world.intel.informants.map((i) => [i.id, i.assignedVenue]));
  const routes: CourierRoute[] = [];
  for (const run of world.network.pendingCouriers) {
    const from = run.viaDrop !== null
      ? (world.network.drops.find((d) => d.id === run.viaDrop)?.venue ?? null)
      : (postOf.get(run.asset) ?? lastKnownVenue(world, run.asset));
    const to = lastKnownVenue(world, run.target);
    if (from === null || to === null) continue; // an endpoint the player can't place → no mark drawn
    routes.push({ asset: run.asset, target: run.target, from, to });
  }
  return routes;
}
