import type { PredicateId } from './rumors/claim';
import type { TraitDef, TraitId } from './rumors/traits';
import type { VignetteDef } from './vignettes/types';

export interface PredicateDef {
  id: PredicateId;
  /** 0..1 — how tellable the story is on its own. */
  juiciness: number;
  /** Moralizer target: the sin-register version of this predicate. */
  sinVersion: PredicateId | null;
  /** Partisan only fires on faction-relevant claims. */
  factionRelevant: boolean;
  /** Who the claim helps or harms — confirmation bias reads this. */
  valence: 'damaging' | 'neutral' | 'flattering';
}

/**
 * Money prices choices, never a second game (Plan 8 constraint): flat integer coin,
 * weekly stipend, visible prices — no markets, no interest, no optimization minigame.
 * This is the ONE content table; every price is a named constant here (never a
 * hand-rolled literal elsewhere). `src/content/economy.ts` supplies `STANDARD_ECONOMY`
 * with the authored v1 values — a retune surface, term-registered in Task 11.
 */
export interface EconomyDef {
  startingCoin: number;
  /** Lands on REST_DAY's nightly (src/sim/step.ts). */
  weeklyStipend: number;
  /** Unpaid week: disposition slides (Task 4) — not read by this task. */
  wagePerInformantPerWeek: number;
  recruitCost: { money: number; ideology: number; coercion: number; ego: number };
  courierRun: number;
  deadDropSetup: number;
  /** Noble hosting. Lowlife equivalent is `backRoomEvent`. */
  salonEvent: number;
  backRoomEvent: number;
  /** severity × this (Task 10). */
  brokerSaleBase: number;
}

/**
 * Injected engine configuration: the engine defines this shape, content supplies
 * the data, and callers pass it in. Rules contains functions (trait transforms),
 * so it must NEVER be stored inside WorldState (serializability law) — it is
 * always passed as a parameter.
 */
export interface Rules {
  predicates: Record<PredicateId, PredicateDef>;
  traits: Record<TraitId, TraitDef>;
  /** Player/intel tuning: which occupations the enemy's watch profiles read as suspicious. */
  intel: { watchOccupations: string[] };
  /** State-triggered micro-scenes (pillar 7): declarative preconditions → ordinary world facts. */
  vignettes: readonly VignetteDef[];
  /** The treasury's one price table. */
  economy: EconomyDef;
}
