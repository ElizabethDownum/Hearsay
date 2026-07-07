import type { EconomyDef } from '../sim/rules';

/**
 * The one price table (Plan 8 constraint: money prices choices, never a second game).
 * These are EXACTLY the authored v1 prices — a retune surface, term-registered in
 * Task 11. Behavior for most of these fields lands in later tasks (spending helper:
 * Task 3; unpaid-week disposition slide: Task 4; broker sale: Task 10); this task
 * only wires `startingCoin` (world init) and `weeklyStipend` (rest-day nightly).
 */
export const STANDARD_ECONOMY: EconomyDef = {
  startingCoin: 20,
  weeklyStipend: 12,
  wagePerInformantPerWeek: 2,
  recruitCost: { money: 10, ideology: 4, coercion: 2, ego: 6 },
  courierRun: 3,
  deadDropSetup: 5,
  salonEvent: 8,
  backRoomEvent: 4,
  brokerSaleBase: 2,
};
