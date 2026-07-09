import { describe, expect, it } from 'vitest';
import { KEYMAP, type UIAction } from '../../app/src/input/actions';

// Input as ACTIONS (not raw events): the keyboard map is DATA, so a controller / Steam Deck / a
// v1.1 rebind screen can ride the same UIAction surface. This test pins the shipped default map.

describe('KEYMAP — the default keyboard-to-UIAction map (data, rebindable later)', () => {
  it('matches the shipped bindings exactly', () => {
    const expected: Record<string, UIAction> = {
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
      n: { kind: 'open-panel', panel: 'network' },
      y: { kind: 'open-panel', panel: 'treasury' },
      Escape: { kind: 'close' },
    };
    expect(KEYMAP).toEqual(expected);
  });

  it('Space pauses; 1-5 are the Ellie-ratified speed multipliers', () => {
    expect(KEYMAP[' ']).toEqual({ kind: 'pause' });
    expect(['1', '2', '3', '4', '5'].map((k) => (KEYMAP[k] as { speed: number }).speed))
      .toEqual([0.25, 0.5, 1, 2, 4]);
  });

  it('b/c/x/w/l/p/r/t/n/y open the ten panels; Escape closes', () => {
    const panels = 'bcxwlprtny'.split('').map((k) => (KEYMAP[k] as { panel: string }).panel);
    expect(panels).toEqual(['board', 'codex', 'counter', 'web', 'ledger', 'planner', 'report', 'terms', 'network', 'treasury']);
    expect(KEYMAP.Escape).toEqual({ kind: 'close' });
  });
});
