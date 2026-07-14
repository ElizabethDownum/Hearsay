import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { miniTown } from '../sim/helpers/minitown';
import { applyDirective } from '../../src/sim/actions';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { holdFieldObservation } from '../../src/sim/directives/field-reports';
import {
  allocateDirectiveId, allocateMessageId, allocateObservationId, allocateVersionId,
  ensureDirectiveState,
} from '../../src/sim/directives/state';
import type { DirectiveBrief } from '../../src/sim/directives/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';

const BRIEF: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
  priority: 'routine', authority: 'relationship', discretion: 'quiet',
  specificity: 'outcome-only', guidance: [], active: { from: 0, until: 60 },
  report: 'outcome', reportBy: 60, purpose: null,
};

function world() {
  const fixture = miniTown();
  const kept = new Set(['ada', 'bez']);
  fixture.npcs = fixture.npcs
    .filter((npc) => kept.has(npc.id))
    .map((npc) => ({ ...npc, edges: npc.edges.filter((edge) => kept.has(edge.to)) }));
  const value = buildWorld(fixture, 'directive-state', STANDARD_RULES);
  enrollPlayer(value, { home: 'square' });
  value.network.assets.push({
    id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
  });
  value.network.assets.push({
    id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
  });
  value.intel.informants.push({ id: 'bez', assignedVenue: null });
  return value;
}

describe('lazy directive state', () => {
  it('is absent from a fresh world', () => {
    const value = world();
    expect(stableStringify(value)).not.toContain('directiveState');
    expect(stableStringify(value.intel)).not.toContain('network');
  });

  it('allocates stable d/m/v/o ids and the exact nine-key state', () => {
    const value = world();
    applyDirective(value, 'bez', { outboundVia: [], reportVia: [] }, BRIEF, 0);
    expect(holdFieldObservation(
      value, 'player', 'bez',
      { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'square', actor: 'ada' } },
      null, ['you'], null, [],
    )).toBe('o0');

    const state = value.network.directiveState!;
    expect(Object.keys(state).sort()).toEqual([
      'heldObservations', 'messages', 'nextDirective', 'nextMessage', 'nextObservation',
      'nextVersion', 'records', 'recruitmentApproaches', 'scrutiny',
    ].sort());
    expect(state.records[0]!.id).toBe('d0');
    expect(state.records[0]!.authored.id).toBe('v0');
    expect(state.messages[0]!.id).toBe('m0');

    const copy = cloneSerializable(value);
    expect(ensureDirectiveState(copy)).toMatchObject({
      nextDirective: 1, nextMessage: 1, nextVersion: 1, nextObservation: 1,
    });
    const copied = ensureDirectiveState(copy);
    expect([
      allocateDirectiveId(copied), allocateMessageId(copied),
      allocateVersionId(copied), allocateObservationId(copied),
    ]).toEqual(['d1', 'm1', 'v1', 'o1']);
  });

  it('accepts only unique real player-asset relay routes and rejects every self/final hop', () => {
    const valid = world();
    applyDirective(valid, 'bez', { outboundVia: ['ada'], reportVia: ['ada'] }, BRIEF, 0);
    expect(valid.network.directiveState!.messages[0]!.route).toEqual(['ada', 'bez']);

    const cases: { handoff: { outboundVia: string[]; reportVia: string[] }; error: RegExp | string }[] = [
      { handoff: { outboundVia: ['ghost'], reportVia: [] }, error: /outbound route actor 'ghost'.*assets/ },
      { handoff: { outboundVia: ['ada', 'ada'], reportVia: [] }, error: /duplicate outbound/ },
      {
        handoff: { outboundVia: ['bez'], reportVia: [] },
        error: "directive: outbound route contains illegal self/final hop 'bez'",
      },
      { handoff: { outboundVia: [], reportVia: ['ghost'] }, error: /report route actor 'ghost'.*assets/ },
      { handoff: { outboundVia: [], reportVia: ['ada', 'ada'] }, error: /duplicate report/ },
      {
        handoff: { outboundVia: [], reportVia: ['bez'] },
        error: "directive: report route contains illegal self/final hop 'bez'",
      },
    ];
    for (const { handoff, error } of cases) {
      const value = world();
      expect(() => applyDirective(value, 'bez', handoff, BRIEF, 0)).toThrow(error);
      expect(value.network.directiveState).toBeUndefined();
    }
  });

  it('rejects sound-out with the exact Task-11 error and validates active/reportBy bounds', () => {
    const soundOut: DirectiveBrief = {
      ...BRIEF,
      mission: { kind: 'sound-out', target: 'ada', topic: 'cooperation', handle: null, meeting: null },
    };
    expect(() => applyDirective(world(), 'bez', { outboundVia: [], reportVia: [] }, soundOut, 0))
      .toThrow('directive: sound-out missions land with recruitment (Task 11)');

    const invalid: { brief: DirectiveBrief; error: RegExp }[] = [
      { brief: { ...BRIEF, active: { from: 30, until: 15 }, reportBy: null }, error: /active range is reversed/ },
      { brief: { ...BRIEF, active: { from: 0, until: 15 }, reportBy: null }, error: /active range has expired/ },
      { brief: { ...BRIEF, active: { from: 15, until: 60 }, reportBy: 14 }, error: /reportBy.*inside/ },
      { brief: { ...BRIEF, active: { from: 15, until: 60 }, reportBy: 61 }, error: /reportBy.*inside/ },
    ];
    for (const { brief, error } of invalid) {
      const value = world();
      expect(() => applyDirective(value, 'bez', { outboundVia: [], reportVia: [] }, brief, 30))
        .toThrow(error);
      expect(value.network.directiveState).toBeUndefined();
    }
  });
});
