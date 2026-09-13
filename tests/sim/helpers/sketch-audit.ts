import { expect } from 'vitest';
import type { WorldState } from '../../../src/sim/types';

/**
 * The sketch fair-cop audit — a permanent property test in the spirit of the Plan-2
 * provenance audit. Every accusation the enemy will ever put on the Counter-Sketch
 * board must be EXPLAINABLE from the chronicle: each feature carries ≥1 evidence ref,
 * and every ref resolves both to a captured EvidenceEntry AND to the chronicle record
 * the named observer actually heard. This is the debrief substrate guarantee — no
 * feature may float free of a witnessed event.
 *
 * Task 12 adds the network channel. Tasks 3 and 4 add physical residue and night-visit
 * channels: each ref resolves to an actual sighting and, when reported, the exact heard
 * envelope and spoken atom. Physical features must keep their discriminants so they
 * cannot fall through to a same-tick ordinary asking.
 */
export function auditSketch(world: WorldState): void {
  for (const feature of world.enemy.sketch) {
    // Fair-cop law: never empty.
    expect(feature.evidence.length, `feature ${feature.id} (${feature.kind}) has no evidence`).toBeGreaterThanOrEqual(1);

    for (const ref of feature.evidence) {
      if (feature.kind === 'arcane-residue') {
        expect(ref.residue, `feature ${feature.id} physical ref ${JSON.stringify(ref)} lacks its residue discriminant`).toBeDefined();
      }
      if (feature.kind === 'night-visit') expect(ref.nightVisit).toBeDefined();
      if (feature.kind === 'runaround' && ref.claimId === null && ref.messageId === null) {
        expect(ref.residue ?? ref.nightVisit,
          `runaround ${feature.id} null-id ref lacks its physical marker`).toBeDefined();
      }

      if (ref.nightVisit !== undefined) {
        expect(ref.residue).toBeUndefined();
        expect(ref.claimId).toBeNull(); expect(ref.messageId).toBeNull();
        const visit = ref.nightVisit;
        const entry = world.enemy.evidence.find((candidate) => candidate.kind === 'night-visit'
          && candidate.tick === ref.tick && candidate.observer === ref.observer
          && candidate.nightVisit.actor === visit.actor && candidate.nightVisit.witness === visit.witness
          && candidate.nightVisit.observedAt === visit.observedAt);
        expect(entry, 'night visit ref must match physical evidence').toBeDefined();
        if (entry?.kind !== 'night-visit') throw new Error('missing night visit evidence');
        expect(entry.tick).toBe(visit.observedAt); expect(entry.observer).toBe(visit.witness);
        expect(entry.speaker).toBeNull(); expect(entry.addressedTo).toBeNull();
        expect(entry.claimId).toBeNull(); expect(entry.family).toBeNull();
        if (feature.kind === 'night-visit') {
          expect(feature.subject).toBe(visit.actor); expect(feature.family).toBeNull();
          expect(feature.venue).toBe(entry.venue);
          expect(feature.district).toBe(world.enemy.map.venues.find((venue) => venue.id === entry.venue)?.district ?? null);
        }
        expect(world.chronicle.some((row) => row.kind === 'night-visit' && row.tick === visit.observedAt
          && row.observer === visit.witness && row.actor === visit.actor && row.venue === entry.venue),
        'night visit must have the exact recorded physical sighting').toBe(true);
        if (entry.receipt === undefined) {
          expect(visit.witness, 'only the real principal ingests a direct sighting').toBe(world.network.spymaster);
        } else {
          const receipt = entry.receipt;
          expect(receipt.observer).toBe(world.network.spymaster);
          expect(receipt.tick).toBeGreaterThanOrEqual(visit.observedAt);
          const speech = world.chronicle.find((row) => row.kind === 'network-speech'
            && row.tick === receipt.tick && row.messageId === receipt.messageId
            && row.heardBy.some((hearer) => hearer.id === receipt.observer));
          expect(speech, 'night visit receipt must name an actual heard envelope').toBeDefined();
          if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') {
            throw new Error('missing night visit field report');
          }
          expect(speech.spoken.items.some(({ observation }) => observation.kind === 'presence'
            && observation.observedAt === visit.observedAt && observation.venue === entry.venue
            && observation.actor === visit.actor && observation.witness === visit.witness),
          'the exact night visit atom must actually have been spoken').toBe(true);
        }
        continue;
      }
      if (ref.residue !== undefined) {
        expect(ref.nightVisit).toBeUndefined();
        expect(ref.claimId).toBeNull();
        expect(ref.messageId).toBeNull();
        expect(ref.observer).toBe(ref.residue.witness);
        expect(ref.tick).toBe(ref.residue.observedAt);
        const entry = world.enemy.evidence.find((candidate) =>
          candidate.kind === 'arcane-residue' && candidate.tick === ref.tick
          && candidate.observer === ref.observer
          && candidate.residue.id === ref.residue!.id
          && candidate.residue.witness === ref.residue!.witness
          && candidate.residue.observedAt === ref.residue!.observedAt);
        expect(entry, `residue ref ${JSON.stringify(ref)} has no captured evidence`).toBeDefined();
        if (entry?.kind !== 'arcane-residue') throw new Error('missing residue evidence');
        expect(entry.speaker).toBeNull();
        expect(entry.addressedTo).toBeNull();
        expect(entry.claimId).toBeNull();
        expect(entry.family).toBeNull();
        if (feature.kind === 'arcane-residue') {
          expect(feature.venue).toBe(entry.venue);
          expect(feature.subject).toBeNull();
          expect(feature.family).toBeNull();
          expect(feature.district).toBe(world.enemy.map.venues.find((venue) => venue.id === entry.venue)?.district ?? null);
        }
        expect(world.chronicle.some((row) => row.kind === 'residue' && row.act === 'created'
          && row.residueId === entry.residue.id && row.venue === entry.venue
          && row.observer === null && row.tick <= entry.residue.observedAt),
        'physical trace must exist before its sighting').toBe(true);
        expect(world.chronicle.some((row) => row.kind === 'residue' && row.act === 'observed'
          && row.residueId === entry.residue.id && row.venue === entry.venue
          && row.observer === entry.residue.witness && row.tick === entry.residue.observedAt),
        'the exact physical witness must have a recorded sighting').toBe(true);
        if (entry.receipt === undefined) {
          expect(entry.observer, 'only the spymaster can ingest a direct enemy sighting')
            .toBe(world.network.spymaster);
        } else {
          const receipt = entry.receipt;
          expect(receipt.observer).toBe(world.network.spymaster);
          expect(receipt.tick).toBeGreaterThanOrEqual(entry.residue.observedAt);
          const speech = world.chronicle.find((row) => row.kind === 'network-speech'
            && row.tick === receipt.tick && row.messageId === receipt.messageId
            && row.heardBy.some((hearer) => hearer.id === receipt.observer));
          expect(speech, 'received residue must name the actual heard report envelope').toBeDefined();
          if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') {
            throw new Error('missing residue field-report speech');
          }
          expect(speech.spoken.items.some(({ observation }) => observation.kind === 'arcane-residue'
            && observation.residueId === entry.residue.id && observation.venue === entry.venue
            && observation.witness === entry.residue.witness
            && observation.observedAt === entry.residue.observedAt),
          'the exact residue atom must have been spoken, not merely held in the envelope').toBe(true);
        }
        continue;
      }

      // Exactly one id field identifies a ref — a claim ref or a network ref, never both.
      expect(ref.claimId === null || ref.messageId === null,
        `feature ${feature.id} ref ${JSON.stringify(ref)} names two channels at once`).toBe(true);

      // (1) the ref resolves to a captured EvidenceEntry (same tick/observer/claimId/messageId).
      const entry = world.enemy.evidence.find(
        (e) => e.kind !== 'arcane-residue' && e.kind !== 'night-visit'
          && e.tick === ref.tick && e.observer === ref.observer
          && e.claimId === ref.claimId && (e.network?.messageId ?? null) === ref.messageId);
      expect(entry, `feature ${feature.id} ref ${JSON.stringify(ref)} matches no EvidenceEntry`).toBeDefined();

      // (2) the ref resolves to a chronicle record the observer HEARD at that tick.
      if (ref.messageId !== null) {
        // a network ref → a network-speech row with that id/tick whose heardBy names the observer.
        const speech = world.chronicle.find(
          (c) => c.kind === 'network-speech' && c.tick === ref.tick && c.messageId === ref.messageId
            && c.heardBy.some((h) => h.id === ref.observer));
        expect(speech, `feature ${feature.id} network-ref ${JSON.stringify(ref)} matches no speech heard by ${ref.observer}`).toBeDefined();
      } else if (ref.claimId !== null) {
        // an utterance/answer ref → a telling of that claim whose heardBy names the observer.
        const telling = world.chronicle.find(
          (c) => c.kind === 'telling' && c.tick === ref.tick && c.claimId === ref.claimId &&
            c.heardBy.some((h) => h.id === ref.observer));
        expect(telling, `feature ${feature.id} ref ${JSON.stringify(ref)} matches no telling heard by ${ref.observer}`).toBeDefined();
      } else {
        // an asking ref → an asking at that tick whose heardBy names the observer.
        const asking = world.chronicle.find(
          (c) => c.kind === 'asking' && c.tick === ref.tick && c.heardBy.some((h) => h.id === ref.observer));
        expect(asking, `feature ${feature.id} asking-ref ${JSON.stringify(ref)} matches no asking heard by ${ref.observer}`).toBeDefined();
      }
    }
  }
}
