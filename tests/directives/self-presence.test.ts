import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { evaluateReceivedBrief, type ReceivedBriefInput } from '../../src/sim/directives/evaluator';
import type { AdvisoryGuidance, DirectiveBrief } from '../../src/sim/directives/types';
import type { Observation } from '../../src/sim/perception';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { hashWorld } from '../../src/sim/hash';
import { runUntil } from '../../src/sim/step';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const brief: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
  priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: 0, until: 240 }, report: 'full', reportBy: 180, purpose: null,
};
function input(guidance: AdvisoryGuidance[], observations: Observation[] = []): ReceivedBriefInput {
  return { directiveId: 'd0', messagePrincipal: 'enemy', handoffFrom: 'issuer',
    version: { id: 'v0', parent: null, directiveId: 'd0', brief: { ...brief, guidance },
      claimedIssuer: 'issuer', replyRoute: ['issuer'], changedBy: null, changes: [] },
    recipient: { id: 'guard', faction: 'none', rivals: [], knownFactions: { guard: 'none' },
      traits: ['literalist'], mice: null, relationshipToIssuer: 0.8, strikes: 0, turned: false },
    local: { tick: 15, venue: 'square', circleMembers: ['guard', 'issuer'],
      observations: { observer: 'guard', tick: 15, observations } },
    perceivedScrutiny: 0, stage: 'execution' };
}
const expected = (person: string, venue = 'square', at = 0): AdvisoryGuidance =>
  ({ kind: 'expected-presence', person, venue, at });
const seen: Observation = { kind: 'presence', tick: 15, venue: 'square', actor: 'other' };
const cases: { name: string; guidance: AdvisoryGuidance[]; observations: Observation[]; method: 'observe' | 'hold' }[] = [
  { name: 'self is present at the supplied local venue without a self observation',
    guidance: [expected('guard')], observations: [], method: 'observe' },
  { name: 'another person still requires an observation',
    guidance: [expected('other')], observations: [], method: 'hold' },
  { name: 'an actually observed other person satisfies the advisory',
    guidance: [expected('other')], observations: [seen], method: 'observe' },
  { name: 'future guidance is not prematurely treated as contradicted',
    guidance: [expected('other', 'square', 16)], observations: [], method: 'observe' },
  { name: 'advisory at a different venue keeps its existing behavior',
    guidance: [expected('other', 'backroom')], observations: [], method: 'observe' },
  { name: 'self presence cannot override an avoided venue',
    guidance: [expected('guard'), { kind: 'avoid-venue', venue: 'square' }], observations: [], method: 'hold' },
  { name: 'self presence cannot override a not-before instruction',
    guidance: [expected('guard'), { kind: 'not-before', tick: 16 }], observations: [], method: 'hold' },
  { name: 'self presence cannot override a not-after instruction',
    guidance: [expected('guard'), { kind: 'not-after', tick: 14 }], observations: [], method: 'hold' },
];

describe('expected presence uses an actor’s own location without inventing a self observation', () => {
  it.each(cases)('$name', ({ guidance, observations, method }) => {
    const value = input(guidance, observations);
    expect(evaluateReceivedBrief(value, RULES).method.kind).toBe(method);
  });

  it('self guidance has the same eight-dimensional decision as no contradiction, and the input remains pure', () => {
    const value = input([expected('guard')]);
    const bytes = JSON.stringify(value);
    expect(evaluateReceivedBrief(value, RULES)).toEqual(evaluateReceivedBrief(input([]), RULES));
    expect(JSON.stringify(value)).toBe(bytes);
    expect(value.local.observations.observations).toEqual([]);
  });

  it('the standard authored watch actually works through the full tick loop without removing its guidance', () => {
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of fixture.npcs) {
      npc.traits = ['literalist'];
      npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
    }
    const initial = buildWorld(fixture, 'self-presence-watch', RULES);
    initial.network.spymaster = 'ada';
    initial.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    initial.enemy.observers = [{ id: 'bez', vigilance: 1 }];
    applyEnemyDecision(initial, { day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
    const replay = structuredClone(initial);
    const record = initial.network.directiveState!.records[0]!;
    expect(record.authored.brief.guidance).toContainEqual({
      kind: 'expected-presence', person: 'bez', venue: 'square', at: 2400,
    });
    expect(record.authored.brief.report).toBe('outcome');
    runUntil(initial, 1440 + 1141, RULES); // first complete authored watch window
    expect(record.execution?.state).toBe('attempted');
    expect(record.received).not.toBeNull();
    expect(record.execution?.workedDays ?? []).toContain(1);
    const report = initial.network.directiveState!.messages.find((message) =>
      message.payload.kind === 'directive-report' && message.payload.directiveId === record.id);
    expect(report).toBeDefined();
    runUntil(replay, initial.tick, RULES);
    expect(hashWorld(initial)).toBe(hashWorld(replay));
  });
});
