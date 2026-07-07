import { PREDICATES } from './predicates';
import { TRAITS } from './traits';
import { STANDARD_VIGNETTES } from './vignettes';
import { STANDARD_ECONOMY } from './economy';
import type { Rules } from '../sim/rules';

export const STANDARD_RULES: Rules = {
  predicates: PREDICATES, traits: TRAITS, intel: { watchOccupations: ['guard'] },
  vignettes: STANDARD_VIGNETTES, economy: STANDARD_ECONOMY,
};
