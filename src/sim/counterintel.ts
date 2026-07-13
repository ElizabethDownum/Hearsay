import { dayOf } from '../core/time';
import { observationsFor, type TickEvents } from './perception';
import { juiciness, STANCE } from './rumors/propagation';
import { reportThrough } from './reporting';
import { enemyDigest, pressureFor } from './enemy/digest';
import { exposureStatus } from './scenario/exposure';
import type { Rules } from './rules';
import type { EnemyDecision } from './enemy/state';
import type { WorldState } from './types';

/**
 * The enemy's ONLY sensory input. Reads observers' feeds (never world state directly),
 * applies the vigilance rule, and appends to the evidence log the digest will consume.
 */
export function captureEvidence(world: WorldState, events: TickEvents, rules: Rules): void {
  for (const spec of world.enemy.observers) {
    const observer = world.npcs[spec.id];
    if (!observer) continue;
    const feed = observationsFor(spec.id, events);
    for (const obs of feed.observations) {
      if (obs.kind === 'utterance') {
        const noticed = !obs.overheard || juiciness(obs.claim, rules) >= 1 - spec.vigilance;
        if (!noticed) continue;
        world.enemy.evidence.push({
          tick: obs.tick, venue: obs.venue, observer: spec.id, overheard: obs.overheard,
          speaker: obs.speaker, addressedTo: obs.addressedTo, kind: 'utterance', mode: obs.mode,
          claimId: obs.claim.id, family: obs.claim.family,
          reported: reportThrough(world, spec.id, obs.claim, rules, 'enemy'), about: null,
        });
      } else if (obs.kind === 'asking') {
        world.enemy.evidence.push({
          tick: obs.tick, venue: obs.venue, observer: spec.id, overheard: obs.overheard,
          speaker: obs.speaker, addressedTo: obs.addressedTo, kind: 'asking', mode: null,
          claimId: null, family: 'family' in obs.about ? obs.about.family : null,
          reported: null, about: obs.about,
        });
      }
    }
  }
}

// 15-alignment (spec): interrogations 900–1020. Watches retuned to 960–1140 (P6-T8): measured
// against evening gossip flow — the old {1080,1200} sat in a retell-cooldown lull and caught none
// of the 480/720/960/1200 bursts (1200 exclusive), so a watch's first capture arrived a day late.
// {960,1140} straddles the 960 cooldown-burst shoulder: +49% total public-venue utterance exposure
// over 5 procgen seeds, winning on every seed (tests/harness/watch-window.report.test.ts). Both
// bounds 15-aligned. INTERROGATION unchanged.
export const INTERROGATION = { from: 900, to: 1020 } as const;
export const WATCH = { from: 960, to: 1140 } as const;

function addOverride(world: WorldState, id: string, o: WorldState['scheduleOverrides'][string][number]): void {
  world.scheduleOverrides[id] = [...(world.scheduleOverrides[id] ?? []), o];
}

/** Decisions become world facts — all of them observable through ordinary perception. */
export function applyEnemyDecision(world: WorldState, decision: EnemyDecision): void {
  const enemy = world.enemy;
  enemy.decisions.push(decision);
  enemy.sketch.push(...decision.features);
  enemy.featureCounter += decision.features.length;
  enemy.digestedThrough = enemy.evidence.length;

  for (const q of decision.inquiries) {
    world.inquiries[q.asker] = [...(world.inquiries[q.asker] ?? []),
      { about: q.about, from: 'enemy', expiresDay: q.expiresDay, asked: [], answersHeard: 0 }];
    enemy.inquiriesIssued.push('family' in q.about ? `f:${q.about.family}` : `s:${q.about.subject}`);
  }
  for (const order of decision.interrogations) {
    enemy.interrogated.push(`${order.target}:${'family' in order.about ? `f:${order.about.family}` : `s:${order.about.subject}`}`);
    for (const id of [order.guard, order.target]) {
      addOverride(world, id, { fromDay: order.day, toDay: order.day + 1,
        from: INTERROGATION.from, to: INTERROGATION.to, venue: order.venue, source: 'enemy' });
    }
    world.inquiries[order.guard] = [...(world.inquiries[order.guard] ?? []),
      { about: order.about, from: 'enemy', expiresDay: order.day + 2, asked: [], answersHeard: 0 }];
  }
  for (const w of decision.watches) {
    enemy.watchedDistricts.push(w.district);
    for (const post of w.posts) {
      addOverride(world, post.guard, { fromDay: w.startDay, toDay: null,
        from: WATCH.from, to: WATCH.to, venue: post.venue, source: 'enemy' });
    }
  }
}

/**
 * The embodied spymaster's nightly countermeasure budget (Plan 8 §13; amendment #4, ratified:
 * "effectiveness loss = nightly countermeasure budget spent reacting to their own scandal"). This
 * is the WORLD-SIDE seam — it runs AFTER the digest and reads the spymaster's OWN belief store
 * (amendment-#3 machinery: `counterSpun` + credence), never digest input. The digest signature stays
 * `(EnemyState, day, rules)` and cannot see his mind, so the no-omniscience pillar holds UNCHANGED.
 *
 * Each un-counter-spun damaging self-rumor he holds at >= REPEAT stance consumes one countermeasure
 * slot; slots are spent interrogation-first, then watch (deterministic). He spends the night on his
 * own scandal instead of hunting you — the digest emits fewer orders, one dropped per scandal. No-op
 * when no spymaster is wired (a headless / hand-built world) or his mind holds no qualifying scandal.
 */
function spendCountermeasureBudget(world: WorldState, decision: EnemyDecision, rules: Rules): void {
  const spymaster = world.network.spymaster;
  if (spymaster === null) return;
  const store = world.beliefs[spymaster];
  if (!store) return;

  let slotsToSpend = 0;
  for (const belief of Object.values(store)) {
    if (belief.claim.subject !== spymaster) continue;                        // only rumors about HIM
    if (belief.counterSpun) continue;                                        // he already answered it
    if (rules.predicates[belief.claim.predicate]?.valence !== 'damaging') continue; // must sting
    if (belief.credence < STANCE.REPEAT) continue;                           // and be taken seriously
    slotsToSpend += 1;
  }
  if (slotsToSpend === 0) return;

  // Deterministic: the interrogation slot goes first, then the watch — one order per spent slot.
  if (slotsToSpend > 0 && decision.interrogations.length > 0) {
    decision.interrogations = decision.interrogations.slice(1);
    slotsToSpend -= 1;
  }
  if (slotsToSpend > 0 && decision.watches.length > 0) {
    decision.watches = decision.watches.slice(1);
    slotsToSpend -= 1;
  }
}

/**
 * The nightly beat: digest what the network sampled today, spend the spymaster's budget, act on
 * it. `pressure` (Plan 8 Task 10, exposure escalation tiers) is computed HERE — the world-side
 * seam — from `exposureStatus(world).score` (adjudicator-only, but runEnemyDay is world-side and
 * reads it the same lawful way the referee does) and threaded into the digest as a plain integer.
 * The digest signature stays a pure fold: it never sees `world`, only the single number this
 * function hands it, so the no-omniscience pillar holds UNCHANGED. Computed AFTER the observers-
 * empty guard, so an enemy-off world never even touches exposureStatus (the enemy-off pins never
 * move — Task 10 changes nothing about a headless/guardless roster).
 */
export function runEnemyDay(world: WorldState, rules: Rules): void {
  if (world.enemy.observers.length === 0) return;
  const pressure = pressureFor(exposureStatus(world).score);
  const decision = enemyDigest(world.enemy, dayOf(world.tick), rules, pressure);
  spendCountermeasureBudget(world, decision, rules);
  applyEnemyDecision(world, decision);
}
