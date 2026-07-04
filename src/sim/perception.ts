import type { Tick } from '../core/time';
import type { Claim, EntityId, VenueId } from './rumors/claim';

export interface Utterance {
  tick: Tick;
  venue: VenueId;
  circleMembers: EntityId[];
  speaker: EntityId;
  addressedTo: EntityId;
  claim: Claim;
}

/** Everything that happened in one tick — the ONLY raw material observation is built from. */
export interface TickEvents {
  tick: Tick;
  positions: Record<EntityId, VenueId>;
  utterances: Utterance[];
}

export type Observation =
  | { kind: 'presence'; tick: Tick; venue: VenueId; actor: EntityId }
  | { kind: 'utterance'; tick: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; claim: Claim; overheard: boolean };

export interface ObservationFeed {
  observer: EntityId;
  tick: Tick;
  observations: Observation[];
}

/**
 * Structural law: any actor observes the world through this function and
 * nothing else. Same venue = see presence; same circle = hear the words.
 */
export function observationsFor(observer: EntityId, events: TickEvents): ObservationFeed {
  const observations: Observation[] = [];
  const myVenue = events.positions[observer];

  if (myVenue !== undefined) {
    for (const [actor, venue] of Object.entries(events.positions)) {
      if (actor !== observer && venue === myVenue) {
        observations.push({ kind: 'presence', tick: events.tick, venue: myVenue, actor });
      }
    }
  }

  for (const u of events.utterances) {
    if (u.speaker !== observer && u.circleMembers.includes(observer)) {
      observations.push({
        kind: 'utterance', tick: u.tick, venue: u.venue,
        speaker: u.speaker, addressedTo: u.addressedTo, claim: u.claim,
        overheard: u.addressedTo !== observer,
      });
    }
  }

  return { observer, tick: events.tick, observations };
}
