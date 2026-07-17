import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { evaluateReceivedBrief, type ReceivedBriefInput } from '../../src/sim/directives/evaluator';
import type { BriefVersion, DirectiveBrief } from '../../src/sim/directives/types';

const brief: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'target' } },
  priority: 'important', authority: 'office', discretion: 'open', specificity: 'guided',
  guidance: [], active: { from: 0, until: 240 }, report: 'full', reportBy: 180,
  purpose: 'learn the truth',
};
const version = (value: DirectiveBrief = brief): BriefVersion => ({ id: 'v0', parent: null,
  directiveId: 'd0', brief: value, claimedIssuer: 'issuer', replyRoute: ['issuer'],
  changedBy: null, changes: [] });
const input = (overrides: Partial<ReceivedBriefInput> = {}): ReceivedBriefInput => ({
  directiveId: 'd0', version: version(), messagePrincipal: 'player', handoffFrom: 'issuer',
  recipient: { id: 'recipient', faction: 'guild', rivals: [], knownFactions: { recipient: 'guild' },
    traits: ['literalist'], mice: null, relationshipToIssuer: 0, strikes: 0, turned: false },
  local: { tick: 0, venue: 'square', circleMembers: ['recipient'], observations: {
    observer: 'recipient', tick: 0, observations: [],
  } }, perceivedScrutiny: 0, stage: 'receipt', ...overrides,
});

describe('evaluateReceivedBrief', () => {
  it('returns exactly the approved eight dimensions and is byte-identical on replay', () => {
    const a = evaluateReceivedBrief(input(), STANDARD_RULES);
    const b = evaluateReceivedBrief(input(), STANDARD_RULES);
    expect(Object.keys(a).sort()).toEqual([
      'candor', 'commitment', 'disclosure', 'initiative', 'interpretation', 'method', 'risk', 'timing',
    ]);
    expect(a).toEqual(b);
  });

  it.each([
    ['office', 'important', 'open', 'attempt'],
    ['office', 'important', 'quiet', 'attempt'],
    ['compel', 'urgent', 'open', 'attempt'],
    ['request', 'important', 'open', 'refuse'],
  ] as const)('pins edge-less reachability for %s/%s/%s', (authority, priority, discretion, expected) => {
    const received = version({ ...brief, authority, priority, discretion });
    expect(evaluateReceivedBrief(input({ version: received }), STANDARD_RULES).commitment).toBe(expected);
  });

  it('expires inclusively only when a strictly future beat fits and receipt caution never overruns', () => {
    const active = version({ ...brief, priority: 'urgent', active: { from: 0, until: 15 } });
    expect(evaluateReceivedBrief(input({ version: active, local: {
      ...input().local, tick: 15,
    } }), STANDARD_RULES)).toMatchObject({ commitment: 'refuse', method: { kind: 'hold' },
      timing: { actAt: null, reportAt: null } });
    const cautious = evaluateReceivedBrief(input({ version: active, perceivedScrutiny: 0.5 }), STANDARD_RULES);
    expect(cautious.timing).toEqual({ actAt: null, reportAt: null });
  });

  it('crosses loyal/turned low/mid/high scrutiny without exposing allegiance at high scrutiny', () => {
    const matrix = [
      [false, 0, 'ordinary'], [true, 0, 'doctored'],
      [false, 0.5, 'guarded'], [true, 0.5, 'omissive'],
      [false, 0.7, 'guarded'], [true, 0.7, 'guarded'],
    ] as const;
    for (const [turned, scrutiny, candor] of matrix) {
      const profile = evaluateReceivedBrief(input({ perceivedScrutiny: scrutiny,
        recipient: { ...input().recipient, turned } }), STANDARD_RULES);
      expect(profile.candor).toBe(candor);
      if (scrutiny >= 0.5) expect(profile.initiative).toBe('literal');
      if (scrutiny >= 0.7) expect(profile.risk).toBe('avoidant');
    }
  });

  it('uses only explicitly known rival factions for ideology damage', () => {
    const shaped = version({ ...brief, mission: { kind: 'shape', operation: 'spread', payload: {
      family: 'f0', parent: null, claim: { subject: 'target', predicate: 'stole', object: null,
        count: 1, severity: 4, place: null, attribution: 'issuer' },
    }, audience: { kind: 'person', id: 'target' }, redirectTo: null } });
    const hidden = evaluateReceivedBrief(input({ version: shaped, recipient: {
      ...input().recipient, mice: 'ideology', knownFactions: { recipient: 'guild' },
    } }), STANDARD_RULES);
    const namedNonRival = evaluateReceivedBrief(input({ version: shaped, recipient: {
      ...input().recipient, mice: 'ideology', knownFactions: { recipient: 'guild', target: 'guild' },
    } }), STANDARD_RULES);
    const rivalKnown = evaluateReceivedBrief(input({ version: shaped, recipient: {
      ...input().recipient, mice: 'ideology', rivals: ['target'],
      knownFactions: { recipient: 'guild', target: 'guild' },
    } }), STANDARD_RULES);
    expect(hidden.commitment).toBe('attempt');
    expect(namedNonRival).toEqual(hidden);
    expect(rivalKnown.commitment).toBe('refuse');
  });

  it('applies expected/avoid/not-before/not-after guidance only to method selection', () => {
    const local = { ...input().local, circleMembers: ['recipient', 'alternate'] };
    const recipient = { ...input().recipient, relationshipToIssuer: 0.5 };
    const expected = version({ ...brief, guidance: [
      { kind: 'expected-presence', person: 'target', venue: 'square', at: 0 },
    ] });
    expect(evaluateReceivedBrief(input({ version: expected, local, recipient }), STANDARD_RULES).method)
      .toEqual({ kind: 'observe', target: { kind: 'person', id: 'alternate' } });
    const avoided = version({ ...brief, guidance: [{ kind: 'avoid-venue', venue: 'square' }] });
    expect(evaluateReceivedBrief(input({ version: avoided, local, recipient }), STANDARD_RULES).method)
      .toEqual({ kind: 'observe', target: { kind: 'person', id: 'alternate' } });
    for (const guidance of [
      [{ kind: 'not-before' as const, tick: 30 }],
      [{ kind: 'not-after' as const, tick: -1 }],
    ]) {
      const held = evaluateReceivedBrief(input({ version: version({ ...brief, guidance }),
        local, recipient }), STANDARD_RULES);
      expect(held.method).toEqual({ kind: 'hold' });
    }
  });

  it('treats execution timing as descriptive and never reschedules a due defer', () => {
    const deferred = version({ ...brief, authority: 'request', active: { from: 0, until: 3000 },
      report: 'none', reportBy: null });
    const recipient = { ...input().recipient, relationshipToIssuer: 0.4 };
    const local = { ...input().local, tick: 15 };
    expect(evaluateReceivedBrief(input({ version: deferred, recipient, local, stage: 'receipt' }),
      STANDARD_RULES)).toMatchObject({
      commitment: 'defer', timing: { actAt: 15 + TICKS_PER_DAY, reportAt: null },
    });
    expect(evaluateReceivedBrief(input({ version: deferred, recipient, local, stage: 'execution' }),
      STANDARD_RULES)).toMatchObject({
      commitment: 'defer', timing: { actAt: 15, reportAt: null },
    });
  });

  it('reads avoid-person across the current circle with observed and absent controls', () => {
    const guidance = [{ kind: 'avoid-person' as const, person: 'bystander' }];
    const recipient = { ...input().recipient, relationshipToIssuer: 0.5 };
    const present = { ...input().local, circleMembers: ['recipient', 'bystander', 'alternate'] };
    const absent = { ...input().local, circleMembers: ['recipient', 'alternate'] };
    const measured = version({ ...brief, guidance });
    expect(evaluateReceivedBrief(input({ version: measured, recipient, local: present }), STANDARD_RULES).method)
      .toEqual({ kind: 'observe', target: { kind: 'person', id: 'alternate' } });
    expect(evaluateReceivedBrief(input({ version: measured, recipient, local: absent }), STANDARD_RULES).method)
      .toEqual({ kind: 'observe', target: { kind: 'person', id: 'target' } });
    const avoidant = version({ ...brief, discretion: 'quiet', guidance });
    expect(evaluateReceivedBrief(input({ version: avoidant, recipient, local: present }), STANDARD_RULES).method)
      .toEqual({ kind: 'hold' });
  });

  it('player/enemy mirror inputs normalize to identical profiles', () => {
    expect(evaluateReceivedBrief(input({ messagePrincipal: 'enemy' }), STANDARD_RULES))
      .toEqual(evaluateReceivedBrief(input({ messagePrincipal: 'player' }), STANDARD_RULES));
  });
});

describe('evaluator source fences FIRE on forbidden architecture', () => {
  const source = readFileSync(new URL('../../src/sim/directives/evaluator.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  it('rejects WorldState text/import', () => {
    expect(source).not.toMatch(/\bWorldState\b/);
  });
  it('rejects whole-world faction maps and principal-id relationship lookups', () => {
    expect(source).not.toMatch(/world\.npcs|principalId|trustBetween|relationshipTo\s*\(/);
  });
});
