import type { ScenarioDef } from '../../sim/scenario/types';

/** V1's one polished scenario: topple the usurper before the crown lands. 40 days. */
export const CORONATION: ScenarioDef = {
  id: 'coronation',
  name: 'The Coronation',
  days: 40,
  objectiveTerm: 'objective-topple',
  win: { kind: 'council-turns', quorum: 2 },
};
