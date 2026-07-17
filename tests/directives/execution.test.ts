import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyDirective } from '../../src/sim/actions';
import {
  attemptDirective, collectDirectiveActIntents, markDirectiveDue,
  expireDirectiveActsBeforeCollection, expireDirectiveExecutions,
  recordDirectiveInquiryAnswer, recordDirectiveInquiryAsked,
} from '../../src/sim/directives/execution';
import { projectShapePayloadForMethod } from '../../src/sim/directives/mutation';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { DirectiveBrief, DirectiveRecord } from '../../src/sim/directives/types';
import { stableStringify } from '../../src/sim/hash';
import { captureEvidence } from '../../src/sim/counterintel';
import type { Asking, Utterance } from '../../src/sim/perception';
import { observationsFor } from '../../src/sim/perception';
import { chooseAnswer } from '../../src/sim/inquiry';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import type { WorldState } from '../../src/sim/types';
import { miniTown } from '../sim/helpers/minitown';

const BASE: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
  priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
  guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120,
  purpose: 'learn locally',
};

function staged(seed: string, brief: DirectiveBrief = BASE): { world: WorldState; record: DirectiveRecord } {
  const fixture = miniTown();
  const kept = new Set(['ada', 'bez', 'cyn']);
  fixture.npcs = fixture.npcs.filter((npc) => kept.has(npc.id)).map((npc) => ({
    ...npc, schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: 'square' }],
    edges: npc.edges.filter((edge) => kept.has(edge.to)),
  }));
  const world = buildWorld(fixture, seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, brief, 0);
  const message = world.network.directiveState!.messages[0]!;
  expect(realizeNetworkForward(world, message.id, { venue: 'square', members: ['you', 'ada'] },
    0, STANDARD_RULES)).not.toBeNull();
  return { world, record: world.network.directiveState!.records[0]! };
}

describe('directive execution', () => {
  it('marks due in phase 1 and offers exactly one priority-ranked autonomous intent', () => {
    const { world, record } = staged('execution-due');
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    expect(record.execution).toMatchObject({ state: 'pending', dueAt: due });
    expect(collectDirectiveActIntents(world, due, [{ venue: 'square', members: ['ada', 'bez'] }]))
      .toEqual([{ kind: 'directive-act', actor: 'ada', ref: record.id, rank: 2 }]);
  });

  it('still rejects a real double queue while a live directive-due setup exists', () => {
    const { world, record } = staged('execution-double-due');
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    record.execution!.dueAt = 0;
    expect(() => attemptDirective(world, record.id,
      { venue: 'square', members: ['ada', 'cyn'] }, 0, STANDARD_RULES))
      .toThrow(/attempted to queue two directive-due setups/);
  });

  it('aborts an already-expired due record before collection so it cannot win a slot', () => {
    const { world, record } = staged('execution-expired-before-collection');
    world.tick = 121;
    markDirectiveDue(world, record.id, 121);
    expireDirectiveActsBeforeCollection(world, 121, STANDARD_RULES);
    expect(record.execution?.state).toBe('aborted');
    expect(collectDirectiveActIntents(world, 121,
      [{ venue: 'square', members: ['ada', 'bez'] }])).toEqual([]);
  });

  it('learn-person cannot complete while separated and completes on the first real shared venue', () => {
    const { world, record } = staged('execution-person');
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    const held = attemptDirective(world, record.id, { venue: 'square', members: ['ada', 'cyn'] },
      due, STANDARD_RULES);
    expect(held.tellings).toEqual([]);
    expect(record.execution).toMatchObject({ state: 'deferred', dueAt: null });

    const retry = due + 15;
    world.tick = retry;
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'square' }];
    markDirectiveDue(world, record.id, retry);
    attemptDirective(world, record.id, { venue: 'square', members: ['ada', 'bez'] },
      retry, STANDARD_RULES);
    expect(record.execution).toMatchObject({ state: 'completed', changedAt: retry });
    const report = world.network.directiveState!.messages.find((message) =>
      message.payload.kind === 'directive-report');
    expect(report?.payload).toMatchObject({ report: { evidence: [
      { kind: 'observation', text: `presence:bez:square:${retry}` },
    ] } });
  });

  it('venue observation enumerates only the actual local frame and ignores an unseen district', () => {
    const brief: DirectiveBrief = { ...BASE,
      mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } } };
    const { world, record } = staged('execution-venue', brief);
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    const hiddenBefore = stableStringify(world.npcs.cyn);
    world.npcs.cyn!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    attemptDirective(world, record.id, { venue: 'square', members: ['ada', 'bez'] },
      due, STANDARD_RULES);
    const report = world.network.directiveState!.messages.find((message) =>
      message.payload.kind === 'directive-report');
    expect(report?.payload).toMatchObject({ report: { evidence: [
      { kind: 'observation', text: `presence:bez:square:${due}` },
    ] } });
    expect(stableStringify({ ...world.npcs.cyn, schedule: JSON.parse(hiddenBefore).schedule }))
      .toBe(hiddenBefore);
  });

  it('story learn becomes ordinary asking and the first addressed answer completes it once', () => {
    const brief: DirectiveBrief = { ...BASE,
      mission: { kind: 'learn', target: { kind: 'story', family: 'f-story' } } };
    const { world, record } = staged('execution-story', brief);
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    attemptDirective(world, record.id, { venue: 'square', members: ['ada', 'bez'] },
      due, STANDARD_RULES);
    expect(world.inquiries.ada?.[0]).toMatchObject({
      id: record.id, directiveId: record.id, from: 'player', expiresAt: 120,
    });
    recordDirectiveInquiryAsked(world, record.id, due + 15);
    expect(record.execution).toMatchObject({ state: 'awaiting-answer', waiting: {
      kind: 'story-answer', taskId: record.id, expiresAt: 120,
    } });
    const answer: Utterance = { tick: due + 15, venue: 'square', circleMembers: ['ada', 'bez'],
      speaker: 'bez', addressedTo: 'ada', mode: 'answer', claim: {
        id: 'c-answer', family: 'f-story', parent: null, subject: 'cyn', predicate: 'stole',
        object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
      } };
    expect(recordDirectiveInquiryAnswer(world, record.id, answer, STANDARD_RULES)).toBe(true);
    expect(recordDirectiveInquiryAnswer(world, record.id, answer, STANDARD_RULES)).toBe(false);
    expect(record.execution).toMatchObject({ state: 'completed', waiting: null });
    expect(world.inquiries.ada).toBeUndefined();
    expect(world.network.directiveState!.messages.filter((message) =>
      message.payload.kind === 'directive-report')).toHaveLength(1);
  });

  it('story learn honors ordinary answer trust, discretion, and reporter traits without belief reads', () => {
    const { world } = staged('execution-story-discretion', { ...BASE,
      mission: { kind: 'learn', target: { kind: 'story', family: 'f-story' } } });
    world.npcs.bez!.traits = ['exaggerator'];
    world.npcs.bez!.edges = world.npcs.bez!.edges.filter((edge) => edge.to !== 'ada');
    world.beliefs.bez!['f-story'] = {
      claim: { id: 'c-held', family: 'f-story', parent: null, subject: 'cyn', predicate: 'stole',
        object: null, count: 2, severity: 3, place: null, attribution: SOMEONE },
      credence: 0.8, heardFrom: 'cyn', heardAt: 0, firstHeardAt: 0, timesHeard: 1,
      apparentSources: ['cyn'], discretion: true, counterSpun: false,
    };
    const asking: Asking = { tick: 30, venue: 'square', circleMembers: ['ada', 'bez'],
      speaker: 'ada', addressedTo: 'bez', about: { family: 'f-story' }, authority: false };
    expect(chooseAnswer(world, 'bez', asking, 30, STANDARD_RULES)).toBeNull();
    world.npcs.bez!.edges.push({ to: 'ada', kind: 'friend', trust: 0.8 });
    expect(chooseAnswer(world, 'bez', asking, 30, STANDARD_RULES)?.claim)
      .toMatchObject({ count: 4, severity: 4, attribution: 'cyn' });
    const source = readFileSync(new URL('../../src/sim/directives/execution.ts', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/world\.beliefs|matchBelief/);
  });

  it('shape emits one ordinary utterance and records carried-story only after emission', () => {
    const brief: DirectiveBrief = { ...BASE, mission: { kind: 'shape', operation: 'suppress',
      payload: { family: null, parent: null, claim: { subject: 'cyn', predicate: 'stole',
        object: null, count: 4, severity: 5, place: null, attribution: SOMEONE } },
      audience: { kind: 'person', id: 'bez' }, redirectTo: null } };
    const { world, record } = staged('execution-shape', brief);
    world.npcs.ada!.traits = ['literalist'];
    expect(world.network.assets[0]!.facts).toEqual([]);
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    const realized = attemptDirective(world, record.id,
      { venue: 'square', members: ['ada', 'bez'] }, due, STANDARD_RULES);
    expect(realized.tellings).toHaveLength(1);
    expect(realized.tellings[0]).toMatchObject({ speaker: 'ada', addressedTo: 'bez', mode: 'telling' });
    const expectedPayload = projectShapePayloadForMethod(
      brief.mission.kind === 'shape' ? brief.mission.payload : neverShape(),
      'suppress', null,
      { id: 'ada', faction: world.npcs.ada!.faction, rivals: world.npcs.ada!.rivals,
        knownFactions: { ada: world.npcs.ada!.faction }, traits: world.npcs.ada!.traits },
      STANDARD_RULES,
    );
    expect(realized.tellings[0]!.claim).toMatchObject(expectedPayload.claim);
    const events = { tick: due,
      positions: { ada: 'square', bez: 'square' }, utterances: realized.tellings,
      askings: [] };
    expect(observationsFor('bez', events).observations).toEqual([
      expect.objectContaining({ kind: 'presence', actor: 'ada' }),
      expect.objectContaining({ kind: 'utterance', speaker: 'ada', addressedTo: 'bez' }),
    ]);
    world.enemy.observers.push({ id: 'bez', vigilance: 1 });
    world.network.spymaster = 'cyn';
    world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0,
      strikes: 0, facts: [] });
    captureEvidence(world, events, STANDARD_RULES);
    expect(world.network.directiveState!.heldObservations).toEqual(expect.arrayContaining([
      expect.objectContaining({ observer: 'bez', content: { kind: 'raw', observation:
        expect.objectContaining({ kind: 'utterance', speaker: 'ada' }) } }),
    ]));
    expect(world.network.assets[0]!.facts).toEqual([
      { tick: due, kind: 'carried-story', ref: realized.tellings[0]!.claim.family },
    ]);
  });

  it('redirect changes attribution before teller traits and does not force a missing audience', () => {
    const brief: DirectiveBrief = { ...BASE, mission: { kind: 'shape', operation: 'redirect',
      payload: { family: 'f0', parent: null, claim: { subject: 'cyn', predicate: 'stole',
        object: null, count: 1, severity: 3, place: null, attribution: SOMEONE } },
      audience: { kind: 'person', id: 'bez' }, redirectTo: 'cyn' } };
    const { world, record } = staged('execution-redirect', brief);
    world.npcs.ada!.traits = ['literalist'];
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    const realized = attemptDirective(world, record.id,
      { venue: 'square', members: ['ada', 'bez'] }, due, STANDARD_RULES);
    expect(realized.tellings[0]!.claim.attribution).toBe('cyn');

    const missing = staged('execution-redirect-missing', brief);
    missing.world.tick = missing.record.decision!.timing.actAt!;
    markDirectiveDue(missing.world, missing.record.id, missing.world.tick);
    missing.world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    expect(attemptDirective(missing.world, missing.record.id,
      { venue: 'square', members: ['ada'] }, missing.world.tick, STANDARD_RULES).tellings).toEqual([]);
    expect(missing.record.execution?.state).toBe('deferred');
  });

  it('detailed missing-presence stays literal while a guided trusted twin adapts lexicographically', () => {
    const guidance = [{ kind: 'expected-presence' as const, person: 'bez', venue: 'square', at: 15 }];
    const literal = staged('execution-guidance-literal', { ...BASE, specificity: 'detailed', guidance });
    const adaptive = staged('execution-guidance-adaptive', { ...BASE, specificity: 'guided', guidance });
    for (const pair of [literal, adaptive]) {
      pair.world.npcs.ada!.edges.push({ to: 'you', kind: 'friend', trust: 0.75 });
      pair.world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
      pair.world.tick = pair.record.decision!.timing.actAt!;
      markDirectiveDue(pair.world, pair.record.id, pair.world.tick);
    }
    attemptDirective(literal.world, literal.record.id,
      { venue: 'square', members: ['ada', 'cyn'] }, literal.world.tick, STANDARD_RULES);
    attemptDirective(adaptive.world, adaptive.record.id,
      { venue: 'square', members: ['ada', 'cyn'] }, adaptive.world.tick, STANDARD_RULES);
    expect(literal.record.execution?.state).toBe('deferred');
    expect(adaptive.record.execution?.state).toBe('completed');
    const report = adaptive.world.network.directiveState!.messages.find((message) =>
      message.payload.kind === 'directive-report');
    expect(report?.payload).toMatchObject({ report: { evidence: [
      { kind: 'observation', text: `presence:cyn:square:${adaptive.world.tick}` },
    ] } });
  });

  it('a non-day-aligned deadline aborts silence exactly, while an answer on that tick wins', () => {
    const brief: DirectiveBrief = { ...BASE, active: { from: 0, until: 45 }, reportBy: 45,
      mission: { kind: 'learn', target: { kind: 'story', family: 'f-story' } } };
    const silent = staged('execution-deadline-silent', brief);
    const answered = staged('execution-deadline-answered', brief);
    for (const pair of [silent, answered]) {
      pair.world.tick = pair.record.decision!.timing.actAt!;
      markDirectiveDue(pair.world, pair.record.id, pair.world.tick);
      attemptDirective(pair.world, pair.record.id,
        { venue: 'square', members: ['ada', 'bez'] }, pair.world.tick, STANDARD_RULES);
      recordDirectiveInquiryAsked(pair.world, pair.record.id, 30);
      pair.world.tick = 45;
    }
    const answer: Utterance = { tick: 45, venue: 'square', circleMembers: ['ada', 'bez'],
      speaker: 'bez', addressedTo: 'ada', mode: 'answer', claim: {
        id: 'c-deadline', family: 'f-story', parent: null, subject: 'cyn', predicate: 'stole',
        object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
      } };
    expect(recordDirectiveInquiryAnswer(answered.world, answered.record.id, answer, STANDARD_RULES))
      .toBe(true);
    expireDirectiveExecutions(answered.world, 45, STANDARD_RULES);
    expireDirectiveExecutions(silent.world, 45, STANDARD_RULES);
    expect(answered.record.execution?.state).toBe('completed');
    expect(silent.record.execution?.state).toBe('aborted');
    expect(silent.world.inquiries.ada).toBeUndefined();
  });
});

function neverShape(): never {
  throw new Error('expected shape fixture');
}
