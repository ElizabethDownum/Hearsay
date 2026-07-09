/**
 * The composition root's town-view TYPE surface — the seam that lets the fenced town diagram be
 * typed against the exact contracts the root produces, without importing engine VALUE code.
 *
 * Why this file exists (epistemic-honesty lint fence + the "same rule value" law):
 *   The town directory is fenced by the panels-law block (eslint.config.js): NO imports from the
 *   sim/world/bots/harness trees — value OR type — so a town component can never reach into the
 *   engine. But the diagram's props ARE, verbatim, the sim's `PlayerView` (the epistemic selector)
 *   and its layout input IS the public-street `TownMap`; both types live in the fenced sim tree.
 *   The fence's rule value is BINDING-fixed (Plan-7 constraint: extend the files array, same rule
 *   value, no new block, no allowTypeImports), so the town files obtain the NAMES through this
 *   UNFENCED app-root module instead. These are `export type` re-exports — fully erased at build,
 *   carrying ZERO runtime coupling — so the runtime fence (no engine values in town/) is completely
 *   intact: types flow, values do not. This mirrors how the panels get `BoardView` from
 *   src/intel/types rather than reaching into the sim themselves.
 */
export type { PlayerView } from '../../src/sim/fieldwork';
export type { TownMap } from '../../src/sim/enemy/state';
// Plan 8 Task 11 — the network surface's epistemic view-models + the one price table's type. Same
// erased-type-only re-export discipline: names flow to the fenced panels, zero runtime coupling.
export type { NetworkView, NetworkAssetView, NetworkDropView, CourierRoute } from '../../src/sim/fieldwork';
export type { EconomyDef } from '../../src/sim/rules';
