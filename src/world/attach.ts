import { SOMEONE, mintClaim } from '../sim/rumors/claim';
import { blankIntel } from '../sim/fieldwork';
import { buildTownMap, buildWorld, enrollPlayer } from '../sim/world';
import type { Rules } from '../sim/rules';
import type { WorldState } from '../sim/types';
import type { GeneratedTown } from './types';

/** His civilian assets sense the town at a flat vigilance v1 (spec: "vigilance 0.5 flat v1"). */
const ENEMY_ASSET_VIGILANCE = 0.5;

/**
 * Build a live world from a generated town: enemy roster + map wired, secret witnesses seeded.
 * `rules` is optional and only seeds the treasury (forwarded to `buildWorld` → `startingCoin`);
 * engine code never imports content, so composition roots (the app's session staging, harness
 * entries) PASS rules in — a bare `worldFromTown(town, seed)` keeps the coin-0 fallback for
 * hand-built fixture tests that don't care about the economy.
 */
export function worldFromTown(town: GeneratedTown, seed: string, rules?: Rules): WorldState {
  const world = buildWorld(town.fixture, seed, rules);
  world.enemy.observers = town.guards.map((g) => ({ ...g }));
  world.enemy.map = buildTownMap(town.fixture);
  // The embodied spymaster (Task 7): his civilian assets grow the enemy's coverage beyond the
  // guards through the SAME observer machinery (vigilance 0.5 flat), and his id is the world-side
  // handle the runEnemyDay budget spend / applyRecruit read. His assets also join the enemy-side
  // roster mirror as AssetRecords (one machinery — Task 8 reads them). Their relationship to the
  // embodied spymaster is a real edge, symmetrically with attachPlayer's asset→player edge. buildWorld
  // clones NPCs shallowly and edges deeply; these edge-only writes preserve that clone discipline.
  // Skipped for a hand-built town
  // with no enemyNet (undefined) or a validator-rejected null.
  if (town.enemyNet) {
    world.network.spymaster = town.enemyNet.spymaster;
    for (const id of town.enemyNet.assets) {
      world.enemy.observers.push({ id, vigilance: ENEMY_ASSET_VIGILANCE });
      world.network.enemyAssets.push({
        id, mice: null, wagePaidThroughDay: 0, strikes: 0,
        facts: [{ tick: 0, kind: 'recruited-by', ref: town.enemyNet.spymaster }],
      });
      const asset = world.npcs[id];
      if (asset && !asset.edges.some((e) => e.to === town.enemyNet!.spymaster)) {
        asset.edges.push({ to: town.enemyNet.spymaster, kind: 'friend', trust: 0.75 });
      }
    }
  }
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

  const playerId = world.playerId!; // enrollPlayer just set it
  for (const id of dossier.informants) {
    world.intel.informants.push({ id, assignedVenue: null });
    // Migration (Task 3): each dossier freebie becomes a roster AssetRecord — a legacy loyalist
    // (mice: null), recruited by the player at tick 0, on the record interrogation reads back.
    world.network.assets.push({
      id, mice: null, wagePaidThroughDay: 0, strikes: 0,
      facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }],
    });
    // Disposition IS the trust edge (asset → player), amendment #4c. P5 wired no such edge —
    // informants were an intel-side id list only — so create it at 0.75 (above the 0.7 confide
    // line) when absent; an existing edge is reused as-is.
    const informant = world.npcs[id];
    if (informant && !informant.edges.some((e) => e.to === playerId)) {
      informant.edges.push({ to: playerId, kind: 'friend', trust: 0.75 });
    }
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
