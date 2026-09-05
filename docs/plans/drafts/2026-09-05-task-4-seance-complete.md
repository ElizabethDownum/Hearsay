# Plan 9 Task 4 — séance (complete author draft)

Authored-by: native Codex, inherited GPT-6 capability. Date: 2026-09-05.
Source inspected: caa5a38, reverified at 0241fc8b82a633856a47c625d2b807753e9fa138.
Status: complete code/tests, ready for independent plan review; predecessor verification required before dispatch (see final readiness block).
Spec: docs/design-spec.md — Magic, priced like sin; Symmetric observability.
Authority: docs/plans/plan-9-current.md; docs/review/current.md R7, including the controller's accepted night-visit amendment.
Constraints: this file and .superpowers/sdd/plan6-constraints.md, plan7-constraints.md, plan8-constraints.md, plan11-constraints.md.
Gate: npm test; npm run lint; npm run typecheck; npm run app:build; npm run soak; npm run mc.
Order: approved Task1 recovery -> approved Task2 -> approved Task3 -> 4A -> 4B -> 4C -> 4D -> independent review.
No Task2/3 code existed at the inspected base. Controller must record the actual committed predecessor hash, verified interfaces, and suite/report floor before dispatch. No future hash is guessed.

## Binding scope and licenses

Generate one separate historical witness, never remove a living NPC or put a dead id in Secret.witnesses. Preserve existing graph, cast, schedules, scenario roles, witness beliefs and generation draws. Generate truthful seven-field secret data and one real outgoing subject relationship after scenario secret retargeting, using only new gen:departed RNG. Copy small JSON data into WorldState; runtime never discovers hidden edges for this action or indexes a dead belief store.

Generated metadata: value = usable; null = failed generated draw, departed-sane validation rerolls; omission = hand-built compatibility. No present undefined keys. Successful séance: one per campaign, 20 coin, current finite 15-aligned tick, offered chapel/cathedral, 00:00 <= minute <04:00, no living participant. Validate everything before debit/latch/intel/chronicle. No new composer UI. Successful session action saves/replays through the existing API.

Séance intel has explicit magic provenance and null speaker/addressee. It clusters without inventing NPC routes/carriers/Codex receive-emit pairs. An NPC named seance stays distinct. Existing living scry observations remain valid deduction inputs.

The original risk premise was false: noticedByObserver rejects presence, ingestEnemyItem has no presence arm, silent ticks skip enemy capture, and ordinary player presence denotes a watch occupation. Controller accepted a narrow avatar night-visit rule, analogous in scope to the existing avatar caught-in-the-act law. A real local observer sees the avatar at a chapel by night independently of magic. A remote observer holds then physically reports it; the spymaster may see directly without invented speech. Existing evidence is the substrate, no redundant ledger. One night-visit feature per(kind,subject), exposure +1, no carrier-profile identification; unchanged pressure/district/watch rules may use it. General NPC anomaly gossip remains deferred.

No-magic compatibility is precise: no-encounter worlds retain old bytes except generated departed metadata; an ordinary avatar chapel-night visit may now create evidence even without a séance. Gating detection on hidden magic state would break the accepted physical cause. Marked night-visit presence reported player-side is scene-presence, never a counterfeit watch.

All units: frontier_implementer; independent frontier_reviewer >= implementer, no children. One code writer/index owner. Preserve unrelated dirty work. No pushes, packages, config exemptions, art/assets, network/process/UI automation, broad world clones or shared AI writes. Every unit ends green and committed-or-absent with actual hash/gates in the worker report. Suite counts may only fall with an approved per-test disposition.

Emergent assertions are hypotheses: failure -> stop/report evidence, never weaken physics/formulas/thresholds/seeds/tests/spec. Untraceable existing-suite failure -> BLOCKED. Reviewer grades plan-mandated defects at full severity. No separate skill/script is warranted; reuse metadata, offered-frame, physical-report and permanent-auditor patterns.

## Predecessor contract (verified author-to-author; verify production before dispatch)

Task3 must provide:

- IntelEntry.provenance?: MagicProvenance {kind:'magic';spell:'scrying'|'seance';operation:string}; string via remains. src/intel/provenance.ts exports sourceOf/sourceKey/sourceLabel/isMagic/singleInformantChannel.
- scene-presence intel kind; routeOf refuses null endpoints; Codex cannot use null-endpoint séance rows; magic is not an independent informant channel.
- enemy/state.ts PhysicalReceipt {tick:Tick;observer:EntityId;messageId:MessageId}; physical residue arm has null speech fields and optional receipt. Physical ref data remains on SketchEvidenceRef; receipt stays only on matched EvidenceEntry.
- field-reports::ingestEnemyItem fourth parameter physicalReceipt:PhysicalReceipt, supplied by actual principal perception of the spoken field report.
- tests/sim/helpers/sketch-audit.ts exports auditSketch(world), extracted with legacy positive tests retained and residue source/receipt tests.
- recordAndIngest captureEvidence guard preserves speech OR residue-present. Task4 adds a separate narrow silent-presence capture call.
- ChronicleEntry includes ScryRecord/ResidueRecord, world.magic stays scry-only. Task4 does not rewrite magic.ts.
- Digest voicings uses positive Extract<EvidenceEntry,{kind:'utterance'|'network'}> narrowing, which already excludes future physical arms. No enemy digest import additions.

Preserve all Task2 optional document marker projections; séance emits no marker. Any predecessor mismatch requires an explicit author/controller amendment, never an improvised parallel mechanism.

## File license and chunks

4A (60–90 min): NEW src/sim/magic-types.ts, src/world/departed.ts, tests/sim/helpers/seance-town.ts, tests/world/departed.test.ts; MODIFY src/world/types.ts, gen.ts, validate.ts, attach.ts; src/sim/types.ts, chronicle.ts (comment only); src/harness/metrics.ts (explicit telling narrowing).
4B (60–90 min): NEW src/sim/seance.ts, src/sim/night-visit.ts, tests/sim/seance.test.ts, tests/app/seance-session.test.ts; MODIFY src/sim/rules.ts, campaign.ts; src/content/economy.ts, terms.ts; app/src/loop/session.ts, input/actions.ts.
4C (60–90 min): NEW src/sim/night-visits.ts, tests/sim/night-visits.test.ts; MODIFY src/sim/night-visit.ts, perception.ts, phases.ts; src/sim/directives/types.ts, field-reports.ts; src/sim/enemy/state.ts, digest.ts; tests/sim/helpers/sketch-audit.ts.
4D (45–90 min): full verification/comparison, independent review; controller owns closure docs. No additional production files are implicitly licensed.

## 4A — historical witness and runtime copy

Model: frontier_implementer. Review: frontier_reviewer. Tests first: helper/test import RED precedes implementation; after types exist, invalid-metadata tests must fail on missing departed-sane enforcement, not just compile.

Create src/sim/magic-types.ts:

~~~ts
import type { Tick } from '../core/time';
import type { ReportedClaim } from './enemy/state';
import type { ClaimId, EntityId, VenueId } from './rumors/claim';
import type { Edge } from './types';

export interface DepartedEdge { from: EntityId; to: EntityId; kind: Edge['kind'] }
export interface DepartedWitness {
  id: string; name: string; secretId: string;
  reported: ReportedClaim; edge: DepartedEdge;
}
export interface RuntimeDeparted extends DepartedWitness { claimId: ClaimId }
export interface SeanceRecord {
  kind: 'seance'; tick: Tick; operation: string; venue: VenueId;
  departedId: string; claimId: ClaimId; edge: DepartedEdge;
}
export interface NightVisitRecord {
  kind: 'night-visit'; tick: Tick; venue: VenueId; observer: EntityId; actor: EntityId;
}
~~~

src/world/types.ts: add import type { DepartedWitness } from '../sim/magic-types'; change GeneratedTown's doc to "Generator output: fixture plus metadata selectively copied into runtime by worldFromTown." Add this member:

~~~ts
  /** Historical data, never a living Secret.witnesses member. Generator sets value/null;
   * null fails departed-sane and rerolls. Hand-built towns may omit the property. */
  departed?: DepartedWitness | null;
~~~

Create src/world/departed.ts:

~~~ts
import { Rng } from '../core/rng';
import { CLAIM_FIELDS, SOMEONE } from '../sim/rumors/claim';
import type { ReportedClaim } from '../sim/enemy/state';
import type { DepartedWitness } from '../sim/magic-types';
import type { TownFixture } from '../sim/types';
import type { GeneratedTown, Secret } from './types';

const order = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const normalized = (value: string): string => value.trim().toLowerCase();

export function reportedSecret(secret: Secret): ReportedClaim {
  return {
    subject: secret.subject, predicate: secret.predicate, object: secret.object,
    count: null, severity: secret.severity, place: secret.place, attribution: SOMEONE,
  };
}
function reserved(fixture: TownFixture): Set<string> {
  return new Set([
    'you', 'safehouse',
    ...fixture.npcs.flatMap((npc) => [normalized(npc.id), normalized(npc.name)]),
    ...fixture.venues.map((venue) => normalized(venue.id)),
  ]);
}
export function generateDeparted(
  seed: string, fixture: TownFixture, secrets: readonly Secret[], names: readonly string[],
): DepartedWitness | null {
  const rng = new Rng(seed, 'gen:departed');
  const npcs = new Map(fixture.npcs.map((npc) => [npc.id, npc]));
  const candidates = [...secrets].sort((a, b) => order(a.id, b.id)).flatMap((secret) => {
    const subject = npcs.get(secret.subject);
    if (!subject) return [];
    const edges = subject.edges.filter((edge) => edge.to !== subject.id && npcs.has(edge.to))
      .map((edge) => ({ from: subject.id, to: edge.to, kind: edge.kind }))
      .sort((a, b) => order(a.to, b.to) || order(a.kind, b.kind));
    return edges.length === 0 ? [] : [{ secret, edges }];
  });
  if (candidates.length === 0) return null;
  const chosen = candidates[rng.int(0, candidates.length)]!;
  const edge = chosen.edges[rng.int(0, chosen.edges.length)]!;
  const blocked = reserved(fixture);
  const namePool = [...new Set(names.map((name) => name.trim()))]
    .filter((name) => name.length > 0 && !blocked.has(normalized(name))).sort(order);
  let name: string;
  if (namePool.length > 0) {
    name = namePool[rng.int(0, namePool.length)]!;
  } else {
    name = 'The unnamed witness';
    let ordinal = 2;
    while (blocked.has(normalized(name))) name = 'The unnamed witness ' + ordinal++;
  }
  let ordinal = 0;
  let id = 'departed:' + ordinal;
  while (blocked.has(normalized(id))) id = 'departed:' + ++ordinal;
  return { id, name, secretId: chosen.secret.id, reported: reportedSecret(chosen.secret), edge: { ...edge } };
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Small report-style validator; no undefined serialization or whole-world validation. */
export function departedProblems(town: GeneratedTown): string[] {
  if (!Object.hasOwn(town, 'departed')) return [];
  if (town.departed === undefined) return ['present departed metadata must not be undefined'];
  if (town.departed === null) return ['no historical witness with a real secret and subject edge'];
  const departed = town.departed;
  if (!record(departed) || typeof departed.id !== 'string' || departed.id.trim() === ''
    || typeof departed.name !== 'string' || departed.name.trim() === ''
    || typeof departed.secretId !== 'string' || !record(departed.reported)
    || !record(departed.edge)) return ['malformed historical witness'];
  const problems: string[] = [];
  const blocked = reserved(town.fixture);
  if (blocked.has(normalized(departed.id))) problems.push('departed id collides with a living or venue identity');
  if (blocked.has(normalized(departed.name))) problems.push('departed name is already in use');
  const matches = town.secrets.filter((secret) => secret.id === departed.secretId);
  if (matches.length !== 1) return [...problems, 'departed secret does not resolve uniquely'];
  const secret = matches[0]!;
  const expected = reportedSecret(secret);
  if (Object.keys(departed.reported).sort().join('|') !== [...CLAIM_FIELDS].sort().join('|')
    || CLAIM_FIELDS.some((field) => departed.reported[field] !== expected[field])) {
    problems.push('departed testimony differs from the real secret');
  }
  const subject = town.fixture.npcs.find((npc) => npc.id === secret.subject);
  if (!subject || departed.edge.from !== secret.subject || departed.edge.to === secret.subject
    || !town.fixture.npcs.some((npc) => npc.id === departed.edge.to)
    || !subject.edges.some((edge) => edge.to === departed.edge.to && edge.kind === departed.edge.kind)) {
    problems.push('departed clue is not a real outgoing subject relationship');
  }
  return problems;
}
~~~

src/world/gen.ts: import { generateDeparted } from './departed'. Immediately after existing districts construction and before final return add:

~~~ts
  // Independent historical record after all existing streams and scenario retargeting.
  const departed = generateDeparted(seed, { venues, npcs: cast.map((m) => m.npc) }, secrets, content.names);
~~~

Append departed to the final return. No other old stream/section/field changes. src/world/validate.ts: import departedProblems; immediately before the graph-invariant early-return guard insert:

~~~ts
  for (const detail of departedProblems(town)) fail('departed-sane', detail);
~~~

src/sim/types.ts: import type { RuntimeDeparted, SeanceRecord, NightVisitRecord } from './magic-types'; append both record variants to ChronicleEntry preserving Task3's variants. Add to WorldState with no buildWorld initialization:

~~~ts
  /** Copied historical data, present only when a town supplied a valid witness. */
  departed?: RuntimeDeparted;
  /** Absent until a successful ritual; campaign-wide. */
  seanceUsed?: { operation: string; tick: Tick };
~~~

src/world/attach.ts: import departedProblems. Before buildWorld at worldFromTown entry add:

~~~ts
  const problems = departedProblems(town);
  if (problems.length > 0) throw new Error('worldFromTown: departed-sane: ' + problems.join('; '));
~~~

After world.claims[claim.id] = claim in the existing secret loop, before the living witness loop:

~~~ts
    const departed = town.departed;
    if (departed && departed.secretId === secret.id) {
      world.departed = {
        id: departed.id, name: departed.name, secretId: departed.secretId,
        claimId: claim.id, reported: { ...departed.reported }, edge: { ...departed.edge },
      };
    }
~~~

No extra claim/genesis event, no dead witness/store, no aliases of either nested record.

Compile-driven family-thread consumer: threadOf includes every claimId-bearing record, so it will now include a séance record too. Retain that truthful family membership. In src/sim/chronicle.ts update only threadOf's comment to name tellings, injects and séances and state that membership does not imply a human heardBy list. In src/harness/metrics.ts campaignMetrics, replace the bare `else for (const h of entry.heardBy) seen.add(h.id);` line with:

~~~ts
    else if (entry.kind === 'telling') for (const h of entry.heardBy) seen.add(h.id);
~~~

Metrics still count only living belief delivery by inject/telling; no synthetic hearer, new belief, or reach is inferred from a séance. This narrowing belongs in 4A so its new chronicle union compiles before the action lands. The 4B success test below proves the actual ritual leaves every campaign metric unchanged and remains visible in the family thread.

Create tests/sim/helpers/seance-town.ts (also used by 4B/4C):

~~~ts
import { STANDARD_GEN_CONFIG } from '../../../src/content/gen/standard';
import { STANDARD_RULES } from '../../../src/content/rules';
import { enrollPlayer } from '../../../src/sim/world';
import type { Npc, WorldState } from '../../../src/sim/types';
import { worldFromTown } from '../../../src/world/attach';
import { generateDeparted } from '../../../src/world/departed';
import type { GeneratedTown, GenConfig } from '../../../src/world/types';

export const SEANCE_CONFIG: GenConfig = {
  ...STANDARD_GEN_CONFIG, npcCount: 4, districtCount: 1, keystoneCount: 0,
  bridgesPerAdjacentPair: 0, guardsPerDistrict: 1, secretCount: 1,
};
export function seanceTown(withDeparted = true): GeneratedTown {
  const ids = ['ada', 'bez', 'guard', 'boss'];
  const npcs: Npc[] = ids.map((id, index) => ({
    id, name: id, home: 'square', occupation: id === 'guard' ? 'guard' : 'grocer',
    faction: 'none', traits: ['literalist', 'skeptic'], rivals: [],
    schedule: [{ days: 'all', from: 0, to: 1440, venue: 'square' }],
    edges: [{ to: ids[(index + 1) % ids.length]!, kind: 'friend', trust: 0.8 }],
  }));
  const town: GeneratedTown = {
    fixture: {
      venues: [
        { id: 'square', district: 'd0', access: 'public' },
        { id: 'chapel-d0', district: 'd0', access: 'public' },
        { id: 'cathedral', district: 'd0', access: 'public' },
        { id: 'hq', district: 'd0', access: 'invitational' },
        { id: 'guard-home', district: 'd0', access: 'private' },
      ], npcs,
    },
    districts: [{ id: 'd0', venueIds: ['square', 'chapel-d0', 'cathedral', 'hq', 'guard-home'], npcIds: ids }],
    keystones: [], guards: [{ id: 'guard', vigilance: 1 }],
    secrets: [{ id: 's0', subject: 'ada', predicate: 'stole', object: null,
      place: 'square', severity: 4, witnesses: ['bez'] }],
    dossier: null,
  };
  if (withDeparted) town.departed = generateDeparted('seance-stage', town.fixture, town.secrets, ['Mira']);
  return town;
}
export function seanceWorld(): WorldState {
  const world = worldFromTown(seanceTown(), 'seance-stage', STANDARD_RULES);
  enrollPlayer(world, { home: 'chapel-d0' });
  return world;
}
export function nightVisitWorld(): WorldState {
  const world = seanceWorld();
  world.network.spymaster = 'boss';
  world.npcs.guard!.schedule = [
    { days: 'all', from: 0, to: 15, venue: 'chapel-d0' },
    { days: 'all', from: 15, to: 45, venue: 'guard-home' },
    { days: 'all', from: 45, to: 60, venue: 'hq' },
    { days: 'all', from: 60, to: 1440, venue: 'square' },
  ];
  world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }];
  return world;
}
~~~

Create tests/world/departed.test.ts:

~~~ts
import { describe, expect, it } from 'vitest';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { generateDeparted, departedProblems, reportedSecret } from '../../src/world/departed';
import { generateTown } from '../../src/world/gen';
import { generateValidTown } from '../../src/world/serve';
import { validateTown } from '../../src/world/validate';
import { worldFromTown } from '../../src/world/attach';
import { SEANCE_CONFIG, seanceTown } from '../sim/helpers/seance-town';

describe('the departed is separate historical data', () => {
  it('selects truth and a real subject edge without removing or mutating living data', () => {
    const town = seanceTown(false);
    const before = stableStringify(town);
    const departed = generateDeparted('fixed', town.fixture, town.secrets, ['Mira']);
    expect(stableStringify(town)).toBe(before);
    expect(departed).toMatchObject({
      name: 'Mira', secretId: 's0', reported: reportedSecret(town.secrets[0]!),
      edge: { from: 'ada', to: 'bez', kind: 'friend' },
    });
    expect(town.fixture.npcs).toHaveLength(4);
    expect(town.secrets[0]!.witnesses).toEqual(['bez']);
    town.departed = departed;
    expect(validateTown(town, SEANCE_CONFIG).ok).toBe(true);
    const world = worldFromTown(town, 'fixed', STANDARD_RULES);
    expect(Object.keys(world.beliefs).sort()).toEqual(['ada', 'bez', 'boss', 'guard']);
    expect(world.beliefs.bez!.s0).toMatchObject({ discretion: true, credence: 0.95 });
    expect(world.beliefs[departed!.id]).toBeUndefined();
    expect(world.claimCounter).toBe(1);
    expect(world.chronicle).toHaveLength(1);
  });
  it('is deterministic under reordered input and picks unused content names', () => {
    const town = seanceTown(false);
    const names = ['ada', ' ADA ', 'square', 'Mira', 'Lena', ''];
    const first = generateDeparted('fixed', town.fixture, town.secrets, names);
    expect(first).toEqual(generateDeparted('fixed',
      { venues: [...town.fixture.venues].reverse(), npcs: [...town.fixture.npcs].reverse() },
      [...town.secrets].reverse(), [...names].reverse()));
    expect(['Lena', 'Mira']).toContain(first!.name);
  });
  it('falls back stably when every content name is used and avoids both namespaces', () => {
    const town = seanceTown(false);
    town.fixture.venues.push(
      { id: 'departed:0', district: 'd0', access: 'public' },
      { id: 'The unnamed witness', district: 'd0', access: 'public' });
    const before = stableStringify(town);
    const departed = generateDeparted('fixed', town.fixture, town.secrets, ['ada', 'square']);
    expect(departed).toMatchObject({ id: 'departed:1', name: 'The unnamed witness 2' });
    expect(stableStringify(town)).toBe(before);
    expect(departedProblems({ ...town, departed })).toEqual([]);
  });
  it('returns null rather than inventing a secret-edge pair; null fails attachment and validation', () => {
    const town = seanceTown(false);
    town.fixture.npcs.find((npc) => npc.id === 'ada')!.edges = [];
    town.departed = generateDeparted('fixed', town.fixture, town.secrets, ['Mira']);
    expect(town.departed).toBeNull();
    expect(validateTown(town, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('departed-sane');
    expect(() => worldFromTown(town, 'fixed')).toThrow(/departed-sane/);
  });
  it.each(['id', 'name', 'secret', 'testimony', 'edge'] as const)(
    'rejects %s corruption while the valid twin passes', (field) => {
      const town = seanceTown();
      expect(validateTown(town, SEANCE_CONFIG).ok).toBe(true);
      const bad = cloneSerializable(town);
      const departed = bad.departed!;
      if (field === 'id') departed.id = 'chapel-d0';
      if (field === 'name') departed.name = 'Ada';
      if (field === 'secret') departed.secretId = 'missing';
      if (field === 'testimony') departed.reported.severity = 1;
      if (field === 'edge') departed.edge.to = 'boss';
      expect(validateTown(bad, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('departed-sane');
      expect(() => worldFromTown(bad, 'bad')).toThrow(/departed-sane/);
    });
  it('keeps living-only witness validation firing and omitted hand-built metadata absent', () => {
    const town = seanceTown(false);
    expect(validateTown(town, SEANCE_CONFIG).ok).toBe(true);
    const world = worldFromTown(town, 'omitted');
    expect(world).not.toHaveProperty('departed');
    expect(world).not.toHaveProperty('seanceUsed');
    town.secrets[0]!.witnesses.push('departed:0');
    expect(validateTown(town, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('secrets-valid');
  });
  it('rejects present undefined metadata instead of admitting a non-JSON absence', () => {
    const town = seanceTown(false);
    town.departed = undefined;
    expect(departedProblems(town)).toEqual(['present departed metadata must not be undefined']);
    expect(validateTown(town, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('departed-sane');
    expect(() => worldFromTown(town, 'undefined')).toThrow(/departed-sane/);
  });
  it('binds the existing minted claim and owns nested copies across sessions and JSON', () => {
    const town = seanceTown();
    const left = worldFromTown(town, 'one');
    const right = worldFromTown(town, 'two');
    const departed = left.departed!;
    expect(left.claims[departed.claimId]).toMatchObject({ family: departed.secretId, parent: null, ...departed.reported });
    expect(JSON.parse(JSON.stringify(left)).departed).toEqual(departed);
    expect(departed.reported).not.toBe(town.departed!.reported);
    expect(departed.edge).not.toBe(town.departed!.edge);
    town.departed!.reported.severity = 1;
    town.departed!.edge.to = 'boss';
    expect(departed.reported.severity).toBe(4);
    expect(departed.edge.to).toBe('bez');
    departed.reported.severity = 2;
    departed.edge.to = 'guard';
    expect(right.departed!.reported.severity).toBe(4);
    expect(right.departed!.edge.to).toBe('bez');
  });
  it('generated towns always carry the key and valid served witnesses resolve', () => {
    for (const seed of ['departed-a', 'departed-b', 'departed-c', 'departed-d']) {
      expect(Object.hasOwn(generateTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT), 'departed')).toBe(true);
      const a = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
      const b = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
      expect(a).toEqual(b);
      expect(a.town.departed).not.toBeNull();
      expect(departedProblems(a.town)).toEqual([]);
      expect(a.town.fixture.npcs).toHaveLength(STANDARD_GEN_CONFIG.npcCount);
      const living = new Set(a.town.fixture.npcs.map((npc) => npc.id));
      expect(a.town.secrets.every((secret) => secret.witnesses.every((id) => living.has(id)))).toBe(true);
      expect(worldFromTown(a.town, seed, STANDARD_RULES).departed!.secretId).toBe(a.town.departed!.secretId);
    }
  });
  it('exhausted serve reports departed failure rather than creating a zero-secret witness', () => {
    expect(() => generateValidTown('no-secrets',
      { ...STANDARD_GEN_CONFIG, secretCount: 0, maxAttempts: 2 },
      STANDARD_GEN_CONTENT, STANDARD_RULES)).toThrow(/exhausted 2 attempts[\s\S]*departed-sane/);
  });
});
~~~

4A checksums: four living fixture NPCs; one living witness; one secret; zero new claim allocations beyond existing attachment. Reserved-name loops advance over finite sets. No existing generation stream call changes. Commit subject: feat: retain an isolated historical witness without changing the living town.

## 4B — priced local ritual and the real session

Model: frontier_implementer. Review: frontier_reviewer. Add tests first; capture import RED, then the first behavioral RED after type scaffolding. License also includes tests/app/jargon.test.ts solely for the named later-term subtraction described below.

Create src/sim/night-visit.ts (4C extends it):

~~~ts
import { minuteOfDay, type Tick } from '../core/time';

export const isSacredVenue = (venue: string): boolean =>
  venue === 'cathedral' || venue === 'chapel' || /^chapel-.+/.test(venue);
export const isNightVisitTime = (tick: Tick): boolean =>
  Number.isFinite(tick) && Number.isInteger(tick) && tick >= 0 && minuteOfDay(tick) < 240;
~~~

Create src/sim/seance.ts:

~~~ts
import type { Tick } from '../core/time';
import { offeredVenueFor } from './actions';
import type { Circle } from './agents';
import { blankIntel } from './fieldwork';
import { canAfford, debitCoin } from './network/roster';
import { isNightVisitTime, isSacredVenue } from './night-visit';
import { CLAIM_FIELDS } from './rumors/claim';
import { CONVERSATION_BEAT } from './rumors/propagation';
import type { Rules } from './rules';
import type { WorldState } from './types';

export interface SeanceAction { kind: 'seance'; tick: Tick }

export function applySeance(
  world: WorldState, tick: Tick, rules: Rules, offered?: readonly Circle[],
): void {
  if (!Number.isFinite(tick) || !Number.isInteger(tick) || tick < 0
    || tick !== world.tick || tick % CONVERSATION_BEAT !== 0) {
    throw new Error('seance: requires the current finite conversation beat');
  }
  const player = world.playerId;
  if (player === null || !world.npcs[player]) throw new Error('seance: no player is enrolled');
  if (offered !== undefined && !offered.some((circle) => circle.members.includes(player))) {
    throw new Error('seance: avatar absent from offered circle');
  }
  const venue = offeredVenueFor(world, offered);
  if (venue === null || !world.venues[venue] || !isSacredVenue(venue)) {
    throw new Error('seance: requires a chapel or cathedral');
  }
  if (!isNightVisitTime(tick)) throw new Error('seance: requires a time before 04:00');
  const departed = world.departed;
  if (!departed) throw new Error('seance: no departed witness is known');
  if (world.seanceUsed !== undefined) throw new Error('seance: the departed has already spoken');
  const claim = world.claims[departed.claimId];
  if (!claim || claim.family !== departed.secretId || claim.parent !== null
    || CLAIM_FIELDS.some((field) => claim[field] !== departed.reported[field])) {
    throw new Error('seance: historical testimony has no matching retained claim');
  }
  const price = rules.economy.seance;
  if (!Number.isFinite(price) || !Number.isInteger(price) || price <= 0) {
    throw new Error('seance: invalid economy price');
  }
  if (!canAfford(world, price)) throw new Error('seance: insufficient coin');

  const operation = 'seance:' + departed.id;
  debitCoin(world, price);
  world.seanceUsed = { operation, tick };
  const common = {
    tick, venue, via: 'seance', overheard: false,
    provenance: { kind: 'magic' as const, spell: 'seance' as const, operation },
  };
  world.intel.log.push({
    ...blankIntel(), ...common, kind: 'utterance',
    claimId: departed.claimId, family: departed.secretId, reported: { ...departed.reported },
  }, {
    ...blankIntel(), ...common, kind: 'edge-read', edgeFrom: departed.edge.from,
    edgeTo: departed.edge.to, edgeKind: departed.edge.kind,
  });
  world.chronicle.push({
    kind: 'seance', tick, operation, venue, departedId: departed.id,
    claimId: departed.claimId, edge: { ...departed.edge },
  });
}
~~~

Exact integration splices:

- src/sim/rules.ts EconomyDef: add `seance: number;` adjacent to forgery. src/content/economy.ts STANDARD_ECONOMY: add `seance: 20,`. Retain all Task3 scry prices.
- src/sim/campaign.ts: import `{ applySeance, type SeanceAction }` from './seance'; append SeanceAction to Action. Before default add:

~~~ts
    case 'seance':
      if (!rules) throw new Error('applyAction: seance requires rules (economy prices)');
      applySeance(world, action.tick, rules, frame?.circles);
      break;
~~~

- app/src/loop/session.ts: append `'seance'` to PlannedLocalActionKind and LOCAL_KINDS. Add `case 'seance': return [];` to localParticipants before default. No SPEECH_KINDS entry: the single chosen offer already excludes another same-offer action; séance creates no human speech. Keep the existing successful-action-only log append.
- app/src/input/actions.ts VERB_TERM: add `seance: 'verb-seance',`.
- src/content/terms.ts TERMS: add these three entries. Task3 already registers the distinct magic source term; do not duplicate it. Add these exact three ids to tests/app/jargon.test.ts LATER_PLAN_TERM_IDS alongside its predecessor entries. Preserve the historical eight-term count/assertions.

~~~ts
  'verb-seance': { id: 'verb-seance', label: 'Hold a séance',
    short: '20 coin, once per campaign. A chapel or cathedral before 04:00. The departed gives testimony and one relationship.', entry: null },
  'the-departed': { id: 'the-departed', label: 'The departed',
    short: 'A historical witness whose account survives: a true secret and one real relationship.', entry: null },
  'night-visit': { id: 'night-visit', label: 'Night visit',
    short: 'A chapel or cathedral visit before 04:00. A guard must report it; the spymaster can witness it directly.', entry: null },
~~~

Create tests/sim/seance.test.ts:

~~~ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { campaignMetrics } from '../../src/harness/metrics';
import { clustersOf, routeOf } from '../../src/intel/board';
import { corroborations } from '../../src/intel/codex';
import { informantLedger } from '../../src/intel/ledger';
import { isMagic, sourceKey } from '../../src/intel/provenance';
import { webView } from '../../src/intel/web';
import { applyGoTo } from '../../src/sim/actions';
import { applyAction } from '../../src/sim/campaign';
import { threadOf } from '../../src/sim/chronicle';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { applySeance } from '../../src/sim/seance';
import { runUntil } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { seanceWorld } from './helpers/seance-town';

const cast = (world: WorldState): void => applyAction(world, { kind: 'seance', tick: world.tick }, R);
const atomicRefusal = (world: WorldState, action: () => void, match: RegExp): void => {
  const before = stableStringify(world);
  expect(action).toThrow(match);
  expect(stableStringify(world)).toBe(before);
};

describe('séance is retained testimony, priced once', () => {
  it('debits 20, emits two explicit magic rows and one record without allocating a claim or belief', () => {
    const world = seanceWorld();
    const before = cloneSerializable(world);
    const metricsBefore = campaignMetrics(world, world.departed!.secretId);
    cast(world);
    const departed = world.departed!;
    expect(world.coin).toBe(before.coin - 20);
    expect(world.seanceUsed).toEqual({ operation: 'seance:' + departed.id, tick: 0 });
    expect(world.claims).toEqual(before.claims);
    expect(world.beliefs).toEqual(before.beliefs);
    expect(world.claimCounter).toBe(before.claimCounter);
    expect(campaignMetrics(world, departed.secretId)).toEqual(metricsBefore);
    expect(threadOf(world, departed.secretId).filter((row) => row.kind === 'seance')).toHaveLength(1);
    expect(world).not.toHaveProperty('magic');
    expect(world.intel.log).toHaveLength(2);
    expect(world.intel.log[0]).toMatchObject({ kind: 'utterance', family: departed.secretId,
      claimId: departed.claimId, reported: departed.reported, speaker: null, addressedTo: null });
    expect(world.intel.log[1]).toMatchObject({ kind: 'edge-read', edgeFrom: departed.edge.from,
      edgeTo: departed.edge.to, edgeKind: departed.edge.kind });
    for (const row of world.intel.log) {
      expect(row.provenance).toEqual({ kind: 'magic', spell: 'seance', operation: 'seance:' + departed.id });
      expect(row.via).toBe('seance');
      expect(row).not.toHaveProperty('document');
    }
    expect(world.chronicle.slice(before.chronicle.length)).toEqual([{
      kind: 'seance', tick: 0, operation: 'seance:' + departed.id, venue: 'chapel-d0',
      departedId: departed.id, claimId: departed.claimId, edge: departed.edge,
    }]);
  });
  it('uses the retained clue after live relationships change, with detached output data', () => {
    const world = seanceWorld();
    world.npcs.ada!.edges = [];
    cast(world);
    expect(world.intel.log[1]).toMatchObject({ edgeFrom: 'ada', edgeTo: 'bez', edgeKind: 'friend' });
    world.intel.log[0]!.reported!.severity = 1;
    expect(world.departed!.reported.severity).toBe(4);
    expect(world.claims[world.departed!.claimId]!.severity).toBe(4);
    const row = world.chronicle.find((entry) => entry.kind === 'seance')!;
    if (row.kind !== 'seance') throw new Error('missing ritual');
    row.edge.to = 'guard';
    expect(world.departed!.edge.to).toBe('bez');
  });
  it('clusters without fictional routes, carriers, receive/emit pairs or a second informant', () => {
    const world = seanceWorld();
    cast(world);
    const family = world.departed!.secretId;
    expect(clustersOf(world.intel.log)).toHaveLength(1);
    expect(routeOf(world.intel.log, family)).toEqual([]);
    expect(webView(world.intel.log, { kind: 'npc', id: 'ada' }).spokes).toEqual([]);
    for (const trait of Object.keys(R.traits)) {
      expect(corroborations(world.intel.log, 'ada', trait, R)).toEqual([]);
    }
    const ordinary = { ...cloneSerializable(world.intel.log[0]!), via: 'seance',
      speaker: 'ada', addressedTo: 'bez' };
    delete ordinary.provenance;
    expect(isMagic(ordinary)).toBe(false);
    expect(sourceKey(ordinary)).not.toBe(sourceKey(world.intel.log[0]!));
    world.intel.log.push(ordinary);
    expect(informantLedger(world.intel.log, 'seance').rows).toHaveLength(1);
    expect(informantLedger(world.intel.log, 'seance').corroboratedElsewhere).toEqual([]);
    expect(webView(world.intel.log, { kind: 'npc', id: 'ada' }).spokes.map((spoke) => spoke.carrier))
      .toEqual(['seance']);
  });
  it.each([0, 15, 225, 1440, 1665])('accepts legal beat %i including midnight and last legal beat', (tick) => {
    const world = seanceWorld(); world.tick = tick;
    cast(world);
    expect(world.seanceUsed!.tick).toBe(tick);
  });
  it.each([240, 1425, 1680])('refuses daytime %i atomically', (tick) => {
    const world = seanceWorld(); world.tick = tick;
    atomicRefusal(world, () => cast(world), /before 04:00/);
  });
  it.each([NaN, Infinity, -Infinity, -15, 0.5, 1])('refuses invalid beat %s before mutation', (tick) => {
    const world = seanceWorld(); world.tick = tick;
    atomicRefusal(world, () => applySeance(world, tick, R), /finite conversation beat/);
  });
  it.each(['player', 'nowhere', 'venue', 'departed', 'claim', 'testimony', 'coin'] as const)(
    'refuses invalid %s before debit or lazy allocation', (fault) => {
      const world = seanceWorld();
      if (fault === 'player') world.playerId = null;
      if (fault === 'nowhere') world.playerVenue = null;
      if (fault === 'venue') world.playerVenue = 'square';
      if (fault === 'departed') delete world.departed;
      if (fault === 'claim') delete world.claims[world.departed!.claimId];
      if (fault === 'testimony') world.departed!.reported.severity = 1;
      if (fault === 'coin') world.coin = 19;
      atomicRefusal(world, () => cast(world), /seance:/);
      expect(world).not.toHaveProperty('seanceUsed');
    });
  it.each([NaN, Infinity, -1, 0, 1.5])('rejects malformed price %s atomically', (price) => {
    const world = seanceWorld();
    atomicRefusal(world, () => applySeance(world, 0, { ...R, economy: { ...R.economy, seance: price } }), /price/);
  });
  it('requires rules, the current tick, and an avatar in an explicit offered frame', () => {
    const world = seanceWorld();
    atomicRefusal(world, () => applyAction(world, { kind: 'seance', tick: 0 }), /requires rules/);
    atomicRefusal(world, () => applyAction(world, { kind: 'seance', tick: 15 }, R), /action tick/);
    atomicRefusal(world, () => applySeance(world, 0, R, []), /avatar absent/);
  });
  it('accepts a real cathedral and rejects a chapel-shaped id absent from the world', () => {
    const world = seanceWorld(); world.playerVenue = 'chapel-missing';
    atomicRefusal(world, () => cast(world), /chapel or cathedral/);
    world.playerVenue = 'cathedral'; cast(world);
    expect(world.intel.log[0]!.venue).toBe('cathedral');
  });
  it('uses the actual frozen offered venue in both same-tick movement directions', () => {
    const legal = seanceWorld();
    const frame = prepareTick(legal, R);
    finishTick(legal, R, frame, () => {
      applyGoTo(legal, 'square');
      applyAction(legal, { kind: 'seance', tick: 0 }, R, frame);
    });
    expect(legal.playerVenue).toBe('square');
    expect(legal.intel.log.find(isMagic)!.venue).toBe('chapel-d0');
    const illegal = seanceWorld(); illegal.playerVenue = 'square';
    const inverse = prepareTick(illegal, R);
    finishTick(illegal, R, inverse, () => {
      applyGoTo(illegal, 'chapel-d0');
      atomicRefusal(illegal, () => applyAction(illegal, { kind: 'seance', tick: 0 }, R, inverse), /chapel/);
    });
    expect(illegal).not.toHaveProperty('seanceUsed');
  });
  it('keeps the campaign latch over a day boundary and JSON round trip', () => {
    const world = seanceWorld(); cast(world);
    const restored = cloneSerializable(world);
    restored.tick = 1440; restored.coin = 100;
    atomicRefusal(restored, () => cast(restored), /already spoken/);
  });
  it('leaves no-encounter no-magic worlds byte equal apart from retained metadata', () => {
    const a = seanceWorld(); a.playerVenue = 'square';
    const b = cloneSerializable(a); delete b.departed;
    runUntil(a, 60, R); runUntil(b, 60, R);
    expect(a).not.toHaveProperty('seanceUsed'); expect(a).not.toHaveProperty('magic');
    const comparable = cloneSerializable(a); delete comparable.departed;
    expect(stableStringify(comparable)).toBe(stableStringify(b));
  });
});
~~~

Create tests/app/seance-session.test.ts:

~~~ts
import { describe, expect, it } from 'vitest';
import { localParticipants, loadSession, newSession } from '../../app/src/loop/session';
import { VERB_TERM } from '../../app/src/input/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { TERMS } from '../../src/content/terms';
import { boardView } from '../../src/intel/board';
import { stableStringify } from '../../src/sim/hash';

describe('séance through the requested-beat session', () => {
  it('executes from a real offer and regrows identical runtime metadata, intel and latch from the saved log', () => {
    const session = newSession('seance-session');
    expect(session.world.departed).toBeDefined();
    expect(session.world.scenario!.status).toBe('running');
    expect(session.world.network.spymaster).not.toBeNull();
    expect(session.world.venues.cathedral).toMatchObject({ access: 'public' });
    session.submit({ kind: 'goTo', venue: 'cathedral' }); session.advance(1);
    expect(session.requestLocalInteraction()).toEqual({ requestedFor: 15, refused: false });
    expect(session.advance(20).stopped).toBe('local-offer');
    const offer = session.localOffer()!;
    expect(offer).toMatchObject({ tick: 15, venue: 'cathedral' });
    expect(localParticipants({ kind: 'seance' })).toEqual([]);
    const coin = session.world.coin;
    expect(session.chooseLocal(offer.token, { kind: 'seance' })).toEqual({ queuedFor: 15 });
    session.advance(1);
    expect(session.world.coin).toBe(coin - 20);
    expect(session.save().log.filter((action) => action.kind === 'seance')).toEqual([{ kind: 'seance', tick: 15 }]);
    const replay = loadSession(session.save(), session.world.tick);
    expect(stableStringify(replay.world)).toBe(stableStringify(session.world));
    expect(boardView(replay.world.intel.log, 3, STANDARD_RULES))
      .toEqual(boardView(session.world.intel.log, 3, STANDARD_RULES));
    session.requestLocalInteraction(); session.advance(20);
    session.chooseLocal(session.localOffer()!.token, { kind: 'seance' });
    expect(() => session.advance(1)).toThrow(/already spoken/);
    expect(session.save().log.filter((action) => action.kind === 'seance')).toHaveLength(1);
  });
  it('a refused local attempt never becomes a saved action and nonlocal submit is fenced', () => {
    const session = newSession('seance-refusal');
    expect(() => session.submit({ kind: 'seance' } as never)).toThrow(/local actions require/);
    session.requestLocalInteraction(); session.advance(1);
    const coin = session.world.coin;
    session.chooseLocal(session.localOffer()!.token, { kind: 'seance' });
    expect(() => session.advance(1)).toThrow(/chapel/);
    expect(session.world.coin).toBe(coin);
    expect(session.world).not.toHaveProperty('seanceUsed');
    expect(session.save().log).toEqual([]);
  });
  it('registers truthful short vocabulary and the exhaustive verb mapping', () => {
    expect(VERB_TERM.seance).toBe('verb-seance');
    for (const id of ['verb-seance', 'the-departed', 'night-visit']) {
      expect(TERMS[id]).toMatchObject({ id, entry: null });
      expect(TERMS[id]!.short.length).toBeGreaterThan(0);
      expect(TERMS[id]!.short.length).toBeLessThanOrEqual(120);
    }
  });
});
~~~

4B checksums: standard cost20 equals initial20, one ritual leaves0; minute225 is legal,240 is not; one ordinary family claim remains one claim; exactly2 added intel rows/1 ritual chronicle; no participants or synthetic speech. Commit subject: feat: séance — the dead speak once, at night, for a price.

## 4C — actual chapel-night sightings become fair evidence

Split this mechanism into two serial 60–90 minute units: 4C1 capture/report/evidence + transport tests; 4C2 digest/ref/auditor + consequence tests. Same model/reviewer floors. The licensed tests/sim/night-visits.test.ts below is complete; for 4C1 land the first describe only (and its imports/helpers actually used), then 4C2 adds the second. No skipped/todo tests, unused imports or placeholder assertions. The extra physical arm is isolated; all existing speech union fields remain strict.

4C1 src/sim/enemy/state.ts: beside PhysicalReceipt add:

~~~ts
export interface NightVisitEvidenceData {
  actor: EntityId;
  witness: EntityId;
  observedAt: Tick;
}
~~~

Add `nightVisit?: never` to each existing EvidenceEntry arm (including Task3 residue). Append:

~~~ts
  | (Omit<EvidenceBase, 'speaker' | 'addressedTo'> & {
      kind: 'night-visit'; speaker: null; addressedTo: null; mode: null;
      claimId: null; family: null; reported: null; about: null;
      nightVisit: NightVisitEvidenceData; receipt?: PhysicalReceipt;
      residue?: never; network?: never; leaked?: never;
    })
~~~

Observation's presence arm in src/sim/perception.ts gains `witness?: EntityId`; ReportedFieldObservation's presence arm in src/sim/directives/types.ts gains the same. Document both: "Only the scoped night-visit capture marks its actual physical witness. Omission retains ordinary presence semantics." observationsFor itself stays unchanged, returning only real actor/venue/tick; the narrow caller marks what it actually saw. This avoids a new generic perception kind or global ordinary-presence capture rule.

src/sim/night-visit.ts add type imports `{ PhysicalReceipt }` from './enemy/state', `{ ReportedFieldObservation }` from './directives/types', `{ WorldState }` from './types'; append:

~~~ts
export type ReportedNightVisit = Extract<ReportedFieldObservation, { kind: 'presence' }>
  & { witness: string };

/** Consumes visible reported data only; no player/ritual/claim/schedule/edge lookup. */
export function ingestEnemyNightVisit(
  world: WorldState, observation: ReportedNightVisit, receipt?: PhysicalReceipt,
): void {
  if (!isNightVisitTime(observation.observedAt) || !isSacredVenue(observation.venue)) return;
  const duplicate = world.enemy.evidence.some((entry) => entry.kind === 'night-visit'
    && entry.venue === observation.venue && entry.nightVisit.actor === observation.actor
    && entry.nightVisit.witness === observation.witness
    && entry.nightVisit.observedAt === observation.observedAt);
  if (duplicate) return;
  world.enemy.evidence.push({
    kind: 'night-visit', tick: observation.observedAt, venue: observation.venue,
    observer: observation.witness, overheard: false, speaker: null, addressedTo: null,
    mode: null, claimId: null, family: null, reported: null, about: null,
    nightVisit: { actor: observation.actor, witness: observation.witness, observedAt: observation.observedAt },
    ...(receipt === undefined ? {} : { receipt: { ...receipt } }),
  });
}
~~~

Create src/sim/night-visits.ts:

~~~ts
import { dayOf } from '../core/time';
import { holdFieldObservation } from './directives/field-reports';
import type { NightVisitRecord } from './magic-types';
import { ingestEnemyNightVisit, isNightVisitTime, isSacredVenue } from './night-visit';
import { observationsFor, type TickEvents } from './perception';
import type { WorldState } from './types';

/** A scoped avatar caper sighting, independent of whether any magic was performed. */
export function captureNightVisits(world: WorldState, events: TickEvents): void {
  if (!isNightVisitTime(events.tick)) return;
  const avatar = world.playerId;
  const principal = world.network.spymaster;
  if (avatar === null || !world.npcs[avatar] || principal === null || !world.npcs[principal]) return;
  const venue = events.positions[avatar];
  if (venue === undefined || !world.venues[venue] || !isSacredVenue(venue)) return;
  const witnesses = [...new Set([...world.enemy.observers.map((observer) => observer.id), principal])].sort();
  for (const witness of witnesses) {
    if (witness === avatar || !world.npcs[witness]) continue;
    const observed = observationsFor(witness, events).observations.find((row) =>
      row.kind === 'presence' && row.actor === avatar && row.venue === venue && row.tick === events.tick);
    if (observed?.kind !== 'presence') continue;
    // One canonical sighting per real witness/actor/place/day. Retelling keeps that timestamp.
    let sighting = world.chronicle.find((row): row is NightVisitRecord => row.kind === 'night-visit'
      && row.observer === witness && row.actor === avatar && row.venue === venue
      && dayOf(row.tick) === dayOf(events.tick));
    if (!sighting) {
      sighting = { kind: 'night-visit', tick: observed.tick, venue: observed.venue,
        observer: witness, actor: observed.actor };
      world.chronicle.push(sighting);
    }
    if (witness === principal) {
      ingestEnemyNightVisit(world, { kind: 'presence', observedAt: sighting.tick,
        venue: sighting.venue, actor: sighting.actor, witness });
    } else {
      holdFieldObservation(world, 'enemy', witness, { kind: 'raw', observation: {
        kind: 'presence', tick: sighting.tick, venue: sighting.venue, actor: sighting.actor, witness,
      } }, null, [principal], null, []);
    }
  }
}
~~~

The day key bounds duplicate observations; it does not multiply sketch pressure. An omitted ordinary presence atom retains existing transport closure behavior and gets no same-day automatic retry. A later day's actual encounter can create a new report. No timing/RNG/retry mechanic changes. A headless fixture with no embodied principal has no new collection route. General NPC chapel attendance remains ordinary presence; only actual avatar encounters use the caper rule, as the existing caught-in-act law already specializes avatar conduct.

src/sim/phases.ts: import `{ captureNightVisits }` from './night-visits'. In recordAndIngest, immediately before existing `captureIntel(world, events, rules);` add `captureNightVisits(world, events);`. It runs on the actual final event bundle before queueUnqueuedFieldReports and independently of the speech/residue captureEvidence guard. Preserve Task3's residue OR and its sensor order; do not run captureEvidence on every tick.

src/sim/directives/field-reports.ts: import `{ ingestEnemyNightVisit }` from '../night-visit'. In BOTH presence return object literals (rawReportedObservation and projectReportedObservation), after actor add:

~~~ts
        ...(observation.witness === undefined ? {} : { witness: observation.witness }),
~~~

Ordinary presence bytes stay unchanged; guarded/omissive/doctored early presence omission gates stay intact. In ingestPlayerItem's presence arm replace only `kind: 'presence'` with `kind: observation.witness === undefined ? 'presence' : 'scene-presence'`. Keep shared factRefs tail and Task3 residue/network branches. In ingestEnemyItem, after its existing arcane-residue early-return arm add:

~~~ts
  if (observation.kind === 'presence' && observation.witness !== undefined) {
    ingestEnemyNightVisit(world, { ...observation, witness: observation.witness }, physicalReceipt);
    return;
  }
~~~

The principal must physically hear the report through the unchanged ingestObservedFieldReport caller. No hidden held row is used to fill an omitted atom. The existing network evidence envelope is still captured; night-visit evidence additionally records what the actual spoken item said. Preserve all document marker projections.

4C2 src/sim/enemy/state.ts: add `nightVisit?: NightVisitEvidenceData` to SketchEvidenceRef; add `'night-visit'` to SketchFeature.kind. Receipt remains only on evidence. Update ref documentation to include both physical channels with null speech ids. src/sim/enemy/digest.ts: extend ref(e)'s object with:

~~~ts
    ...(e.kind === 'night-visit' ? { nightVisit: { ...e.nightVisit } } : {}),
~~~

Shared predecessor defect found during authoring: original sameRefs compares only the old four fields, so distinct physical leads with null ids can alias. Task3's controller-reviewed amendment must first compare `residue?.id`, `residue?.witness`, `residue?.observedAt`. Task4 then appends the three nightVisit comparisons. The final COMPLETE replacement is below, with no new imports:

~~~ts
const sameRefs = (a: readonly SketchEvidenceRef[], b: readonly SketchEvidenceRef[]): boolean =>
  a.length === b.length && a.every((ref, i) => ref.tick === b[i]!.tick
    && ref.observer === b[i]!.observer && ref.claimId === b[i]!.claimId
    && ref.messageId === b[i]!.messageId
    && ref.residue?.id === b[i]!.residue?.id
    && ref.residue?.witness === b[i]!.residue?.witness
    && ref.residue?.observedAt === b[i]!.residue?.observedAt
    && ref.nightVisit?.actor === b[i]!.nightVisit?.actor
    && ref.nightVisit?.witness === b[i]!.nightVisit?.witness
    && ref.nightVisit?.observedAt === b[i]!.nightVisit?.observedAt);
~~~

Immediately after Task3's arcane-residue feature loop and before heuristic8 insert:

~~~ts
  for (const e of state.evidence) {
    if (e.kind !== 'night-visit') continue;
    const subject = e.nightVisit.actor;
    if (has((feature) => feature.kind === 'night-visit' && feature.subject === subject)) continue;
    addFeature({
      kind: 'night-visit', day, family: null, subject, venue: e.venue,
      district: districtOf.get(e.venue) ?? null,
      detail: `${subject} seen at ${e.venue} before 04:00 (day ${dayOf(e.nightVisit.observedAt)}, witness ${e.nightVisit.witness})`,
      evidence: [ref(e)],
    });
  }
~~~

The runaround copies a lead's refs. Widening refs makes its old shallow copy insufficient. Task3's controller-reviewed prerequisite must detach optional residue data; Task4 must detach optional nightVisit data. Replace the existing `evidence: lead.evidence.map((row) => ({ ...row })),` line with the complete final copy:

~~~ts
      evidence: lead.evidence.map((row) => ({
        ...row,
        ...(row.residue === undefined ? {} : { residue: { ...row.residue } }),
        ...(row.nightVisit === undefined ? {} : { nightVisit: { ...row.nightVisit } }),
      })),
~~~

Existing exposureStatus counts distinct(kind,subject), so this gives the avatar +1 ordinary exposure. Only carrier-profile identifies; do not add a special identification path. No enemy state ledger, omniscient import, story family, false speaker, extra countermeasure, or new balance constant. The existing pressure and district rules may consume the resulting lawful feature. The digest remains a pure fold over state/map/rules. Its positive voicings narrowing already excludes physical entries.

Existing runEnemyDay deliberately returns for an empty observer roster. Preserve that enemy-off law: the direct-principal consequence test retains a real guard roster with the guard physically elsewhere. Normal generated enemy worlds have guards. A hand-built observer-empty world may record direct physical evidence but does not run a nightly digest; no stronger promise is made for that diagnostic setup.

Extend tests/sim/helpers/sketch-audit.ts before its Task3 residue branch with this branch and feature-to-channel assertion (the existing outer ref loop and common id conflict assertion remain):

~~~ts
      if (feature.kind === 'night-visit') expect(ref.nightVisit).toBeDefined();
      if (ref.nightVisit !== undefined) {
        expect(ref.residue).toBeUndefined();
        expect(ref.claimId).toBeNull(); expect(ref.messageId).toBeNull();
        const visit = ref.nightVisit;
        const entry = world.enemy.evidence.find((candidate) => candidate.kind === 'night-visit'
          && candidate.tick === ref.tick && candidate.observer === ref.observer
          && candidate.nightVisit.actor === visit.actor && candidate.nightVisit.witness === visit.witness
          && candidate.nightVisit.observedAt === visit.observedAt);
        expect(entry, 'night visit ref must match physical evidence').toBeDefined();
        if (entry?.kind !== 'night-visit') throw new Error('missing night visit evidence');
        expect(entry.tick).toBe(visit.observedAt); expect(entry.observer).toBe(visit.witness);
        expect(entry.speaker).toBeNull(); expect(entry.addressedTo).toBeNull();
        expect(entry.claimId).toBeNull(); expect(entry.family).toBeNull();
        if (feature.kind === 'night-visit') {
          expect(feature.subject).toBe(visit.actor); expect(feature.family).toBeNull();
          expect(feature.venue).toBe(entry.venue);
          expect(feature.district).toBe(world.enemy.map.venues.find((venue) => venue.id === entry.venue)?.district ?? null);
        }
        expect(world.chronicle.some((row) => row.kind === 'night-visit' && row.tick === visit.observedAt
          && row.observer === visit.witness && row.actor === visit.actor && row.venue === entry.venue),
        'night visit must have the exact recorded physical sighting').toBe(true);
        if (entry.receipt === undefined) {
          expect(visit.witness, 'only the real principal ingests a direct sighting').toBe(world.network.spymaster);
        } else {
          const receipt = entry.receipt;
          expect(receipt.observer).toBe(world.network.spymaster);
          expect(receipt.tick).toBeGreaterThanOrEqual(visit.observedAt);
          const speech = world.chronicle.find((row) => row.kind === 'network-speech'
            && row.tick === receipt.tick && row.messageId === receipt.messageId
            && row.heardBy.some((hearer) => hearer.id === receipt.observer));
          expect(speech, 'night visit receipt must name an actual heard envelope').toBeDefined();
          if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') {
            throw new Error('missing night visit field report');
          }
          expect(speech.spoken.items.some(({ observation }) => observation.kind === 'presence'
            && observation.observedAt === visit.observedAt && observation.venue === entry.venue
            && observation.actor === visit.actor && observation.witness === visit.witness),
          'the exact night visit atom must actually have been spoken').toBe(true);
        }
        continue;
      }
~~~

In Task3 residue branch add `expect(ref.nightVisit).toBeUndefined();`. In the legacy evidence finder extend its existing physical exclusion to `e.kind !== 'arcane-residue' && e.kind !== 'night-visit' &&`. Preserve every claim/network/asking assertion and existing positive/negative test. Do not loosen the auditor to trust matching null ids alone.

Create tests/sim/night-visits.test.ts:

~~~ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { captureNightVisits } from '../../src/sim/night-visits';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { auditSketch } from './helpers/sketch-audit';
import { nightVisitWorld } from './helpers/seance-town';

const visits = (world: WorldState) => world.enemy.evidence.filter((row) => row.kind === 'night-visit');
const heldVisits = (world: WorldState) => (world.network.directiveState?.heldObservations ?? [])
  .filter((row) => row.content.kind === 'raw' && row.content.observation.kind === 'presence'
    && row.content.observation.witness !== undefined);
const features = (world: WorldState) => world.enemy.sketch.filter((row) => row.kind === 'night-visit');
const delivered = (): WorldState => {
  const world = nightVisitWorld(); runUntil(world, 46, R);
  expect(visits(world)).toHaveLength(1);
  return world;
};

describe('a night visit is seen locally and reported physically', () => {
  it('holds a silent local sighting; remote evidence changes only at the real later meeting', () => {
    const world = nightVisitWorld();
    const digest = stableStringify(enemyDigest(world.enemy, 0, R));
    const events = step(world, R);
    expect(events.utterances).toEqual([]); expect(events.askings).toEqual([]);
    expect(events.networkSpeeches ?? []).toEqual([]);
    expect(events.positions).toMatchObject({ you: 'chapel-d0', guard: 'chapel-d0', boss: 'hq' });
    expect(heldVisits(world)).toHaveLength(1);
    expect(heldVisits(world)[0]).toMatchObject({ observer: 'guard', observedAt: 0, deliveredAt: null,
      content: { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard' } } });
    expect(visits(world)).toEqual([]);
    expect(stableStringify(enemyDigest(world.enemy, 0, R))).toBe(digest);
    runUntil(world, 45, R);
    expect(visits(world)).toEqual([]); expect(heldVisits(world)[0]!.deliveredAt).toBeNull();
    const meeting = step(world, R);
    expect(meeting.positions).toMatchObject({ guard: 'hq', boss: 'hq', you: 'chapel-d0' });
    expect(visits(world)).toHaveLength(1);
    const entry = visits(world)[0]!;
    expect(entry).toMatchObject({ tick: 0, venue: 'chapel-d0', observer: 'guard',
      speaker: null, addressedTo: null, claimId: null, family: null,
      nightVisit: { actor: 'you', witness: 'guard', observedAt: 0 }, receipt: { tick: 45, observer: 'boss' } });
    const speech = meeting.networkSpeeches!.find((row) => row.messageId === entry.receipt!.messageId)!;
    expect(speech).toMatchObject({ speaker: 'guard', addressedTo: 'boss', venue: 'hq' });
    expect(speech.spoken.kind).toBe('field-report');
    if (speech.spoken.kind !== 'field-report') throw new Error('missing report');
    expect(speech.spoken.items.map((item) => item.observation)).toContainEqual({
      kind: 'presence', observedAt: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard',
    });
    expect(heldVisits(world)[0]!.deliveredAt).toBe(45);
    expect(world.enemy.evidence.some((row) => row.kind === 'network' && row.network.messageId === speech.messageId)).toBe(true);
  });
  it('the spymaster can see directly on a silent tick without a fictional report', () => {
    const world = nightVisitWorld(); world.enemy.observers = [];
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
    const events = step(world, R);
    expect(events.networkSpeeches ?? []).toEqual([]);
    expect(visits(world)).toHaveLength(1);
    expect(visits(world)[0]).toMatchObject({ observer: 'boss', nightVisit: { actor: 'you', witness: 'boss', observedAt: 0 } });
    expect(visits(world)[0]).not.toHaveProperty('receipt');
    expect(heldVisits(world)).toEqual([]);
  });
  it.each(['no-observer', 'elsewhere', 'daytime', 'not-chapel', 'no-avatar', 'no-principal'] as const)(
    'does not manufacture a sighting for %s', (fault) => {
      const world = nightVisitWorld();
      if (fault === 'no-observer') world.enemy.observers = [];
      if (fault === 'elsewhere') world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'square' }];
      if (fault === 'daytime') {
        world.tick = 240;
        world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
      }
      if (fault === 'not-chapel') world.playerVenue = 'square';
      if (fault === 'no-avatar') world.playerId = null;
      if (fault === 'no-principal') world.network.spymaster = null;
      step(world, R);
      expect(visits(world)).toEqual([]); expect(heldVisits(world)).toEqual([]);
      expect(world.chronicle.some((row) => row.kind === 'night-visit')).toBe(false);
    });
  it('capture requires event-local physical presence and does not read hidden spell state', () => {
    const world = nightVisitWorld();
    for (const key of ['departed', 'seanceUsed', 'magic'] as const) {
      Object.defineProperty(world, key, { configurable: true, get() { throw new Error('hidden magic read'); } });
    }
    captureNightVisits(world, { tick: 0, positions: { you: 'square', guard: 'chapel-d0', boss: 'hq' }, utterances: [], askings: [] });
    expect(heldVisits(world)).toEqual([]);
    captureNightVisits(world, { tick: 0, positions: { you: 'chapel-d0', guard: 'chapel-d0', boss: 'hq' }, utterances: [], askings: [] });
    expect(heldVisits(world)).toHaveLength(1);
  });
  it('an ordinary visit and a performed ritual create the same physical sighting/report evidence', () => {
    const ordinary = nightVisitWorld(); const ritual = nightVisitWorld();
    const frame = prepareTick(ritual, R);
    finishTick(ritual, R, frame, () => applyAction(ritual, { kind: 'seance', tick: 0 }, R, frame));
    runUntil(ritual, 46, R); runUntil(ordinary, 46, R);
    expect(visits(ritual)).toEqual(visits(ordinary));
    expect(heldVisits(ritual)).toEqual(heldVisits(ordinary));
    expect(ordinary).not.toHaveProperty('seanceUsed');
    expect(ritual.seanceUsed).toBeDefined();
  });
  it('a turned reporter can omit the atom; an empty spoken envelope is no physical evidence', () => {
    const world = nightVisitWorld();
    world.network.enemyAssets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0,
      strikes: 0, facts: [], turned: true });
    runUntil(world, 46, R);
    expect(heldVisits(world)).toHaveLength(1);
    const report = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === 45 && row.speaker === 'guard' && row.spoken.kind === 'field-report');
    expect(report).toBeDefined();
    if (report?.kind !== 'network-speech' || report.spoken.kind !== 'field-report') throw new Error('missing omission envelope');
    expect(report.spoken.items).toEqual([]);
    expect(visits(world)).toEqual([]);
    // Preserve ordinary presence closure, rather than silently extending Task3's residue retry law.
    expect(heldVisits(world)[0]!.deliveredAt).toBe(45);
  });
  it('the avatar overhearing the real report receives scene presence, never a false watch', () => {
    const world = nightVisitWorld(); world.venues.hq!.access = 'public';
    const log: Action[] = [{ kind: 'goTo', tick: 30, venue: 'hq' }];
    runLogOn(world, R, log, 46);
    expect(world.intel.log.some((row) => row.kind === 'scene-presence' && row.actor === 'you'
      && row.venue === 'chapel-d0' && row.via === 'guard')).toBe(true);
    expect(world.intel.log.some((row) => row.kind === 'presence' && row.actor === 'you')).toBe(false);
    expect(visits(world)).toHaveLength(1);
  });
});

describe('the scoped physical risk has a bounded, auditable consequence', () => {
  it.each([false, true])('nightly commits +1 exposure, no carrier identification; direct=%s', (direct) => {
    const world = nightVisitWorld();
    if (direct) {
      world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'square' }];
      world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
    }
    expect(exposureStatus(world)).toMatchObject({ score: 0, identified: false });
    runUntil(world, 1440, R);
    expect(visits(world)).toHaveLength(1);
    expect(features(world)).toHaveLength(1);
    expect(features(world)[0]).toMatchObject({ subject: 'you', family: null, district: 'd0', venue: 'chapel-d0' });
    expect(exposureStatus(world)).toMatchObject({ score: 1, identified: false });
    expect(world.enemy.sketch.filter((row) => row.kind === 'carrier-profile')).toEqual([]);
    auditSketch(world);
  });
  it('one report per daily encounter does not accumulate repeated-night feature pressure', () => {
    const world = nightVisitWorld(); runUntil(world, 15, R);
    expect(heldVisits(world)).toHaveLength(1);
    expect(world.chronicle.filter((row) => row.kind === 'night-visit')).toHaveLength(1);
    runUntil(world, 2880, R);
    expect(world.chronicle.filter((row) => row.kind === 'night-visit')).toHaveLength(2);
    expect(visits(world)).toHaveLength(2);
    expect(features(world)).toHaveLength(1);
    expect(exposureStatus(world)).toMatchObject({ score: 1, identified: false });
    expect(enemyDigest(world.enemy, 2, R).features.filter((row) => row.kind === 'night-visit')).toEqual([]);
    auditSketch(world);
  });
  it('pure digest sees only delivered evidence, and does not mutate its substrate', () => {
    const world = delivered();
    const before = stableStringify(world.enemy);
    const decision = enemyDigest(world.enemy, 0, R);
    expect(stableStringify(world.enemy)).toBe(before);
    expect(decision.features.filter((row) => row.kind === 'night-visit')).toHaveLength(1);
    const unseen = cloneSerializable(world); delete unseen.departed;
    unseen.npcs.ada!.edges = [];
    expect(enemyDigest(unseen.enemy, 0, R)).toEqual(decision);
  });
  it.each([false, true])('runaround ref equality respects physical identity; already priced same visit=%s', (same) => {
    // Pure digest vehicle, as in enemy-runaround.test.ts: a receipt-built lead plus staged spent orders.
    const world = delivered();
    const lead = enemyDigest(world.enemy, 0, R).features.find((row) => row.kind === 'night-visit')!;
    const old = cloneSerializable(lead);
    old.id = 'prior-runaround'; old.kind = 'runaround';
    if (!same) delete old.evidence[0]!.nightVisit; // legacy asking shares the two null ids
    world.enemy.sketch = [lead, old]; world.enemy.featureCounter = 2;
    world.enemy.actionLedger = [{
      orderKey: 'watch:d0', kind: 'watch', directiveIds: ['d-test'], leadFeatureId: lead.id,
      subject: 'you', about: { subject: 'you' }, district: 'd0', scheduleStartDay: 1,
      posts: [{ guard: 'guard', venue: 'square' }], workedDays: [1, 2], askedAt: null,
    }];
    const before = stableStringify(world.enemy);
    const runarounds = enemyDigest(world.enemy, 3, R).features.filter((row) => row.kind === 'runaround');
    expect(stableStringify(world.enemy)).toBe(before);
    expect(runarounds).toHaveLength(same ? 0 : 1);
    if (!same) {
      expect(runarounds[0]!.evidence).toEqual(lead.evidence);
      expect(runarounds[0]!.evidence[0]!.nightVisit).not.toBe(lead.evidence[0]!.nightVisit);
      runarounds[0]!.evidence[0]!.nightVisit!.actor = 'changed-output';
      expect(lead.evidence[0]!.nightVisit!.actor).toBe('you');
    }
  });
  it('real action/physical-report/nightly history and JSON survive replay exactly', () => {
    const live = nightVisitWorld();
    const action: Action = { kind: 'seance', tick: 0 };
    const frame = prepareTick(live, R);
    finishTick(live, R, frame, () => applyAction(live, action, R, frame));
    runUntil(live, 1440, R);
    const replay = runLogOn(nightVisitWorld(), R, cloneSerializable([action]), 1440);
    expect(features(live)).toHaveLength(1); expect(live.seanceUsed).toBeDefined();
    expect(stableStringify(replay)).toBe(stableStringify(live));
    expect(stableStringify(cloneSerializable(live))).toBe(stableStringify(live));
    auditSketch(live);
  });
  it.each(['no-evidence', 'no-sighting', 'bad-ref', 'missing-physical-ref', 'no-receipt', 'bad-message', 'not-heard', 'omitted-atom'] as const)(
    'the permanent auditor rejects %s after a nonempty successful physical chain', (fault) => {
      const good = delivered(); runUntil(good, 1440, R);
      expect(features(good)).toHaveLength(1); auditSketch(good);
      const bad = cloneSerializable(good);
      const entry = visits(bad)[0]!;
      const receipt = entry.receipt!;
      const speech = bad.chronicle.find((row) => row.kind === 'network-speech'
        && row.tick === receipt.tick && row.messageId === receipt.messageId);
      if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') throw new Error('missing positive report');
      if (fault === 'no-evidence') bad.enemy.evidence = bad.enemy.evidence.filter((row) => row.kind !== 'night-visit');
      if (fault === 'no-sighting') bad.chronicle = bad.chronicle.filter((row) => row.kind !== 'night-visit');
      if (fault === 'bad-ref') features(bad)[0]!.evidence[0]!.nightVisit!.actor = 'ada';
      if (fault === 'missing-physical-ref') {
        delete features(bad)[0]!.evidence[0]!.nightVisit;
        // A corrupt ref must not borrow this unrelated ordinary asking's matching null ids.
        bad.enemy.evidence.push({ kind: 'asking', tick: 0, venue: 'chapel-d0', observer: 'guard',
          speaker: 'ada', addressedTo: 'bez', overheard: true, mode: null, claimId: null,
          family: null, reported: null, about: { subject: 'ada' } });
        bad.chronicle.push({ kind: 'asking', tick: 0, venue: 'chapel-d0', speaker: 'ada',
          addressedTo: 'bez', about: { subject: 'ada' }, authority: false,
          heardBy: [{ id: 'guard', addressed: false }] });
      }
      if (fault === 'no-receipt') delete entry.receipt;
      if (fault === 'bad-message') entry.receipt!.messageId = 'missing';
      if (fault === 'not-heard') speech.heardBy = speech.heardBy.filter((row) => row.id !== 'boss');
      if (fault === 'omitted-atom') speech.spoken.items = [];
      expect(() => auditSketch(bad)).toThrow();
    });
});
~~~

4C checksums: one silent encounter -> one held row -> no remote evidence through tick44 -> real speech45 -> physical evidence timestamp0 plus receipt45 -> one nightly feature -> exposure1/identifiedfalse. Direct principal has physical timestamp0 and no receipt. Two days create two sighting reports but still one(kind,subject) feature. Commit subjects: `feat: retain and physically report avatar chapel-night sightings`; `feat: audit night visits as bounded enemy exposure`.

## 4D — evidence, complete reports, and independent closure

Model: frontier_implementer for bounded verification/fixes already licensed above; frontier_reviewer for independent accumulated review. Controller owns any plan adoption, baseline disposition and final documentation. No runtime change may be introduced by a report normalization or a threshold/seed/config exemption.

Before 4A dispatch, controller records the actual committed Task2/Task3 chain, the independently approved provenance/physical interface, complete suite/file floor, and clean scope or separately owned dirty files. The frozen Task3 AUTHOR artifact read here is SHA256 `16655291E98D8CEF7A7FB3E8EF84DE28CBAC41B7C52C2D066D36DA9259A1F00B`; it is not an implemented predecessor hash. Its two physical-ref corrections (sameRefs identity and nested runaround copy) remain separately disclosed controller-review prerequisites. Do not edit that frozen artifact from a Task4 dispatch.

At the certified predecessor, before changing generation, run the baseline captures below from the repo root. Use the same machine/environment/seed configuration for the after logs. Existing certified predecessor logs may be copied into these exact paths only with their real hash/commands recorded in the worker report; never relabel historical caa5a38/0241fc8 output as a current baseline.

~~~powershell
New-Item -ItemType Directory -Force -Path .superpowers/sdd/task-4-validation | Out-Null
git rev-parse HEAD | Set-Content -Encoding utf8 .superpowers/sdd/task-4-validation/before-head.txt
npm.cmd test 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/before-test.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 predecessor test gate failed' }
npm.cmd run soak 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/before-soak.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 predecessor soak gate failed' }
npm.cmd run mc 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/before-mc.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 predecessor mc gate failed' }
~~~

Focused gates, run separately as each unit reaches GREEN; include output and exit code. Every unit also runs npm run typecheck before its scoped commit.

| Unit | Exact focused command |
|---|---|
| 4A | `npm test -- tests/world/departed.test.ts tests/world/validate.test.ts tests/world/secrets.test.ts tests/world/dossier.test.ts` |
| 4B | `npm test -- tests/sim/seance.test.ts tests/app/seance-session.test.ts tests/intel/magic-provenance.test.ts tests/app/jargon.test.ts tests/content/terms.test.ts` |
| 4C1 | `npm test -- tests/sim/night-visits.test.ts tests/directives/field-reports.test.ts tests/sim/scry-residue.test.ts` |
| 4C2 | `npm test -- tests/sim/night-visits.test.ts tests/sim/sketch-faircop.test.ts tests/sim/enemy-runaround.test.ts tests/sim/no-omniscience.test.ts tests/sim/seance.test.ts tests/app/seance-session.test.ts` |

RED/GREEN evidence must be causal: departed-sane rejects invalid metadata while the valid twin passes; null endpoint rows remain claimful while route/carrier/Codex deductions stay empty; wrong offered venue fails while its inverse succeeds; remote held sighting remains absent from enemy evidence until real speech; a stripped spoken atom fails the auditor after a nonempty successful chain; the same-ref runaround control suppresses a repeat while a legacy null-id collision does not. Missing import alone is not complete behavioral RED. Existing tests may not be deleted, skipped, narrowed or retimed to explain a failure. Diagnose actual source/vehicle mechanics; if the authored hypothesis is false, stop with the smallest recorded trace for controller amendment.

After all implementation units and the independent review's licensed fixes, run the full gate below once; repeat only changed/failed checks when justified. Save the corresponding full logs. Typecheck covers root and app projects. Record the measured app bundle size/gzip, timing verdict and full suite count; no timing improvement is presumed.

~~~powershell
npm.cmd test 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/after-test.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 full suite failed' }
npm.cmd run lint 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/after-lint.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 lint failed' }
npm.cmd run typecheck 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/after-typecheck.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 typecheck failed' }
npm.cmd run app:build 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/after-build.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 app build failed' }
npm.cmd run soak 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/after-soak.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 soak failed' }
npm.cmd run mc 2>&1 | Tee-Object -FilePath .superpowers/sdd/task-4-validation/after-mc.log
if ($LASTEXITCODE -ne 0) { throw 'Task4 mc failed' }
~~~

Create `.superpowers/sdd/task-4-validation/compare-reports.mjs` with this exact comparator, copied from the frozen Task3 draft's controller-sourced normalization. This is a validation artifact, not a production file. It compares every report block/line and strips only the explicitly identified timing columns; its four firing controls prevent a selected-metric comparison from pretending to be complete:

~~~js
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const [baselineSoak, baselineMc, currentSoak, currentMc, outputPath] = process.argv.slice(2);
const baseline = readFileSync(baselineSoak, 'utf8') + '\n' + readFileSync(baselineMc, 'utf8');
const current = readFileSync(currentSoak, 'utf8') + '\n' + readFileSync(currentMc, 'utf8');

function measurements(raw) {
  const reports = new Map();
  let key = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (line.startsWith('stdout | ')) {
      key = line.slice('stdout | '.length);
      if (!reports.has(key)) reports.set(key, []);
      continue;
    }
    if (/^(?:✓|×|❯|Test Files\b|Tests\s|Start at\b|Duration\b|RUN\s|stderr \|)/u.test(line)) {
      key = null;
      continue;
    }
    if (key === null || line === '') continue;
    const values = reports.get(key);
    if (key.includes('digest-cost.report.test.ts')) {
      if (/^day\s+evidenceLen\s+nightlyMs/.test(line)) {
        values.push('day evidenceLen');
        continue;
      }
      const row = /^(\d+)\s+(\d+)\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+$/.exec(line);
      if (row) { values.push(`${row[1]} ${row[2]}`); continue; }
      if (/^(?:real-tick fit:|digest-median fit:|observed fit shape|day-40 extrapolation \((?:conservative|naive))/.test(line)) continue;
      if (line.startsWith('day-40 extrapolated nightly')) {
        values.push(line.replace(/= [-\d.]+ ms/, '= <wall-clock> ms'));
        continue;
      }
    }
    values.push(line);
  }
  assert.ok(reports.size >= 8, 'complete report set required');
  return [...reports].sort(([a], [b]) => a.localeCompare(b));
}

const expected = measurements(baseline);
assert.deepEqual(measurements(baseline), expected, 'known-good self comparison');
const anchor = /first-try validity: [\d.]+%/.exec(baseline)?.[0];
assert.ok(anchor, 'real generation measurement needed for comparator controls');
const changed = baseline.replace(anchor, 'first-try validity: -1%');
const extra = baseline.replace(anchor, anchor + '\nunexpected measurement: 1');
const missing = baseline.replace(anchor, '');
assert.notDeepEqual(measurements(changed), expected, 'changed measurement must fail');
assert.notDeepEqual(measurements(extra), expected, 'extra measurement must fail');
assert.notDeepEqual(measurements(missing), expected, 'missing measurement must fail');
assert.deepEqual(measurements(current), expected, 'complete normalized reports differ');
const result = {
  baselineSoak, baselineMc, currentSoak, currentMc,
  reportBlocks: expected.length,
  deterministicLines: expected.reduce((sum, [, lines]) => sum + lines.length, 0),
  allBlocksEqual: true,
  controls: ['known-good', 'changed-value', 'extra-output', 'missing-output'],
  keys: expected.map(([key]) => key),
};
writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
~~~

Run:

~~~powershell
node .superpowers/sdd/task-4-validation/compare-reports.mjs '.superpowers/sdd/task-4-validation/before-soak.log' '.superpowers/sdd/task-4-validation/before-mc.log' '.superpowers/sdd/task-4-validation/after-soak.log' '.superpowers/sdd/task-4-validation/after-mc.log' '.superpowers/sdd/task-4-validation/report-comparison.json'
if ($LASTEXITCODE -ne 0) { throw 'Task4 complete deterministic report comparison failed' }
~~~

Generation diagnosis: compare all existing fixture/district/cast/dossier/secret/enemy/station metrics against the real predecessor. The helper consumes only gen:departed and does not mutate inputs; gen.ts gets one import, one call after all old sections and one returned key. An unexplained old-stream difference is a defect. If the new departed-sane invariant alone adds rejected seeds, report exact seeds/attempts/failures and the old versus new served fixtures; controller must explicitly approve any consequent generation rebaseline. Never weaken living-witness checks, reroll budgets, distribution floors, damage thresholds, rumor rules or report comparison. The intended new physical delta is restricted to actual avatar chapel-night encounters; existing harness scenarios should not be silently reclassified as that exception.

Before each commit, inspect the staged scope and diff. Use the controller's UTF-8 commit-message-file convention. Each unit must be green and committed-or-absent with its actual hash, affected tests and evidence reported. Final review reads all accumulated units, including the independent generation stream, current session/replay path, direct/remote sighting chain, missing-atom negative controls, optional-key absence, and the pure digest import fence. Apply the constraints to defects in plan-mandated code at full severity. A regression unexplained by the actual diff is BLOCKED; no pass claim by historical suite number.

## Author self-review and readiness

Forward pass (constraints -> 4A -> 4B -> 4C -> 4D): followed every retained value from generator after retargeting, through nonaliasing attachment, priced offered-frame action and explicit magic intel. Checked finite/aligned tick before mutation, half-open midnight window, no dead NPC/belief/extra claim, one campaign latch and successful-only session replay log. Checked silent physical observation, stable daily source timestamp, actual later spoken atom, separate principal receipt, pure evidence-only feature and exposure semantics. Termination is bounded by finite candidate sets, actual witnesses and existing held fingerprints; loops allocate no synthetic actor. One witness/venue/day grows at most one sighting record, feature pressure saturates per(kind,subject).

Reverse pass (4D -> 4C -> 4B -> 4A -> constraints): audited unit dependencies, fair-cop negative controls and simultaneous null-id collisions, then replay and fixture reachability back to generated ground truth. Corrected author API mistakes (world.coin, runUntil(world,endTick,rules), sourceKey(SourceRow)); preserved the observer-empty enemy-off nightly guard with an active-roster direct-control fixture; retained ordinary presence omission closure; classified player receipt as scene-presence; rejected present undefined metadata; added full nested ref copy and comparator identity instead of allowing the old flat-ref assumptions to persist. The two residue counterparts are explicit predecessor amendments, not concealed Task4 scope. Existing living/ordinary behavior is guarded by old tests and the complete report comparison.

Read-only static evidence: native Node/TypeScript compiler host over in-memory files parsed and semantically checked 11 complete authored modules (new production/helpers/tests plus the extracted auditor) together with the Task4 integration splices and the stated additive predecessor interface. After inserting Task3's positive claim-bearing voicings narrowing, the check reported zero diagnostics. It read current source through a53551d6e47fc575f7c306f43f9fa0ff836250cc and made no source/test/index writes. The overlay is a source/API check, not an executed implementation: it does not certify Task2/3 runtime behavior, full-project production typecheck, tests, lint, build, soak or MC. No proposed tests were run by this author. Those exact checks remain implementation gates above.

Author readiness: COMPLETE CODE AND TEST BODIES, both self-reviews complete; ready for independent PLAN review and controller adoption. NOT certified for immediate implementation dispatch: actual committed Task2/3 interfaces, the two reviewed residue-ref corrections, and the refreshed predecessor baseline still must be verified by the controller. No unresolved user choice is introduced. Engine-first scope leaves composer UI to the later plan. Do not claim implementation, runtime validation, or final feature completion from this author artifact.
