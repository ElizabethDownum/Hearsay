import { SOMEONE, mintClaim } from '../sim/rumors/claim';
import { blankIntel } from '../sim/fieldwork';
import { buildTownMap, buildWorld, enrollPlayer } from '../sim/world';
import type { WorldState } from '../sim/types';
import type { GeneratedTown } from './types';

/** Build a live world from a generated town: enemy roster + map wired, secret witnesses seeded. */
export function worldFromTown(town: GeneratedTown, seed: string): WorldState {
  const world = buildWorld(town.fixture, seed);
  world.enemy.observers = town.guards.map((g) => ({ ...g }));
  world.enemy.map = buildTownMap(town.fixture);
  for (const secret of [...town.secrets].sort((a, b) => a.id.localeCompare(b.id))) {
    const claim = mintClaim(world, {
      family: secret.id, parent: null, subject: secret.subject, predicate: secret.predicate,
      object: secret.object, count: null, severity: secret.severity, place: secret.place,
      attribution: SOMEONE,
    });
    world.claims[claim.id] = claim;
    for (const witness of secret.witnesses) {
      world.beliefs[witness]![secret.id] = {
        claim, credence: 0.95, heardFrom: 'witnessed', heardAt: 0, firstHeardAt: 0,
        timesHeard: 1, apparentSources: [], discretion: true, counterSpun: false,
      };
      world.chronicle.push({ kind: 'inject', tick: 0, target: witness, claimId: claim.id, by: 'genesis' });
    }
  }
  return world;
}

/**
 * Attach the avatar to a live world: its own private `safehouse` venue (first district), the two
 * dossier informants wired into the intel state, and the day-0 dossier seeded into the intel log
 * — `via: 'dossier'`, tick 0, in traitReads → edgeReads → hint order. Writes `world.station` (the
 * access law's standing): defaults to the seed's deal, or an explicit `station` for tests/staging
 * (the deal already shaped the dossier at gen time — the override only moves which doors open, not
 * where the dossier looked). Throws if the town has no dossier, a safehouse venue already exists,
 * or a player is already enrolled (so a second attach throws).
 */
export function attachPlayer(world: WorldState, town: GeneratedTown, station?: 'noble' | 'lowlife'): void {
  const dossier = town.dossier;
  if (!dossier) throw new Error('attachPlayer: town has no dossier');
  if (world.venues['safehouse']) throw new Error('attachPlayer: a safehouse venue already exists');

  world.venues['safehouse'] = { id: 'safehouse', district: town.districts[0]!.id, access: 'private' };
  enrollPlayer(world, { home: 'safehouse' });
  // Generated towns always carry a deal; 'noble' is the neutral fallback only for a hand-built town.
  world.station = station ?? town.stationDeal ?? 'noble';

  for (const id of dossier.informants) {
    world.intel.informants.push({ id, assignedVenue: null });
  }

  for (const tr of dossier.traitReads) {
    world.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'safehouse', via: 'dossier',
      kind: 'trait-read', overheard: false, npc: tr.npc, trait: tr.trait,
    });
  }
  for (const er of dossier.edgeReads) {
    world.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'safehouse', via: 'dossier',
      kind: 'edge-read', overheard: false, edgeFrom: er.from, edgeTo: er.to, edgeKind: er.kind,
    });
  }
  if (dossier.secretHint) {
    world.intel.log.push({
      ...blankIntel(), tick: 0, venue: 'safehouse', via: 'dossier',
      kind: 'hint', overheard: false, hintAbout: dossier.secretHint.about, hintWitness: dossier.secretHint.witness,
    });
  }
}
