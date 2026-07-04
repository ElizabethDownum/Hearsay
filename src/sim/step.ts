import { dayOf, minuteOfDay } from '../core/time';
import { circlesAt, venueAt } from './agents';
import { expireInquiries, runAskPhase } from './inquiry';
import { observationsFor, type Asking, type TickEvents, type Utterance } from './perception';
import { chooseTelling, ingest, CONVERSATION_BEAT } from './rumors/propagation';
import { captureEvidence } from './counterintel';
import { reactToSelfRumor } from './reactions';
import type { Rules } from './rules';
import type { WorldState } from './types';

/** Advance one tick. Movement -> circles -> tellings -> ingestion. Deterministic order. */
export function step(world: WorldState, rules: Rules): TickEvents {
  const t = world.tick;
  const positions = Object.fromEntries(
    Object.values(world.npcs).map((n) => [n.id, venueAt(n, t, world.scheduleOverrides[n.id] ?? [])]),
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

  // Ingestion flows through the one perception path: every NPC hears exactly what
  // observationsFor grants them (same-circle utterances they did not speak). This is
  // the single encoding of the co-presence law — hearing is never re-derived here.
  if (utterances.length > 0 || events.askings.length > 0) {
    for (const hearerId of Object.keys(world.npcs).sort()) {
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

  if (minuteOfDay(t) === 1439) expireInquiries(world, dayOf(t));

  world.tick = t + 1;
  return events;
}

export function runUntil(world: WorldState, endTick: number, rules: Rules): void {
  while (world.tick < endTick) step(world, rules);
}
