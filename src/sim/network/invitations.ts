import type { Tick } from '../../core/time';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { WorldState } from '../types';
import type { NetworkInvitation } from './types';
import { circlesAt, positionOf } from '../agents';
import { recordFact } from './compartment';
import { assetFor } from './roster';

function validWindow(window: { from: Tick; until: Tick }): void {
  if (window.from >= window.until) throw new Error('invitation: requested window must be nonempty');
  if (window.from % CONVERSATION_BEAT !== 0 || window.until % CONVERSATION_BEAT !== 0) {
    throw new Error('invitation: requested window must be conversation-beat aligned');
  }
}

export function appendInvitation(
  world: WorldState,
  row: Omit<NetworkInvitation, 'id'>,
): NetworkInvitation {
  validWindow(row.requested);
  if (row.scheduled !== null) validWindow(row.scheduled);
  const rows = world.network.invitations ?? (world.network.invitations = []);
  const invitation: NetworkInvitation = { id: `invite-${rows.length}`, ...row };
  rows.push(invitation);
  return invitation;
}

export function invitationById(world: WorldState, id: string): NetworkInvitation | null {
  return world.network.invitations?.find((row) => row.id === id) ?? null;
}

export function evaluateInvitation(input: {
  relationship: number;
  localWitnesses: number;
  perceivedScrutiny: number;
}): 'accept' | 'refuse' {
  let points = input.relationship >= 0.75 ? 2 : input.relationship >= 0.50 ? 1
    : input.relationship < 0.25 ? -2 : 0;
  if (input.localWitnesses > 2) points -= 1;
  if (input.perceivedScrutiny >= 0.70) points -= 1;
  return points >= 1 ? 'accept' : 'refuse';
}

export function pruneEmptyInvitationState(world: WorldState): void {
  if (world.network.invitations?.length === 0) delete world.network.invitations;
}

/** Phase-5 lifecycle: attendance is physical; closing the window never moves anyone. */
export function resolveInvitations(world: WorldState, tick: Tick): void {
  for (const invitation of world.network.invitations ?? []) {
    if (invitation.status !== 'accepted' || invitation.scheduled === null) continue;
    const inside = invitation.scheduled.from <= tick && tick < invitation.scheduled.until;
    if (inside && tick % CONVERSATION_BEAT === 0 && invitation.attendedAt === null) {
      const guest = world.npcs[invitation.invitee];
      const guestThere = guest !== undefined && positionOf(world, guest, tick) === invitation.venue;
      const rendezvousThere = invitation.kind !== 'rendezvous' || (
        world.playerId !== null && world.playerVenue === invitation.venue
        && circlesAt(world, tick).some((circle) => circle.venue === invitation.venue
          && circle.members.includes(world.playerId!) && circle.members.includes(invitation.invitee))
      );
      if (guestThere && rendezvousThere) {
        invitation.attendedAt = tick;
        if (invitation.kind === 'rendezvous'
          && assetFor(world, invitation.principal, invitation.invitee)) {
          recordFact(world, invitation.principal, invitation.invitee,
            { kind: 'met-asset', ref: invitation.inviter });
        }
      }
    }
    if (tick < invitation.scheduled.until) continue;
    invitation.status = invitation.attendedAt === null ? 'missed' : 'attended';
    if (invitation.status === 'attended' && invitation.kind === 'hosting'
      && assetFor(world, invitation.principal, invitation.invitee)) {
      recordFact(world, invitation.principal, invitation.invitee,
        { kind: 'attended-hosting', ref: invitation.venue });
    }
    invitation.closedAt = tick;
  }
}
