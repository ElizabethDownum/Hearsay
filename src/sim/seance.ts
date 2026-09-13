import type { Tick } from '../core/time';
import { offeredVenueFor } from './actions';
import type { Circle } from './agents';
import { blankIntel } from './fieldwork';
import { canAfford, debitCoin } from './network/roster';
import { isNightVisitTime, isSacredVenue } from './night-visit';
import { CLAIM_FIELDS } from './rumors/claim';
import { CONVERSATION_BEAT } from './rumors/propagation';
import type { Rules } from './rules';
import type { WorldState } from './types';

export interface SeanceAction { kind: 'seance'; tick: Tick }

export function applySeance(
  world: WorldState, tick: Tick, rules: Rules, offered?: readonly Circle[],
): void {
  if (!Number.isFinite(tick) || !Number.isInteger(tick) || tick < 0
    || tick !== world.tick || tick % CONVERSATION_BEAT !== 0) {
    throw new Error('seance: requires the current finite conversation beat');
  }
  const player = world.playerId;
  if (player === null || !world.npcs[player]) throw new Error('seance: no player is enrolled');
  if (offered !== undefined && !offered.some((circle) => circle.members.includes(player))) {
    throw new Error('seance: avatar absent from offered circle');
  }
  const venue = offeredVenueFor(world, offered);
  if (venue === null || !world.venues[venue] || !isSacredVenue(venue)) {
    throw new Error('seance: requires a chapel or cathedral');
  }
  if (!isNightVisitTime(tick)) throw new Error('seance: requires a time before 04:00');
  const departed = world.departed;
  if (!departed) throw new Error('seance: no departed witness is known');
  if (world.seanceUsed !== undefined) throw new Error('seance: the departed has already spoken');
  const claim = world.claims[departed.claimId];
  if (!claim || claim.family !== departed.secretId || claim.parent !== null
    || CLAIM_FIELDS.some((field) => claim[field] !== departed.reported[field])) {
    throw new Error('seance: historical testimony has no matching retained claim');
  }
  const price = rules.economy.seance;
  if (!Number.isFinite(price) || !Number.isInteger(price) || price <= 0) {
    throw new Error('seance: invalid economy price');
  }
  if (!canAfford(world, price)) throw new Error('seance: insufficient coin');

  const operation = 'seance:' + departed.id;
  debitCoin(world, price);
  world.seanceUsed = { operation, tick };
  const common = {
    tick, venue, via: 'seance', overheard: false,
    provenance: { kind: 'magic' as const, spell: 'seance' as const, operation },
  };
  world.intel.log.push({
    ...blankIntel(), ...common, kind: 'utterance',
    claimId: departed.claimId, family: departed.secretId, reported: { ...departed.reported },
  }, {
    ...blankIntel(), ...common, kind: 'edge-read', edgeFrom: departed.edge.from,
    edgeTo: departed.edge.to, edgeKind: departed.edge.kind,
  });
  world.chronicle.push({
    kind: 'seance', tick, operation, venue, departedId: departed.id,
    claimId: departed.claimId, edge: { ...departed.edge },
  });
}
