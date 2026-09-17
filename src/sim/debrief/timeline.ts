import type { SketchFeature } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';

export interface SketchNight {
  day: number;
  added: SketchFeature[];
  known: SketchFeature[];
  identified: boolean;
  identifiedOnDay: number | null;
}

/**
 * Actual completed digests, not a reconstruction from old observation ticks.
 * Identification uses the existing avatar carrier-profile rule. No feature-count
 * distance or historical exposure score is invented from today's informant roster.
 */
export function sketchTimeline(world: WorldState): { nights: SketchNight[]; unrecorded: SketchFeature[] } {
  const days = new Map<number, SketchFeature[]>();
  for (const decision of world.enemy.decisions) {
    const additions = days.get(decision.day) ?? [];
    additions.push(...decision.features); days.set(decision.day, additions);
  }
  const known = new Map<string, SketchFeature>();
  const nights: SketchNight[] = [];
  let identifiedOnDay: number | null = null;
  for (const [day, features] of [...days].sort(([a], [b]) => a - b)) {
    const added: SketchFeature[] = [];
    for (const feature of features) {
      if (known.has(feature.id)) continue;
      known.set(feature.id, feature); added.push(cloneSerializable(feature));
      if (identifiedOnDay === null && world.playerId !== null
        && feature.kind === 'carrier-profile' && feature.subject === world.playerId) identifiedOnDay = day;
    }
    nights.push({ day, added, known: [...known.values()].map(cloneSerializable),
      identified: identifiedOnDay !== null, identifiedOnDay });
  }
  return { nights, unrecorded: world.enemy.sketch.filter((feature) => !known.has(feature.id)).map(cloneSerializable) };
}
