import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { stableStringify } from '../../src/sim/hash';
import { ensureDirectiveState } from '../../src/sim/directives/state';
import { queueNetworkMessage, realizeNetworkForward } from '../../src/sim/directives/transport';
import type {
  BriefVersion, DirectiveBrief, NetworkPayload, SpokenNetworkPayload,
} from '../../src/sim/directives/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const BRIEF: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'cyn' } },
  priority: 'routine', authority: 'relationship', discretion: 'open',
  specificity: 'guided', guidance: [], active: { from: 0, until: 90 },
  report: 'outcome', reportBy: 90, purpose: 'mirror every spoken field',
};

const VERSION: BriefVersion = {
  id: 'v-law', parent: null, directiveId: 'd-law', brief: BRIEF,
  claimedIssuer: 'ada', replyRoute: ['ada'], changedBy: null, changes: [],
};

function world() {
  const value = buildWorld(miniTown(), 'spoken-law', STANDARD_RULES);
  enrollPlayer(value, { home: 'square' });
  // This suite pins carried/spoken equality, not the skeptic's voluntary-retelling gate.
  value.npcs.ada!.traits = ['literalist'];
  for (const id of ['ada', 'bez', 'cyn']) {
    value.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    value.network.enemyAssets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  }
  return value;
}

function payloads(): NetworkPayload[] {
  return [
    { kind: 'directive', version: VERSION },
    { kind: 'directive-report', directiveId: 'd-law', report: {
      outcome: 'done', reason: 'observed', evidence: null, source: 'ada', uncertainty: 'low',
    }, factRefs: [{ asset: 'ada', factIndex: 0 }], enemyAction: null },
    { kind: 'directive-response', directiveId: 'd-law', response: 'attempt', report: null },
    { kind: 'handler-brief', sourceDirectiveId: 'd-law', version: VERSION },
    { kind: 'field-report', origin: 'ada', sourceDirectiveId: null,
      sourceObservationIds: [], renderedItems: null },
    { kind: 'compartment-fact', principal: 'player', asset: 'ada', factIndex: 0,
      fact: { tick: 0, kind: 'met-asset', ref: 'bez' } },
    { kind: 'sketch-tip', principal: 'enemy', asset: 'ada', featureId: 'sf-law',
      subject: 'cyn', detail: 'Cyn carried the copied report.' },
    { kind: 'invitation', invitationId: 'i-law', invitationKind: 'rendezvous',
      inviter: 'ada', counterparty: 'cyn', invitee: 'cyn', venue: 'square',
      requested: { from: 15, until: 30 } },
    { kind: 'invitation-response', invitationId: 'i-law', response: 'accept' },
    { kind: 'recruitment-approach', approachId: 'a-law', recruiter: 'ada', target: 'cyn' },
    { kind: 'recruitment-response', approachId: 'a-law', response: 'accept' },
  ];
}

type CarriedSpeech = SpokenNetworkPayload extends infer Payload
  ? Payload extends { onwardTo: unknown } ? Omit<Payload, 'onwardTo'> : never
  : never;

/** Knowledge-bearing internal content, with association-only/transport fields deliberately stripped. */
function carried(payload: NetworkPayload): CarriedSpeech {
  switch (payload.kind) {
    case 'directive': return { kind: 'directive', directiveId: payload.version.directiveId,
      brief: payload.version.brief, claimedIssuer: payload.version.claimedIssuer,
      replyRoute: payload.version.replyRoute };
    case 'directive-report': return { kind: 'directive-report', directiveId: payload.directiveId,
      report: payload.report, enemyAction: payload.enemyAction, factRefs: payload.factRefs };
    case 'directive-response': return { kind: 'directive-response', directiveId: payload.directiveId,
      response: payload.response, report: payload.report };
    case 'handler-brief': return { kind: 'handler-brief', brief: payload.version.brief,
      claimedIssuer: payload.version.claimedIssuer, replyRoute: payload.version.replyRoute };
    case 'field-report': return { kind: 'field-report', items: (payload.renderedItems ?? []).map((item) => ({
      observation: item.observation, factRefs: item.factRefs,
    })) };
    case 'compartment-fact': return { kind: 'compartment-fact', asset: payload.asset, fact: payload.fact };
    case 'sketch-tip': return { kind: 'sketch-tip', asset: payload.asset,
      subject: payload.subject, detail: payload.detail };
    case 'invitation': return { kind: 'invitation', invitationId: payload.invitationId,
      invitationKind: payload.invitationKind, inviter: payload.inviter, counterparty: payload.counterparty,
      invitee: payload.invitee, venue: payload.venue, requested: payload.requested };
    case 'invitation-response': return { kind: 'invitation-response', invitationId: payload.invitationId,
      response: payload.response };
    case 'recruitment-approach': return { kind: 'recruitment-approach', approachId: payload.approachId,
      recruiter: payload.recruiter, target: payload.target };
    case 'recruitment-response': return { kind: 'recruitment-response', approachId: payload.approachId,
      response: payload.response };
  }
}

describe('spoken content is the complete carried knowledge', () => {
  it('mirrors every one of the eleven payload variants after every physical delivery', () => {
    for (const initial of payloads()) {
      const value = world();
      if (initial.kind === 'directive') {
        ensureDirectiveState(value).records.push({
          id: 'd-law', principal: 'player', principalId: 'you', recipient: 'cyn', issuedAt: 0,
          handoff: { outboundVia: ['ada', 'bez'], reportVia: [] }, authored: VERSION,
          received: null, decision: null, execution: null, receivedReports: [],
        });
      }
      const id = queueNetworkMessage(value, 'player', 'ada', ['bez', 'cyn'], initial, 0, null, null);
      const first = realizeNetworkForward(
        value, id, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES,
      )!;
      const message = value.network.directiveState!.messages[0]!;
      expect(stableStringify({ ...carried(message.payload), onwardTo: 'cyn' }), initial.kind)
        .toBe(stableStringify(first.spoken));

      const second = realizeNetworkForward(
        value, id, { venue: 'square', members: ['bez', 'cyn'] }, 15, STANDARD_RULES,
      )!;
      expect(stableStringify({ ...carried(message.payload), onwardTo: null }), initial.kind)
        .toBe(stableStringify(second.spoken));
    }
  });

  it('a sketch tip carries its queued words even when hidden sketch state changes between hops', () => {
    const value = world();
    value.enemy.sketch.push({
      id: 'sf-law', kind: 'carrier-profile', day: 0, family: null, subject: 'cyn',
      district: 'd0', detail: 'new hidden wording', evidence: [{ tick: 0, observer: 'ada', claimId: null }],
    });
    const id = queueNetworkMessage(value, 'player', 'ada', ['bez', 'cyn'], {
      kind: 'sketch-tip', principal: 'enemy', asset: 'ada', featureId: 'sf-law',
      subject: 'bez', detail: 'the words resolved at queue time',
    }, 0, null, null);
    const first = realizeNetworkForward(
      value, id, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES,
    )!;
    value.enemy.sketch[0]!.subject = null;
    value.enemy.sketch[0]!.detail = 'mutated after the first contact';
    const second = realizeNetworkForward(
      value, id, { venue: 'square', members: ['bez', 'cyn'] }, 15, STANDARD_RULES,
    )!;
    expect(second.spoken).toEqual({ ...first.spoken, onwardTo: null });
  });
});

const FORBIDDEN_RECEIPT_READ = /(?:message\.payload|payload|lineage)(?:\.[A-Za-z]+)*\.(brief|claimedIssuer|replyRoute|report|enemyAction|factRefs|fact|subject|detail|response|requested|recruiter|target)\b/g;

function forbiddenReceiptReads(source: string): string[] {
  const body = source.match(/function receiveFinal\([\s\S]*?\r?\n}\r?\n\r?\nfunction attemptHop/)?.[0] ?? '';
  return [...body.matchAll(FORBIDDEN_RECEIPT_READ)].map((match) => match[0]);
}

describe('receipt handlers cannot recover hidden knowledge-bearing payload fields', () => {
  const source = readFileSync(join(process.cwd(), 'src/sim/directives/transport.ts'), 'utf8');

  it('the real receipt dispatcher passes the source scan', () => {
    expect(forbiddenReceiptReads(source)).toEqual([]);
  });

  it('the scan fires on an injected hidden-fact violation', () => {
    const injected = source.replace(
      /(function receiveFinal\([\s\S]*?const state = ensureDirectiveState\(world\);)/,
      '$1\n  const violation = message.payload.fact;',
    );
    expect(forbiddenReceiptReads(injected)).toContain('message.payload.fact');
  });
});
