import type { Action } from '../../../src/sim/campaign';

/**
 * UI intents as ACTIONS, not raw events. The spec's day-one commitment: a controller / Steam Deck /
 * a v1.1 rebind screen all ride this same surface, because input is a value the loop interprets, not
 * a hard-wired handler. The `verb` kind carries a sim `Action` (type-only import — the app→engine
 * boundary is crossed by TYPES only in this file, so no runtime engine coupling leaks into input/).
 *
 * `close` is not in the brief's UIAction list, but the brief's KEYMAP binds "Escape close"; since
 * KEYMAP is typed `Record<string, UIAction>`, an Escape→close binding is only well-typed if `close`
 * is a UIAction. The two verbatim clauses are reconciled by adding this one member (nothing else in
 * the union covers "dismiss the open panel").
 */
export type UIAction =
  | { kind: 'pause' }
  | { kind: 'speed'; speed: 0.25 | 0.5 | 1 | 2 | 4 }
  | { kind: 'select-venue'; id: string }
  | { kind: 'select-npc'; id: string }
  | { kind: 'open-panel'; panel: 'board' | 'codex' | 'counter' | 'web' | 'ledger' | 'planner' | 'report' | 'terms' }
  | { kind: 'assist'; level: 0 | 1 | 2 | 3 }
  | { kind: 'close' }
  | { kind: 'verb'; action: Action };

/**
 * The shipped default keyboard map (DATA, so it is rebindable later — keybindings ship v1.1).
 * Space pause · 1-5 speeds (0.25/0.5/1/2/4) · b/c/x/w/l/p/r/t panels (in panel-union order) · Escape close.
 * Keys are `KeyboardEvent.key` values; `select-venue`/`select-npc`/`assist`/`verb` are pointer-driven
 * (they need an id/level/payload) and so are intentionally absent from the static key map.
 */
export const KEYMAP: Record<string, UIAction> = {
  ' ': { kind: 'pause' },
  '1': { kind: 'speed', speed: 0.25 },
  '2': { kind: 'speed', speed: 0.5 },
  '3': { kind: 'speed', speed: 1 },
  '4': { kind: 'speed', speed: 2 },
  '5': { kind: 'speed', speed: 4 },
  b: { kind: 'open-panel', panel: 'board' },
  c: { kind: 'open-panel', panel: 'codex' },
  x: { kind: 'open-panel', panel: 'counter' },
  w: { kind: 'open-panel', panel: 'web' },
  l: { kind: 'open-panel', panel: 'ledger' },
  p: { kind: 'open-panel', panel: 'planner' },
  r: { kind: 'open-panel', panel: 'report' },
  t: { kind: 'open-panel', panel: 'terms' },
  Escape: { kind: 'close' },
};
