import { dayOfWeek, REST_DAY } from '../../core/time';
import { STANCE } from '../rumors/propagation';
import { dispositionOf } from './roster';
import type { EntityId } from '../rumors/claim';
import type { AssetRecord } from './types';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import { queueNetworkMessage } from '../directives/transport';
import { strictNextBeat } from '../directives/state';

/**
 * The trust line a secret crosses to become a turncoat (spec: "a turncoat is a secret crossing a
 * broken trust edge"). STRICT less-than: disposition must be BELOW 0.4 to flip. A retune surface, but
 * the physics live here, not in a content table (it is a behavioral threshold, not a price).
 */
export const FLIP_DISPOSITION = 0.4;

/**
 * The nightly turncoat pass (Plan 8 Task 8) — wired into step.ts AFTER wages, BEFORE vignettes
 * (plan-verbatim ordering; a rest-day wage slide can push an eroded asset under the flip line THIS
 * night, so "after wages" is load-bearing and tested). Runs every nightly beat:
 *
 *   1. FLIP DETECTION (every night, both directions):
 *      · your asset  → enemy: disposition < 0.4 AND the enemy has IDENTIFIED them (their id appears
 *        as any sketch-feature subject). Hidden — `turned: true`, the player is never told.
 *      · his asset   → YOU: they hold a damaging spymaster claim at BELIEVE (v1 pin — the counter-spin
 *        ecology, not trust-edge decay). They become your walk-in (`turned: true` on the enemy record).
 *   2. WEEKLY EMISSIONS (rest-day nightly only — the SAME weekly beat as wages, controller note 5):
 *      · your turncoats LEAK one compartment fact each (oldest unleaked) into his evidence.
 *      · your walk-ins REVEAL one real sketch feature each (a hint entry via their id).
 *
 * Latched: a flip is one-way in v1 (a turncoat never comes back). No-op in a headless world / with
 * no spymaster wired for the enemy-side checks.
 */
export function runTurncoatPass(world: WorldState, rules: Rules): void {
  detectPlayerSideFlips(world);
  detectWalkIns(world, rules);
  if (dayOfWeek(world.tick) === REST_DAY) {
    weeklyLeaks(world);
    weeklyWalkInReveals(world);
  }
}

// ── Flip detection ───────────────────────────────────────────────────────────

/** Your asset flips to the enemy: eroded past the trust line AND named in the enemy's sketch. */
function detectPlayerSideFlips(world: WorldState): void {
  if (world.playerId === null) return;
  for (const asset of world.network.assets) {
    if (asset.turned) continue;                                  // latched — never comes back (v1)
    if (dispositionOf(world, asset.id) >= FLIP_DISPOSITION) continue; // the trust edge still holds
    if (!enemyIdentified(world, asset.id)) continue;             // the enemy has no name for them yet
    asset.turned = true;                                         // hidden — no intel/UI tell anywhere
  }
}

/**
 * "Their id appears as any sketch feature subject" (interrogation/carrier-profile did it — P4's
 * SketchFeature.subject). Reading ENEMY state here is the T7 world-side seam class: this is the
 * nightly WORLD pass, never a selector — the player never sees the sketch. Documented like T7's
 * budget spend: the no-omniscience boundary is untouched (nothing player-facing reads enemy.sketch).
 */
function enemyIdentified(world: WorldState, id: EntityId): boolean {
  return world.enemy.sketch.some((f) => f.subject === id);
}

/** His asset flips to you (a walk-in): they believe a damaging claim about the spymaster (BELIEVE). */
function detectWalkIns(world: WorldState, rules: Rules): void {
  const spymaster = world.network.spymaster;
  if (spymaster === null) return;
  for (const asset of world.network.enemyAssets) {
    if (asset.turned) continue;
    if (!believesDamagingSpymasterClaim(world, asset.id, spymaster, rules)) continue;
    asset.turned = true; // no verb: walk-ins volunteer — disaffection is the motive (confide physics)
  }
}

/**
 * v1 pin (premise duty): trust edges don't decay from rumors today, so his asset flips when they
 * HOLD a damaging spymaster claim at BELIEVE — amendment-#3's counter-spin ecology, reading his own
 * belief store (the same world-side read the T7 budget spend uses on the spymaster's mind).
 */
function believesDamagingSpymasterClaim(
  world: WorldState, id: EntityId, spymaster: EntityId, rules: Rules,
): boolean {
  const store = world.beliefs[id];
  if (!store) return false;
  return Object.values(store).some((b) =>
    b.claim.subject === spymaster
    && rules.predicates[b.claim.predicate]?.valence === 'damaging'
    && b.credence >= STANCE.BELIEVE);
}

// ── Weekly emissions (rest-day nightly) ────────────────────────────────────────

/** Deterministic id order — every roster sweep is lexicographic (zero entropy). */
const byId = (a: AssetRecord, b: AssetRecord): number => a.id.localeCompare(b.id);

/**
 * Each turned player-side asset prepares its OLDEST unleaked compartment fact (facts are tick-ordered
 * append-only). It enters enemy evidence only if the embodied spymaster physically hears the queued
 * compartment-fact speech; queueing alone is not principal knowledge.
 */
function weeklyLeaks(world: WorldState): void {
  const spymaster = world.network.spymaster;
  if (spymaster === null) return;
  for (const asset of [...world.network.assets].sort(byId)) {
    if (!asset.turned) continue;
    const leakedThrough = asset.leakedThrough ?? 0;
    if (leakedThrough >= asset.facts.length) continue; // nothing left to give up
    const pending = world.network.directiveState?.messages.some((message) =>
      message.payload.kind === 'compartment-fact'
      && message.payload.asset === asset.id
      && message.payload.factIndex === leakedThrough
      && message.deliveredAt === null && message.failedAt === null);
    if (pending) continue;
    const fact = asset.facts[leakedThrough]!;
    queueNetworkMessage(world, 'enemy', asset.id, [spymaster], {
      kind: 'compartment-fact', principal: 'player', asset: asset.id,
      factIndex: leakedThrough, fact: { ...fact },
    }, strictNextBeat(world.tick), null, null);
  }
}

/**
 * Each walk-in volunteers one REAL sketch feature — the infiltration deep-read channel (spec's
 * "observable in principle"). Reading enemy.sketch here is lawful as the CONTENT of a disaffected
 * insider's tip: they are IN his organization, and this WORLD-SIDE pass queues a physical tip — no
 * selector reads the sketch and no player intel changes until the avatar hears the speech.
 *
 * Reveals subject-bearing features (the enemy's identifications of PEOPLE — origin-vague / carrier-
 * profile), oldest un-revealed first. Deterministic: features are consumed in sketch order.
 */
function weeklyWalkInReveals(world: WorldState): void {
  const player = world.playerId;
  if (player === null) return;
  for (const walkIn of [...world.network.enemyAssets].sort(byId)) {
    if (!walkIn.turned) continue;
    const subjectFeatures = world.enemy.sketch.filter((f) => f.subject !== null);
    const revealedThrough = walkIn.revealedThrough ?? 0;
    if (revealedThrough >= subjectFeatures.length) continue; // nothing new to reveal this week
    const feature = subjectFeatures[revealedThrough]!;
    const pending = world.network.directiveState?.messages.some((message) =>
      message.payload.kind === 'sketch-tip'
      && message.payload.asset === walkIn.id
      && message.payload.featureId === feature.id
      && message.deliveredAt === null && message.failedAt === null);
    if (pending) continue;
    queueNetworkMessage(world, 'player', walkIn.id, [player], {
      kind: 'sketch-tip', principal: 'enemy', asset: walkIn.id, featureId: feature.id,
      subject: feature.subject, detail: feature.detail,
    }, strictNextBeat(world.tick), null, null);
  }
}
