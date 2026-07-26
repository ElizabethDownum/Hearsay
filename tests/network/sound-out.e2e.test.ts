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
  callSites, callSiteTable, describeUnresolved, forbiddenReached, mentionedBy, parseModule,
  pushSiteTable, pushTargets, srcFilesNaming, unresolvedSites,
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

/**
 * Every module-local function a sound-out can pass through on the asset's side — INCLUDING the shared
 * response dispatcher `settleRecruitmentAnswer`, which a sound-out answer's physical receipt always
 * enters. The dispatcher lawfully hands off to `closeDirectRecruitment` for a direct approach, so that
 * one branch target is CUT from the walk (see `reachable`): what remains is exactly the region that
 * runs no matter which branch is taken, which is where a leak would actually sit.
 */
const SOUND_OUT_ROOTS = [
  'startSoundOut', 'settleSoundOutAnswer', 'waitingSoundOutRecord', 'settleRecruitmentAnswer',
];
const DISPATCH_CUT = ['closeDirectRecruitment'];
/** The engine's enrollment primitives — every way a roster row or its trimmings can be created. */
const ENROLLMENT_PRIMITIVES = [
  'enrollRecruitedAsset', 'ensureAssetRecord', 'recordPlayerKnownFact', 'setDispositionEdge',
];
const ENROLLMENT_NAMES = [...ENROLLMENT_PRIMITIVES, 'rosterFor'];
/** …and the arrays whose growth IS membership, which a name scan alone cannot see. */
const ROSTER_ARRAYS = ['assets', 'enemyAssets', 'informants', 'roster', 'rosterFor'];
/**
 * The EXACT set of places an enrollment primitive may be called, and the exact places a roster array
 * may grow. Pinned rather than merely bounded: a new site ANYWHERE in the module — dispatcher, helper,
 * or a rename of either — changes these tables and fires, whatever guard it hides behind.
 */
const ALLOWED_ENROLLMENT_SITES = [
  'enrollRecruitedAsset→closeDirectRecruitment',
  'ensureAssetRecord→closeDirectRecruitment',
  'ensureAssetRecord→receiveApproachAtHandler',
  'recordPlayerKnownFact→enrollRecruitedAsset',
  'setDispositionEdge→enrollRecruitedAsset',
];
const ALLOWED_ROSTER_GROWTH = ['informants@enrollRecruitedAsset', 'roster@enrollRecruitedAsset'];
/** The evaluator's result belongs to the target's own answer composition, and to nothing else. */
const ALLOWED_EVALUATOR_SITES = [
  'evaluateRecruitment→composeCandidateResponse',
  'evaluateRecruitment→decideLaterAnswer',
];
/** Every name whose reach these scans claim to know — the fail-closed default's watch list. */
const GUARDED_NAMES = [...ENROLLMENT_NAMES, 'evaluateRecruitment'];
/** The modules the fail-closed default governs: recruitment plus the sound-out execution arm. */
const GUARDED_MODULES = [RECRUITMENT_PATH, EXECUTION_PATH];
const DYNAMIC_BANNED =
  'dynamic access is banned in the guarded module — use a direct call so the enforcement scans can see you';
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

/** Splice a statement in immediately after an exact source line. */
function injectAfter(source: string, anchor: string, statement: string): string {
  expect(source.includes(anchor), `the injection anchor exists: ${anchor}`).toBe(true);
  return source.replace(anchor, `${anchor}\n${statement}`);
}

/**
 * The re-reviewer's dispatcher injection: an enrollment primitive in the UNGUARDED prologue of
 * `settleRecruitmentAnswer`, which every sound-out answer's receipt runs through.
 */
const DISPATCH_PROLOGUE =
  '  if (!approach || approach.recruiter !== holder || approach.status === \'closed\') return;';
const leakAtDispatcher = (statement: string): string =>
  injectAfter(RECRUITMENT_SRC, DISPATCH_PROLOGUE, statement);

/** Add a real import to the guarded module — the shape an import-alias leak needs. */
const TYPES_IMPORT = 'import type { Mice, Principal } from \'./types\';';
function withImport(source: string, line: string): string {
  expect(source.includes(TYPES_IMPORT), 'the import anchor exists').toBe(true);
  return source.replace(TYPES_IMPORT, `${line}\n${TYPES_IMPORT}`);
}

describe('sound-out enforcement scans', () => {
  // ── ENFORCEMENT SCAN 3: zero enrollment reachable from any sound-out path ─────────────────────
  it('call-graph scan: nothing reachable from a sound-out path can enroll anybody', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    expect(forbiddenReached(graph, SOUND_OUT_ROOTS, ENROLLMENT_NAMES, DISPATCH_CUT)).toEqual([]);
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(graph, SOUND_OUT_ROOTS, DISPATCH_CUT).has(name)))
      .toEqual([]);
    const execution = parseModule(EXECUTION_PATH);
    expect(forbiddenReached(execution, ['attemptDirective'], ENROLLMENT_NAMES)).toEqual([]);
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(execution, ['attemptDirective']).has(name)))
      .toEqual([]);
    // Cross-module fence: a new enrolling helper in a new module cannot hide from these scans.
    expect(srcFilesNaming(ENROLLMENT_PRIMITIVES)).toEqual(ENROLLMENT_FILES);
    expect(srcFilesNaming(ROSTER_GROWTH_NEEDLES)).toEqual(ROSTER_GROWTH_FILES);

    // FIRING PROOF (a): a direct enrollment — roster GROWTH, which no name scan sees.
    const pushed = parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  world.intel.informants.push({ id: record.recipient, assignedVenue: null });',
    ));
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(pushed, SOUND_OUT_ROOTS, DISPATCH_CUT).has(name)))
      .toContain('informants');

    // FIRING PROOF (b): the reviewer's bypass — `ensureAssetRecord`, which the old scan did not know.
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  ensureAssetRecord(world, record.principal, record.recipient);',
    )), SOUND_OUT_ROOTS, ENROLLMENT_NAMES, DISPATCH_CUT)).toContain('ensureAssetRecord');

    // FIRING PROOF (c): the reviewer's bypass — the same enrollment one HELPER deep.
    const viaHelper = injectInto(
      RECRUITMENT_SRC.replace('export function settleSoundOutAnswer(',
        'function quietlyEnroll(world: WorldState, id: EntityId): void {\n'
        + '  ensureAssetRecord(world, \'player\', id);\n}\n'
        + 'export function settleSoundOutAnswer('),
      'export function settleSoundOutAnswer(', '  quietlyEnroll(world, record.recipient);',
    );
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, viaHelper), SOUND_OUT_ROOTS,
      ENROLLMENT_NAMES, DISPATCH_CUT), 'a helper hop still enrolls').toContain('ensureAssetRecord');

    // FIRING PROOF (d): RE-REVIEW SEAM — the enrollment sits in the shared response DISPATCHER's
    // unguarded prologue, which every sound-out answer's physical receipt runs through.
    const atDispatcher = parseModule(RECRUITMENT_PATH, leakAtDispatcher(
      '  const leaked = approach;\n  ensureAssetRecord(world, leaked.principal, leaked.target);',
    ));
    expect(forbiddenReached(atDispatcher, SOUND_OUT_ROOTS, ENROLLMENT_NAMES, DISPATCH_CUT),
      'the dispatcher is inside the boundary').toContain('ensureAssetRecord');
    // …and cutting the direct branch does not blind the walk to a leak inside the sound-out branch.
    const inSoundOutBranch = parseModule(RECRUITMENT_PATH, injectAfter(
      RECRUITMENT_SRC, '    const record = waitingSoundOutRecord(world, approachId, holder);',
      '    ensureAssetRecord(world, approach.principal, approach.target);',
    ));
    expect(forbiddenReached(inSoundOutBranch, SOUND_OUT_ROOTS, ENROLLMENT_NAMES, DISPATCH_CUT),
      'the cut removes only the lawful direct hand-off').toContain('ensureAssetRecord');

    // FIRING PROOF (e): roster growth through the ACCESSOR rather than a named array.
    const viaAccessor = parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  rosterFor(world, record.principal).push(undefined as never);',
    ));
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(viaAccessor, SOUND_OUT_ROOTS, DISPATCH_CUT).has(name)),
      'growth through rosterFor(...) is still growth').toContain('rosterFor');

    // FIRING PROOF (f): RE-RE-REVIEW SEAM — an IMPORT ALIAS of the primitive, called at the
    // dispatcher. `import { ensureAssetRecord as x }` makes `x` the primitive, not a new name.
    const importAliased = parseModule(RECRUITMENT_PATH, withImport(
      leakAtDispatcher('  stealthEnsure(world, approach.principal, approach.target);'),
      'import { ensureAssetRecord as stealthEnsure } from \'./roster\';',
    ));
    expect(forbiddenReached(importAliased, SOUND_OUT_ROOTS, ENROLLMENT_NAMES, DISPATCH_CUT),
      'an import alias is still the primitive').toContain('ensureAssetRecord');

    // FIRING PROOF (g): RE-RE-REVIEW SEAM — roster growth through BRACKET access, which dodges the
    // literal `assets.push` needle the file fence looks for.
    const bracketPush = parseModule(RECRUITMENT_PATH, injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  world.network[\'assets\'].push(undefined as never);',
    ));
    expect(ROSTER_ARRAYS.filter((name) => pushTargets(bracketPush, SOUND_OUT_ROOTS, DISPATCH_CUT).has(name)),
      'bracket syntax is still growth of the same array').toContain('assets');
    expect(pushSiteTable(bracketPush, ROSTER_ARRAYS)).toContain('assets@settleSoundOutAnswer');
  });

  // ── ENFORCEMENT SCAN 4: enrollment stays a guarded direct-avatar moment ───────────────────────
  it('call-graph scan: EVERY enrollment primitive sits at a pinned, guarded call site', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    // Exact allowed-call-site enforcement: not "no enrollment on this path" but "enrollment exists
    // HERE and nowhere else", for every primitive including `ensureAssetRecord`.
    expect(callSiteTable(graph, ENROLLMENT_PRIMITIVES)).toEqual(ALLOWED_ENROLLMENT_SITES);
    expect(pushSiteTable(graph, ROSTER_ARRAYS)).toEqual(ALLOWED_ROSTER_GROWTH);

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

    // FIRING PROOF (c): RE-REVIEW SEAM — `ensureAssetRecord` in the response dispatcher. No guard,
    // helper, or closure argument can hide it: the pinned table simply gains a row.
    const atDispatcher = parseModule(RECRUITMENT_PATH, leakAtDispatcher(
      '  const leaked = approach;\n  ensureAssetRecord(world, leaked.principal, leaked.target);',
    ));
    expect(callSiteTable(atDispatcher, ENROLLMENT_PRIMITIVES))
      .toContain('ensureAssetRecord→settleRecruitmentAnswer');
    expect(callSiteTable(atDispatcher, ENROLLMENT_PRIMITIVES)).not.toEqual(ALLOWED_ENROLLMENT_SITES);

    // FIRING PROOF (d): the same leak behind a RENAME of the primitive — the table resolves aliases.
    const renamed = parseModule(RECRUITMENT_PATH, leakAtDispatcher(
      '  const ensureRow = ensureAssetRecord;\n  ensureRow(world, approach.principal, approach.target);',
    ));
    expect(callSiteTable(renamed, ENROLLMENT_PRIMITIVES))
      .toContain('ensureAssetRecord→settleRecruitmentAnswer');

    // FIRING PROOF (e): and behind a PROPERTY alias of the primitive.
    const viaProperty = parseModule(RECRUITMENT_PATH, leakAtDispatcher(
      '  const rosterApi = { ensureAssetRecord };\n'
      + '  rosterApi.ensureAssetRecord(world, approach.principal, approach.target);',
    ));
    expect(callSiteTable(viaProperty, ENROLLMENT_PRIMITIVES))
      .toContain('ensureAssetRecord→settleRecruitmentAnswer');

    // FIRING PROOF (f): RE-RE-REVIEW SEAM — an IMPORT ALIAS. The exact table resolves the specifier,
    // so the site is attributed to the primitive it actually reaches.
    const importAliased = parseModule(RECRUITMENT_PATH, withImport(
      leakAtDispatcher('  stealthEnsure(world, approach.principal, approach.target);'),
      'import { ensureAssetRecord as stealthEnsure } from \'./roster\';',
    ));
    expect(callSiteTable(importAliased, ENROLLMENT_PRIMITIVES))
      .toContain('ensureAssetRecord→settleRecruitmentAnswer');

    // FIRING PROOF (g): RE-RE-REVIEW SEAM — a STATIC BRACKET call of the primitive.
    const bracketCall = parseModule(RECRUITMENT_PATH, leakAtDispatcher(
      '  const rosterApi = { ensureAssetRecord };\n'
      + '  rosterApi[\'ensureAssetRecord\'](world, approach.principal, approach.target);',
    ));
    expect(callSiteTable(bracketCall, ENROLLMENT_PRIMITIVES))
      .toContain('ensureAssetRecord→settleRecruitmentAnswer');
  });

  // ── ENFORCEMENT SCAN 5: the evaluator's result belongs to the target alone ────────────────────
  it('call-graph scan: only the target\'s own answer composition reads the evaluator', () => {
    const graph = parseModule(RECRUITMENT_PATH);
    expect(mentionedBy(graph, 'evaluateRecruitment'))
      .toEqual(['composeCandidateResponse', 'decideLaterAnswer']);
    // Direct AST call-site enforcement, independent of the mention closure.
    expect(callSiteTable(graph, ['evaluateRecruitment'])).toEqual(ALLOWED_EVALUATOR_SITES);
    expect(forbiddenReached(graph, SOUND_OUT_ROOTS, ['evaluateRecruitment'], DISPATCH_CUT)).toEqual([]);
    // Cross-module fence: the evaluator is not even nameable outside its own module.
    expect(srcFilesNaming(['evaluateRecruitment'])).toEqual([RECRUITMENT_PATH]);

    /** Read the evaluator from `settleSoundOutAnswer` through the given module-level preamble. */
    const leakThrough = (preamble: string, call: string): ReturnType<typeof parseModule> =>
      parseModule(RECRUITMENT_PATH, injectInto(
        RECRUITMENT_SRC.replace('const opposite =', `${preamble}\nconst opposite =`),
        'export function settleSoundOutAnswer(', `  ${call}`,
      ));

    const aliasShapes: { label: string; preamble: string; call: string }[] = [
      // (a) the original bypass — a bare identifier alias.
      {
        label: 'bare alias',
        preamble: 'const peekAnswer = evaluateRecruitment;',
        call: 'void peekAnswer(undefined as never);',
      },
      // (b) RE-REVIEW SEAM — a PROPERTY-ACCESS alias.
      {
        label: 'property alias',
        preamble: 'const evaluatorApi = { evaluateRecruitment };\n'
          + 'const peekAnswer = evaluatorApi.evaluateRecruitment;',
        call: 'void peekAnswer(undefined as never);',
      },
      // (c) a DESTRUCTURING rename of the same property.
      {
        label: 'destructuring rename',
        preamble: 'const evaluatorApi = { evaluateRecruitment };\n'
          + 'const { evaluateRecruitment: peekAnswer } = evaluatorApi;',
        call: 'void peekAnswer(undefined as never);',
      },
      // (d) called straight off the property, with no local name at all.
      {
        label: 'property call',
        preamble: 'const evaluatorApi = { evaluateRecruitment };',
        call: 'void evaluatorApi.evaluateRecruitment(undefined as never);',
      },
      // (e) RE-RE-REVIEW SEAM — a STATIC ELEMENT ACCESS call. Bracket syntax names the evaluator
      // exactly as dot syntax does, and is resolved the same way.
      {
        label: 'static element-access call',
        preamble: 'const evaluatorApi = { evaluateRecruitment };',
        call: 'void evaluatorApi[\'evaluateRecruitment\'](undefined as never);',
      },
      // (f) RE-RE-REVIEW SEAM — a static element access captured into a local first.
      {
        label: 'static element-access alias',
        preamble: 'const evaluatorApi = { evaluateRecruitment };\n'
          + 'const peekAnswer = evaluatorApi[\'evaluateRecruitment\'];',
        call: 'void peekAnswer(undefined as never);',
      },
      // (g) RE-RE-REVIEW SEAM — a COMPUTED-LITERAL destructuring rename.
      {
        label: 'computed destructuring rename',
        preamble: 'const evaluatorApi = { evaluateRecruitment };\n'
          + 'const { [\'evaluateRecruitment\']: peekAnswer } = evaluatorApi;',
        call: 'void peekAnswer(undefined as never);',
      },
    ];

    for (const { label, preamble, call } of aliasShapes) {
      const leaked = leakThrough(preamble, call);
      expect(mentionedBy(leaked, 'evaluateRecruitment'), `${label}: not an escape hatch`)
        .toContain('settleSoundOutAnswer');
      expect(forbiddenReached(leaked, SOUND_OUT_ROOTS, ['evaluateRecruitment'], DISPATCH_CUT), label)
        .toEqual(['evaluateRecruitment']);
      expect(callSiteTable(leaked, ['evaluateRecruitment']), `${label}: call-site table`)
        .toContain('evaluateRecruitment→settleSoundOutAnswer');
    }

    // FIRING PROOF (e): the evaluator one HELPER deep from the sound-out path.
    const viaHelper = injectInto(
      RECRUITMENT_SRC.replace('export function settleSoundOutAnswer(',
        'function peekWillingness(input: RecruitmentInput): RecruitmentResponse {\n'
        + '  return evaluateRecruitment(input);\n}\n'
        + 'export function settleSoundOutAnswer('),
      'export function settleSoundOutAnswer(', '  void peekWillingness(undefined as never);',
    );
    expect(forbiddenReached(parseModule(RECRUITMENT_PATH, viaHelper), SOUND_OUT_ROOTS,
      ['evaluateRecruitment'], DISPATCH_CUT), 'a helper hop still reads the evaluator')
      .toEqual(['evaluateRecruitment']);

    // FIRING PROOF (h): the evaluator read from the shared response DISPATCHER itself.
    const atDispatcher = parseModule(RECRUITMENT_PATH,
      leakAtDispatcher('  void evaluateRecruitment(undefined as never);'));
    expect(forbiddenReached(atDispatcher, SOUND_OUT_ROOTS, ['evaluateRecruitment'], DISPATCH_CUT),
      'the dispatcher is inside the evaluator boundary too').toEqual(['evaluateRecruitment']);
  });

  // ── ENFORCEMENT SCAN 6: the FAIL-CLOSED default ───────────────────────────────────────────────
  // Scans 1–5 each answer "is this guarded name reached from here?". A name-hiding form the parser
  // cannot read makes all of them answer "no" for the wrong reason — which is how bracket, computed
  // and import-alias syntax kept slipping through. This scan inverts the default: anything the
  // resolver cannot name is itself a violation, so a NEW dynamic shape fails on arrival instead of
  // waiting to be enumerated. Truly dynamic access is thereby structurally banned in these modules.
  it(`call-graph scan: nothing in the guarded modules is unreadable — ${DYNAMIC_BANNED}`, () => {
    for (const path of GUARDED_MODULES) {
      const sites = unresolvedSites(parseModule(path), GUARDED_NAMES);
      expect(sites, `${path}\n${DYNAMIC_BANNED}\n${describeUnresolved(sites)}`).toEqual([]);
    }

    /** Every proof below asserts the KIND that fired, so a coincidental hit cannot stand in. */
    const kindsFor = (source: string): string[] =>
      [...new Set(unresolvedSites(parseModule(RECRUITMENT_PATH, source), GUARDED_NAMES)
        .map((site) => site.kind))].sort();

    // FIRING PROOF (a): RE-RE-REVIEW SEAM — a genuinely DYNAMIC evaluator call. There is no static
    // answer, so it cannot be resolved and must therefore be refused.
    const dynamicCall = injectInto(
      RECRUITMENT_SRC.replace('const opposite =',
        'const evaluatorApi = { evaluateRecruitment };\n'
        + 'const evaluatorName = \'evaluateRecruitment\' as \'evaluateRecruitment\';\n'
        + 'const opposite ='),
      'export function settleSoundOutAnswer(',
      '  void evaluatorApi[evaluatorName](undefined as never);',
    );
    expect(kindsFor(dynamicCall), 'a computed callee is refused').toContain('callee');

    // FIRING PROOF (b): RE-RE-REVIEW SEAM — a TERNARY roster receiver, the shape whose `'<unknown>'`
    // sentinel used to be filtered out of the pinned table.
    const ternaryPush = injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  (response === \'accept\' ? world.network.assets : world.network.enemyAssets)\n'
      + '    .push(undefined as never);',
    );
    expect(kindsFor(ternaryPush), 'an unnameable growth receiver is refused')
      .toContain('growth-receiver');

    // FIRING PROOF (c): capturing a guarded name into MODULE state. Every bracket bypass needs such a
    // holder to read the name out of, so the capture itself is refused — no enumeration required.
    expect(kindsFor(RECRUITMENT_SRC.replace('const opposite =',
      'const evaluatorApi = { evaluateRecruitment };\nconst opposite =')),
    'a module-level holder for a guarded name is refused').toContain('module-capture');

    // FIRING PROOF (d): the fail-closed default catches a form NOBODY enumerated — an indirect call
    // through a ternary of two function values.
    const ternaryCallee = injectInto(
      RECRUITMENT_SRC, 'export function settleSoundOutAnswer(',
      '  void (response === \'accept\' ? isProtectedRole : isProtectedRole)(world, rules, \'x\');',
    );
    expect(kindsFor(ternaryCallee), 'an unenumerated dynamic shape still fails closed')
      .toContain('callee');
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
