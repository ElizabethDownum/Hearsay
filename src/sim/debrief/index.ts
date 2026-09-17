import { dayOf } from '../../core/time';
import type { HypothesisCard } from '../../intel/entry';
import type { EnemyActionLedgerEntry, SketchFeature } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import type { Resolution, ScenarioStatus } from '../scenario/types';
import type { ChronicleEntry, InstitutionRecord, WorldState } from '../types';
import { debriefCalendar, type DebriefCalendar } from './calendar';
import { operationThreads, type OperationThreads } from './threads';

export type { DebriefCalendar, DebriefDay } from './calendar';
export type { OverlayDay, OverlaySignal } from './overlay';
export type { OperationThreads, PhysicalObservationHistory } from './threads';
export interface DebriefView {
  at: number;
  ending: { status: Exclude<ScenarioStatus, 'running'>; resolution: Resolution | null;
    resolutionState: 'consistent' | 'missing' | 'inconsistent' };
  calendar: DebriefCalendar;
  operations: OperationThreads;
  chronicle: { chronicleIndex: number; record: ChronicleEntry }[];
  recordsBeyondClock: { chronicleIndex: number; record: ChronicleEntry }[];
  /** Current reported HQ bookkeeping has no retained update timestamps; never backdate it. */
  headquartersLedger: { timing: 'unrecorded'; entries: EnemyActionLedgerEntry[] };
  /** Current player-authored annotations only; no grades or reconstructed historical edits. */
  annotations: { timing: 'terminal-current'; graded: false; cards: HypothesisCard[] };
}

/** Validate retained identities, not the referee's rules, thresholds or today's council/informant roster. */
function resolutionMatches(world: WorldState, resolution: Resolution): boolean {
  const actions = { won: 'denounce', 'lost-clock': 'coronation', 'lost-exposed': 'unmasking', 'lost-caught': 'arrest' } as const;
  const institutions = world.chronicle.filter((row): row is InstitutionRecord => row.kind === 'institution'
    && row.action === actions[resolution.kind] && row.tick <= world.tick && dayOf(row.tick) === resolution.day);
  // Resolution carries a day, not an event index: multiple candidate endings remain ambiguous.
  if (institutions.length !== 1) return false;
  const institution = institutions[0]!;
  if (resolution.kind === 'won' || resolution.kind === 'lost-clock') {
    if (new Set(resolution.turned.map((row) => row.npc)).size !== resolution.turned.length
      || (resolution.kind === 'won' && resolution.turned.length === 0)
      || stableStringify(institution.claimIds) !== stableStringify(resolution.turned.map((row) => row.claimId))) return false;
    if (resolution.kind === 'won'
      && stableStringify(institution.actors) !== stableStringify(resolution.turned.map((row) => row.npc))) return false;
    return resolution.turned.every((row) => {
      const claim = world.claims[row.claimId];
      if (!claim || claim.id !== row.claimId || claim.family !== row.family || claim.subject !== institution.subject
        || !Number.isFinite(row.credence) || row.credence < 0 || row.credence > 1) return false;
      if (resolution.kind === 'won') return true; // The denouncement names each member and claim in matching order.
      // Coronation records omit member names; only a retained matching belief can resolve this partial-progress pointer.
      const belief = world.beliefs[row.npc]?.[row.family];
      return belief !== undefined && stableStringify(belief.claim) === stableStringify(claim)
        && belief.credence === row.credence && belief.firstHeardAt <= institution.tick;
    });
  }
  if (resolution.kind === 'lost-exposed') {
    if (resolution.features.length === 0
      || new Set(resolution.features.map((row) => row.featureId)).size !== resolution.features.length) return false;
    const recordedIds = new Set(world.enemy.decisions.flatMap((row) => row.features.map((feature) => feature.id)));
    const dated = world.enemy.decisions.filter((row) => row.day <= resolution.day).flatMap((row) => row.features);
    const currentIds = new Set(dated.map((feature) => feature.id));
    const retained = dated.concat(world.enemy.sketch.filter((feature) => !recordedIds.has(feature.id) || currentIds.has(feature.id)));
    const sources: SketchFeature[] = [];
    for (const ref of resolution.features) {
      const candidates = retained.filter((feature) => feature.id === ref.featureId
        && feature.day <= resolution.day && feature.evidence.every((evidence) => evidence.tick <= institution.tick));
      // A feature may be mirrored by its decision and current sketch; identical copies are one retained identity.
      const identities = new Map(candidates.map((feature) => [stableStringify(feature), feature]));
      if (identities.size !== 1) return false;
      const source = identities.values().next().value!;
      if (source.subject !== ref.subject) return false;
      sources.push(source);
    }
    return sources.some((feature) => feature.subject === institution.subject);
  }
  if (institution.subject !== world.playerId || institution.actors.length !== 1
    || institution.actors[0] !== resolution.heardBy) return false;
  const captures = world.chronicle.filter((row) => (row.kind === 'telling' || row.kind === 'network-speech')
    && row.tick === institution.tick && row.venue === resolution.venue && row.speaker === institution.subject
    && row.heardBy.some((hearer) => hearer.id === resolution.heardBy)
    && stableStringify(institution.claimIds) === stableStringify(row.kind === 'telling' ? [row.claimId] : []));
  return captures.length === 1;
}

/** Sole public value entry. Check the terminal state before reading any hidden model substrate. */
export function debriefView(world: WorldState): DebriefView | null {
  const scenario = world.scenario;
  if (scenario === null || scenario.status === 'running') return null;
  const resolution = scenario.resolution;
  return { at: world.tick,
    ending: { status: scenario.status, resolution: cloneSerializable(resolution),
      resolutionState: resolution === null ? 'missing' : resolution.kind === scenario.status
        && Number.isSafeInteger(resolution.day) && resolution.day >= 0 && resolution.day <= dayOf(world.tick)
        && resolutionMatches(world, resolution) ? 'consistent' : 'inconsistent' },
    calendar: debriefCalendar(world), operations: operationThreads(world),
    chronicle: world.chronicle.flatMap((record, chronicleIndex) => record.tick <= world.tick
      ? [{ chronicleIndex, record: cloneSerializable(record) }] : [])
      .sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex),
    recordsBeyondClock: world.chronicle.flatMap((record, chronicleIndex) => record.tick > world.tick
      ? [{ chronicleIndex, record: cloneSerializable(record) }] : []),
    headquartersLedger: { timing: 'unrecorded', entries: cloneSerializable(world.enemy.actionLedger ?? []) },
    annotations: { timing: 'terminal-current', graded: false,
      cards: cloneSerializable(world.intel.cards).sort((a, b) => a.id.localeCompare(b.id)) } };
}
