import type { Tick } from '../../core/time';
import type { IntelEntry } from '../../intel/entry';
import { cloneSerializable, stableStringify } from '../hash';
import type { EvidenceEntry } from '../enemy/state';
import { reportThrough } from '../reporting';
import type { Rules } from '../rules';
import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import type { Observation } from '../perception';
import type { Principal } from '../network/types';
import { isTurnedAgainst } from '../network/roster';
import { allocateObservationId, ensureDirectiveState, strictNextBeat } from './state';
import type {
  HeldFieldObservation, NetworkMessage, NetworkSpeech, ReportedFieldObservation,
} from './types';
import { queueNetworkMessage } from './transport';

const blankIntelFields = (): Omit<IntelEntry, 'tick' | 'venue' | 'via' | 'kind' | 'overheard'> => ({
  speaker: null, addressedTo: null, mode: null, authority: false, claimId: null, family: null,
  reported: null, about: null, actor: null, npc: null, trait: null,
  edgeFrom: null, edgeTo: null, edgeKind: null, hintAbout: null, hintWitness: null,
});

function observedAt(content: HeldFieldObservation['content']): Tick {
  return content.kind === 'raw' ? content.observation.tick : content.observation.observedAt;
}

export function holdFieldObservation(
  world: WorldState,
  principal: Principal,
  observer: EntityId,
  content: HeldFieldObservation['content'],
  rootFingerprint: string | null,
  route: EntityId[],
  sourceDirectiveId: string | null,
  factRefs: { asset: EntityId; factIndex: number }[],
): string {
  if (!world.npcs[observer]) throw new Error(`field-report: unknown observer '${observer}'`);
  if (route.length === 0) throw new Error('field-report: an observation needs a physical return route');
  if (content.kind === 'reported' && rootFingerprint === null) {
    throw new Error('field-report: a reported observation must carry its root fingerprint');
  }
  const root = rootFingerprint
    ?? stableStringify(['root', observer, content.kind === 'raw' ? content.observation : content]);
  const fingerprint = stableStringify([principal, observer, root]);
  const state = ensureDirectiveState(world);
  const existing = state.heldObservations.find((row) => row.fingerprint === fingerprint);
  if (existing) return existing.id;
  const id = allocateObservationId(state);
  state.heldObservations.push({
    id,
    fingerprint,
    rootFingerprint: root,
    principal,
    observer,
    observedAt: observedAt(content),
    content: cloneSerializable(content),
    sourceDirectiveId,
    route: [...route],
    factRefs: cloneSerializable(factRefs),
    queuedIn: null,
    deliveredAt: null,
  });
  return id;
}

const sameRoute = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function queueUnqueuedFieldReports(world: WorldState): void {
  const state = world.network.directiveState;
  if (!state) return;
  const pending = state.heldObservations
    .filter((row) => row.queuedIn === null && row.deliveredAt === null)
    .sort((a, b) => a.principal.localeCompare(b.principal)
      || a.observer.localeCompare(b.observer) || a.fingerprint.localeCompare(b.fingerprint));

  for (const row of pending) {
    const matching = state.messages.find((message) =>
      message.payload.kind === 'field-report'
      && message.principal === row.principal
      && message.origin === row.observer
      && message.holder === row.observer
      && message.nextHop === 0
      && message.deliveredAt === null
      && message.failedAt === null
      && message.payload.renderedItems === null
      && message.payload.sourceDirectiveId === row.sourceDirectiveId
      && sameRoute(message.route, row.route)
      && message.payload.sourceObservationIds.length < 8);
    if (matching && matching.payload.kind === 'field-report') {
      matching.payload.sourceObservationIds.push(row.id);
      matching.availableAfter = Math.max(matching.availableAfter, strictNextBeat(row.observedAt));
      row.queuedIn = matching.id;
      continue;
    }
    const id = queueNetworkMessage(world, row.principal, row.observer, row.route, {
      kind: 'field-report',
      origin: row.observer,
      sourceDirectiveId: row.sourceDirectiveId,
      sourceObservationIds: [row.id],
      renderedItems: null,
    }, strictNextBeat(row.observedAt), null, null);
    row.queuedIn = id;
  }
}

/** Reports-of-reports carry each spoken item/root atomically; the outer envelope is never re-held. */
export function holdObservedFieldReportItems(
  world: WorldState,
  principal: Principal,
  observer: EntityId,
  observation: Extract<Observation, { kind: 'network-speech' }>,
  route: EntityId[],
): boolean {
  if (observation.spoken.kind !== 'field-report') return false;
  const packet = world.network.directiveState?.messages.find((message) =>
    message.id === observation.messageId && message.payload.kind === 'field-report');
  if (!packet || packet.payload.kind !== 'field-report') return true;
  const payload = packet.payload;
  if (payload.renderedItems === null
    || payload.renderedItems.length !== observation.spoken.items.length) return true;
  observation.spoken.items.forEach((item, index) => {
    holdFieldObservation(
      world, principal, observer,
      { kind: 'reported', observation: item.observation },
      payload.renderedItems![index]!.rootFingerprint,
      route, null, item.factRefs,
    );
  });
  return true;
}

function rawReportedObservation(row: HeldFieldObservation): ReportedFieldObservation {
  if (row.content.kind === 'reported') return cloneSerializable(row.content.observation);
  const observation = row.content.observation;
  switch (observation.kind) {
    case 'utterance':
      {
        const { subject, predicate, object, count, severity, place, attribution } = observation.claim;
      return {
        kind: 'utterance', observedAt: observation.tick, venue: observation.venue,
        speaker: observation.speaker, addressedTo: observation.addressedTo,
        overheard: observation.overheard, mode: observation.mode,
        claimId: observation.claim.id, family: observation.claim.family,
        reported: { subject, predicate, object, count, severity, place, attribution },
      };
      }
    case 'asking':
      return {
        kind: 'asking', observedAt: observation.tick, venue: observation.venue,
        speaker: observation.speaker, addressedTo: observation.addressedTo,
        overheard: observation.overheard, authority: observation.authority,
        about: cloneSerializable(observation.about),
      };
    case 'presence':
      return {
        kind: 'presence', observedAt: observation.tick,
        venue: observation.venue, actor: observation.actor,
      };
    case 'network-speech':
      return {
        kind: 'network-speech', observedAt: observation.tick, venue: observation.venue,
        speaker: observation.speaker, addressedTo: observation.addressedTo,
        overheard: observation.overheard, messageId: observation.messageId,
        spoken: cloneSerializable(observation.spoken),
      };
  }
}

/** Project the copy this speaker actually holds; relays never recover the origin's raw observation. */
function projectReportedObservation(
  world: WorldState,
  observation: ReportedFieldObservation,
  reporter: EntityId,
  rules: Rules,
  audience: Principal,
): ReportedFieldObservation | null {
  // Turncoat doctoring happens at the spoken projection seam: omitted atoms are never learned by
  // the principal, while the receipt can still close every source row carried by this packet.
  const doctored = isTurnedAgainst(world, audience, reporter);
  if (doctored && (observation.kind === 'presence'
    || (observation.kind === 'asking' && observation.authority))) return null;
  switch (observation.kind) {
    case 'utterance':
      return {
        kind: 'utterance', observedAt: observation.observedAt, venue: observation.venue,
        speaker: observation.speaker, addressedTo: observation.addressedTo,
        overheard: observation.overheard, mode: observation.mode,
        claimId: observation.claimId, family: observation.family,
        reported: reportThrough(world, reporter, {
          id: observation.claimId, family: observation.family, parent: null,
          ...observation.reported,
        }, rules, audience),
      };
    case 'asking':
      return {
        kind: 'asking', observedAt: observation.observedAt, venue: observation.venue,
        speaker: observation.speaker, addressedTo: observation.addressedTo,
        overheard: observation.overheard, authority: observation.authority,
        about: cloneSerializable(observation.about),
      };
    case 'presence':
      return {
        kind: 'presence', observedAt: observation.observedAt,
        venue: observation.venue, actor: observation.actor,
      };
    case 'network-speech':
      return {
        kind: 'network-speech', observedAt: observation.observedAt, venue: observation.venue,
        speaker: observation.speaker, addressedTo: observation.addressedTo,
        overheard: observation.overheard, messageId: observation.messageId,
        spoken: cloneSerializable(observation.spoken),
      };
  }
}

export function projectFieldReportHop(
  world: WorldState,
  message: NetworkMessage,
  speaker: EntityId,
  rules: Rules,
): {
  rootFingerprint: string;
  observation: ReportedFieldObservation;
  factRefs: { asset: EntityId; factIndex: number }[];
}[] {
  if (message.payload.kind !== 'field-report') {
    throw new Error(`field-report projection: message '${message.id}' is ${message.payload.kind}`);
  }
  const payload = message.payload;
  if (payload.renderedItems !== null) {
    return payload.renderedItems.flatMap((item) => {
      const observation = projectReportedObservation(
        world, item.observation, speaker, rules, message.principal,
      );
      return observation === null ? [] : [{
        rootFingerprint: item.rootFingerprint,
        observation,
        factRefs: cloneSerializable(item.factRefs),
      }];
    });
  }
  const state = ensureDirectiveState(world);
  const rendered: ReturnType<typeof projectFieldReportHop> = [];
  for (const id of payload.sourceObservationIds) {
    const row = state.heldObservations.find((candidate) => candidate.id === id);
    if (!row || row.queuedIn !== message.id || row.observer !== payload.origin) {
      throw new Error(`field-report projection: malformed source '${id}'`);
    }
    const observation = projectReportedObservation(
      world, rawReportedObservation(row), speaker, rules, message.principal,
    );
    if (observation === null) continue;
    rendered.push({
      rootFingerprint: row.rootFingerprint,
      observation,
      factRefs: cloneSerializable(row.factRefs),
    });
  }
  return rendered;
}

function sourceDirectiveFor(world: WorldState, messageId: string): string | null {
  const payload = world.network.directiveState?.messages.find((message) => message.id === messageId)?.payload;
  if (!payload) return null;
  if (payload.kind === 'directive') return payload.version.directiveId;
  if (payload.kind === 'directive-report') return payload.directiveId;
  if (payload.kind === 'handler-brief') return payload.sourceDirectiveId;
  return null;
}

function addKnownFact(world: WorldState, asset: EntityId, factIndex: number, receivedAt: Tick): void {
  const rows = world.intel.knownAssetFacts ?? (world.intel.knownAssetFacts = []);
  if (!rows.some((row) => row.asset === asset && row.factIndex === factIndex)) {
    rows.push({ asset, factIndex, receivedAt });
  }
}

function ingestPlayerItem(
  world: WorldState,
  via: EntityId,
  item: { observation: ReportedFieldObservation; factRefs: { asset: EntityId; factIndex: number }[] },
  receivedAt: Tick,
): void {
  const observation = item.observation;
  if (observation.kind === 'utterance') {
    world.intel.log.push({
      ...blankIntelFields(), tick: observation.observedAt, venue: observation.venue, via,
      kind: 'utterance', overheard: observation.overheard,
      speaker: observation.speaker, addressedTo: observation.addressedTo,
      mode: observation.mode, claimId: observation.claimId, family: observation.family,
      reported: cloneSerializable(observation.reported),
    });
  } else if (observation.kind === 'asking') {
    world.intel.log.push({
      ...blankIntelFields(), tick: observation.observedAt, venue: observation.venue, via,
      kind: 'asking', overheard: observation.overheard,
      speaker: observation.speaker, addressedTo: observation.addressedTo,
      authority: observation.authority, about: cloneSerializable(observation.about),
      family: 'family' in observation.about ? observation.about.family : null,
    });
  } else if (observation.kind === 'presence') {
    world.intel.log.push({
      ...blankIntelFields(), tick: observation.observedAt, venue: observation.venue, via,
      kind: 'presence', overheard: true, actor: observation.actor,
    });
  } else {
    const rows = world.intel.network ?? (world.intel.network = []);
    rows.push({
      tick: observation.observedAt, venue: observation.venue, via,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, messageId: observation.messageId,
      spoken: cloneSerializable(observation.spoken),
    });
  }
  for (const ref of item.factRefs) addKnownFact(world, ref.asset, ref.factIndex, receivedAt);
}

function ingestEnemyItem(
  world: WorldState,
  observer: EntityId,
  item: { observation: ReportedFieldObservation },
): void {
  const observation = item.observation;
  let entry: EvidenceEntry | null = null;
  if (observation.kind === 'utterance') {
    entry = {
      tick: observation.observedAt, venue: observation.venue, observer,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, kind: 'utterance', mode: observation.mode,
      claimId: observation.claimId, family: observation.family,
      reported: cloneSerializable(observation.reported), about: null,
    };
  } else if (observation.kind === 'asking') {
    entry = {
      tick: observation.observedAt, venue: observation.venue, observer,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, kind: 'asking', mode: null,
      claimId: null, family: 'family' in observation.about ? observation.about.family : null,
      reported: null, about: cloneSerializable(observation.about),
    };
  } else if (observation.kind === 'network-speech') {
    entry = {
      tick: observation.observedAt, venue: observation.venue, observer,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, kind: 'network', mode: null,
      claimId: null, family: null, reported: null, about: null,
      network: {
        messageId: observation.messageId,
        sourceDirectiveId: sourceDirectiveFor(world, observation.messageId),
        spoken: cloneSerializable(observation.spoken),
      },
    };
  }
  if (entry) world.enemy.evidence.push(entry);
}

export function ingestObservedFieldReport(
  world: WorldState,
  principal: Principal,
  speech: NetworkSpeech,
): void {
  if (speech.spoken.kind !== 'field-report') return;
  if (principal === 'player') {
    for (const item of speech.spoken.items) ingestPlayerItem(world, speech.speaker, item, speech.tick);
  } else {
    for (const item of speech.spoken.items) ingestEnemyItem(world, speech.speaker, item);
  }
}
