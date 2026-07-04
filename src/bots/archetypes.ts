import { at } from '../core/time';
import type { Action } from '../sim/campaign';
import type { InjectSpec } from '../sim/actions';
import type { Rules } from '../sim/rules';
import type { WorldState } from '../sim/types';
import type { EntityId } from '../sim/rumors/claim';
import { SOMEONE } from '../sim/rumors/claim';

export interface Bot {
  name: string;
  /** Called at each day boundary; returns that day's actions (ticks within the day). */
  decide(world: WorldState, rules: Rules, day: number): Action[];
}

/** NPC ids by out-edge count descending, lexicographic tie-break. Deterministic. */
export function bestConnected(world: WorldState): EntityId[] {
  return Object.values(world.npcs)
    .sort((a, b) => b.edges.length - a.edges.length || (a.id < b.id ? -1 : 1))
    .map((n) => n.id);
}

const CANON: InjectSpec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4, place: 'market', attribution: SOMEONE,
};

/** One well-placed morning whisper to the best-connected mind, then silence. */
export const patientWhisperer: Bot = {
  name: 'patient-whisperer',
  decide(world, _rules, day) {
    if (day !== 0) return [];
    return [{ tick: at(0, 8), kind: 'inject', target: bestConnected(world)[0]!, spec: CANON }];
  },
};

/** Three stories to the three best-connected minds across day 0. */
export const blitzCrier: Bot = {
  name: 'blitz-crier',
  decide(world, _rules, day) {
    if (day !== 0) return [];
    const targets = bestConnected(world).slice(0, 3);
    const hours = [8, 12, 18] as const;
    return targets.map((target, i) => ({
      tick: at(0, hours[i]!), kind: 'inject' as const, target, spec: CANON,
    }));
  },
};
