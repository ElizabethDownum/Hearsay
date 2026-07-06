import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { circlesAt, positionOf } from './agents';
import { observationsFor, type TickEvents } from './perception';
import { reportThrough } from './reporting';
import { CONVERSATION_BEAT } from './rumors/propagation';
import type { Rules } from './rules';
import type { IntelEntry, WorldState } from './types';
import type { Claim, EntityId, VenueId } from './rumors/claim';
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
        world.intel.log.push({
          ...blankIntel(), tick: obs.tick, venue: obs.venue, via: source.via,
          kind: 'asking', overheard: obs.overheard, speaker: obs.speaker, addressedTo: obs.addressedTo,
          authority: obs.authority, about: obs.about,
          family: 'family' in obs.about ? obs.about.family : null,
        });
      } else if (obs.kind === 'presence') {
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

  // Live coverage: your own venue, plus every venue an informant is actually posted to.
  const covered = new Set<VenueId>();
  if (world.playerVenue !== null) covered.add(world.playerVenue);
  for (const inf of world.intel.informants) {
    if (inf.assignedVenue !== null) covered.add(inf.assignedVenue);
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
    scenario: world.scenario
      ? { status: world.scenario.status, day: dayOf(tick), daysTotal: world.scenario.days }
      : null,
  };
}
