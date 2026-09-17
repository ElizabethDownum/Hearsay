import type { BriefVersion, DirectiveOutcomeRecord, DirectiveRecord, NetworkPayload } from '../directives/types';
import type { Principal } from '../network/types';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import { networkThreads, type NetworkThread } from './network';

/** Private terminal history; no part of this reader is a live directive-desk selector. */
export interface DirectiveThread {
  kind: 'directive';
  id: string;
  directiveId: string;
  principal: Principal;
  principalId: string;
  recipient: string;
  issuedAt: number;
  authoredCopy: BriefVersion;
  deliveredCopy: DirectiveRecord['received'];
  latestRun: DirectiveRecord['execution'];
  /** Null means history was not recorded, never that no work occurred. */
  localResults: DirectiveOutcomeRecord[] | null;
  /** These are returned accounts, which can differ from the local results. */
  returnedAccounts: DirectiveRecord['receivedReports'];
  messageIds: string[];
}

/** Association metadata joins operations; this function does not feed an NPC's knowledge. */
function directiveOf(world: WorldState, payload: NetworkPayload): string | null {
  switch (payload.kind) {
    case 'directive': return payload.version.directiveId;
    case 'directive-report': case 'directive-response': return payload.directiveId;
    case 'handler-brief': case 'field-report': return payload.sourceDirectiveId;
    case 'invitation': case 'invitation-response':
      return world.network.invitations?.find((row) => row.id === payload.invitationId)?.sourceDirectiveId ?? null;
    case 'recruitment-approach': case 'recruitment-response':
      return world.network.directiveState?.recruitmentApproaches
        .find((row) => row.id === payload.approachId)?.sourceDirectiveId ?? null;
    case 'compartment-fact': case 'sketch-tip': return null;
  }
}

/** Build network history once, and link exact packet identities rather than similar prose. */
export function directiveHistories(world: WorldState): { directives: DirectiveThread[]; messages: NetworkThread[] } {
  const messages = networkThreads(world);
  const linked = new Map<string, Set<string>>();
  const link = (directiveId: string, messageId: string): void => {
    const group = linked.get(directiveId) ?? new Set<string>();
    group.add(messageId); linked.set(directiveId, group);
  };
  for (const message of world.network.directiveState?.messages ?? []) {
    const directiveId = directiveOf(world, message.payload);
    if (directiveId !== null) link(directiveId, message.id);
  }
  // Orphaned legacy speech can still explicitly name its directive. A handler copy
  // or unrelated packet with no retained association remains in the messages list.
  for (const message of messages) for (const stage of message.stages) {
    if (stage.copy.kind === 'directive' || stage.copy.kind === 'directive-report'
      || stage.copy.kind === 'directive-response') link(stage.copy.directiveId, message.messageId);
  }
  const directives = (world.network.directiveState?.records ?? []).map((record): DirectiveThread => {
    const ids = new Set(linked.get(record.id) ?? []);
    if (record.received) ids.add(record.received.messageId);
    for (const row of record.outcomes ?? []) if (row.reportMessageId !== null) ids.add(row.reportMessageId);
    return { kind: 'directive', id: 'directive:' + record.id, directiveId: record.id,
      principal: record.principal, principalId: record.principalId, recipient: record.recipient,
      issuedAt: record.issuedAt, authoredCopy: cloneSerializable(record.authored),
      deliveredCopy: cloneSerializable(record.received), latestRun: cloneSerializable(record.execution),
      localResults: record.outcomes === undefined ? null : cloneSerializable(record.outcomes),
      returnedAccounts: cloneSerializable(record.receivedReports), messageIds: [...ids].sort() };
  }).sort((a, b) => a.issuedAt - b.issuedAt || a.directiveId.localeCompare(b.directiveId));
  return { directives, messages };
}
