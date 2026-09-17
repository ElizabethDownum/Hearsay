import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { directiveHistories } from '../../src/sim/debrief/directives';
import { sketchTimeline } from '../../src/sim/debrief/timeline';
import { issueDirectiveRecord, allocateNetworkMessage } from '../../src/sim/directives/state';
import { queueDirectiveReport } from '../../src/sim/directives/reports';
import type { DirectiveDecisionProfile, DirectiveExecutionResult } from '../../src/sim/directives/types';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { hashWorld } from '../../src/sim/hash';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'directive-debrief', RULES);
  enrollPlayer(world, { home: 'square' });
  const record = issueDirectiveRecord(world, {
    principal: 'player', principalId: 'you', recipient: 'ada',
    handoff: { outboundVia: [], reportVia: [] }, tick: 0, cause: null,
    brief: { mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
      priority: 'routine', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: null },
  });
  return { world, record };
}
const result: DirectiveExecutionResult = { outcome: 'observed', reason: 'shared venue',
  evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }], source: 'ada',
  uncertainty: 'low', reportedClaim: null, factRefs: [] };

describe('directive histories distinguish stages and copies', () => {
  it('does not pretend an issued order was received or performed', () => {
    const { world, record } = fixture();
    const model = directiveHistories(world);
    expect(model.directives[0]).toMatchObject({ directiveId: record.id, deliveredCopy: null,
      latestRun: null, localResults: null, returnedAccounts: [] });
    expect(model.messages[0]!.stages).toEqual([]);
    expect(model.directives[0]!.messageIds).toEqual([model.messages[0]!.messageId]);
  });

  it('keeps altered receipt and reported outcome separate from authorship and raw work', () => {
    const { world, record } = fixture();
    record.received = { tick: 15, version: structuredClone(record.authored), handoffFrom: 'bez', messageId: 'm-received' };
    record.received.version.brief.purpose = 'altered';
    record.outcomes = [{ tick: 30, result: structuredClone(result), reportMessageId: 'm-report' }];
    record.receivedReports.push({ receivedAt: 60, via: 'bez', report: {
      outcome: 'claimed something else', reason: null, evidence: null, source: null, uncertainty: null,
    } });
    const model = directiveHistories(world).directives[0]!;
    expect(model.authoredCopy.brief.purpose).toBeNull();
    expect(model.deliveredCopy!.version.brief.purpose).toBe('altered');
    expect(model.localResults![0]!.result.outcome).toBe('observed');
    expect(model.returnedAccounts[0]!.report.outcome).toBe('claimed something else');
    expect(model.messageIds).toContain('m-received');
    expect(model.messageIds).toContain('m-report');
  });

  it('links an actual queued report once even when both metadata paths name it', () => {
    const { world, record } = fixture();
    record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'you', messageId: 'm0' };
    const profile: DirectiveDecisionProfile = {
      interpretation: record.authored.brief.mission, commitment: 'attempt', initiative: 'literal',
      risk: 'measured', method: { kind: 'observe', target: { kind: 'person', id: 'bez' } },
      timing: { actAt: 15, reportAt: 30 }, candor: 'ordinary',
      disclosure: { outcome: true, reason: true, evidence: true, source: true, uncertainty: true },
    };
    const id = queueDirectiveReport(world, record, profile, result, RULES, 15)!;
    expect(directiveHistories(world).directives[0]!.messageIds.filter((value) => value === id)).toEqual([id]);
  });

  it('retains unrelated network operations without falsely attributing them to the directive', () => {
    const { world } = fixture();
    const id = allocateNetworkMessage(world, 'enemy', 'bez', ['ada'],
      { kind: 'sketch-tip', principal: 'enemy', asset: 'bez', featureId: 'sf0', subject: null, detail: 'tip' }, 15, null, null);
    const model = directiveHistories(world);
    expect(model.messages.some((row) => row.messageId === id)).toBe(true);
    expect(model.directives[0]!.messageIds).not.toContain(id);
  });

  it('all nested directive model data is detached and absent histories stay absent', () => {
    const { world, record } = fixture();
    record.outcomes = [{ tick: 15, result: structuredClone(result), reportMessageId: null }];
    const before = hashWorld(world); const model = directiveHistories(world);
    model.directives[0]!.authoredCopy.brief.active.until = 999;
    model.directives[0]!.localResults![0]!.result.evidence[0]!.text = 'changed';
    expect(hashWorld(world)).toBe(before);
  });
});

function feature(id: string, day: number, kind: SketchFeature['kind'] = 'origin-vague', subject: string | null = 'you'): SketchFeature {
  return { id, kind, day, family: 'f0', subject, district: 'd0', detail: id,
    evidence: [{ tick: 1, observer: 'ada', claimId: 'c0', messageId: null }] };
}
describe('the nightly sketch is the actual digest record', () => {
  it('does not invent a digest from empty state', () => {
    const { world } = fixture(); const before = hashWorld(world);
    expect(sketchTimeline(world)).toEqual({ nights: [], unrecorded: [] });
    expect(hashWorld(world)).toBe(before);
  });

  it('keeps late learned features on the digest day despite an old observation tick', () => {
    const { world } = fixture(); const f = feature('sf0', 3);
    world.enemy.decisions.push({ day: 3, features: [f], inquiries: [], interrogations: [], watches: [] });
    world.enemy.sketch.push(f);
    expect(sketchTimeline(world).nights.map((night) => night.day)).toEqual([3]);
    expect(sketchTimeline(world).nights[0]!.known[0]!.evidence[0]!.tick).toBe(1);
  });

  it('many unrelated or other-person features do not become avatar identification', () => {
    const { world } = fixture();
    const features = Array.from({ length: 20 }, (_, i) => feature('sf' + i, 0));
    features.push(feature('sf-other', 0, 'carrier-profile', 'ada'));
    world.enemy.decisions.push({ day: 0, features, inquiries: [], interrogations: [], watches: [] });
    expect(sketchTimeline(world).nights[0]).toMatchObject({ identified: false, identifiedOnDay: null });
  });

  it('identifies only when the actual avatar carrier-profile enters a completed digest', () => {
    const { world } = fixture();
    world.enemy.decisions.push({ day: 1, features: [], inquiries: [], interrogations: [], watches: [] },
      { day: 2, features: [feature('sf-face', 2, 'carrier-profile')], inquiries: [], interrogations: [], watches: [] },
      { day: 3, features: [], inquiries: [], interrogations: [], watches: [] });
    expect(sketchTimeline(world).nights.map((night) => [night.day, night.identified, night.identifiedOnDay])).toEqual([
      [1, false, null], [2, true, 2], [3, true, 2],
    ]);
  });

  it('retains an orphan current feature as unrecorded history rather than guessing a digest', () => {
    const { world } = fixture(); const f = feature('sf-missing', 4); world.enemy.sketch.push(f);
    expect(sketchTimeline(world)).toEqual({ nights: [], unrecorded: [f] });
  });

  it('each night owns its copies independently from earlier nights and the source', () => {
    const { world } = fixture(); const f = feature('sf0', 0);
    world.enemy.decisions.push({ day: 0, features: [f], inquiries: [], interrogations: [], watches: [] },
      { day: 1, features: [], inquiries: [], interrogations: [], watches: [] });
    const before = hashWorld(world); const model = sketchTimeline(world);
    model.nights[1]!.known[0]!.evidence[0]!.observer = 'changed';
    model.nights[0]!.added[0]!.detail = 'changed';
    expect(model.nights[0]!.known[0]).toEqual(f);
    expect(hashWorld(world)).toBe(before);
  });
});
