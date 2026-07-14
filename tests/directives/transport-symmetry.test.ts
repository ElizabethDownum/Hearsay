import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { miniTown } from '../sim/helpers/minitown';
import { stableStringify } from '../../src/sim/hash';
import { queueNetworkMessage, realizeNetworkForward } from '../../src/sim/directives/transport';
import { buildWorld } from '../../src/sim/world';

function timeline(principal: 'player' | 'enemy') {
  const value = buildWorld(miniTown(), `mirror-${principal}`, STANDARD_RULES);
  const id = queueNetworkMessage(value, principal, 'ada', ['bez'], {
    kind: 'invitation-response', invitationId: 'invite-0', response: 'accept',
  }, 0, null, null);
  const speech = realizeNetworkForward(
    value, id, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES,
  );
  const message = value.network.directiveState!.messages[0]!;
  return { message: { ...message, principal: 'P' }, speech };
}

describe('principal-symmetric transport', () => {
  it('uses byte-identical mechanics for player and enemy messages', () => {
    expect(stableStringify(timeline('player'))).toBe(stableStringify(timeline('enemy')));
  });
});
