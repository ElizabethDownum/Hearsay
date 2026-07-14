import { describe, expect, it } from 'vitest';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import {
  networkView, courierRouteView, playerView, STRIKE_BAR_PENALTY,
} from '../../src/sim/fieldwork';
import { recordFact, recordPlayerKnownFact } from '../../src/sim/network/compartment';
import { blankIntel } from '../../src/sim/fieldwork';
import { at } from '../../src/core/time';
import { stableStringify } from '../../src/sim/hash';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';

/** A live world with the two dossier assets on the player roster (the T11 network surface's subject). */
function stage(seed: string): WorldState {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  const world = worldFromTown(town, seed, STANDARD_RULES);
  attachPlayer(world, town);
  return world;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('networkView — the roster surface exposes ONLY player-known bookkeeping', () => {
  it('lists player assets sorted by id, each with wages/strikes/assignment/facts-count — never turned/enemyAssets', () => {
    const world = stage('nv-1');
    const view = networkView(world);

    const ids = view.assets.map((a) => a.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toEqual([...ids].sort());                         // deterministic id order
    expect(new Set(ids)).toEqual(new Set(world.network.assets.map((a) => a.id))); // exactly the player roster

    // NEVER the enemy roster.
    for (const enemy of world.network.enemyAssets) expect(ids).not.toContain(enemy.id);

    // The exact player-known field set — wages (wagePaidThroughDay), strikes, assignment, facts-COUNT.
    const first = view.assets[0]!;
    expect(Object.keys(first).sort()).toEqual(
      ['requestedVenue', 'dispositionBar', 'factsCount', 'id', 'mice', 'strikes', 'wagePaidThroughDay'].sort(),
    );
  });

  it('counts only player-known compartment indexes, never remote raw facts or their content', () => {
    const world = stage('nv-facts');
    const asset = world.network.assets[0]!;
    const knownBefore = networkView(world).assets.find((a) => a.id === asset.id)!.factsCount;
    world.tick = at(2, 0);
    recordFact(world, 'player', asset.id, { kind: 'carried-story', ref: 'f-secret-carried' });
    expect(networkView(world).assets.find((a) => a.id === asset.id)!.factsCount).toBe(knownBefore);
    recordPlayerKnownFact(world, asset.id, { kind: 'met-asset', ref: 'you' });
    const view = networkView(world);
    const row = view.assets.find((a) => a.id === asset.id)!;
    expect(row.factsCount).toBe(knownBefore + 1);              // a number, not the raw list
    // The content (kinds + refs) never leaks into the view's serialization.
    const json = stableStringify(view);
    expect(json).not.toContain('carried-story');
    expect(json).not.toContain('f-secret-carried');
  });

  it('the verdigris bar derives from strikes (player-known bookkeeping), NEVER the raw trust edge', () => {
    const world = stage('nv-bar');
    const asset = world.network.assets[0]!;
    // Move the real trust edge WAY off — if the bar read trust it would move; it must not.
    world.npcs[asset.id]!.edges.find((e) => e.to === world.playerId)!.trust = 0.05;
    asset.strikes = 2;
    const row = networkView(world).assets.find((a) => a.id === asset.id)!;
    expect(row.strikes).toBe(2);
    expect(row.dispositionBar).toBeCloseTo(Math.max(0, 1 - STRIKE_BAR_PENALTY * 2), 10);
    // A heavily-struck asset floors at 0, never negative.
    asset.strikes = 999;
    expect(networkView(world).assets.find((a) => a.id === asset.id)!.dispositionBar).toBe(0);
  });

  it('carries the latest requested post, never the operational assignment', () => {
    const world = stage('nv-assign');
    const asset = world.network.assets[0]!;
    const inf = world.intel.informants.find((i) => i.id === asset.id)!;
    inf.assignedVenue = 'safehouse';
    world.intel.requestedPosts = [{ informant: asset.id, venue: 'market', authoredAt: world.tick }];
    expect(networkView(world).assets.find((a) => a.id === asset.id)!.requestedVenue).toBe('market');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('playerView.station — the avatar knows its own standing', () => {
  it('mirrors world.station', () => {
    const world = stage('pv-station');
    expect(['noble', 'lowlife']).toContain(world.station);
    expect(playerView(world).station).toBe(world.station);
    world.station = 'lowlife';
    expect(playerView(world).station).toBe('lowlife');
    world.station = null;
    expect(playerView(world).station).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('courierRouteView — your own planning marks, from PLAYER-KNOWN data only', () => {
  const STORY: Claim = {
    id: 'c-r', family: 'f-r', parent: null, subject: 'x', predicate: 'stole',
    object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
  };

  it('is empty when no player planning mark is open', () => {
    const world = stage('cr-empty');
    expect(courierRouteView(world)).toEqual([]);
  });

  it('draws a face-handoff run: from the asset posting to the target’s last-known intel venue', () => {
    const world = stage('cr-face');
    const asset = world.network.assets[0]!.id;
    const target = Object.keys(world.npcs).find((id) => id !== asset && id !== world.playerId)!;
    world.intel.requestedPosts = [{ informant: asset, venue: 'safehouse', authoredAt: at(1, 0) }];
    // The target was last SEEN (in the player's own intel) at some public venue.
    const seenVenue = world.enemy.map.venues.find((v) => v.access === 'public')!.id;
    world.intel.log.push({
      ...blankIntel(), tick: at(1, 8), venue: seenVenue, via: 'self',
      kind: 'utterance', overheard: true, speaker: target, addressedTo: 'x',
      mode: 'telling', claimId: STORY.id, family: STORY.family, reported: STORY,
    });
    world.intel.courierPlans = [{ id: 'plan-0', asset, target, from: 'safehouse', to: seenVenue,
      authoredAt: at(1, 0), acknowledgedAt: null }];

    const routes = courierRouteView(world);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ asset, target, from: 'safehouse', to: seenVenue });
  });

  it('a run via a dead drop draws FROM the drop’s venue', () => {
    const world = stage('cr-drop');
    const asset = world.network.assets[0]!.id;
    const target = Object.keys(world.npcs).find((id) => id !== asset && id !== world.playerId)!;
    const pub = world.enemy.map.venues.find((v) => v.access === 'public')!.id;
    world.network.drops.push({ id: 'drop-1', venue: pub, knownBy: [world.playerId!] });
    world.intel.log.push({
      ...blankIntel(), tick: at(1, 8), venue: pub, via: 'self',
      kind: 'utterance', overheard: true, speaker: target, addressedTo: 'x',
      mode: 'telling', claimId: STORY.id, family: STORY.family, reported: STORY,
    });
    world.intel.courierPlans = [{ id: 'plan-0', asset, target, from: pub, to: pub,
      authoredAt: at(1, 0), acknowledgedAt: null }];
    expect(courierRouteView(world)[0]).toMatchObject({ from: pub, to: pub });
  });

  it('skips a run whose target has NEVER appeared in the player’s intel (no world-truth peek)', () => {
    const world = stage('cr-unknown');
    const asset = world.network.assets[0]!.id;
    // A target the player has zero intel on — its real position is world truth, off-limits.
    const target = Object.keys(world.npcs).find((id) => id !== asset && id !== world.playerId)!;
    world.intel.requestedPosts = [{ informant: asset, venue: 'safehouse', authoredAt: at(1, 0) }];
    world.intel.courierPlans = [{ id: 'plan-0', asset, target, from: 'safehouse', to: null,
      authoredAt: at(1, 0), acknowledgedAt: null }];
    expect(courierRouteView(world)).toEqual([]); // destination unknown → no mark drawn
  });
});
