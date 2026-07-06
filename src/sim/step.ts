import { dayOf, minuteOfDay } from '../core/time';
import { circlesAt, positionOf } from './agents';
import { expireInquiries, runAskPhase } from './inquiry';
import { observationsFor, type Asking, type TickEvents, type Utterance } from './perception';
import { chooseTelling, ingest, CONVERSATION_BEAT } from './rumors/propagation';
import { captureEvidence, runEnemyDay } from './counterintel';
import { captureIntel } from './fieldwork';
import { reactToSelfRumor } from './reactions';
import { runVignettes } from './vignettes/engine';
import { scenarioNightly } from './scenario/referee';
import type { Rules } from './rules';
import type { WorldState } from './types';

/** Advance one tick. Movement -> circles -> tellings -> ingestion. Deterministic order. */
export function step(world: WorldState, rules: Rules): TickEvents {
  const t = world.tick;
  const positions = Object.fromEntries(
    Object.values(world.npcs).map((n) => [n.id, positionOf(world, n, t)]),
  );

  const utterances: Utterance[] = [];
  const askings: Asking[] = [];
  if (minuteOfDay(t) % CONVERSATION_BEAT === 0) {
    for (const circle of circlesAt(world, t)) {
      if (circle.members.length < 2) continue;
      const phase = runAskPhase(world, circle, t, rules);
      askings.push(...phase.askings);
      utterances.push(...phase.answers);
      const spoke = new Set(phase.spoke);
      for (const member of circle.members) {
        if (spoke.has(member)) continue;
        // The avatar never auto-tells — the human speaks (or doesn't). Bystander physics
        // (being heard, being addressed) are untouched; only volition is skipped.
        if (member === world.playerId) continue;
        const u = chooseTelling(world, member, circle, t, rules);
        if (u) utterances.push(u);
      }
    }
  }

  const events: TickEvents = { tick: t, positions, utterances, askings };

  for (const u of utterances) {
    world.chronicle.push({
      kind: 'telling', tick: u.tick, venue: u.venue, speaker: u.speaker,
      addressedTo: u.addressedTo, claimId: u.claim.id,
      heardBy: u.circleMembers.filter((m) => m !== u.speaker)
        .map((id) => ({ id, addressed: id === u.addressedTo })),
      mode: u.mode,
    });
  }

  for (const a of askings) {
    world.chronicle.push({
      kind: 'asking', tick: a.tick, venue: a.venue, speaker: a.speaker,
      addressedTo: a.addressedTo, about: a.about, authority: a.authority,
      heardBy: a.circleMembers.filter((m) => m !== a.speaker)
        .map((id) => ({ id, addressed: id === a.addressedTo })),
    });
  }

  // The enemy hears only what its people heard: capture reads the same feeds, gated by
  // vigilance, filtered through observer traits. Independent of ingestion — no-op when
  // there are no observers (Testford/miniTown), so old suites are untouched.
  if (utterances.length > 0 || askings.length > 0) captureEvidence(world, events, rules);

  // The player's mirror of capture: the avatar (unfiltered) and informants (trait-filtered)
  // sense through the SAME feeds. Runs UNCONDITIONALLY — presence capture needs event-less
  // ticks too, and positions are always in `events`. Self-guards to a no-op with no sources,
  // so player-free worlds (all prior suites) are untouched.
  captureIntel(world, events, rules);

  // Ingestion flows through the one perception path: every NPC hears exactly what
  // observationsFor grants them (same-circle utterances they did not speak). This is
  // the single encoding of the co-presence law — hearing is never re-derived here.
  if (utterances.length > 0 || events.askings.length > 0) {
    for (const hearerId of Object.keys(world.npcs).sort()) {
      // The avatar's mind is not modelled by the sim: it neither ingests gossip nor reacts to
      // rumors about itself (so reactToSelfRumor can never fire for it). Task 2's capture, not
      // this loop, builds the player's feed. Skip BEFORE observationsFor — cheap and total.
      if (hearerId === world.playerId) continue;
      const feed = observationsFor(hearerId, events);
      for (const obs of feed.observations) {
        if (obs.kind !== 'utterance') continue;
        ingest(world, hearerId, { tick: obs.tick, speaker: obs.speaker, claim: obs.claim }, !obs.overheard, rules);
        if (obs.claim.subject === hearerId) {
          reactToSelfRumor(world, hearerId, obs.claim.family, obs.tick, rules);
        }
      }
    }
  }

  // The nightly beat: digest today's evidence into countermeasures (world facts),
  // THEN sweep spent inquiries. No-op on rosters with no observers (old suites untouched).
  if (minuteOfDay(t) === 1439) {
    runEnemyDay(world, rules);          // digest today's evidence into countermeasures...
    expireInquiries(world, dayOf(t));   // ...THEN sweep spent inquiries.
    runVignettes(world, rules);         // ...THEN tonight's micro-scenes fire (pillar 7), so...
    scenarioNightly(world, rules);      // ...the institutions read a settled day incl. the vignettes.
  }

  world.tick = t + 1;
  return events;
}

export function runUntil(world: WorldState, endTick: number, rules: Rules): void {
  while (world.tick < endTick) step(world, rules);
}
