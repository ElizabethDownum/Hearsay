import type { IntelEntry } from '../intel/entry';
import type { ResidueObservation } from './perception';
import type { ReportedFieldObservation } from './directives/types';
import type { PhysicalReceipt } from './enemy/state';
import type { WorldState } from './types';

export type ReportedResidue = Extract<ReportedFieldObservation, { kind: 'arcane-residue' }>;

/** Called only for a local perception observation, never when a remote report arrives. */
export function rememberResidueSighting(world: WorldState, observation: ResidueObservation): ResidueObservation {
  const trace = world.magic?.traces.find((row) => row.id === observation.residueId);
  if (!trace || trace.venue !== observation.venue || observation.tick < trace.createdAt
    || !world.npcs[observation.witness]) throw new Error('residue: invalid physical sighting');
  const previous = trace.seenBy.find((row) => row.observer === observation.witness);
  if (previous) return { ...observation, tick: previous.tick };
  trace.seenBy.push({ observer: observation.witness, tick: observation.tick });
  world.chronicle.push({ kind: 'residue', act: 'observed', tick: observation.tick,
    residueId: trace.id, venue: trace.venue, observer: observation.witness });
  return { ...observation };
}

export function reportResidue(observation: ResidueObservation): ReportedResidue {
  return { kind: 'arcane-residue', observedAt: observation.tick, venue: observation.venue,
    residueId: observation.residueId, witness: observation.witness };
}

export function sameResidue(a: ReportedResidue, b: ReportedResidue): boolean {
  return a.residueId === b.residueId && a.venue === b.venue
    && a.witness === b.witness && a.observedAt === b.observedAt;
}

/** Consumes only the observed/spoken atom. Never looks up a trace to complete missing speech. */
export function ingestEnemyResidue(
  world: WorldState, observation: ReportedResidue, receipt?: PhysicalReceipt,
): void {
  if (world.enemy.evidence.some((entry) => entry.kind === 'arcane-residue'
    && entry.residue.id === observation.residueId)) return;
  world.enemy.evidence.push({
    tick: observation.observedAt, venue: observation.venue, observer: observation.witness,
    kind: 'arcane-residue', overheard: false, speaker: null, addressedTo: null,
    mode: null, claimId: null, family: null, reported: null, about: null,
    residue: { id: observation.residueId, witness: observation.witness, observedAt: observation.observedAt },
    ...(receipt === undefined ? {} : { receipt: { ...receipt } }),
  });
}

/** Player knowledge likewise dedupes the trace, never changes physical existence. */
export function ingestPlayerResidue(
  world: WorldState, observation: ReportedResidue, via: string,
): void {
  if (world.intel.log.some((entry) => entry.kind === 'arcane-residue'
    && entry.residueId === observation.residueId)) return;
  const row: IntelEntry = {
    tick: observation.observedAt, venue: observation.venue, via, kind: 'arcane-residue',
    overheard: false, speaker: null, addressedTo: null, mode: null, authority: false,
    claimId: null, family: null, reported: null, about: null, actor: null, npc: null, trait: null,
    edgeFrom: null, edgeTo: null, edgeKind: null, hintAbout: null, hintWitness: null,
    residueId: observation.residueId,
  };
  world.intel.log.push(row);
}
