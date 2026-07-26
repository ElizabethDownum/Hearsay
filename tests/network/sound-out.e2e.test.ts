import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyDirective } from '../../src/sim/actions';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { runUntil } from '../../src/sim/step';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { recordScrutiny } from '../../src/sim/directives/scrutiny';
import { assetFor } from '../../src/sim/network/roster';
import { compartmentOf } from '../../src/sim/network/compartment';
import type { DirectiveBrief, DirectiveRecord } from '../../src/sim/directives/types';
import type { Mice } from '../../src/sim/network/types';
import type { EntityId, VenueId } from '../../src/sim/rumors/claim';
import type { ScheduleOverride, WorldState } from '../../src/sim/types';
import { makePlayerAsset, pin, recruitWorld, trust } from './helpers/recruit-town';
import {
  callSites, forbiddenReached, mentionedBy, parseModule, pushTargets, srcFilesNaming,
} from '../helpers/callgraph';

const RULES = STANDARD_RULES;
const RECRUITMENT_PATH = 'src/sim/network/recruitment.ts';
const EXECUTION_PATH = 'src/sim/directives/execution.ts';
const RECRUITMENT_SRC = readFileSync(join(process.cwd(), RECRUITMENT_PATH), 'utf8');

interface SoundOutStage {
  seed: string;
  handle?: Mice | null;
  topic?: 'recruitment' | 'cooperation';
  meeting?: { venue: VenueId; from: number; until: number } | null;
  /** cass → dane, the relationship the candidate's own answer reads. */
  targetTrust?: number;
  /** Day-0 [from, to) minute windows in which cass steps into the square. */
  visits?: [number, number][];
  until?: number;
  bystander?: boolean;
}

const SOUND_OUT_VISITS: [number, number][] = [[30, 45], [120, 135], [180, 195], [240, 255]];

/**
 * One deterministic sound-out world: `dane` is the player's asset and stays with the avatar in the
 * square; `cass` lives in the annex and only steps into the square during the authored windows, so
 * every physical leg of the sound-out (approach, spoken answer, invitation, reply) is a separate,
 * test-chosen meeting.
 */
function stageSoundOut(options: SoundOutStage): { world: WorldState; brief: DirectiveBrief } {
  const world = recruitWorld(options.seed);
  pin(world, 'square', 'you', 'dane');
  pin(world, 'annex', 'cass');
  if (options.bystander) pin(world, 'square', 'nell');
  makePlayerAsset(world, 'dane');
  trust(world, 'cass', 'dane', options.targetTrust ?? 0.8);
  for (const [from, to] of options.visits ?? SOUND_OUT_VISITS) {
    const row: ScheduleOverride = {
      fromDay: 0, toDay: 1, from, to, venue: 'square',
      source: 'player', sourceRef: `test:visit:${from}`,
    };
    world.scheduleOverrides['cass'] = [row, ...(world.scheduleOverrides['cass'] ?? [])];
  }
  const brief: DirectiveBrief = {
    mission: {
      kind: 'sound-out', target: 'cass', topic: options.topic ?? 'recruitment',
      handle: options.handle === undefined ? 'money' : options.handle,
      meeting: options.meeting ?? null,
    },
    priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'detailed',
    guidance: [], active: { from: 0, until: options.until ?? at(5, 0) },
    report: 'outcome', reportBy: 0, purpose: null,
  };
  return { world, brief };
}

const issue = (brief: DirectiveBrief): Action[] => [{
  tick: 0, kind: 'directive', recipient: 'dane',
  handoff: { outboundVia: [], reportVia: [] }, brief,
}];

function soundOutRecord(world: WorldState): DirectiveRecord {
  const record = world.network.directiveState!.records.find((row) => row.recipient === 'dane');
  expect(record, 'the sound-out directive record exists').toBeDefined();
  return record!;
}

function speechKinds(world: WorldState, kind: string): { speaker: EntityId; addressedTo: EntityId; heardBy: string[] }[] {
  return world.chronicle
    .filter((entry) => entry.kind === 'network-speech' && entry.spoken.kind === kind)
    .map((entry) => {
      const row = entry as Extract<typeof entry, { kind: 'network-speech' }>;
      return { speaker: row.speaker, addressedTo: row.addressedTo, heardBy: row.heardBy.map((h) => h.id) };
    });
}

function principalKnowledge(world: WorldState): string {
  return stableStringify({
    intelNetwork: world.intel.network ?? [],
    log: world.intel.log,
    informants: world.intel.informants,
    assets: world.network.assets,
    invitations: world.network.invitations ?? [],
    reports: soundOutRecord(world).receivedReports,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('sound-out issuance — the permanent self-target guard replaces the interim stub', () => {
  it('an asset cannot sound itself out, and the refusal mutates nothing', () => {
    const { world, brief } = stageSoundOut({ seed: 'self-target' });
    const selfBrief: DirectiveBrief = {
      ...brief, mission: { ...brief.mission, target: 'dane' } as DirectiveBrief['mission'],
    };
    const before = hashWorld(world);
    expect(() => applyDirective(world, 'dane', { outboundVia: [], reportVia: [] }, selfBrief, 0))
      .toThrow('directive: an asset cannot sound itself out');
    expect(hashWorld(world)).toBe(before);
    expect(world.network.directiveState).toBeUndefined();
  });

  it('a lawful sound-out is now issuable and travels the ordinary directive substrate', () => {
    const { world, brief } = stageSoundOut({ seed: 'issuable' });
    runLogOn(world, RULES, issue(brief), 1);
    const record = soundOutRecord(world);
    expect(record.received).not.toBeNull();
    expect(record.decision!.method).toEqual({ kind: 'approach', target: 'cass' });
    expect(record.execution!.state).toBe('pending');
  });
});

describe('sound-out execution — one observable approach, then the candidate answers for themself', () => {
  it('does nothing before the asset and target share a circle', () => {
    const { world, brief } = stageSoundOut({ seed: 'before-contact' });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 30, RULES);
    const record = soundOutRecord(world);
    expect(record.execution!.state).toBe('deferred');
    expect(world.network.directiveState!.recruitmentApproaches).toHaveLength(0);
    expect(speechKinds(world, 'recruitment-approach')).toHaveLength(0);
  });

  it('at the real co-circle it emits ONLY the approach speech and learns nothing at that moment', () => {
    const { world, brief } = stageSoundOut({ seed: 'approach-only' });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 31, RULES);

    const record = soundOutRecord(world);
    const approach = world.network.directiveState!.recruitmentApproaches[0]!;
    expect(approach.recruiter).toBe('dane');
    expect(approach.target).toBe('cass');
    expect(approach.sourceDirectiveId).toBe(record.id);
    expect(record.execution).toMatchObject({
      state: 'awaiting-answer',
      waiting: { kind: 'recruitment-answer', approachId: approach.id, expiresAt: at(5, 0) },
    });
    expect(speechKinds(world, 'recruitment-approach')).toEqual([
      { speaker: 'dane', addressedTo: 'cass', heardBy: ['cass', 'you'] },
    ]);
    // Nothing was learned: no willingness report, no invitation, no roster movement.
    expect(record.receivedReports).toEqual([]);
    expect(world.network.invitations ?? []).toEqual([]);
    expect(assetFor(world, 'player', 'cass')).toBeNull();
  });

  it('the answer is the candidate\'s own spoken act, one beat later, on the ordinary relay', () => {
    const { world, brief } = stageSoundOut({ seed: 'answer-beat' });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 31, RULES);
    const answer = world.network.directiveState!.messages.find((m) =>
      m.payload.kind === 'recruitment-response')!;
    expect(answer.origin).toBe('cass');
    expect(answer.route).toEqual(['dane']);
    expect(answer.availableAfter).toBe(45);   // strictNextBeat(30): the uniform one-beat composure
    expect(answer.deliveredAt).toBeNull();
  });
});

describe('sound-out answer transport — the twins that separate speech from knowledge', () => {
  it('keeping the pair apart freezes the record and the principal knowledge byte-for-byte', () => {
    const { world, brief } = stageSoundOut({ seed: 'apart', visits: [[30, 45]] });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 31, RULES);
    const frozen = principalKnowledge(world);

    runUntil(world, 120, RULES);
    const record = soundOutRecord(world);
    expect(record.execution!.state).toBe('awaiting-answer');
    expect(record.receivedReports).toEqual([]);
    expect(world.network.invitations ?? []).toEqual([]);
    expect(principalKnowledge(world)).toBe(frozen);
  });

  it('delivering the spoken answer — and only that — produces the willingness report', () => {
    const { world, brief } = stageSoundOut({ seed: 'delivered', bystander: true });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 121, RULES);

    const responses = speechKinds(world, 'recruitment-response');
    expect(responses).toEqual([
      { speaker: 'cass', addressedTo: 'dane', heardBy: ['dane', 'nell', 'you'] },
    ]);
    runUntil(world, 151, RULES); // the report rides the received reply route back to the avatar
    const report = soundOutRecord(world).receivedReports.at(-1);
    expect(report, 'the willingness report physically arrived').toBeDefined();
    expect(report!.report.outcome).toBe('willing');
    expect(assetFor(world, 'player', 'cass')).toBeNull();
  });

  it('a WITNESS to the approach hears the offered handle — and still nothing hidden', () => {
    const { world, brief } = stageSoundOut({ seed: 'witness-handle', bystander: true });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 31, RULES);

    const entry = (world.intel.network ?? []).find((row) => row.spoken.kind === 'recruitment-approach');
    expect(entry, 'the avatar witnessed the approach').toBeDefined();
    expect(entry!.overheard, 'a bystander capture, not the addressee\'s').toBe(true);
    expect(entry!.spoken, 'the offer is part of what was said').toEqual({
      kind: 'recruitment-approach', approachId: 'a0', recruiter: 'dane', target: 'cass',
      mice: 'money', leverageFamily: null, onwardTo: null,
    });
    const serialized = stableStringify(entry!);
    for (const banned of [
      'protectedRole', 'enemyLinked', 'enemyLinkedAtDecision', 'turned', 'status', 'decided', 'initial',
    ]) expect(serialized, banned).not.toContain(banned);
  });

  it('the asset converts what it was TOLD through its OWN waiting record, not the global row', () => {
    const { world, brief } = stageSoundOut({ seed: 'own-record' });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 31, RULES);

    // Doctor the recruiter-principal's approach row: the asset's conversion never dereferences it.
    const approach = world.network.directiveState!.recruitmentApproaches[0]!;
    approach.sourceDirectiveId = 'no-such-directive';
    approach.mice = 'coercion';

    runUntil(world, 151, RULES);
    const report = soundOutRecord(world).receivedReports.at(-1);
    expect(report, 'the willingness report still arrived').toBeDefined();
    expect(report!.report.outcome).toBe('willing');
    expect(assetFor(world, 'player', 'cass'), 'and still enrolls nobody').toBeNull();
  });

  it('a never-delivered answer aborts at the active window with no willingness claim', () => {
    const { world, brief } = stageSoundOut({ seed: 'no-answer', visits: [[30, 45]], until: 180 });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 211, RULES);
    const record = soundOutRecord(world);
    expect(record.execution!.state).toBe('aborted');
    const outcomes = record.receivedReports.map((row) => row.report.outcome ?? '');
    expect(outcomes.length).toBeLessThanOrEqual(1);
    for (const outcome of outcomes) expect(outcome).not.toMatch(/willing|uncertain/);
  });
});

describe('willingness labels — every branch, including the null cooperation handle', () => {
  const cases: { label: string; targetTrust: number }[] = [
    { label: 'willing', targetTrust: 0.8 },
    { label: 'uncertain', targetTrust: 0.6 },
    { label: 'unwilling', targetTrust: 0.1 },
  ];

  it('cooperation with a null handle reaches willing, uncertain and unwilling', () => {
    for (const { label, targetTrust } of cases) {
      const { world, brief } = stageSoundOut({
        seed: `label-${label}`, topic: 'cooperation', handle: null, targetTrust,
      });
      runLogOn(world, RULES, issue(brief), 1);
      runUntil(world, 151, RULES);
      const report = soundOutRecord(world).receivedReports.at(-1);
      expect(report, label).toBeDefined();
      expect(report!.report.outcome, label).toBe(label);
      // NEVER enrollment — not on any branch.
      expect(assetFor(world, 'player', 'cass'), label).toBeNull();
      expect(world.intel.informants.map((i) => i.id), label).toEqual(['dane']);
      expect(compartmentOf(world, 'player', 'cass'), label).toEqual([]);
    }
  });
});

describe('sound-out meetings — an independent invitation, and attendance that is only an opportunity', () => {
  const MEETING = { venue: 'safehouse' as VenueId, from: at(0, 10), until: at(0, 10) + 15 };

  it('an accepted willingness raises a sound-out invitation the candidate answers for themself', () => {
    const { world, brief } = stageSoundOut({ seed: 'invite-accept', meeting: MEETING });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 121, RULES);
    const invitation = world.network.invitations!.at(-1)!;
    expect(invitation).toMatchObject({
      kind: 'sound-out', principal: 'player', inviter: 'dane', counterparty: 'you',
      invitee: 'cass', venue: 'safehouse', status: 'offered',
    });

    runUntil(world, 181, RULES);  // the invitation physically reaches cass
    expect(world.network.invitations!.at(-1)!.status).toBe('accepted');
    expect(world.scheduleOverrides['cass']!.some((row) => row.venue === 'safehouse')).toBe(false);

    runUntil(world, 241, RULES);  // her reply reaches dane — only NOW is she scheduled
    expect(world.scheduleOverrides['cass']!.some((row) => row.venue === 'safehouse')).toBe(true);
    expect(world.scheduleOverrides['you'] ?? []).toEqual([]);
  });

  it('a refusing candidate schedules nothing at all', () => {
    const { world, brief } = stageSoundOut({
      seed: 'invite-refuse', meeting: MEETING, targetTrust: 0.5,
    });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 121, RULES);
    expect(world.network.invitations!.at(-1)!.status).toBe('offered');
    // Scrutiny recorded AFTER she composed her answer changes only the invitation reply.
    recordScrutiny(world, 'cass', 'dane', 'confrontation', 130);
    recordScrutiny(world, 'cass', 'dane', 'authority-pressure', 130);
    runUntil(world, 241, RULES);
    expect(world.network.invitations!.at(-1)!.status).toBe('refused');
    expect(world.scheduleOverrides['cass']!.some((row) => row.venue === 'safehouse')).toBe(false);
  });

  it('actual attendance marks the meeting and creates ONLY a direct-recruit opportunity', () => {
    const { world, brief } = stageSoundOut({ seed: 'attendance', meeting: MEETING });
    runLogOn(world, RULES, issue(brief), 1);
    runUntil(world, 241, RULES);
    world.playerVenue = 'safehouse';                       // the player must be there in person
    runUntil(world, MEETING.until + 1, RULES);

    const invitation = world.network.invitations!.at(-1)!;
    expect(invitation.attendedAt).toBe(MEETING.from);
    expect(invitation.status).toBe('attended');
    // Attendance is an opportunity, never an enrollment or a pause.
    expect(assetFor(world, 'player', 'cass')).toBeNull();
    expect(compartmentOf(world, 'player', 'cass')).toEqual([]);
    expect(world.intel.informants.map((i) => i.id)).toEqual(['dane']);
    expect(world.scheduledSetup ?? []).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The two sound-out enforcement scans, as CALL-GRAPH closures. A token scan over one function body
// is bypassed by a helper hop or a rename; these ask what the whole reachable closure can touch.

/** Every module-local function a sound-out can pass through on the asset's side. */
const SOUND_OUT_ROOTS = ['startSoundOut', 'settleSoundOutAnswer', 'waitingSoundOutRecord'];
/** The engine's enrollment primitives — every way a roster row or its trimmings can be created. */
const ENROLLMENT_NAMES = [
  'enrollRecruitedAsset', 'ensureAssetRecord', 'recordPlayerKnownFact', 'setDispositionEdge',
  'rosterFor',
];
/** …and the arrays whose growth IS membership, which a name scan alone cannot see. */
const ROSTER_ARRAYS = ['assets', 'enemyAssets', 'informants', 'roster'];
/** The ONLY src files allowed to name an enrollment primitive — the cross-module escape fence. */
const ENROLLMENT_FILES = [
  'src/sim/actions.ts',
  'src/sim/network/compartment.ts',
  'src/sim/network/recruitment.ts',
  'src/sim/network/roster.ts',
];
/** …and the only files allowed to grow a roster array directly (world construction + the one site). */
const ROSTER_GROWTH_NEEDLES = ['assets.push', 'enemyAssets.push', 'informants.push', 'roster.push'];
const ROSTER_GROWTH_FILES = ['src/sim/network/recruitment.ts', 'src/world/attach.ts'];

/** Splice a statement in at the top of a named function body. */
function injectInto(source: string, anchor: string, statement: string): string {
  const start = source.indexOf(anchor);
  expect(start, `the injection anchor '${anchor}' exists`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('{', source.indexOf(')', start + anchor.length));
  return `${source.slice(0, open + 1)}\n${statement}${source.slice(open + 1)}`;
}

describe('sound-out enforcement scans', () => {
  // ── ENFORCEMENT SCAN 3: zero enrollment reachable from any sound-out path ─────────────────────
  it('call-graph scan: nothing reachable from a sound-out path can enroll anybody', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    expect(forbiddenReached(graph, SOUND_OUT_ROOTS, ENROLLMENT_NAMES)).toEqual([]);
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(graph, SOUND_OUT_ROOTS).has(name))).toEqual([]);
    const execution = parseModule(EXECUTION_PATH);
    expect(forbiddenReached(execution, ['attemptDirective'], ENROLLMENT_NAMES)).toEqual([]);
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(execution, ['attemptDirective']).has(name)))
      .toEqual([]);
    // Cross-module fence: a new enrolling helper in a new module cannot hide from these scans.
    expect(srcFilesNaming(ENROLLMENT_NAMES.slice(0, 4))).toEqual(ENROLLMENT_FILES);
    expect(srcFilesNaming(ROSTER_GROWTH_NEEDLES)).toEqual(ROSTER_GROWTH_FILES);

    // FIRING PROOF (a): a direct enrollment — roster GROWTH, which no name scan sees.
    const pushed = parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  world.intel.informants.push({ id: record.recipient, assignedVenue: null });',
    ));
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(pushed, SOUND_OUT_ROOTS).has(name)))
      .toContain('informants');

    // FIRING PROOF (b): the reviewer's bypass — `ensureAssetRecord`, which the old scan did not know.
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  ensureAssetRecord(world, record.principal, record.recipient);',
    )), SOUND_OUT_ROOTS, ENROLLMENT_NAMES)).toContain('ensureAssetRecord');

    // FIRING PROOF (c): the reviewer's bypass — the same enrollment one HELPER deep.
    const viaHelper = injectInto(
      RECRUITMENT_SRC.replace('export function settleSoundOutAnswer(',
        'function quietlyEnroll(world: WorldState, id: EntityId): void {\n'
        + '  ensureAssetRecord(world, \'player\', id);\n}\n'
        + 'export function settleSoundOutAnswer('),
      'export function settleSoundOutAnswer(', '  quietlyEnroll(world, record.recipient);',
    );
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, viaHelper), SOUND_OUT_ROOTS,
      ENROLLMENT_NAMES), 'a helper hop still enrolls').toContain('ensureAssetRecord');
  });

  // ── ENFORCEMENT SCAN 4: enrollment stays a guarded direct-avatar moment ───────────────────────
  it('call-graph scan: the direct-recruitment close is the ONE enrollment route, and it is guarded', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    const enrolling = callSites(graph, ['enrollRecruitedAsset']);
    expect(enrolling.map((site) => site.enclosing)).toEqual(['closeDirectRecruitment']);

    const closing = callSites(graph, ['closeDirectRecruitment']);
    expect(closing.map((site) => site.enclosing)).toEqual(['settleRecruitmentAnswer']);
    expect(closing[0]!.guards.some((guard) => guard.includes('sourceDirectiveId')),
      `the enrollment route is guarded (guards: ${closing[0]!.guards.join(' · ')})`).toBe(true);
    // …and the enrollment site itself is fail-closed about the same fact.
    expect(graph.mentions.get('enrollRecruitedAsset')!.has('sourceDirectiveId')).toBe(true);

    // FIRING PROOF (a): the reviewer's bypass — removing the enrollment guard.
    const unguarded = parseModule(RECRUITMENT_PATH,
      RECRUITMENT_SRC.replaceAll('approach.sourceDirectiveId !== null', 'false'));
    expect(unguarded.source, 'the injection applied').not.toBe(RECRUITMENT_SRC);
    expect(callSites(unguarded, ['closeDirectRecruitment'])[0]!.guards
      .some((guard) => guard.includes('sourceDirectiveId')), 'an unguarded route is caught').toBe(false);

    // FIRING PROOF (b): a second enrollment route opened somewhere else in the module.
    const smuggled = parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  closeDirectRecruitment(world, undefined as never, response, tick);',
    ));
    expect(callSites(smuggled, ['closeDirectRecruitment']).map((site) => site.enclosing))
      .toContain('settleSoundOutAnswer');
  });

  // ── ENFORCEMENT SCAN 5: the evaluator's result belongs to the target alone ────────────────────
  it('call-graph scan: only the target\'s own answer composition reads the evaluator', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    expect(mentionedBy(graph, 'evaluateRecruitment'))
      .toEqual(['composeCandidateResponse', 'decideLaterAnswer']);
    expect(forbiddenReached(graph, SOUND_OUT_ROOTS, ['evaluateRecruitment'])).toEqual([]);
    // Cross-module fence: the evaluator is not even nameable outside its own module.
    expect(srcFilesNaming(['evaluateRecruitment'])).toEqual([RECRUITMENT_PATH]);

    // FIRING PROOF (a): the reviewer's bypass — a module-level ALIAS used from a sound-out path.
    const aliased = parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC.replace('const opposite =', 'const peekAnswer = evaluateRecruitment;\nconst opposite ='),
      'export function settleSoundOutAnswer(', '  void peekAnswer(undefined as never);',
    ));
    expect(mentionedBy(aliased, 'evaluateRecruitment'), 'a rename is not an escape hatch')
      .toContain('settleSoundOutAnswer');
    expect(forbiddenReached(aliased, SOUND_OUT_ROOTS, ['evaluateRecruitment']))
      .toEqual(['evaluateRecruitment']);

    // FIRING PROOF (b): the evaluator one HELPER deep from the sound-out path.
    const viaHelper = injectInto(
      RECRUITMENT_SRC.replace('export function settleSoundOutAnswer(',
        'function peekWillingness(input: RecruitmentInput): RecruitmentResponse {\n'
        + '  return evaluateRecruitment(input);\n}\n'
        + 'export function settleSoundOutAnswer('),
      'export function settleSoundOutAnswer(', '  void peekWillingness(undefined as never);',
    );
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, viaHelper), SOUND_OUT_ROOTS,
      ['evaluateRecruitment']), 'a helper hop still reads the evaluator').toEqual(['evaluateRecruitment']);
  });
});

describe('sound-out live ≡ replay', () => {
  it('the whole sound-out path regrows byte-identically from seed + log', () => {
    const build = (): { world: WorldState; brief: DirectiveBrief } =>
      stageSoundOut({ seed: 'sound-out-replay', meeting: MEETING_FOR_REPLAY, bystander: true });
    const a = build();
    const b = build();
    runLogOn(a.world, RULES, issue(a.brief), at(1, 0));
    runLogOn(b.world, RULES, issue(b.brief), at(1, 0));
    expect(hashWorld(a.world)).toBe(hashWorld(b.world));
    expect(soundOutRecord(a.world).receivedReports.length).toBeGreaterThan(0);
  });
});

const MEETING_FOR_REPLAY = { venue: 'safehouse' as VenueId, from: at(0, 10), until: at(0, 10) + 15 };
