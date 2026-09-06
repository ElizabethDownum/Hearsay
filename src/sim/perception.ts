import type { Tick } from '../core/time';
import type { Claim, EntityId, RumorId, VenueId } from './rumors/claim';
import type { NetworkSpeech, SpokenNetworkPayload } from './directives/types';

export interface Utterance {
  tick: Tick;
  venue: VenueId;
  circleMembers: EntityId[];
  speaker: EntityId;
  addressedTo: EntityId;
  claim: Claim;
  /** 'answer' = a retelling compelled by an asking; its attribution discloses the teller's source. */
  mode: 'telling' | 'answer';
  /** The speaker explicitly says their answer came from a document. Absent on ordinary speech. */
  document?: true;
}

export type InquiryKey = { family: RumorId } | { subject: EntityId };

export interface Asking {
  tick: Tick;
  venue: VenueId;
  circleMembers: EntityId[];
  speaker: EntityId;
  addressedTo: EntityId;
  about: InquiryKey;
  /** true iff the task's `from === 'enemy'` — a question asked with the watch's authority. */
  authority: boolean;
}

/** Everything that happened in one tick — the ONLY raw material observation is built from. */
export interface TickEvents {
  tick: Tick;
  positions: Record<EntityId, VenueId>;
  utterances: Utterance[];
  askings: Asking[];
  networkSpeeches?: NetworkSpeech[];
}

export type Observation =
  | { kind: 'presence'; tick: Tick; venue: VenueId; actor: EntityId }
  | { kind: 'utterance'; tick: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; claim: Claim; overheard: boolean; mode: 'telling' | 'answer';
      document?: true }
  | { kind: 'asking'; tick: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; about: InquiryKey; overheard: boolean; authority: boolean }
  | { kind: 'network-speech'; tick: Tick; venue: VenueId; speaker: EntityId;
      addressedTo: EntityId; messageId: string; spoken: SpokenNetworkPayload; overheard: boolean };

export interface ObservationFeed {
  observer: EntityId;
  tick: Tick;
  observations: Observation[];
}

export interface VenueSensor {
  kind: 'venue-sensor'; venue: VenueId; from: Tick; to: Tick;
}
export type SceneObservation = Extract<Observation, { kind: 'presence' | 'utterance' | 'asking' }>;

function utteranceObservation(u: Utterance, overheard: boolean): Extract<Observation, { kind: 'utterance' }> {
  return {
    kind: 'utterance', tick: u.tick, venue: u.venue,
    speaker: u.speaker, addressedTo: u.addressedTo, claim: u.claim,
    overheard, mode: u.mode,
    ...(u.document === true ? { document: true as const } : {}),
  };
}

/**
 * Structural law: any actor observes the world through this function and
 * nothing else. Same venue = see presence; same circle = hear the words.
 */
export function observationsFor(observer: EntityId, events: TickEvents): ObservationFeed {
  const observations: Observation[] = [];
  const myVenue = events.positions[observer];

  if (myVenue !== undefined) {
    for (const [actor, venue] of Object.entries(events.positions).sort(([a], [b]) => a.localeCompare(b))) {
      if (actor !== observer && venue === myVenue) {
        observations.push({ kind: 'presence', tick: events.tick, venue: myVenue, actor });
      }
    }
  }

  for (const u of events.utterances) {
    if (u.speaker !== observer && u.circleMembers.includes(observer)) {
      observations.push(utteranceObservation(u, u.addressedTo !== observer));
    }
  }

  for (const a of events.askings) {
    if (a.speaker !== observer && a.circleMembers.includes(observer)) {
      observations.push({
        kind: 'asking', tick: a.tick, venue: a.venue,
        speaker: a.speaker, addressedTo: a.addressedTo, about: a.about,
        overheard: a.addressedTo !== observer, authority: a.authority,
      });
    }
  }

  for (const speech of events.networkSpeeches ?? []) {
    if (speech.speaker !== observer && speech.circleMembers.includes(observer)) {
      observations.push({
        kind: 'network-speech', tick: speech.tick, venue: speech.venue,
        speaker: speech.speaker, addressedTo: speech.addressedTo,
        messageId: speech.messageId, spoken: speech.spoken,
        overheard: speech.addressedTo !== observer,
      });
    }
  }

  return { observer, tick: events.tick, observations };
}

export function observationsAtVenue(sensor: VenueSensor, events: TickEvents): SceneObservation[] {
  if (events.tick < sensor.from || events.tick >= sensor.to) return [];
  const observations: SceneObservation[] = [];
  for (const [actor, venue] of Object.entries(events.positions).sort(([a], [b]) => a.localeCompare(b))) {
    if (venue === sensor.venue) observations.push({ kind: 'presence', tick: events.tick, venue, actor });
  }
  for (const u of events.utterances) {
    if (u.tick === events.tick && u.venue === sensor.venue) {
      observations.push(utteranceObservation(u, true));
    }
  }
  for (const a of events.askings) {
    if (a.tick === events.tick && a.venue === sensor.venue) observations.push({
      kind: 'asking', tick: a.tick, venue: a.venue,
      speaker: a.speaker, addressedTo: a.addressedTo, about: a.about,
      overheard: true, authority: a.authority,
    });
  }
  return observations;
}
