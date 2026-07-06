import type { WorldState } from '../types';
import type { SketchEvidence } from './types';

export interface ExposureStatus {
  score: number;
  identified: boolean;
  features: SketchEvidence[];
}

/**
 * How much of the enemy's sketch points at YOUR people. Distinct (kind, subject) keys
 * only — feature COUNT saturates (P4 finding) and must never be a meter. Identification
 * = a carrier-profile whose subject is the avatar: the hop-zero profile has your face.
 */
export function exposureStatus(world: WorldState): ExposureStatus {
  const mine = new Set<string>();
  if (world.playerId) mine.add(world.playerId);
  for (const i of world.intel.informants) mine.add(i.id);
  const keys = new Set<string>();
  const features: SketchEvidence[] = [];
  let identified = false;
  for (const f of world.enemy.sketch) {
    if (f.subject === null || !mine.has(f.subject)) continue;
    keys.add(`${f.kind}:${f.subject}`);
    features.push({ featureId: f.id, subject: f.subject });
    if (f.kind === 'carrier-profile' && f.subject === world.playerId) identified = true;
  }
  return { score: keys.size, identified, features };
}
