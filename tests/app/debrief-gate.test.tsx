import { describe, expect, it, vi } from 'vitest';
import { createElement, type DependencyList, type EffectCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyAction } from '../../src/sim/campaign';
import { hashWorld } from '../../src/sim/hash';
import { scenarioNightly } from '../../src/sim/scenario/referee';
import { step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import type { Session } from '../../app/src/loop/session';
import { miniTown } from '../sim/helpers/minitown';
import { terminalStory } from './helpers/debrief-campaign';

const gate = vi.hoisted(() => {
  // These app checks run from the repository root, as do the existing source/fence checks.
  const root = process.cwd().replaceAll('\\', '/');
  return { world: null as WorldState | null, denyLive: false, calls: [] as WorldState[],
    effects: null as EffectCallback[] | null,
    session: root + '/app/src/loop/session.ts' };
});
vi.mock(gate.session, async () => {
  const actual = await vi.importActual<typeof import('../../app/src/loop/session')>(gate.session);
  return { ...actual, newSession: (seed: string): Session => {
    if (gate.world === null) return actual.newSession(seed);
    const forbidden = () => { throw new Error('Rendering must not execute a session command'); };
    return { seed, world: gate.world, log: [], submit: forbidden, requestLocalInteraction: forbidden,
      cancelLocalInteraction: forbidden, chooseLocal: forbidden, advance: forbidden, localOffer: () => null,
      speechQueuedForBeat: () => false, save: () => ({ seed, log: [] }) };
  } };
});
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: () => undefined }) }));
// The repository config externalises react (CJS namespace, not spy-able); capture effects through the
// same module mock route the session already uses instead of redefining a namespace export.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useEffect: (effect: EffectCallback, deps?: DependencyList) => {
    if (gate.effects) { gate.effects.push(effect); return; }
    actual.useEffect(effect, deps);
  } };
});

async function renderApp(world: WorldState, effects?: EffectCallback[]) {
  gate.world = world;
  gate.effects = effects ?? null;
  const models = await import('../../src/sim/debrief/index');
  const original = models.debriefView;
  const spy = vi.spyOn(models, 'debriefView').mockImplementation((input) => {
    gate.calls.push(input);
    if (gate.denyLive && (input.scenario === null || input.scenario.status === 'running')) throw new Error('Hidden fold reached a live campaign');
    return original(input);
  });
  vi.stubGlobal('document', { getElementById: () => ({}) });
  try {
    const local = await import('../../app/src/loop/session');
    expect(local.newSession('probe').world, 'the actual main session import must receive this fixture').toBe(world);
    const { App } = await import('../../app/src/main'); const result = renderToStaticMarkup(createElement(App));
    if (world.scenario !== null && world.scenario.status !== 'running') expect(result).toContain('Open the');
    return result;
  }
  finally { gate.effects = null; spy.mockRestore(); vi.unstubAllGlobals(); gate.world = null; gate.denyLive = false; }
}
function fresh() {
  const town = miniTown(); for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'debrief-ui-gate', R); enrollPlayer(world, { home: 'backroom' }); world.enemy.observers = [];
  world.scenario = { defId: 'debrief-ui-gate', days: 1, win: { kind: 'council-turns', quorum: 2 },
    cast: { usurper: 'bez', council: ['ada', 'cyn'] }, status: 'running', resolution: null };
  return world;
}
const claim = { subject: 'bez', predicate: 'stole', object: null, count: 2, severity: 4 as const, place: 'square', attribution: 'someone' };

describe('the actual main composition branch keeps terminal truth out of running panels', () => {
  it('the actual registered keyboard handler leaves terminal Space activation alone and preserves running shortcuts', async () => {
    const world = terminalStory().world; const effects: EffectCallback[] = []; await renderApp(world, effects);
    const callbacks: ((event: KeyboardEvent) => void)[] = []; const cleanup: (() => void)[] = [];
    vi.stubGlobal('window', { addEventListener: (kind: string, callback: (event: KeyboardEvent) => void) => {
      if (kind === 'keydown') callbacks.push(callback);
    }, removeEventListener: () => undefined });
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
    try {
      for (const effect of effects) { const result = effect(); if (result) cleanup.push(result); }
      expect(callbacks).toHaveLength(1); const preventDefault = vi.fn(); const before = hashWorld(world);
      const event = { key: ' ', target: { tagName: 'BUTTON' }, preventDefault } as unknown as KeyboardEvent;
      callbacks[0]!(event); expect(preventDefault).not.toHaveBeenCalled(); expect(hashWorld(world)).toBe(before);
      world.scenario!.status = 'running'; callbacks[0]!(event); expect(preventDefault).toHaveBeenCalledOnce();
    } finally { for (const close of cleanup) close(); vi.unstubAllGlobals(); }
  });

  it.each(['running', 'scenario-free'] as const)('%s rendering never calls any debrief fold or receives a terminal payload', async (state) => {
    const world = fresh(); if (state === 'scenario-free') world.scenario = null;
    world.enemy.sketch.push({ id: 'hidden', kind: 'carrier-profile', day: 0, subject: 'you', family: null,
      district: null, detail: 'PRIVATE MODEL SENTINEL', evidence: [] });
    gate.calls = []; gate.denyLive = true; const before = hashWorld(world);
    const html = await renderApp(world);
    expect(gate.calls).toEqual([]); expect(html).not.toContain('PRIVATE MODEL SENTINEL');
    expect(html).not.toContain('Terminal debrief'); expect(html).not.toContain('Open the');
    expect(html).toContain('playback'); expect(hashWorld(world)).toBe(before);
  });

  it.each(['won', 'lost-clock', 'lost-exposed', 'lost-caught'] as const)('the actual %s resolution reaches exactly one fold and the opening card', async (status) => {
    let world = fresh();
    if (status === 'lost-clock') world = terminalStory().world;
    else if (status === 'won') {
      applyInject(world, 'ada', claim); applyInject(world, 'cyn', claim); scenarioNightly(world, R);
    } else if (status === 'lost-exposed') {
      world.enemy.sketch.push({ id: 'retained-identity', kind: 'carrier-profile', day: 0, subject: 'you', family: null,
        district: null, detail: 'the retained avatar carrier profile', evidence: [] }); scenarioNightly(world, R);
    } else {
      world.scenario!.days = 10; world.enemy.observers = [{ id: 'bez', vigilance: 1 }]; world.playerVenue = 'square'; world.tick = 15;
      applyAction(world, { tick: 15, kind: 'tell', to: 'ada', spec: claim }, R); step(world, R);
    }
    expect(world.scenario!.status).toBe(status); gate.calls = []; const before = hashWorld(world);
    const html = await renderApp(world);
    expect(gate.calls).toHaveLength(1); expect(gate.calls[0]).toBe(world); expect(html).toContain('Open the');
    expect(html).not.toContain('aria-label="playback"'); expect(hashWorld(world)).toBe(before);
  });
});
