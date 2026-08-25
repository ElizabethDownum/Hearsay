import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  type Access, type ModuleGraph, accessedName, assertParsed, chainNames, isAccess, parseModule,
  reachable, staticNamePosition, unwrapNode,
} from '../helpers/callgraph';
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
    { kind: 'recruitment-approach', approachId: 'a-law', recruiter: 'ada', target: 'cyn',
      mice: 'coercion', leverageFamily: 'f-law' },
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
      recruiter: payload.recruiter, target: payload.target,
      mice: payload.mice, leverageFamily: payload.leverageFamily };
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
      district: 'd0', detail: 'new hidden wording', evidence: [{ tick: 0, observer: 'ada', claimId: null, messageId: null }],
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

/**
 * THE RECEIPT FENCE — binding-aware, on the TypeScript AST (whole-branch finding I-3; the P11-1 /
 * Task-13 regex→AST precedent, and the same idiom as the T13 selector prongs in `view.test.ts`).
 *
 * The law it enforces is `plan11-constraints.md`'s SPEECH IS THE ONLY KNOWLEDGE CHANNEL: a receipt
 * handler may read internal payload fields only where the spoken projection exposes them, plus pure
 * association handles that bind the observed speech to the receiving principal's OWN records.
 * Transport/lineage/dedup metadata may associate and dedupe but never creates principal knowledge.
 *
 * The retired mechanism was a regex over `receiveFinal`'s text. It saw `message.payload.fact` and
 * nothing else: the reviewer's in-memory probe recovered the same field through
 * `const { fact } = message.payload` and `const h = message.payload; h.fact` with the fence green.
 * A regex cannot follow a BINDING, and a binding is the whole trick.
 *
 * This scan instead answers the structural question — *which paths under the payload object does the
 * receipt closure dereference?* — by tracking every local name that comes to hold a payload path:
 *
 *   - DIRECT        `message.payload.fact`
 *   - BRACKET       `message.payload['fact']`            (a static key is the same read)
 *   - DESTRUCTURE   `const { fact } = message.payload`   (renames and nesting included)
 *   - ALIAS         `const h = message.payload; h.fact`
 *   - NESTED ALIAS  `const v = h.version; v.brief`       (an alias of an alias, to any depth)
 *
 * Three things make it fail CLOSED rather than merely broad:
 *   1. a source the parser only RECOVERED from is refused outright, never scanned as clean;
 *   2. a key only the running program knows (`message.payload[whichever]`) is reported as `.*`,
 *      which no allowlist entry covers;
 *   3. handing the payload OBJECT to a call — or naming it maximally at all — is reported as an
 *      `escape`, because that is where a read would go to hide from an in-module scan.
 *
 * A BINDING IS A HOLDER *AND* A READ. `const lineage = message.payload.version` really does
 * dereference `version`, so it is reported — but as its own path, judged on its own role, and it
 * does NOT license what sits inside it. `lineage.brief` is a separate, separately-judged read. The
 * one expression that names no field is `message.payload` itself, so binding THAT is pure aliasing;
 * naming it anywhere else hands the object somewhere this scan cannot follow, and is an `escape`.
 *
 * Binding resolution is IN-MODULE, over `receiveFinal` and the module-local functions reachable from
 * it. The cross-module data-flow residual (a payload value carried out through an imported helper
 * under another name) is the accepted P11-13/P11-16 mandate line: this scan asserts what is
 * resolvable and deliberately does not become a whole-program analyzer.
 */
const TRANSPORT = 'src/sim/directives/transport.ts';
const RECEIPT_ROOT = 'receiveFinal';
const PAYLOAD_ROOT = 'message.payload';
const SCAN = 'the receipt payload scan';

type ReadForm = 'direct' | 'bracket' | 'destructure' | 'alias' | 'nested-alias' | 'escape';

interface PayloadRead {
  /** The full dotted path from the payload object, e.g. `message.payload.version.brief`. */
  path: string;
  form: ReadForm;
  enclosing: string;
  line: number;
}

/**
 * The lawful reads, keyed by path and justified by SEMANTIC ROLE — never by line number, so moving
 * the code cannot move the fence. Every entry is a transport discriminant, a lineage field, a dedup
 * cursor, or an association handle naming a record the RECEIVING principal already owns. Anything
 * carrying what was said — `brief`, `report`, `fact`, `detail`, `subject`, `response`, `requested`,
 * `recruiter`, `target`, `replyRoute`, `enemyAction`, `factRefs`, `renderedItems` — is absent, and
 * absence is the default: an unlisted path is a violation, including a field nobody has invented yet.
 *
 * An entry also covers what is reachable THROUGH it (`sourceObservationIds.map`), so each one is a
 * deliberate statement that the handle and its contents are non-knowledge.
 */
const LAWFUL_RECEIPT_READS: Record<string, string> = {
  'message.payload.kind': 'transport discriminant: WHICH envelope arrived, never what it says',
  'message.payload.version.id': 'lineage — message provenance, not content',
  'message.payload.version.parent': 'lineage',
  'message.payload.version.changedBy': 'lineage — who mutated the brief in transit',
  'message.payload.version.changes': 'lineage — the recorded mutation trail',
  'message.payload.version.claimedIssuer':
    'association handle (receivedIssuerAssociation): names the principal whose OWN scrutiny record '
    + 'this receipt associates to. The same words also arrive spoken, and are read from `spoken` '
    + 'wherever they bear knowledge.',
  'message.payload.sourceObservationIds': 'dedup/cursor identifiers of the receiver\'s own held rows',
  'message.payload.asset': 'association handle — names a row on the receiving principal\'s own roster',
  'message.payload.factIndex': 'cursor index into that same roster row, never the fact',
  'message.payload.featureId': 'identifier of the receiver\'s own sketch feature',
};

/**
 * WAYPOINTS are lawful to REACH and license nothing beyond themselves. `message.payload.version` is
 * the lineage envelope: getting to `.id` means naming it, but the brief and the claimed issuer that
 * also live inside it are judged separately, on their own lines above. This is the tier that keeps
 * "I had to touch the container" from becoming "so I may read its contents".
 */
const LAWFUL_WAYPOINTS: Record<string, string> = {
  'message.payload.version': 'lineage envelope — reaching it licenses no field inside it',
};

function isLawful(path: string): boolean {
  if (Object.hasOwn(LAWFUL_WAYPOINTS, path)) return true;
  return Object.keys(LAWFUL_RECEIPT_READS)
    .some((allowed) => path === allowed || path.startsWith(`${allowed}.`));
}

/** Every payload path dereferenced anywhere in the receipt closure. */
function payloadReads(graph: ModuleGraph, roots: readonly string[]): PayloadRead[] {
  const reads: PayloadRead[] = [];
  const lineOf = (node: ts.Node): number =>
    graph.file.getLineAndCharacterOfPosition(node.getStart(graph.file)).line + 1;

  for (const fnName of [...reachable(graph, roots)].sort()) {
    const body = (graph.functions.get(fnName) as { body?: ts.Node } | undefined)?.body;
    if (body === undefined) continue;
    /** local name → the payload path it holds. Straight-line code: a binding precedes its uses. */
    const holders = new Map<string, string>();
    const record = (path: string, form: ReadForm, at: ts.Node): void => {
      reads.push({ path, form, enclosing: fnName, line: lineOf(at) });
    };

    /** The payload path an expression reaches, or `null` if it reaches no payload at all. */
    const pathOf = (node: ts.Node): string | null => {
      const target = unwrapNode(node);
      if (ts.isIdentifier(target)) return holders.get(target.text) ?? null;
      if (isAccess(target)) {
        const base = pathOf(target.expression);
        if (base === null) {
          return chainNames(target).join('.') === PAYLOAD_ROOT ? PAYLOAD_ROOT : null;
        }
        const key = accessedName(target);
        return key === null ? `${base}.*` : `${base}.${key}`;
      }
      if (ts.isCallExpression(target)) return pathOf(target.expression);
      return null;
    };

    const formOf = (node: Access): ReadForm => {
      if (ts.isElementAccessExpression(node)) return 'bracket';
      const receiver = unwrapNode(node.expression);
      if (!ts.isIdentifier(receiver)) return 'direct';
      return holders.get(receiver.text) === PAYLOAD_ROOT ? 'alias' : 'nested-alias';
    };

    /** `const { fact } = <payload path>` — a rename or nesting changes the spelling, not the read. */
    const bind = (pattern: ts.ObjectBindingPattern, base: string): void => {
      for (const element of pattern.elements) {
        if (element.dotDotDotToken !== undefined) {
          record(`${base}.*`, 'destructure', element);
          continue;
        }
        const key = element.propertyName !== undefined
          ? staticNamePosition(element.propertyName)
          : (ts.isIdentifier(element.name) ? element.name.text : null);
        if (key === null) {
          record(`${base}.*`, 'destructure', element);
          continue;
        }
        const path = `${base}.${key}`;
        record(path, 'destructure', element);
        if (ts.isObjectBindingPattern(element.name)) bind(element.name, path);
        else if (ts.isIdentifier(element.name)) holders.set(element.name.text, path);
      }
    };

    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
        const base = pathOf(node.initializer);
        if (base !== null) {
          // Binding `message.payload` names no field — that is the one pure alias. Anything deeper
          // dereferenced a field to get here, and that dereference is a read in its own right.
          const source = unwrapNode(node.initializer);
          if (base !== PAYLOAD_ROOT) {
            record(base, isAccess(source) ? formOf(source) : 'direct', source);
          }
          if (ts.isIdentifier(node.name)) holders.set(node.name.text, base);
          else if (ts.isObjectBindingPattern(node.name)) bind(node.name, base);
          // An ARRAY pattern over a payload path reads positionally — unreadable here, so refused.
          else record(`${base}.*`, 'destructure', node);
          return;
        }
      }
      if (isAccess(node)) {
        const path = pathOf(node);
        const parent: ts.Node | undefined = node.parent;
        const isReceiver = parent !== undefined && isAccess(parent) && parent.expression === node;
        if (path !== null && !isReceiver) {
          // Naming the payload OBJECT maximally hands the whole thing somewhere this scan cannot see.
          record(path, path === PAYLOAD_ROOT ? 'escape' : formOf(node), node);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
  }
  return reads;
}

function scanTransport(sourceOverride?: string): PayloadRead[] {
  const graph = parseModule(TRANSPORT, sourceOverride);
  assertParsed(graph.file, SCAN);
  return payloadReads(graph, [RECEIPT_ROOT]);
}

const unlawful = (reads: readonly PayloadRead[]): PayloadRead[] =>
  reads.filter((read) => !isLawful(read.path));

const REAL_SOURCE = readFileSync(join(process.cwd(), TRANSPORT), 'utf8');

/** Inject a statement at the top of the real `receiveFinal` — the 1:1 firing vehicle. */
function inject(statement: string): PayloadRead[] {
  const anchor = 'const state = ensureDirectiveState(world);';
  const at = REAL_SOURCE.indexOf(anchor, REAL_SOURCE.indexOf(`function ${RECEIPT_ROOT}(`));
  expect(at, 'the injection anchor must exist inside receiveFinal').toBeGreaterThan(0);
  return scanTransport(REAL_SOURCE.slice(0, at + anchor.length)
    + `\n  ${statement}\n` + REAL_SOURCE.slice(at + anchor.length));
}

describe('receipt handlers cannot recover hidden knowledge-bearing payload fields', () => {
  it('the scanned closure is the receipt dispatcher and the module-local helpers it calls', () => {
    const graph = parseModule(TRANSPORT);
    expect([...reachable(graph, [RECEIPT_ROOT])].sort())
      .toEqual(['receiveFinal', 'receivedIssuerAssociation']);
  });

  it('the real receipt closure dereferences nothing but lawful handles', () => {
    expect(unlawful(scanTransport())).toEqual([]);
  });

  it('and it really does dereference the payload — the lawful set is exactly these paths', () => {
    // Non-vacuity: a scan that saw NOTHING would also report no violation.
    expect([...new Set(scanTransport().map((read) => read.path))].sort()).toEqual([
      'message.payload.asset',
      'message.payload.factIndex',
      'message.payload.featureId',
      'message.payload.kind',
      'message.payload.sourceObservationIds',
      'message.payload.version',
      'message.payload.version.changedBy',
      'message.payload.version.changes',
      'message.payload.version.claimedIssuer',
      'message.payload.version.id',
      'message.payload.version.parent',
    ]);
    for (const path of new Set(scanTransport().map((read) => read.path))) {
      expect(LAWFUL_RECEIPT_READS[path] ?? LAWFUL_WAYPOINTS[path],
        `${path} must be justified by role`).toBeTruthy();
    }
  });

  it('the real closure never hands the payload object anywhere the scan cannot follow', () => {
    expect(scanTransport().filter((read) => read.form === 'escape')).toEqual([]);
  });

  it('every form the real closure uses is one the scan can name', () => {
    expect([...new Set(scanTransport().map((read) => read.form))].sort())
      .toEqual(['alias', 'direct', 'nested-alias']);
  });

  it.each([
    ['direct', 'const violation = message.payload.fact;', 'message.payload.fact', 'direct'],
    ['bracket', "const violation = message.payload['fact'];", 'message.payload.fact', 'bracket'],
    ['destructure', 'const { fact: violation } = message.payload as never;',
      'message.payload.fact', 'destructure'],
    ['renamed destructure', 'const { detail: violation } = message.payload as never;',
      'message.payload.detail', 'destructure'],
    ['alias', 'const hidden = message.payload; const violation = hidden.fact;',
      'message.payload.fact', 'alias'],
    ['nested alias',
      'const hidden = message.payload as never; const inner = hidden.version;'
      + ' const violation = inner.brief;',
      'message.payload.version.brief', 'nested-alias'],
    ['nested destructure', 'const { version: { brief: violation } } = message.payload as never;',
      'message.payload.version.brief', 'destructure'],
  ])('the scan fires on an injected %s read', (_form, statement, path, form) => {
    const found = unlawful(inject(statement));
    expect(found.map((read) => read.path)).toContain(path);
    expect(found.find((read) => read.path === path)?.form).toBe(form);
  });

  it('a key only the running program knows fails closed rather than passing', () => {
    const found = unlawful(inject('const violation = message.payload[String(t)];'));
    expect(found.map((read) => read.path)).toContain('message.payload.*');
  });

  it('a rest capture of the whole payload fails closed', () => {
    const found = unlawful(inject('const { ...violation } = message.payload as never;'));
    expect(found.map((read) => read.path)).toContain('message.payload.*');
  });

  it('handing the payload OBJECT to a call is reported as an escape', () => {
    const found = unlawful(inject('void cloneSerializable(message.payload);'));
    expect(found).toContainEqual(expect.objectContaining({
      path: 'message.payload', form: 'escape', enclosing: 'receiveFinal',
    }));
  });

  it('a lawful handle read stays lawful when it is injected in a new spelling', () => {
    // The allowlist is by ROLE, so the same handle reached through an alias is still clean —
    // this is the control that proves the firing cases above fire on the FIELD, not on novelty.
    expect(unlawful(inject('const ok = message.payload; void ok.kind;'))).toEqual([]);
  });

  it('the scan refuses a source the parser only recovered from', () => {
    expect(() => scanTransport(`${REAL_SOURCE}\nfunction broken( {`)).toThrow(/could not parse/);
  });
});
