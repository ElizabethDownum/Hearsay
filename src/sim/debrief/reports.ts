import type { HeldFieldObservation, SpokenNetworkPayload } from '../directives/types';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import { networkThreads, reportValueChanges, type NetworkThread, type SpokenCopyChange } from './network';

type ReportItem = Extract<SpokenNetworkPayload, { kind: 'field-report' }>['items'][number];
export interface ReportItemStage {
  chronicleIndex: number;
  tick: number;
  speaker: string;
  addressedTo: string;
  heardBy: NetworkThread['stages'][number]['heardBy'];
  status: 'spoken' | 'omitted' | 'unknown';
  item: ReportItem | null;
  /** Unknown previous copy or a missing link breaks comparison, never guesses a reindex. */
  changes: SpokenCopyChange[] | null;
}
export interface FieldReportThread {
  kind: 'field-report-item';
  id: string;
  rootFingerprint: string;
  /** Retained raw/reported holdings, not retroactively inferred from a later speech. */
  held: HeldFieldObservation[];
  packets: {
    messageId: string;
    transport: NetworkThread['transport'];
    transportAt: number | null;
    plannedRoute: string[] | null;
    stages: ReportItemStage[];
  }[];
}

/**
 * One original observation can travel in several reports and change at each hop.
 * Packet/held deliveredAt is transport bookkeeping; only actual spoken copies and
 * audiences show whether an item was said or heard. A delivered empty envelope
 * does not turn its omitted contents into knowledge.
 */
export function fieldReportThreads(world: WorldState, messages = networkThreads(world)): FieldReportThread[] {
  const threads = new Map<string, FieldReportThread>();
  const rootsByMessage = new Map<string, Set<string>>();
  const get = (root: string): FieldReportThread => {
    const row: FieldReportThread = threads.get(root) ?? { kind: 'field-report-item', id: 'report:' + root,
      rootFingerprint: root, held: [], packets: [] };
    threads.set(root, row); return row;
  };
  const link = (root: string, messageId: string): void => {
    get(root);
    const roots = rootsByMessage.get(messageId) ?? new Set<string>();
    roots.add(root); rootsByMessage.set(messageId, roots);
  };
  const held = world.network.directiveState?.heldObservations ?? [];
  for (const row of held) {
    get(row.rootFingerprint).held.push(cloneSerializable(row));
    if (row.queuedIn !== null) link(row.rootFingerprint, row.queuedIn);
  }
  for (const packet of world.network.directiveState?.messages ?? []) {
    if (packet.payload.kind !== 'field-report') continue;
    for (const id of packet.payload.sourceObservationIds) {
      const row = held.find((candidate) => candidate.id === id);
      if (row) link(row.rootFingerprint, packet.id);
    }
    for (const item of packet.payload.renderedItems ?? []) link(item.rootFingerprint, packet.id);
  }
  for (const message of messages) for (const stage of message.stages) {
    for (const root of stage.reportRoots ?? []) link(root, message.messageId);
  }
  for (const message of messages) for (const root of rootsByMessage.get(message.messageId) ?? []) {
    const stages: ReportItemStage[] = [];
    let previous: ReportItem | null = null;
    for (const stage of message.stages) {
      if (stage.copy.kind !== 'field-report') { previous = null; continue; }
      const position = stage.reportRoots?.indexOf(root) ?? -1;
      const status = stage.reportRoots === null ? 'unknown' : position < 0 ? 'omitted' : 'spoken';
      const item = status === 'spoken' ? cloneSerializable(stage.copy.items[position]!) : null;
      stages.push({ chronicleIndex: stage.chronicleIndex, tick: stage.tick, speaker: stage.speaker,
        addressedTo: stage.addressedTo, heardBy: cloneSerializable(stage.heardBy), status, item,
        changes: previous !== null && item !== null ? reportValueChanges(previous, item) : null });
      previous = item;
    }
    get(root).packets.push({ messageId: message.messageId, transport: message.transport,
      transportAt: message.transportAt, plannedRoute: cloneSerializable(message.plannedRoute), stages });
  }
  // Retain a known association whose legacy packet and speech history are both missing.
  const retainedMessages = new Set(messages.map((message) => message.messageId));
  for (const [messageId, roots] of rootsByMessage) {
    if (retainedMessages.has(messageId)) continue;
    for (const root of roots) get(root).packets.push({ messageId, transport: 'unrecorded',
      transportAt: null, plannedRoute: null, stages: [] });
  }
  for (const row of threads.values()) {
    row.held.sort((a, b) => a.observedAt - b.observedAt || a.id.localeCompare(b.id));
    row.packets.sort((a, b) => a.messageId.localeCompare(b.messageId));
  }
  return [...threads.values()].sort((a, b) => a.rootFingerprint.localeCompare(b.rootFingerprint));
}
