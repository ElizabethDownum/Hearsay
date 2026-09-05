# Plan 9 Task 3 — live scrying and physical residue

**Authored-by:** native Codex, inherited model binding (original draft and corrections 1–2; the seat did not expose an enforceable model name); recovery and correction 3 by `claude-fable-5-1` on 2026-09-05 under the explicit user authorization recorded in `.superpowers/sdd/task-3-claude-recovery-author-brief.md`. **Date:** 2026-09-05. **Status: CORRECTED COMPLETE AUTHOR DRAFT (recovered) — pending focused independent re-review.** The two Important physical-reference consumer findings in `.superpowers/sdd/task-3-plan-review-2026-09-05.md`, plus the auditor absent-marker fall-through confirmed after that review, are corrected below under the accepted correction brief and its recovery brief. Exact production edits, tests, file licenses, coherent commit units and author-review passes are present. No production implementation or test execution occurred in either authoring session. The original author's limited read-only syntax/type/API probes are documented below and in `.superpowers/sdd/task-3-author-report.md` with their limits; the recovery session ran no probe at all. Neither is a passing production gate. Dispatch still requires approved Task 1/2 completion and the actual Task 2 base/report logs.
**Spec:** `docs/design-spec.md:12-23,166-167,174-176,197-207,217-402`; original Task 3 at `docs/plans/archive/2026-07-05-plan-9.md:87-94`; accepted corrections R5/R6 in `docs/review/current.md`; audit Findings 2/3 in `.superpowers/sdd/p9-plan-audit-2026-09-05-report.md`.
**Base:** resumed documentation HEAD `0241fc8b82a633856a47c625d2b807753e9fa138`, game-code Task 1 recovery `caa5a38`, with root separately repairing R12/R13. Controller MUST record the real committed Task 2 completion hash in the dispatch header. No future hash is asserted here. The recovery session re-read the digest/state/auditor seams at the frozen `a53551d` working tree; the plan review already recorded that the relevant digest blob was unchanged from the brief baseline through that HEAD. **Order:** Task 1 approved → Task 2 approved → 3A → 3B → 3C1 → 3C2 → 3D → 3E → independent review.
**Gate:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run app:build`; final physics gate additionally `npm run soak`, `npm run mc` and complete deterministic-report comparison.
**Constraints file:** this document's binding constraints section is the Task 3 constraints artifact, alongside `.superpowers/sdd/plan11-constraints.md` and carried Plan 6/7/8 constraints. The author's two-file license forbids creating a third constraints file. Controller may extract this section verbatim into a dispatch-specific constraints file.
**Calibration:** the original author's exact model was unavailable and the recovery author is `claude-fable-5-1`; elevated independent review remains required because two authoring minds touched this document and neither executed it. The earlier "no Claude worker" wording recorded a temporary dispatch pause that has since expired; root's explicit fallback authorization supersedes it, and this draft still binds implementation and review seats by capability, not provider. All implementation units use `frontier_implementer`; independent `frontier_reviewer` capability must be at least the implementer's. This is a novel sensory/reporting boundary, not a mechanical transcription assignment despite the complete code below.

## Binding constraints

- A successful action purchases one next-day, half-open `[from,to)` minute window at one real venue. Integer minute endpoints are 15-aligned, `0 <= from < to <= 1440`, duration at most 60, cost `rules.economy.scrying = 15`. No cancellation, refunds, campaign cap, minimum material inventory, or extra access prerequisite is introduced. Repeated/overlapping purchases are separate paid operations with separate traces.
- Validate the tick, avatar, venue, day, endpoints, cost definition, and affordability before allocating state, debit, or chronicle writes. Invalid actions leave the entire world byte-identical. Scheduling is a solitary engine action like forge and has no circle target; no local composer ships under A7.
- Only `src/sim/perception.ts` projects raw `TickEvents` into observations. The scry sensor sees live positions/utterances/askings at its purchased venue and current tick; it never reads the chronicle, beliefs, schedule, whole-world clones, or fabricated circle membership. The mirror reports speech faithfully; it does not certify the speech as true.
- The sensor intentionally covers the original Task 3 three-channel contract: presence, ordinary utterance, asking. It does not read network payloads or residues. Expanding this contract is a controller decision, not a worker inference.
- Magic provenance is an optional additive discriminant. Old rows keep absent new keys and identical serialized bytes. An NPC literally named `scrying` or `seance` stays an NPC; spell channels never become web carriers or informant-ledger corroborators.
- At the purchased window's first tick, a physical trace appears even in an empty venue. Its existence is independent of reports. **Root's R5 refinement:** keep it physically present for the campaign; receipt must never erase/change the remotely visible trace and create a delivery oracle. Discovery, evidence, and feature deduplication are separate from physical existence.
- Locally present observers discover deterministically. A direct spymaster sighting may create enemy evidence immediately. Every other enemy observer holds a report, with no enemy evidence/sketch or player notification before lawful speech. A player avatar may observe locally, and operational player informants use the same held-report path.
- First physical discovery is once per `(trace,observer)`. Each principal has an independent held report for that observation. A report's terminal failure or omission does not erase the discovery; an actual later local encounter permits retry. Successful spoken delivery closes that principal/observer hold only. Merely delivering an empty envelope does not close residue forensics. Existing non-residue omission behavior remains unchanged.
- A dedicated `arcane-residue` evidence/ref/feature path names the actual observed trace and venue. `subject` and `family` are null; no caster identity, fabricated speaker, witness from a future patrol, or secret affiliation enters evidence. The digest keeps its exact four-import allow-list; it reads only enemy evidence and the enemy street map.
- All new world state is optional/lazy JSON. No entropy in action/perception/residue/digest; no new dependency, configuration exemption, new content art family, media search, process/network operation, or publication. Register only the already-planned scrying slot with a primitive fallback and necessary vocabulary.
- Preserve Task 2's `document?: true` on Utterance, utterance Observation, ReportedFieldObservation, and EvidenceEntry, and every conditional projection. Do not replace entire Task 2 branches with pre-Task-2 copies. All snippets below describe additive edits against that corrected base.
- Preserve five-phase tick ordering and all nightly dependency ordering. A sensor receives the final live event bundle once during record/capture after phases 2–4 and before environment. Residue activation is prior setup from a previously paid action; it does not alter movement/circles/offer tokens.
- One production writer/index owner at a time. Preserve unrelated documentation work. No pushes. Every unit is committed-or-absent and records its actual gate/test-count evidence in its assigned worker report.
- Emergent-behavior assertions are hypotheses. Failing acceptance → STOP and report evidence; never weaken thresholds, formulas, physics, seeds, or the approved spec. Untraceable existing-suite failure → BLOCKED. Plan-authored code is not presumed correct; report plan-mandated defects at full severity.

## Controller decision table (recommended executable branch below)

| ID | Recommendation encoded below | Concrete alternative and consequence | Basis |
|---|---|---|---|
| D1 | Sensor captures presence, utterances, askings only. | Include network speech as a fourth magic channel; this requires NetworkIntelEntry provenance, directive view audit and speech-only knowledge tests. Do not silently include it. | Original Task 3 explicitly enumerates three; R6 authorizes a live sensor, not a new payload access rule. |
| D2 | A new intel `scene-presence` row records every scry-visible person; ordinary `presence` continues to mean the existing watch feed. | Add a public occupation marker and teach counter-sketch/report how to classify it. That adds a separate semantic field and tests. | `fieldwork.ts` filters ordinary presence by watch occupation; `intel/report.ts` and `intel/countersketch.ts` treat every existing presence row as watch evidence. |
| D3 | Arcane residue is locally visible through ordinary perception to any actor; only existing principals/rosters capture and report it. Player intel gets a distinct residue row, without a hidden enemy-state signal. | Restrict detection to registered enemy observers/spymaster as inquisitors; this needs an explicit capability input to perception and a design rationale for asymmetric visibility. | R5 says actual observers; spec symmetric observability. No new detector skill/occupation has been approved. |
| D4 | Persist trace forever; retry the same held residue only after terminal failure/omission and a later physical encounter by that observer. No timer/RNG. | Once-per-day retry or finite expiry; introduces a new tuning constant. Retry solely on remote receipt state would weaken the physical-contact explanation. | Root's R5 refinement sent 2026-09-05; remote-observation and speech-only constraints. |
| D5 | One residue feature per venue for the campaign. Each paid cast still records its own trace and observed evidence. Repeated casts at that venue do not farm sketch count. | One feature per trace or district; changes pressure magnitude and must be explicitly ratified/measured. | Spec promises a distinctive location-based sketch feature, not a rumor-family heuristic; exposure counts distinct feature keys. This is a proposed v1 dedupe pin, not a sourced numeric balance fact. |
| D6 | Magic may supply real receive→tell observations for trait deduction, but duplicate views of the same telling count once when magic is among them. Magic adds no independent informant channel. | Exclude magic from automatic codex deductions altogether, or globally dedupe all old channels. The former throws away observed mechanics; the latter changes untouched baselines. | R6's channel-corrobation rule plus existing codex receive→emit mechanism and byte-compatibility requirement. |

**Controller adjudication:** root accepted D1–D6 during authorship on 2026-09-05 and owns recording them in the in-project review record. This author draft does not certify the code; the choices are no longer implementation forks. Do not ask Ellie or a worker to decide them again.

## Premise probes before dispatch

Read the committed source and report the exact signatures of `observationsFor`, `recordAndIngest`, `holdFieldObservation`, `ingestObservedFieldReport`, `receivePayload`'s field-report arm, `SketchEvidenceRef`, and `codexDetailView`. Confirm the Task 2 marker is present at every named boundary. Confirm the current import allow-list in `tests/sim/no-omniscience.test.ts` is exactly `['../../core/time', '../rules', '../rumors/claim', './state']`. Confirm `minuteOfDay`/`dayOf` use 1440 ticks/day, and that `recordAndIngest` currently skips enemy capture on empty speech ticks. That empty-tick guard MUST be widened for residue.

Take the full suite/report baseline from the actual Task 2 tree. The inherited 1710-test recovery number is historical and is not the Task 3 floor. No byte/hash/report pin is invented here. Controller owns the clean-tree check because Task 1 and Task 2 were still in progress during authorship.

## 3A — additive provenance and live perception (60–90 minutes)

**Model:** `frontier_implementer`; reviewer `frontier_reviewer` in a different thread.
**Files:** `src/intel/entry.ts`, `src/intel/provenance.ts` (new), `src/sim/perception.ts`, `tests/sim/scry-perception.test.ts` (new), `tests/intel/magic-provenance.test.ts` (new, first describe below). No other production writes in this unit.

Add to `src/intel/entry.ts` before `IntelEntry`:

```ts
export interface MagicProvenance {
  kind: 'magic';
  spell: 'scrying' | 'seance';
  operation: string;
}
```

Add `provenance?: MagicProvenance` to `IntelEntry`; widen its kind union with `'scene-presence'`. All ordinary factories omit new optional keys. Do not add fields to old rows at normalization time. The residue intel kind and residueId are added in 3C1.

Create `src/intel/provenance.ts`:

```ts
import type { IntelEntry, MagicProvenance } from './entry';

export type IntelSource =
  | { kind: 'self' }
  | { kind: 'dossier' }
  | { kind: 'informant'; id: string }
  | MagicProvenance;
export type SourceRow = Pick<IntelEntry, 'via' | 'provenance'>;

export function sourceOf(row: SourceRow): IntelSource {
  if (row.provenance !== undefined) return row.provenance;
  if (row.via === 'self') return { kind: 'self' };
  if (row.via === 'dossier') return { kind: 'dossier' };
  return { kind: 'informant', id: row.via };
}

/** Internal identity, not display text; JSON tuples cannot alias an arbitrary NPC id. */
export function sourceKey(row: SourceRow): string {
  const source = sourceOf(row);
  if (source.kind === 'magic') return JSON.stringify(['magic', source.spell]);
  return JSON.stringify(source.kind === 'informant'
    ? ['informant', source.id] : [source.kind]);
}

export function sourceLabel(row: SourceRow): string {
  const source = sourceOf(row);
  return source.kind === 'magic' ? `${source.spell} (magic)` : row.via;
}

export function isMagic(row: SourceRow): boolean {
  return sourceOf(row).kind === 'magic';
}

/** Magic is useful observation, never a second paid human channel. */
export function singleInformantChannel(rows: readonly SourceRow[]): string | null {
  const sources = rows.map(sourceOf).filter((source) => source.kind !== 'magic');
  if (sources.length === 0 || sources.some((source) => source.kind !== 'informant')) return null;
  const ids = new Set(sources.flatMap((source) => source.kind === 'informant' ? [source.id] : []));
  return ids.size === 1 ? [...ids][0]! : null;
}
```

In perception add the following exported sensor types:

```ts
export interface VenueSensor {
  kind: 'venue-sensor'; venue: VenueId; from: Tick; to: Tick;
}
export type SceneObservation = Extract<Observation, { kind: 'presence' | 'utterance' | 'asking' }>;
```

Factor the existing utterance-object construction into this helper, preserving Task 2's marker. Replace only the old `observations.push({...})` inside the existing utterance loop with `observations.push(utteranceObservation(u, u.addressedTo !== observer));`; do not change its gate. Observation's union is unchanged in 3A.

```ts
function utteranceObservation(u: Utterance, overheard: boolean): Extract<Observation, { kind: 'utterance' }> {
  return {
    kind: 'utterance', tick: u.tick, venue: u.venue,
    speaker: u.speaker, addressedTo: u.addressedTo, claim: u.claim,
    overheard, mode: u.mode,
    ...(u.document === true ? { document: true as const } : {}),
  };
}
```

Append this sensor. Tick equality deliberately excludes stale rows accidentally present in a caller's bundle; ordinary perception retains its prior behavior.

```ts
export function observationsAtVenue(sensor: VenueSensor, events: TickEvents): SceneObservation[] {
  if (events.tick < sensor.from || events.tick >= sensor.to) return [];
  const observations: SceneObservation[] = [];
  for (const [actor, venue] of Object.entries(events.positions).sort(([a], [b]) => a.localeCompare(b))) {
    if (venue === sensor.venue) observations.push({ kind: 'presence', tick: events.tick, venue, actor });
  }
  for (const u of events.utterances) {
    if (u.tick === events.tick && u.venue === sensor.venue) {
      observations.push(utteranceObservation(u, true));
    }
  }
  for (const a of events.askings) {
    if (a.tick === events.tick && a.venue === sensor.venue) observations.push({
      kind: 'asking', tick: a.tick, venue: a.venue,
      speaker: a.speaker, addressedTo: a.addressedTo, about: a.about,
      overheard: true, authority: a.authority,
    });
  }
  return observations;
}
```

Tests first — complete `tests/sim/scry-perception.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { observationsAtVenue, observationsFor, type TickEvents } from '../../src/sim/perception';
import type { Claim } from '../../src/sim/rumors/claim';

const claim: Claim = { id: 'c0', family: 'f0', parent: null, subject: 'a', predicate: 'stole',
  object: null, count: 2, severity: 3, place: null, attribution: 'someone' };
const sensor = { kind: 'venue-sensor' as const, venue: 'hall', from: 1440, to: 1500 };
const events = (tick: number): TickEvents => ({
  tick, positions: { a: 'hall', b: 'hall', outsider: 'well' },
  utterances: [{ tick, venue: 'hall', circleMembers: ['a', 'b'],
    speaker: 'a', addressedTo: 'b', claim, mode: 'answer', document: true }],
  askings: [{ tick, venue: 'hall', circleMembers: ['a', 'b'], speaker: 'b', addressedTo: 'a',
    about: { family: 'f0' }, authority: true }],
});

describe('live venue sensor', () => {
  it.each([1439, 1500, 1501])('excludes adjacent/outside tick %i', (tick) => {
    expect(observationsAtVenue(sensor, events(tick))).toEqual([]);
  });
  it.each([1440, 1455, 1499])('captures matching tick %i without an invented observer', (tick) => {
    const bundle = events(tick);
    const before = JSON.stringify(bundle);
    const seen = observationsAtVenue(sensor, bundle);
    expect(seen.map((row) => row.kind)).toEqual(['presence', 'presence', 'utterance', 'asking']);
    expect(seen.every((row) => row.tick === tick && row.venue === 'hall')).toBe(true);
    expect(seen.find((row) => row.kind === 'utterance')).toMatchObject({ claim, document: true });
    expect(JSON.stringify(bundle)).toBe(before);
    expect(observationsFor('scrying', bundle).observations).toEqual([]);
  });
  it('empty/mismatching venue gives no phantom content; stale utterances are rejected', () => {
    expect(observationsAtVenue({ ...sensor, venue: 'empty' }, events(1440))).toEqual([]);
    const bundle = events(1440);
    bundle.utterances[0]!.tick = 1439;
    expect(observationsAtVenue(sensor, bundle).filter((row) => row.kind === 'utterance')).toEqual([]);
  });
  it('ordinary circles and absent document keys stay unchanged', () => {
    const bundle = events(1440);
    delete bundle.utterances[0]!.document;
    bundle.positions.bystander = 'hall';
    expect(observationsFor('bystander', bundle).observations.every((row) => row.kind === 'presence')).toBe(true);
    const heard = observationsAtVenue(sensor, bundle).find((row) => row.kind === 'utterance')!;
    expect(Object.hasOwn(heard, 'document')).toBe(false);
  });
});
```

**RED:** new imports/types absent; after type work, the boundary tests fail until sensor projection exists. **Checksum:** 3 outside + 3 inside parameter rows plus 2 independent tests = 8 test cases in 3A. Do not change legacy perception expectations. In the provenance test file provided in 3D, 3A lands only the `row`/`magic` fixtures and the first `it.each(['scrying', 'seance'])` test plus the imports they use (`vitest`, `blankIntel`, `IntelEntry`, `sourceOf`, `sourceKey`, `sourceLabel`). All other provenance tests/imports land tests-first in 3D.

## 3B — paid schedule, live capture, physical trace (60–90 minutes)

**Files:** new `src/sim/magic.ts`; `src/sim/types.ts`, `src/sim/campaign.ts`, `src/sim/rules.ts`, `src/content/economy.ts`, `src/sim/phases.ts`, `src/sim/perception.ts`, `app/src/input/actions.ts`, `src/content/terms.ts`, `tests/app/jargon.test.ts`; new `tests/sim/helpers/scry-world.ts`, `tests/sim/scrying.test.ts`, `tests/app/magic-session.test.ts`. **Model/reviewer:** same frontier floors. Complete test bodies are collected in 3E for readability; they land tests-first with 3B.

Add `scrying: number` to `EconomyDef`, `scrying: 15` to `STANDARD_ECONOMY`, `scry: 'verb-scry'` to `VERB_TERM`. Add the first three term rows in 3D now so the action union is compile-complete. In `tests/app/jargon.test.ts`, append `'verb-scry', 'scrying', 'magic'` to the existing `LATER_PLAN_TERM_IDS` array. This is the test's explicitly designed later-plan subtraction mechanism; preserve `TASK_12_HEAD_TERM_COUNT`, `NEW_TERM_IDS`, and the eight-noun historical assertion unchanged. Add a type-only `MagicState` import to world types and `magic?: MagicState` to WorldState; no world initializer changes.

Add `export interface ResidueEvent { id: string; venue: VenueId; createdAt: Tick }` to perception and `residues?: ResidueEvent[]` to TickEvents. This is only physical event data; its observation union/capture behavior lands atomically in 3C1. No delivery or discovery field is exposed in ResidueEvent.

Create `src/sim/magic.ts`:

```ts
import { dayOf, TICKS_PER_DAY, type Tick } from '../core/time';
import { blankIntel } from './fieldwork';
import { canAfford, debitCoin } from './network/roster';
import { observationsAtVenue, type ResidueEvent } from './perception';
import type { TickEvents } from './perception';
import type { EntityId, VenueId } from './rumors/claim';
import type { Rules } from './rules';
import type { WorldState } from './types';

export interface ScryAction {
  tick: Tick; kind: 'scry'; venue: VenueId; day: number; from: number; to: number;
}
export interface ScryWindow {
  id: string; venue: VenueId; day: number; from: number; to: number;
}
export interface ArcaneTrace extends ResidueEvent {
  seenBy: { observer: EntityId; tick: Tick }[];
}
export interface MagicState {
  nextId: number;
  scries: ScryWindow[];
  traces: ArcaneTrace[];
}

export function applyScry(world: WorldState, action: ScryAction, rules: Rules): void {
  if (!Number.isInteger(action.tick) || action.tick < 0 || action.tick !== world.tick) {
    throw new Error('scry: action tick must equal the current tick');
  }
  if (world.playerId === null || !world.npcs[world.playerId]) throw new Error('scry: no avatar');
  if (typeof action.venue !== 'string' || !Object.hasOwn(world.venues, action.venue)) {
    throw new Error('scry: unknown venue');
  }
  if (!Number.isInteger(action.day) || action.day !== dayOf(world.tick) + 1) {
    throw new Error('scry: choose the next day');
  }
  if (!Number.isInteger(action.from) || !Number.isInteger(action.to)
    || action.from < 0 || action.to > TICKS_PER_DAY || action.from >= action.to
    || action.from % 15 !== 0 || action.to % 15 !== 0 || action.to - action.from > 60) {
    throw new Error('scry: choose a 15-aligned window of at most 60 minutes');
  }
  const cost = rules.economy.scrying;
  if (!Number.isInteger(cost) || cost < 0) throw new Error('scry: invalid price');
  if (!canAfford(world, cost)) throw new Error('scry: insufficient coin');
  const id = `s${world.magic?.nextId ?? 0}`;
  if (world.magic?.scries.some((row) => row.id === id)) throw new Error('scry: duplicate operation id');
  debitCoin(world, cost);
  const state = world.magic ?? (world.magic = { nextId: 0, scries: [], traces: [] });
  state.nextId += 1;
  state.scries.push({ id, venue: action.venue, day: action.day, from: action.from, to: action.to });
  world.chronicle.push({ kind: 'scry', tick: world.tick, operation: id,
    venue: action.venue, day: action.day, from: action.from, to: action.to });
}

/** Prior setup: the previous day's purchase begins, independent of whether anyone is present. */
export function beginScryWindows(world: WorldState, tick: Tick): void {
  const state = world.magic;
  if (state === undefined) return;
  for (const window of state.scries) {
    if (window.day * TICKS_PER_DAY + window.from !== tick) continue;
    if (state.traces.some((trace) => trace.id === window.id)) continue;
    state.traces.push({ id: window.id, venue: window.venue, createdAt: tick, seenBy: [] });
    world.chronicle.push({ kind: 'residue', act: 'created', tick,
      residueId: window.id, venue: window.venue, observer: null });
  }
}

/** Only physical fields are projected; delivery/seen latches never cross into live events. */
export function residueEvents(world: WorldState): ResidueEvent[] {
  return (world.magic?.traces ?? []).map(({ id, venue, createdAt }) => ({ id, venue, createdAt }));
}

export function captureScryIntel(world: WorldState, events: TickEvents): void {
  if (world.magic === undefined || world.playerId === null) return;
  for (const window of world.magic.scries) {
    const from = window.day * TICKS_PER_DAY + window.from;
    const to = window.day * TICKS_PER_DAY + window.to;
    if (events.tick < from || events.tick >= to) continue;
    const provenance = { kind: 'magic' as const, spell: 'scrying' as const, operation: window.id };
    for (const observation of observationsAtVenue({ kind: 'venue-sensor', venue: window.venue, from, to }, events)) {
      const base = { ...blankIntel(), tick: observation.tick, venue: observation.venue,
        via: 'scrying', provenance, overheard: true };
      if (observation.kind === 'presence') {
        world.intel.log.push({ ...base, kind: 'scene-presence', actor: observation.actor });
      } else if (observation.kind === 'asking') {
        world.intel.log.push({ ...base, kind: 'asking', speaker: observation.speaker,
          addressedTo: observation.addressedTo, about: observation.about, authority: observation.authority,
          family: 'family' in observation.about ? observation.about.family : null });
      } else {
        const { subject, predicate, object, count, severity, place, attribution } = observation.claim;
        world.intel.log.push({ ...base, kind: 'utterance', speaker: observation.speaker,
          addressedTo: observation.addressedTo, mode: observation.mode,
          claimId: observation.claim.id, family: observation.claim.family,
          reported: { subject, predicate, object, count, severity, place, attribution } });
      }
    }
  }
}
```

Add these world chronicle types and members without altering old rows:

```ts
export interface ScryRecord {
  kind: 'scry'; tick: Tick; operation: string; venue: VenueId;
  day: number; from: number; to: number;
}
export interface ResidueRecord {
  kind: 'residue'; act: 'created' | 'observed'; tick: Tick;
  residueId: string; venue: VenueId; observer: EntityId | null;
}
```

Campaign: import `applyScry, type ScryAction` from `./magic`, append `| ScryAction` to Action, and insert this switch arm before `default`:

```ts
    case 'scry':
      if (!rules) throw new Error('applyAction: scry requires rules (economy prices)');
      applyScry(world, action, rules);
      break;
```

Phases: import `beginScryWindows`, `residueEvents`, `captureScryIntel` from `./magic`. Immediately after `consumePrior(world, frame.prior);` add `beginScryWindows(world, frame.tick);`. Immediately after creating `events`/conditionally attaching network speeches, add:

```ts
  if (world.magic !== undefined && world.magic.traces.length > 0) events.residues = residueEvents(world);
```

Immediately after `captureIntel(world, events, rules);` call `captureScryIntel(world, events);`. Leave artifact tail/environment/queue ordering intact. No cloning the world or chronicle in these hooks. Existing preview logic need not materialize traces because traces do not change the current circle offer or action validity; preview remains mutation-free, tested below.

**Commit boundary:** 3B emits persistent physical data and scry intel but has not yet added a residue Observation arm. It therefore requires no temporary exhaustive-consumer casts. 3C1 introduces that arm with every consumer and its mechanism tests in the same commit.

## 3C — lawful residue discovery, retry, evidence and digest (75–90 minutes)

**Model:** `frontier_implementer`; independent `frontier_reviewer`. Execute in two sequential 60–90 minute units, not one oversized union expansion. **3C1 files:** new `src/sim/residue.ts`; `src/intel/entry.ts`, `src/sim/perception.ts`, `src/sim/phases.ts`, `src/sim/enemy/state.ts`, `src/sim/enemy/digest.ts` (voicings type narrowing only), `src/sim/counterintel.ts`, `src/sim/fieldwork.ts`, `src/sim/directives/types.ts`, `src/sim/directives/field-reports.ts`, `src/sim/directives/transport.ts`, `tests/sim/scry-perception.test.ts`, new `tests/sim/scry-residue.test.ts`. **3C2 files:** `src/sim/enemy/state.ts` (SketchFeature/SketchEvidenceRef only), `src/sim/enemy/digest.ts` (ref/feature rule, sameRefs physical identity and runaround's conditional nested copy), `tests/sim/scry-residue.test.ts` (feature assertions/test below), `tests/sim/sketch-faircop.test.ts`, new `tests/sim/helpers/sketch-audit.ts`, new `tests/sim/scry-ref-runaround.test.ts`. The SketchEvidenceRef widening, sameRefs migration, nested-copy migration and the auditor's required `residue` discriminant for `arcane-residue` features are one atomic 3C2 unit; none may be deferred to Task 4.

In 3C1 add `'arcane-residue'` to IntelEntry.kind and `residueId?: string` to IntelEntry. Add this exported observation type to perception, and append `| ResidueObservation` to Observation:

```ts
export interface ResidueObservation {
  kind: 'arcane-residue'; tick: Tick; venue: VenueId; residueId: string; witness: EntityId;
}
```

Immediately before observationsFor's existing return, append:

```ts
  if (myVenue !== undefined) {
    for (const residue of events.residues ?? []) {
      if (residue.venue !== myVenue || residue.createdAt > events.tick) continue;
      observations.push({ kind: 'arcane-residue', tick: events.tick, venue: myVenue,
        residueId: residue.id, witness: observer });
    }
  }
```

In recordAndIngest widen only the existing captureEvidence guard to:

```ts
  if (utterances.length > 0 || askings.length > 0 || networkSpeeches.length > 0
    || (events.residues?.length ?? 0) > 0) {
    captureEvidence(world, events, rules);
  }
```

Append to the `live venue sensor` describe in `scry-perception.test.ts`:

```ts
  it('residue is visible only to real local observers; report bookkeeping is not an event', () => {
    const bundle = events(1440);
    bundle.residues = [{ id: 's0', venue: 'hall', createdAt: 1440 }];
    expect(observationsFor('b', bundle).observations).toContainEqual({
      kind: 'arcane-residue', tick: 1440, venue: 'hall', residueId: 's0', witness: 'b',
    });
    expect(observationsFor('outsider', bundle).observations).toEqual([]);
    expect(observationsFor('absent', bundle).observations).toEqual([]);
    expect(observationsAtVenue(sensor, bundle).map((row) => row.kind)).toEqual(['presence', 'presence', 'utterance', 'asking']);
    bundle.residues[0]!.createdAt = 1441;
    expect(observationsFor('b', bundle).observations.some((row) => row.kind === 'arcane-residue')).toBe(false);
  });
```

3C1 lands the first six residue tests below with the first test's feature/exposure assertion block and direct test's final feature assertion withheld for 3C2. Omit the unused exposure import until 3C2. 3C2 adds those exact assertions and the final `two paid traces` test tests-first before the dedicated digest feature. Evidence/ref widening never commits with a synthetic speaker or an unhandled union branch.

Add this arm to `ReportedFieldObservation` (before the terminating semicolon):

```ts
  | { kind: 'arcane-residue'; observedAt: Tick; venue: VenueId; residueId: string; witness: EntityId }
```

In `enemy/state.ts`, add:

```ts
export interface ResidueEvidenceData {
  id: string; witness: EntityId; observedAt: Tick;
}
export interface PhysicalReceipt {
  tick: Tick; observer: EntityId; messageId: MessageId;
}
```

Append this evidence union arm. Add `residue?: never; receipt?: never` to each existing evidence arm so inspecting the optional fields is type-safe without changing serialized values.

```ts
  | (Omit<EvidenceBase, 'speaker' | 'addressedTo'> & {
      kind: 'arcane-residue'; speaker: null; addressedTo: null; mode: null;
      claimId: null; family: null; reported: null; about: null;
      network?: never; leaked?: never;
      residue: ResidueEvidenceData;
      receipt?: PhysicalReceipt;
    })
```

Add `residue?: ResidueEvidenceData` to `SketchEvidenceRef`. Add `'arcane-residue'` to `SketchFeature.kind` (preserve Task 2's `'forged-document'`); add `venue?: VenueId` to SketchFeature, emitted only by residue features. Update its documentation: old claim/network/asking refs retain their existing resolution; a residue ref requires both ids null and resolves to physical sighting plus any actual report receipt.

Create `src/sim/residue.ts`:

```ts
import type { IntelEntry } from '../intel/entry';
import type { ResidueObservation } from './perception';
import type { ReportedFieldObservation } from './directives/types';
import type { PhysicalReceipt } from './enemy/state';
import type { WorldState } from './types';

export type ReportedResidue = Extract<ReportedFieldObservation, { kind: 'arcane-residue' }>;

/** Called only for a local perception observation, never when a remote report arrives. */
export function rememberResidueSighting(world: WorldState, observation: ResidueObservation): ResidueObservation {
  const trace = world.magic?.traces.find((row) => row.id === observation.residueId);
  if (!trace || trace.venue !== observation.venue || observation.tick < trace.createdAt
    || !world.npcs[observation.witness]) throw new Error('residue: invalid physical sighting');
  const previous = trace.seenBy.find((row) => row.observer === observation.witness);
  if (previous) return { ...observation, tick: previous.tick };
  trace.seenBy.push({ observer: observation.witness, tick: observation.tick });
  world.chronicle.push({ kind: 'residue', act: 'observed', tick: observation.tick,
    residueId: trace.id, venue: trace.venue, observer: observation.witness });
  return { ...observation };
}

export function reportResidue(observation: ResidueObservation): ReportedResidue {
  return { kind: 'arcane-residue', observedAt: observation.tick, venue: observation.venue,
    residueId: observation.residueId, witness: observation.witness };
}

export function sameResidue(a: ReportedResidue, b: ReportedResidue): boolean {
  return a.residueId === b.residueId && a.venue === b.venue
    && a.witness === b.witness && a.observedAt === b.observedAt;
}

/** Consumes only the observed/spoken atom. Never looks up a trace to complete missing speech. */
export function ingestEnemyResidue(
  world: WorldState, observation: ReportedResidue, receipt?: PhysicalReceipt,
): void {
  if (world.enemy.evidence.some((entry) => entry.kind === 'arcane-residue'
    && entry.residue.id === observation.residueId)) return;
  world.enemy.evidence.push({
    tick: observation.observedAt, venue: observation.venue, observer: observation.witness,
    kind: 'arcane-residue', overheard: false, speaker: null, addressedTo: null,
    mode: null, claimId: null, family: null, reported: null, about: null,
    residue: { id: observation.residueId, witness: observation.witness, observedAt: observation.observedAt },
    ...(receipt === undefined ? {} : { receipt: { ...receipt } }),
  });
}

/** Player knowledge likewise dedupes the trace, never changes physical existence. */
export function ingestPlayerResidue(
  world: WorldState, observation: ReportedResidue, via: string,
): void {
  if (world.intel.log.some((entry) => entry.kind === 'arcane-residue'
    && entry.residueId === observation.residueId)) return;
  const row: IntelEntry = {
    tick: observation.observedAt, venue: observation.venue, via, kind: 'arcane-residue',
    overheard: false, speaker: null, addressedTo: null, mode: null, authority: false,
    claimId: null, family: null, reported: null, about: null, actor: null, npc: null, trait: null,
    edgeFrom: null, edgeTo: null, edgeKind: null, hintAbout: null, hintWitness: null,
    residueId: observation.residueId,
  };
  world.intel.log.push(row);
}

```

`PhysicalReceipt` is the shared additive seam for Task 4's separately authored night-visit evidence. Receipt lives only on EvidenceEntry; SketchEvidenceRef resolves to that entry instead of copying its receipt. Task 3 does not add night-visit types or behavior.

In `counterintel.ts`, import `rememberResidueSighting`, `reportResidue`, `ingestEnemyResidue`. Extend `noticedByObserver`'s return with `|| observation.kind === 'arcane-residue'`. In `ingestEnemyObservation`, insert before the existing utterance branch:

```ts
  if (observation.kind === 'arcane-residue') {
    ingestEnemyResidue(world, reportResidue(rememberResidueSighting(world, observation)));
    return;
  }
```

The spymaster loop owns this immediate call. Non-spymasters still enter the existing `holdFieldObservation` call; do not invoke `ingestEnemyResidue` from candidate collection. In `fieldwork.ts`, import `rememberResidueSighting`, `reportResidue`, `ingestPlayerResidue`, and add the same early residue arm to `appendOwnObservation`, using `ingestPlayerResidue(world, reportResidue(rememberResidueSighting(world, observation)), 'self')`. Change its final bare `else` to `else if (observation.kind === 'network-speech')` to keep new kinds explicit. No watch-occupation filter is applied to residue.

In `directives/field-reports.ts`, import `rememberResidueSighting`, `reportResidue`, `ingestPlayerResidue`, `ingestEnemyResidue` from `../residue`, plus `type PhysicalReceipt` from `../enemy/state`. In `holdFieldObservation`, after the three existing argument validations but before root construction, add:

```ts
  const encounterAt = content.kind === 'raw' && content.observation.kind === 'arcane-residue'
    ? content.observation.tick : null;
  if (content.kind === 'raw' && content.observation.kind === 'arcane-residue') {
    content = { kind: 'raw', observation: rememberResidueSighting(world, content.observation) };
  }
```

Replace the existing `if (existing) return existing.id;` with:

```ts
  if (existing) {
    if (encounterAt !== null && encounterAt > existing.observedAt
      && existing.deliveredAt === null && existing.queuedIn !== null) {
      const attempt = state.messages.find((message) => message.id === existing.queuedIn);
      if (attempt && (attempt.failedAt !== null || attempt.deliveredAt !== null)) {
        existing.queuedIn = null;
      }
    }
    return existing.id;
  }
```

This preserves one discovery/held-root id while permitting a new envelope on a later local encounter. A queued nonterminal report is never duplicated. A held residue that has been successfully spoken never resets. The first raw sighting timestamp remains stable; report time is the actual later speech. No retry changes an ordinary held row. Missing/corrupt message association is a reportable save defect, not permission to create more attempts.

Add this case to `rawReportedObservation`:

```ts
    case 'arcane-residue':
      return reportResidue(observation);
```

In `projectReportedObservation`, after computing `candor`, add:

```ts
  if (observation.kind === 'arcane-residue' && candor !== 'ordinary') return null;
```

Add this case to its switch:

```ts
    case 'arcane-residue':
      return { ...observation };
```

Reason: a residual visual fact has no registered seven-field rumor transform. Ordinary reporting faithfully preserves its atom; guarded/omissive/doctored channels may withhold it. This is D4's disclosed finite behavior, not a new invented way to change venue/witness identity. Existing claim/asking/presence/network projections are untouched, including the Task 2 document marker.

In `ingestPlayerItem`, make the final bare `else` explicitly `else if (observation.kind === 'network-speech')`; insert this new arm before it:

```ts
  } else if (observation.kind === 'arcane-residue') {
    ingestPlayerResidue(world, observation, via);
```

Keep the common `factRefs` loop after the chain. In `ingestEnemyItem`, add a final parameter `physicalReceipt: PhysicalReceipt`; immediately after binding `observation`, add:

```ts
  if (observation.kind === 'arcane-residue') {
    ingestEnemyResidue(world, observation, physicalReceipt);
    return;
  }
```

In `ingestObservedFieldReport` replace ONLY the enemy-side item loop with:

```ts
    const receiver = world.network.spymaster;
    if (receiver === null) return;
    for (const item of speech.spoken.items) ingestEnemyItem(world, speech.speaker, item, {
      tick: speech.tick, observer: receiver, messageId: speech.messageId,
    });
```

The function is reached through ordinary spymaster perception; the receipt ref uses the spymaster who actually heard the report, while the physical ref uses the original witness. Do not substitute a hidden payload origin for either identity. Legacy utterance/asking/network evidence continues using `speech.speaker` exactly as before.

In `transport.ts`, import `reportResidue`, `sameResidue` from `../residue`. Replace ONLY the `if (held.deliveredAt === null) held.deliveredAt = t;` line in the field-report receipt arm with:

```ts
        const residue = held.content.kind === 'raw'
          ? (held.content.observation.kind === 'arcane-residue'
              ? reportResidue(held.content.observation) : null)
          : (held.content.observation.kind === 'arcane-residue' ? held.content.observation : null);
        const wasSpoken = residue === null || spoken.items.some((item) =>
          item.observation.kind === 'arcane-residue' && sameResidue(residue, item.observation));
        if (wasSpoken && held.deliveredAt === null) held.deliveredAt = t;
```

This intentionally preserves the existing test named “omitted atoms still close every bound source id at final receipt” for ordinary observations. Add the residue-specific negative control instead of weakening that old test. Root/held metadata may associate the atom, but only `spoken.items` proves it arrived.

Digest, no import changes: extend the existing `ref(e)` object literal with:

```ts
    ...(e.kind === 'arcane-residue' ? { residue: { ...e.residue } } : {}),
```

In the same 3C2 commit, replace the existing module-private `sameRefs` declaration with this exact comparator. Preserve its current comment and keep it private; tests exercise `enemyDigest`, not an exported testing surrogate:

```ts
const sameRefs = (a: readonly SketchEvidenceRef[], b: readonly SketchEvidenceRef[]): boolean =>
  a.length === b.length && a.every((ref, i) => ref.tick === b[i]!.tick
    && ref.observer === b[i]!.observer && ref.claimId === b[i]!.claimId
    && ref.messageId === b[i]!.messageId
    && ref.residue?.id === b[i]!.residue?.id
    && ref.residue?.witness === b[i]!.residue?.witness
    && ref.residue?.observedAt === b[i]!.residue?.observedAt);
```

All legacy fields and ordering remain part of identity. Valid physical refs have a required string residue id, so an absent residue discriminator cannot equal a present one merely because both speech ids are null. Exact cloned residue values still compare equal. Task 4 will append its corresponding nightVisit field comparisons to this complete Task 3 predecessor; it must preserve the residue comparisons.

Also in 3C2, replace only runaround's `evidence: lead.evidence.map((row) => ({ ...row })),` with:

```ts
      evidence: lead.evidence.map((row) => ({
        ...row,
        ...(row.residue === undefined ? {} : { residue: { ...row.residue } }),
      })),
```

This restores the source's existing independent-copy contract after the nested field is added. It omits absent keys and retains ordinary key order; no whole-state/JSON clone or new production import is licensed. Task 4 can add the analogous conditional nightVisit copy. The feature's subject semantics, runaround thresholds, earned-night ledger and tail rules do not change.

Inside each suspicious-family loop, replace `const voicings = familyEntries.filter((e) => e.reported !== null);` with the positive claim-bearing type predicate. Only the current utterance/network arms can contain reported claims; later physical null-speaker variants remain excluded automatically:

```ts
    const voicings = familyEntries.filter(
      (e): e is Extract<EvidenceEntry, { kind: 'utterance' | 'network' }> => e.reported !== null,
    );
```

After Task 2's paper-forensics rule and before heuristic 8 (so the ordinary district-count machinery can see the new feature), add:

```ts
  for (const e of state.evidence) {
    if (e.kind !== 'arcane-residue') continue;
    if (has((f) => f.kind === 'arcane-residue' && f.venue === e.venue)) continue;
    addFeature({
      kind: 'arcane-residue', day, family: null, subject: null,
      venue: e.venue, district: districtOf.get(e.venue) ?? null,
      detail: `arcane residue observed at ${e.venue} (day ${dayOf(e.residue.observedAt)})`,
      evidence: [ref(e)],
    });
  }
```

No new rumor family, claim, origin-vague, or carrier-profile is created. There is no new bespoke watch rule: the current heuristic 8 may count the resulting district feature under its unchanged prerequisites. Empty/unknown-map district stays null; no hidden world lookup fills it. Existing exposure's null-subject handling remains intact; test it, do not alter it.

**Compiler completion check:** residue's null speaker must not force weakening EvidenceBase for old variants. Use narrowing at the genuine claim-bearing boundary only. Search every `EvidenceEntry`/`Observation`/`ReportedFieldObservation` consumer and resolve new exhaustiveness cases by an explicit residue arm. No `as any`, cast to utterance, synthetic claim, or blanket default return is licensed.

## 3D — every provenance consumer, vocabulary and primitive fallback (60–90 minutes)

**Files:** `src/intel/board.ts`, `src/intel/types.ts`, `src/intel/web.ts`, `src/intel/ledger.ts`, `src/intel/report.ts`, `src/intel/codex.ts`, `src/content/terms.ts`, `app/src/main.tsx`, `app/src/panels/EvidenceBoard.tsx`, `app/src/panels/InformantLedger.tsx`, `app/src/panels/WebViewPanel.tsx`, `app/src/panels/EveningReport.tsx`, `app/src/panels/Codex.tsx`, `assets/manifest.json`, `app/src/assets.ts`, `docs/asset-slots.md`; `tests/intel/magic-provenance.test.ts`, `tests/app/jargon.test.ts`, new `tests/app/magic-provenance.test.tsx`. **Model:** `frontier_implementer`; reviewer `frontier_reviewer`. Exact vocabulary/manifest edits remain in this serial unit.

No change is needed in `countersketch.ts`: the explicit `scene-presence` kind keeps ordinary people out of its existing `presence` watch branch. Authority askings and compelled answers observed through magic remain real signals. No change is needed to NetworkIntelEntry/Directives/Network panel via handling: D1 does not create magic network rows. Record both non-edits in the source-consumer inventory, not as an unsearched assumption.

1. Add `provenance?: IntelEntry['provenance']` to RouteHop. In `routeOf`'s early-return condition add `|| e.speaker === null || e.addressedTo === null`; in its push append `...(e.provenance === undefined ? {} : { provenance: { ...e.provenance } })`. No new key on old routes. This is the Task 4 agreement: séance testimony with null endpoints can cluster, but is not a fictional living-person route. Real scry speech retains its actual endpoints.
2. `web.ts`: import `isMagic`; add optional `magicEntryIndexes?: number[]` to WebView. In the carrier-collection loop, extend its early return with `|| isMagic(e)`. Before returning compute `const magicEntryIndexes = log.flatMap((e, i) => isClaimful(e) && matchedFamilies.has(e.family) && isMagic(e) ? [i] : []);`. Return the existing four fields plus `...(magicEntryIndexes.length === 0 ? {} : { magicEntryIndexes })`. Actual speaker names remain on board routes, but neither a spell nor its observed speaker is mislabeled a person who reported to the player. In WebViewPanel after its existing summary paragraph add:

```tsx
      {web.magicEntryIndexes && <p className="desk-note"><Term id="magic" />: {web.magicEntryIndexes.length} observation(s)</p>}
```

3. `ledger.ts`: import `isMagic`. First loop's guard becomes `if (isMagic(e) || e.via !== via) return;`. The other-channel loop's guard becomes `if (isMagic(e) || e.family === null || e.via === via || !ownFamilies.has(e.family)) return;`. In summaryOf immediately before `return e.kind;` add `if (e.kind === 'arcane-residue') return 'Physical trace at ' + e.venue;`. Keep API and all old row outputs unchanged. An NPC called `scrying` gets only its actual reports; magic does not appear in `otherVias`. In InformantLedger replace `<td>{r.kind}</td>` with `<td>{r.kind === 'arcane-residue' ? <Term id="arcane-residue" /> : r.kind}</td>` so the newly visible physical kind has registered vocabulary.
4. `report.ts`: add optional `magicBySpell?: Record<string, number[]>` to EveningReport. Create `const magicBySpell = new Map<string, number[]>();` next to entriesByViaMap. In the day-filtered loop replace only the three via-bucketing lines with:

```ts
    const target = e.provenance === undefined ? entriesByViaMap : magicBySpell;
    const key = e.provenance === undefined ? e.via : e.provenance.spell;
    const bucket = target.get(key);
    if (bucket) bucket.push(i);
    else target.set(key, [i]);
```

Return its original four fields plus:

```ts
    ...(magicBySpell.size === 0 ? {} : { magicBySpell: Object.fromEntries(
      [...magicBySpell.entries()].sort(([a], [b]) => byId(a, b)),
    ) }),
```

EveningReport panel: immediately after its ordinary via list add:

```tsx
      {report.magicBySpell && <ul>{Object.entries(report.magicBySpell).map(([spell, indexes]) => (
        <li key={spell}><span className="badge badge-via"><Term id="magic" /> · {spell}</span> {indexes.length} observation(s)</li>
      ))}</ul>}
```

5. `codex.ts`: import `isMagic` and add this module helper:

```ts
function physicalTellingKey(e: IntelEntry): string {
  return JSON.stringify([e.tick, e.venue, e.speaker, e.addressedTo, e.family, e.claimId, e.mode]);
}
```

In `observedPairs`' tell early return, add `|| (isMagic(tell) && tell.addressedTo === null)`. In its addressed-receive condition append `&& (!isMagic(rec) || rec.speaker !== null)`. Existing null-speaker tell guard stays. Thus Task 4's testimony with both endpoints null supplies neither a fake speaker nor a fake receiver; scry's real receive/tell events still supply deductions.

Replace only `return pairs;` at the end of `observedPairs` with:

```ts
  const magicTellings = new Set(log.filter((e) => isClaimful(e) && isMagic(e)).map(physicalTellingKey));
  if (magicTellings.size === 0) return pairs;
  const counted = new Set<string>();
  return pairs.filter((pair) => {
    const key = physicalTellingKey(log[pair.toldIndex]!);
    if (!magicTellings.has(key)) return true;
    if (counted.has(key)) return false;
    counted.add(key);
    return true;
  });
```

The stable first pair for an actual telling wins among duplicate observations; this is not a new count threshold. No global dedupe changes old no-magic worlds. Two differing physical telling acts (tick/addressee/claim/mode) remain two acts. Ambiguous trait transforms retain the old overlapping fingerprints.

6. `app/src/main.tsx`: import `sourceLabel`, `singleInformantChannel`, `isMagic`. Replace the body of the map callback in `codexDetailView` with:

```ts
    const hits = corroborations(log, h.npc, h.trait, rules);
    const rows = hits.flatMap((hit) => [log[hit.receivedIndex]!, log[hit.toldIndex]!]);
    const pairs = hits.map((hit) => ({
      family: hit.family,
      viaFrom: sourceLabel(log[hit.receivedIndex]!), viaTo: sourceLabel(log[hit.toldIndex]!),
      changeCount: hit.changes.length,
    }));
    const singleChannelVia = singleInformantChannel(rows);
    return { npc: h.npc, trait: h.trait, hits: pairs.length, locked: pairs.length >= 3,
      pairs, singleChannelVia, ...(rows.some(isMagic) ? { hasMagic: true as const } : {}) };
```

Add `hasMagic?: true` to CodexDetailRow. Preserve the old single-channel badge rendering when `!r.hasMagic`; for a mixed magic/human row, use this conditional content inside the same badge span:

```tsx
{r.hasMagic ? <> one informant channel — {r.singleChannelVia}</>
  : <> single-channel — rests entirely on {r.singleChannelVia}&apos;s reports</>}
```

The span's guard remains `r.locked && r.singleChannelVia`; all-magic pairs have no human-channel badge. This avoids falsely claiming a mixed pair rests entirely on one informant while still refusing to count magic as another informant.

7. EvidenceBoard: import `sourceKey`, `sourceLabel` from `../../../src/intel/provenance`. Replace `viasOf` with:

```ts
  const viasOf = (entryIndexes: number[]) => [...new Map(entryIndexes.map((i) => {
    const row = view.entries[i]!;
    return [sourceKey(row), { key: sourceKey(row), label: sourceLabel(row) }] as const;
  })).values()].sort((a, b) => a.label < b.label ? -1 : a.label > b.label ? 1
    : a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
```

The cluster badge callback becomes `map((v) => <span key={v.key} className="badge badge-via">{v.label}</span>)`. In RawNotes replace `{e.via}` with `{sourceLabel(e)}` and the raw kind token with `{e.kind === 'scene-presence' ? <><Term id="scene-presence" /> {e.actor}</> : e.kind === 'arcane-residue' ? <Term id="arcane-residue" /> : e.kind}`. In route badge replace `{h.via}` with `{sourceLabel(h)}`. Ordinary source text/order stays unchanged for normal ids; grouping uses identity, never display text.
8. Add these term rows to TERMS (the first three land in 3B; the last two land now). Append `'scene-presence', 'arcane-residue'` to `tests/app/jargon.test.ts`'s `LATER_PLAN_TERM_IDS`, preserving every earlier id and the old eight-noun assertion:

```ts
  'verb-scry': { id: 'verb-scry', label: 'Scry', short: 'Buy a remote scene tomorrow: up to an hour, in 15-minute steps. Costs 15 coin and leaves physical residue.', entry: null },
  'scrying': { id: 'scrying', label: 'Scrying', short: 'A view of one venue as events happen. It shows words faithfully; the words themselves may be false.', entry: null },
  'magic': { id: 'magic', label: 'Magic', short: 'Observation through a ritual. It supplies no independent informant channel.', entry: null },
  'scene-presence': { id: 'scene-presence', label: 'Seen in the scene', short: 'A person visible at a known venue and time. Presence alone does not say they serve the watch.', entry: null },
  'arcane-residue': { id: 'arcane-residue', label: 'Arcane residue', short: 'A physical trace where scrying begins. Local witnesses may report it; it does not name the caster.', entry: null },
```

Register `"icon.ui.scrying": null` adjacent to existing ui-icon manifest keys and `scrying: '◉'` in UI_GLYPHS. Append to the existing asset slot documentation:

```md
Plan 9 Task 3 registers `icon.ui.scrying` as null; primitive fallback `◉`.
No media is wired. The planned séance and debrief slots remain their own tasks.
```

No composer/button/keymap or magic realtime alert is added. These are the existing panel reading surfaces and compile-forced action vocabulary.

Complete `tests/intel/magic-provenance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import type { IntelEntry } from '../../src/intel/entry';
import { sourceOf, sourceKey, sourceLabel, singleInformantChannel } from '../../src/intel/provenance';
import { webView } from '../../src/intel/web';
import { informantLedger } from '../../src/intel/ledger';
import { eveningReport } from '../../src/intel/report';
import { corroborations, codexStatus } from '../../src/intel/codex';
import { routeOf } from '../../src/intel/board';
import { counterSignals } from '../../src/intel/countersketch';
import { STANDARD_RULES as R } from '../../src/content/rules';

const row = (over: Partial<IntelEntry> = {}): IntelEntry => ({
  ...blankIntel(), tick: 0, venue: 'hall', via: 'scrying', kind: 'utterance', overheard: true,
  speaker: 'a', addressedTo: 'b', claimId: 'c0', family: 'f0', mode: 'telling',
  reported: { subject: 'a', predicate: 'stole', object: null, count: 2,
    severity: 3, place: null, attribution: 'someone' }, ...over,
});
const magic = (entry: IntelEntry, operation = 's0'): IntelEntry => ({ ...entry,
  via: 'scrying', provenance: { kind: 'magic', spell: 'scrying', operation } });

describe('magic provenance is additive and distinct from an NPC id', () => {
  it.each(['scrying', 'seance'])('keeps the real NPC named %s an informant', (id) => {
    const entry = row({ via: id });
    const bytes = JSON.stringify(entry);
    expect(sourceOf(entry)).toEqual({ kind: 'informant', id });
    expect(sourceKey(entry)).not.toBe(sourceKey(magic(entry)));
    expect(sourceLabel(entry)).toBe(id);
    expect(JSON.stringify(entry)).toBe(bytes);
    expect(Object.hasOwn(entry, 'provenance')).toBe(false);
  });
  it('magic is no carrier or ledger cross-check, while actual NPC reports still count', () => {
    const log = [row(), magic(row()), row({ via: 'ada' })];
    expect(webView(log, { kind: 'npc', id: 'a' }).spokes.map((spoke) => spoke.carrier)).toEqual(['ada', 'scrying']);
    expect(webView([magic(row())], { kind: 'npc', id: 'a' })).toMatchObject({
      spokes: [], magicEntryIndexes: [0], families: [{ family: 'f0' }],
    });
    expect(informantLedger(log, 'scrying').rows.map((entry) => entry.entryIndex)).toEqual([0]);
    expect(informantLedger([row({ via: 'ada' }), magic(row())], 'ada').corroboratedElsewhere).toEqual([]);
    expect(singleInformantChannel([row({ via: 'ada' }), magic(row())])).toBe('ada');
    expect(singleInformantChannel([magic(row())])).toBeNull();
    expect(singleInformantChannel([row({ via: 'ada' }), row({ via: 'bez' })])).toBeNull();
  });
  it('board route and report preserve a magic badge without changing an old source bucket', () => {
    const log = [row(), magic(row())];
    expect(routeOf(log, 'f0')[0]).not.toHaveProperty('provenance');
    expect(routeOf(log, 'f0')[1]).toHaveProperty('provenance.spell', 'scrying');
    expect(eveningReport(log, 0)).toMatchObject({ entriesByVia: { scrying: [0] }, magicBySpell: { scrying: [1] } });
    expect(eveningReport([row()], 0)).not.toHaveProperty('magicBySpell');
  });
  it('unfiltered scene occupants are not automatically watch sightings', () => {
    const scene = magic(row({ kind: 'scene-presence', family: null, reported: null, actor: 'a' }));
    expect(counterSignals([scene])).toEqual([]);
    expect(eveningReport([scene], 0).authoritySightings).toEqual([]);
    expect(counterSignals([{ ...scene, kind: 'presence' }])[0]?.kind).toBe('watch');
  });
  it('three copies of one telling do not manufacture a codex lock; three actual acts can', () => {
    const receive = row({ tick: 10, via: 'ada' });
    const tell = row({ tick: 11, via: 'ada', speaker: 'b', addressedTo: 'a', claimId: 'c1',
      reported: { ...row().reported!, count: 4, severity: 4 } });
    const log = [receive, tell, magic(tell), magic(tell, 's1')];
    expect(corroborations(log, 'b', 'exaggerator', R)).toHaveLength(1);
    const hypothesis = [{ npc: 'b', trait: 'exaggerator', proposedAt: 0 }];
    expect(codexStatus(log, hypothesis, R)[0]).toMatchObject({ hits: 1, locked: false });
    const actualActs = [magic(receive), magic(tell), magic({ ...tell, tick: 26 }), magic({ ...tell, tick: 41 })];
    expect(codexStatus(actualActs, hypothesis, R)[0]).toMatchObject({ hits: 3, locked: true });
  });
  it('the shared seance provenance can carry testimony without inventing a living route or carrier', () => {
    const testimony = row({ via: 'seance', speaker: null, addressedTo: null,
      provenance: { kind: 'magic', spell: 'seance', operation: 'seance:departed-0' } });
    expect(sourceLabel(testimony)).toBe('seance (magic)');
    expect(sourceKey(testimony)).not.toBe(sourceKey(row({ via: 'seance' })));
    expect(routeOf([testimony], 'f0')).toEqual([]);
    expect(webView([testimony], { kind: 'npc', id: 'a' })).toMatchObject({
      families: [{ family: 'f0' }], spokes: [], magicEntryIndexes: [0],
    });
    expect(singleInformantChannel([testimony])).toBeNull();
    expect(corroborations([testimony], 'a', 'exaggerator', R)).toEqual([]);
  });
});
```

Complete `tests/app/magic-provenance.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EvidenceBoard } from '../../app/src/panels/EvidenceBoard';
import { EveningReport } from '../../app/src/panels/EveningReport';
import { Codex } from '../../app/src/panels/Codex';
import { WebViewPanel } from '../../app/src/panels/WebViewPanel';
import { InformantLedger } from '../../app/src/panels/InformantLedger';
import { resolveSlot, UI_GLYPHS } from '../../app/src/assets';
import { boardView } from '../../src/intel/board';
import { eveningReport } from '../../src/intel/report';
import { webView } from '../../src/intel/web';
import { informantLedger } from '../../src/intel/ledger';
import { blankIntel } from '../../src/sim/fieldwork';
import type { IntelEntry } from '../../src/intel/entry';
import { STANDARD_RULES } from '../../src/content/rules';

const entry: IntelEntry = { ...blankIntel(), tick: 1440, venue: 'hall', kind: 'utterance',
  via: 'scrying', provenance: { kind: 'magic', spell: 'scrying', operation: 's0' },
  overheard: true, family: 'f0', claimId: 'c0', speaker: 'a', addressedTo: 'b', mode: 'telling',
  reported: { subject: 'a', predicate: 'stole', object: null, count: 2, severity: 3,
    place: null, attribution: 'someone' } };
const noop = () => {};

describe('existing panels render explicit spell provenance', () => {
  it('raw and clustered boards label magic; web has no synthetic carrier', () => {
    for (const level of [0, 3] as const) {
      const html = renderToStaticMarkup(<EvidenceBoard view={boardView([entry], level, STANDARD_RULES)}
        tags={[]} onAddTag={noop} onRemoveTag={noop} />);
      expect(html).toContain('scrying (magic)');
    }
    const html = renderToStaticMarkup(<WebViewPanel web={webView([entry], { kind: 'npc', id: 'a' })} onSelectNpc={noop} />);
    expect(html).not.toContain('web spoke scrying');
    expect(html).toContain('observation(s)');
  });
  it('report and mixed-channel lock use honest channel wording', () => {
    expect(renderToStaticMarkup(<EveningReport report={eveningReport([entry], 1)} onOpenBoard={noop} />)).toContain('scrying');
    const html = renderToStaticMarkup(<Codex rows={[{ npc: 'b', trait: 'exaggerator', hits: 3,
      locked: true, pairs: [], singleChannelVia: 'ada', hasMagic: true }]} />);
    expect(html).toContain('one informant channel');
    expect(html).not.toContain('rests entirely on');
  });
  it('the already-planned icon resolves to its primitive fallback', () => {
    expect(resolveSlot('icon.ui.scrying')).toEqual({ kind: 'fallback' });
    expect(UI_GLYPHS.scrying).toBe('◉');
  });
  it('a physically reported trace uses registered vocabulary in an informant ledger', () => {
    const residue: IntelEntry = { ...blankIntel(), tick: 1440, venue: 'hall', kind: 'arcane-residue',
      via: 'ada', overheard: false, residueId: 's0' };
    const html = renderToStaticMarkup(<InformantLedger ledger={informantLedger([residue], 'ada')} onSelectFamily={noop} />);
    expect(html).toContain('Arcane residue');
    expect(html).toContain('Physical trace at hall');
  });
});
```

**RED:** source-label/consumer tests expose `scrying` as carrier, a merged report bucket, and a 3-copy false lock before the changes. Existing report/board/ledger/codex suites are the known-good controls; no snapshots or counts may be re-pinned merely because magic was added.

## 3E — collected mechanism tests and final verification (45–75 minutes for the gate)

**Model:** `frontier_implementer`; independent `frontier_reviewer`. This section collects the exact test bodies referenced by earlier units; it grants no deferred-test commit. 3E itself makes no production change. Its only new files are scoped validation artifacts below plus the assigned worker report. Any failing gate requiring code returns to that code's licensed unit for a bounded fix, then re-runs the affected and final required checks.

Create `tests/sim/helpers/scry-world.ts` (licensed starting in 3B):

```ts
import { STANDARD_RULES as R } from '../../../src/content/rules';
import { buildTownMap, buildWorld, enrollPlayer } from '../../../src/sim/world';
import type { Npc, TownFixture } from '../../../src/sim/types';

export function scryWorld() {
  const npc = (id: string, venue: string, occupation = 'grocer'): Npc => ({
    id, name: id, home: venue, occupation, faction: 'none', traits: ['literalist'], rivals: [],
    schedule: [{ days: 'all', from: 0, to: 1440, venue }], edges: [],
  });
  const guard = npc('guard', 'hq', 'guard');
  guard.schedule = [
    { days: 'all', from: 0, to: 45, venue: 'hall' },
    { days: 'all', from: 45, to: 1440, venue: 'hq' },
  ];
  guard.edges.push({ to: 'boss', kind: 'colleague', trust: 0.8 });
  const citizen = npc('citizen', 'hall');
  citizen.edges.push({ to: 'guard', kind: 'colleague', trust: 0.8 });
  const fixture: TownFixture = {
    venues: [
      { id: 'hall', district: 'd0', access: 'public' },
      { id: 'hq', district: 'd0', access: 'private' },
      { id: 'away', district: 'd1', access: 'public' },
    ],
    npcs: [guard, npc('boss', 'hq', 'clerk'), citizen],
  };
  const world = buildWorld(fixture, 'scry-mechanisms', R);
  enrollPlayer(world, { home: 'away' });
  world.network.spymaster = 'boss';
  world.enemy.observers = [{ id: 'guard', vigilance: 1 }];
  world.enemy.map = buildTownMap(fixture);
  return world;
}
```

Complete `tests/sim/scrying.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { beginScryWindows, captureScryIntel, type ScryAction } from '../../src/sim/magic';
import { prepareTick, finishTick } from '../../src/sim/phases';
import { step, runUntil } from '../../src/sim/step';
import { stableStringify, cloneSerializable } from '../../src/sim/hash';
import { scryWorld } from './helpers/scry-world';

const action: ScryAction = { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 };

describe('scry validates before every mutation', () => {
  it.each([
    { day: 0 }, { day: 2 }, { day: 1.5 }, { from: -15 }, { from: 1 }, { to: 1 },
    { to: 0 }, { from: 60, to: 60 }, { from: 60, to: 45 }, { to: 75 },
    { from: 1380, to: 1455 }, { from: NaN }, { to: Infinity }, { venue: 'missing' }, { venue: 'toString' }, { tick: 1 },
  ])('rejects invalid action %j without changing the world', (over) => {
    const world = scryWorld();
    const before = stableStringify(world);
    expect(() => applyAction(world, { ...action, ...over }, R)).toThrow();
    expect(stableStringify(world)).toBe(before);
    expect(Object.hasOwn(world, 'magic')).toBe(false);
  });
  it('rejects unaffordable/missing-avatar/missing-rules states before allocation', () => {
    for (const mode of ['coin', 'avatar', 'rules'] as const) {
      const world = scryWorld();
      if (mode === 'coin') world.coin = 14;
      if (mode === 'avatar') world.playerId = null;
      const before = stableStringify(world);
      expect(() => applyAction(world, action, mode === 'rules' ? undefined : R)).toThrow();
      expect(stableStringify(world)).toBe(before);
    }
  });
  it.each([-1, 0.5, NaN])('rejects invalid configured price %s before allocating state', (scrying) => {
    const world = scryWorld();
    const before = stableStringify(world);
    expect(() => applyAction(world, action, { ...R, economy: { ...R.economy, scrying } })).toThrow('scry: invalid price');
    expect(stableStringify(world)).toBe(before);
  });
  it.each([{ from: 0, to: 15 }, { from: 1380, to: 1440 }])('accepts the exact valid boundary %j', (window) => {
    const world = scryWorld();
    applyAction(world, { ...action, ...window }, R);
    expect(world.coin).toBe(5);
    expect(world.magic!.scries).toEqual([{ id: 's0', venue: 'hall', day: 1, ...window }]);
    expect(world.magic!.traces).toEqual([]);
    expect(world.enemy.evidence).toEqual([]);
  });
});

describe('the current tick is the purchased scene', () => {
  it('residue begins once at the window start, even at an empty venue, and persists past its end', () => {
    const world = scryWorld();
    applyAction(world, { ...action, venue: 'away' }, R);
    world.playerVenue = 'hq'; // make the purchased venue actually empty
    world.tick = 1439;
    step(world, R);
    expect(world.magic!.traces).toEqual([]);
    const events = step(world, R);
    expect(events.residues).toEqual([{ id: 's0', venue: 'away', createdAt: 1440 }]);
    expect(world.magic!.traces).toHaveLength(1);
    expect(world.intel.log.filter((entry) => entry.provenance)).toEqual([]);
    expect(world.enemy.evidence).toEqual([]);
    beginScryWindows(world, 1440);
    expect(world.chronicle.filter((entry) => entry.kind === 'residue' && entry.act === 'created')).toHaveLength(1);
    runUntil(world, 1501, R);
    expect(world.magic!.traces).toHaveLength(1);
  });
  it('capture reads only the supplied live events, preserving utterance truth and not past chronicle', () => {
    const world = scryWorld();
    applyAction(world, action, R);
    const claim = { id: 'live', family: 'f-live', parent: null, subject: 'citizen', predicate: 'stole',
      object: null, count: 7, severity: 4 as const, place: null, attribution: 'someone' };
    const events = { tick: 1440, positions: { citizen: 'hall', guard: 'hall', boss: 'hq' },
      utterances: [{ tick: 1440, venue: 'hall', circleMembers: ['citizen', 'guard'], speaker: 'citizen',
        addressedTo: 'guard', claim, mode: 'telling' as const }], askings: [] };
    const oldChronicle = world.chronicle;
    Object.defineProperty(world, 'chronicle', { configurable: true, get() { throw new Error('historical read'); } });
    expect(() => captureScryIntel(world, events)).not.toThrow();
    Object.defineProperty(world, 'chronicle', { configurable: true, value: oldChronicle, writable: true });
    expect(world.intel.log.find((entry) => entry.kind === 'utterance')).toMatchObject({
      claimId: 'live', via: 'scrying', provenance: { spell: 'scrying', operation: 's0' },
      reported: { count: 7, severity: 4 }, speaker: 'citizen', addressedTo: 'guard',
    });
    expect(world.intel.log.filter((entry) => entry.kind === 'scene-presence').map((entry) => entry.actor)).toEqual(['citizen', 'guard']);
  });
  it('offered-tick preview is pure; prior activation and same-tick speech capture have the right order', () => {
    const world = scryWorld();
    applyAction(world, action, R);
    world.tick = 1440;
    const before = stableStringify(world);
    const frame = prepareTick(world, R);
    expect(stableStringify(world)).toBe(before);
    const events = finishTick(world, R, frame, () => {
      expect(world.magic!.traces).toHaveLength(1);
      applyAction(world, { tick: 1440, kind: 'inject', target: 'citizen', spec: {
        subject: 'guard', predicate: 'stole', object: null, count: 2, severity: 4,
        place: null, attribution: 'someone',
      } }, R, frame);
    });
    expect(events.utterances.length).toBeGreaterThan(0);
    const expected = events.utterances.filter((utterance) => utterance.venue === 'hall').map((utterance) => utterance.claim.id);
    expect(expected.length).toBeGreaterThan(0);
    expect(world.intel.log.filter((entry) => entry.provenance && entry.kind === 'utterance').map((entry) => entry.claimId)).toEqual(expected);
  });
  it('live application plus steps equals successful-action-log replay, including JSON save state', () => {
    const log: Action[] = [action];
    const live = scryWorld();
    const frame = prepareTick(live, R);
    finishTick(live, R, frame, () => applyAction(live, action, R, frame));
    runUntil(live, 1501, R);
    const replay = runLogOn(scryWorld(), R, cloneSerializable(log), 1501);
    expect(stableStringify(live)).toBe(stableStringify(replay));
    expect(stableStringify(cloneSerializable(live))).toBe(stableStringify(live));
    expect(live.magic!.traces).toHaveLength(1);
    expect(live.intel.log.some((entry) => entry.provenance?.spell === 'scrying')).toBe(true);
  });
  it('untouched worlds keep no magic keys', () => {
    const world = scryWorld();
    runUntil(world, 16, R);
    expect(Object.hasOwn(world, 'magic')).toBe(false);
    expect(world.chronicle.some((row) => row.kind === 'scry' || row.kind === 'residue')).toBe(false);
    expect(world.intel.log.some((row) => Object.hasOwn(row, 'provenance'))).toBe(false);
  });
});
```

The phase vehicle has an explicit citizen→guard trust edge, a fresh injected claim about the addressee, and a two-person hall circle. Source: selectTelling rejects missing/nonpositive trust before its score test; relevance is 1 for the hearer's own identity. This fixes the prior author error where the citizen had no legal addressee. If the actual arbitration still prevents emission, report its trace; never fabricate phase events or lower a rumor threshold.

Complete `tests/sim/scry-residue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { beginScryWindows, residueEvents } from '../../src/sim/magic';
import { captureEvidence } from '../../src/sim/counterintel';
import { captureIntel, playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { runUntil, step } from '../../src/sim/step';
import { stableStringify, cloneSerializable } from '../../src/sim/hash';
import { ingestObservedFieldReport, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { observationsFor, type TickEvents } from '../../src/sim/perception';
import { scryWorld } from './helpers/scry-world';

function paid() {
  const world = scryWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
  world.tick = 1440;
  return world;
}
const knowledge = (world: ReturnType<typeof paid>) => stableStringify({
  intel: world.intel, player: playerView(world), network: networkView(world), courier: courierRouteView(world),
});

describe('physical residue waits for lawful discovery and report', () => {
  it('empty speech tick holds remote discovery; only the later actual handler meeting changes evidence', () => {
    const world = paid();
    const before = stableStringify(enemyDigest(world.enemy, 1, R));
    const events = step(world, R);
    expect(events.utterances).toEqual([]);
    expect(events.askings).toEqual([]);
    expect(world.enemy.evidence.filter((row) => row.kind === 'arcane-residue')).toEqual([]);
    expect(stableStringify(enemyDigest(world.enemy, 1, R))).toBe(before);
    const held = world.network.directiveState!.heldObservations.filter((row) => row.principal === 'enemy');
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ observer: 'guard', observedAt: 1440, deliveredAt: null });
    runUntil(world, 1485, R);
    expect(world.enemy.evidence.filter((row) => row.kind === 'arcane-residue')).toEqual([]);
    step(world, R); // guard's real schedule reaches boss at minute 45
    const evidence = world.enemy.evidence.filter((row) => row.kind === 'arcane-residue');
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ observer: 'guard', speaker: null, addressedTo: null,
      venue: 'hall', residue: { id: 's0', witness: 'guard', observedAt: 1440 },
      receipt: { observer: 'boss', tick: 1485 } });
    expect(held[0]!.deliveredAt).toBe(1485);
    expect(world.magic!.traces).toHaveLength(1);
    const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({ subject: null, family: null, venue: 'hall', district: 'd0' });
    world.enemy.sketch.push(...features);
    expect(exposureStatus(world)).toMatchObject({ score: 0, identified: false });
    expect(enemyDigest(world.enemy, 2, R).features.filter((row) => row.kind === 'arcane-residue')).toEqual([]);
    expect(world.chronicle.filter((row) => row.kind === 'residue' && row.act === 'observed' && row.observer === 'guard')).toHaveLength(1);
  });
  it('spymaster own sighting is immediate without a made-up speaker or report envelope', () => {
    const world = paid();
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
    step(world, R);
    const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue')!;
    expect(entry).toMatchObject({ observer: 'boss', speaker: null, addressedTo: null, venue: 'hall' });
    expect(entry).not.toHaveProperty('receipt');
    expect(enemyDigest(world.enemy, 1, R).features.some((row) => row.kind === 'arcane-residue')).toBe(true);
  });
  it('omitted residue stays reportable; a later real encounter retries one held root', () => {
    const world = paid();
    world.network.enemyAssets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true });
    runUntil(world, 1486, R);
    const held = world.network.directiveState!.heldObservations.find((row) => row.principal === 'enemy')!;
    const first = world.network.directiveState!.messages.find((row) => row.id === held.queuedIn)!;
    expect(first.deliveredAt).toBe(1485);
    expect(held.deliveredAt).toBeNull();
    expect(world.enemy.evidence.some((row) => row.kind === 'arcane-residue')).toBe(false);
    expect(world.magic!.traces).toHaveLength(1);
    world.network.enemyAssets[0]!.turned = false; // channel-control twin; no fake receipt
    runUntil(world, 2881, R); // actual next-day visit to the still-present trace
    expect(held.queuedIn).not.toBe(first.id);
    expect(world.network.directiveState!.heldObservations.filter((row) => row.principal === 'enemy')).toHaveLength(1);
    runUntil(world, 2926, R);
    expect(held.deliveredAt).toBe(2925);
    expect(world.enemy.evidence.filter((row) => row.kind === 'arcane-residue')).toHaveLength(1);
    expect(world.magic!.traces).toHaveLength(1);
  });
  it('terminal failure retries only upon another local encounter; a live pending report does not duplicate', () => {
    const world = paid();
    const events = step(world, R);
    const held = world.network.directiveState!.heldObservations[0]!;
    const firstId = held.queuedIn;
    const first = world.network.directiveState!.messages.find((row) => row.id === firstId)!;
    const again = { ...events, tick: 1441 };
    captureEvidence(world, again, R);
    queueUnqueuedFieldReports(world);
    expect(held.queuedIn).toBe(firstId);
    first.failedAt = 1441; // terminal-transport control, not principal knowledge
    captureEvidence(world, { ...again, tick: 1442, positions: { boss: 'hq', guard: 'hq' } }, R);
    expect(held.queuedIn).toBe(firstId);
    captureEvidence(world, { ...again, tick: 1443 }, R);
    queueUnqueuedFieldReports(world);
    expect(held.queuedIn).not.toBe(firstId);
    expect(held.deliveredAt).toBeNull();
    expect(world.enemy.evidence.some((row) => row.kind === 'arcane-residue')).toBe(false);
  });
  it('receipt bookkeeping cannot change remote perception or a principal that heard nothing', () => {
    const world = paid();
    const events = step(world, R);
    const twin = cloneSerializable(world);
    const before = knowledge(twin);
    const physical = residueEvents(twin);
    twin.network.directiveState!.heldObservations[0]!.deliveredAt = 1455;
    expect(knowledge(twin)).toBe(before);
    expect(residueEvents(twin)).toEqual(physical);
    expect(observationsFor('citizen', { ...events, residues: residueEvents(twin) }))
      .toEqual(observationsFor('citizen', { ...events, residues: residueEvents(world) }));
  });
  it('the two principal copies stay independent and an empty spoken report conveys no residue', () => {
    const world = paid();
    beginScryWindows(world, 1440);
    world.intel.informants.push({ id: 'guard', assignedVenue: 'hall' });
    world.network.assets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    const events: TickEvents = { tick: 1440, positions: { guard: 'hall', you: 'away', boss: 'hq' },
      utterances: [], askings: [], residues: residueEvents(world) };
    captureIntel(world, events, R);
    captureEvidence(world, events, R);
    queueUnqueuedFieldReports(world);
    const messages = world.network.directiveState!.messages;
    const playerMessage = messages.find((message) => message.principal === 'player')!;
    const enemyMessage = messages.find((message) => message.principal === 'enemy')!;
    const enemyBefore = stableStringify(world.enemy);
    const enemyPacketBefore = stableStringify(enemyMessage);
    const speech = realizeNetworkForward(world, playerMessage.id,
      { venue: 'away', members: ['guard', 'you'] }, 1455, R)!;
    ingestObservedFieldReport(world, 'player', speech);
    expect(world.intel.log.some((entry) => entry.kind === 'arcane-residue')).toBe(true);
    expect(stableStringify(world.enemy)).toBe(enemyBefore);
    expect(stableStringify(enemyMessage)).toBe(enemyPacketBefore);
    ingestObservedFieldReport(world, 'enemy', { ...speech, addressedTo: 'boss',
      spoken: { kind: 'field-report', items: [], onwardTo: null } });
    expect(stableStringify(world.enemy)).toBe(enemyBefore);
  });
  it('two paid traces at one venue retain two observations but produce one location feature', () => {
    const world = scryWorld();
    world.coin = 30;
    for (let i = 0; i < 2; i += 1) applyAction(world,
      { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 15 }, R);
    world.tick = 1440;
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
    step(world, R);
    expect(world.coin).toBe(0);
    expect(world.magic!.traces).toHaveLength(2);
    expect(world.enemy.evidence.filter((entry) => entry.kind === 'arcane-residue')).toHaveLength(2);
    expect(enemyDigest(world.enemy, 1, R).features.filter((entry) => entry.kind === 'arcane-residue')).toHaveLength(1);
  });
});
```

The two-principal test uses the existing physical-hop unit seam exactly as field-reports.test.ts does; the first test separately proves real schedule arrival through `step`. Never label the staged-hop case alone an end-to-end proof.

Create `tests/sim/scry-ref-runaround.test.ts` tests-first in 3C2. These five cases exercise the real `enemyDigest` runaround equality/copy consumers using refs produced by the real paid-trace capture and digest projection. The subjectful carrier leads and worked-night ledger are **explicitly staged pure-digest inputs**, following the structural fixture pattern in `tests/sim/enemy-runaround.test.ts`. Task 3 emits null-subject residue features; it does not emit these test-only subjectful bindings or furnish a live residue-to-runaround route. The first fixture asserts the real residue feature's unchanged null-subject behavior. Task 4 owns the later subjectful physical lead's actual live integration.

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { step } from '../../src/sim/step';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import type { EnemyState, SketchEvidenceRef, SketchFeature } from '../../src/sim/enemy/state';
import { scryWorld } from './helpers/scry-world';

function paidPhysicalRefs(): { enemy: EnemyState; refs: SketchEvidenceRef[] } {
  const world = scryWorld();
  world.coin = 30;
  for (let i = 0; i < 2; i += 1) applyAction(world,
    { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 15 }, R);
  world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
  world.tick = 1440;
  step(world, R);
  const captured = world.enemy.evidence.filter((entry) => entry.kind === 'arcane-residue');
  expect(captured).toHaveLength(2);
  const refs = captured.map((entry) => {
    // Project each captured trace independently through the shipped ref(e) consumer.
    // This does not change the real rule's one-feature-per-venue dedupe.
    const feature = enemyDigest({ ...world.enemy, evidence: [entry], sketch: [] }, 1, R)
      .features.find((row) => row.kind === 'arcane-residue');
    expect(feature).toMatchObject({ subject: null, family: null, venue: 'hall' });
    const ref = feature?.evidence[0];
    if (ref === undefined) throw new Error('fixture needs a captured physical reference');
    return ref;
  });
  expect(refs.map((ref) => ref.residue?.id)).toEqual(['s0', 's1']);
  for (const ref of refs) expect(ref).toMatchObject({
    tick: 1440, observer: 'boss', claimId: null, messageId: null,
    residue: { witness: 'boss', observedAt: 1440 },
  });
  return { enemy: world.enemy, refs };
}

/** Generic subjectful ref/copy contract, not a claim that Task 3 emitted these leads. */
function stagedRunaroundState(enemy: EnemyState, refs: readonly SketchEvidenceRef[]): EnemyState {
  const sketch: SketchFeature[] = refs.map((ref, index) => ({
    id: `physical-lead-${index}`, kind: 'carrier-profile', day: 1, family: null,
    subject: 'citizen', district: 'd0', detail: 'staged physical-reference contract lead',
    evidence: [cloneSerializable(ref)],
  }));
  return {
    ...enemy, sketch, featureCounter: sketch.length,
    actionLedger: sketch.map((lead, index) => ({
      orderKey: `watch:d0#${index}`, kind: 'watch', directiveIds: [`staged-receipt-${index}`],
      leadFeatureId: lead.id, subject: 'citizen', about: { subject: 'citizen' }, district: 'd0',
      scheduleStartDay: 2, posts: [{ guard: 'guard', venue: 'hall' }],
      workedDays: [2, 3], askedAt: null,
    })),
  };
}

describe('physical reference identity through the real runaround consumer', () => {
  it.each(['exact-physical-clone', 'different-residue', 'physical-versus-legacy', 'exact-legacy-clone'] as const)(
    'prices each distinct reference trail once: %s', (mode) => {
      const { enemy, refs } = paidPhysicalRefs();
      const physical = refs[0]!;
      const legacy: SketchEvidenceRef = {
        tick: physical.tick, observer: physical.observer, claimId: null, messageId: null,
      };
      const first = mode === 'exact-legacy-clone' ? legacy : physical;
      const second = mode === 'different-residue' ? refs[1]!
        : mode === 'physical-versus-legacy' ? legacy : cloneSerializable(first);
      expect([second.tick, second.observer, second.claimId, second.messageId])
        .toEqual([first.tick, first.observer, first.claimId, first.messageId]);
      if (mode === 'exact-physical-clone' || mode === 'exact-legacy-clone') {
        expect(second).toEqual(first);
        expect(second).not.toBe(first);
      } else if (mode === 'different-residue') {
        expect(second.residue).toEqual({ ...first.residue!, id: 's1' });
        expect(first.residue!.id).toBe('s0');
      } else {
        expect(Object.hasOwn(first, 'residue')).toBe(true);
        expect(Object.hasOwn(second, 'residue')).toBe(false);
      }
      const state = stagedRunaroundState(enemy, [first, second]);
      const before = stableStringify(state);
      const decision = enemyDigest(state, 4, R);
      const runarounds = decision.features.filter((row) => row.kind === 'runaround');
      const distinct = mode === 'different-residue' || mode === 'physical-versus-legacy';
      expect(runarounds).toHaveLength(distinct ? 2 : 1);
      expect(runarounds.map((row) => row.evidence))
        .toEqual(distinct ? [[first], [second]] : [[first]]);
      expect((decision.tailDrops ?? []).map((row) => row.leadFeatureId))
        .toEqual(distinct ? ['physical-lead-0', 'physical-lead-1'] : ['physical-lead-0']);
      if (mode === 'exact-legacy-clone') {
        expect(Object.hasOwn(runarounds[0]!.evidence[0]!, 'residue')).toBe(false);
      }
      expect(stableStringify(state)).toBe(before);
    },
  );

  it('derived residue refs retain equal values in independent nested objects', () => {
    const { enemy, refs } = paidPhysicalRefs();
    const state = stagedRunaroundState(enemy, [refs[0]!]);
    const lead = state.sketch[0]!;
    const originalRefs = cloneSerializable(lead.evidence);
    const before = stableStringify(state);
    const decision = enemyDigest(state, 4, R);
    const derived = decision.features.find((row) => row.kind === 'runaround');
    if (derived === undefined) throw new Error('fixture needs a derived runaround');
    expect(derived.evidence).toEqual(originalRefs);
    expect(derived.evidence).not.toBe(lead.evidence);
    expect(derived.evidence[0]).not.toBe(lead.evidence[0]);
    const copy = derived.evidence[0]!.residue;
    const original = lead.evidence[0]!.residue;
    if (copy === undefined || original === undefined) throw new Error('fixture needs nested residue refs');
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    copy.id = 'changed-after-derivation';
    copy.witness = 'changed-witness';
    copy.observedAt += 15;
    expect(lead.evidence).toEqual(originalRefs);
    expect(stableStringify(state)).toBe(before);
  });
});
```

**Meaningful RED/GREEN:** once the earlier residue projection exists, the old comparator collapses both `different-residue` and `physical-versus-legacy` to one runaround; the exact-clone controls remain green. With the comparator corrected but the old shallow runaround copy retained, the nested identity/isolation test fails. After both 3C2 corrections all five cases must pass through enemyDigest, with the existing `enemy-runaround.test.ts` as the legacy consumer control. These are authored expected failure modes, not executed RED/GREEN claims. No exported comparator or test-local reimplementation replaces the actual consumer.

In `tests/sim/sketch-faircop.test.ts`, add imports `applyAction` to its campaign import, `step` to its step import, plus `enemyDigest` from `../../src/sim/enemy/digest`, `cloneSerializable` from `../../src/sim/hash`, `type SketchEvidenceRef, type SketchFeature` from `../../src/sim/enemy/state`, and `scryWorld` from `./helpers/scry-world`. Insert this required-marker precondition and dedicated branch at the start of `for (const ref of feature.evidence)`, before the legacy "exactly one id field" check. The precondition is keyed on the FEATURE kind, so it runs before any ref-channel dispatch: a physical feature's ref that has lost its `residue` discriminator is rejected here and can never fall through to the ordinary asking audit, even when a legitimate asking with the same tick, observer and null speech ids exists. The branch that follows stays value-keyed on `ref.residue`, so a copied physical ref inside some other feature kind is still audited as physical:

```ts
      if (feature.kind === 'arcane-residue') {
        expect(ref.residue, `feature ${feature.id} physical ref ${JSON.stringify(ref)} lacks its residue discriminant`).toBeDefined();
      }
      if (ref.residue !== undefined) {
        expect(ref.claimId).toBeNull();
        expect(ref.messageId).toBeNull();
        expect(ref.observer).toBe(ref.residue.witness);
        expect(ref.tick).toBe(ref.residue.observedAt);
        const entry = world.enemy.evidence.find((candidate) =>
          candidate.kind === 'arcane-residue' && candidate.tick === ref.tick
          && candidate.observer === ref.observer
          && candidate.residue.id === ref.residue!.id
          && candidate.residue.witness === ref.residue!.witness
          && candidate.residue.observedAt === ref.residue!.observedAt);
        expect(entry, `residue ref ${JSON.stringify(ref)} has no captured evidence`).toBeDefined();
        if (entry?.kind !== 'arcane-residue') throw new Error('missing residue evidence');
        expect(entry.speaker).toBeNull();
        expect(entry.addressedTo).toBeNull();
        expect(entry.claimId).toBeNull();
        expect(entry.family).toBeNull();
        if (feature.kind === 'arcane-residue') {
          expect(feature.venue).toBe(entry.venue);
          expect(feature.subject).toBeNull();
          expect(feature.family).toBeNull();
          expect(feature.district).toBe(world.enemy.map.venues.find((venue) => venue.id === entry.venue)?.district ?? null);
        }
        expect(world.chronicle.some((row) => row.kind === 'residue' && row.act === 'created'
          && row.residueId === entry.residue.id && row.venue === entry.venue
          && row.observer === null && row.tick <= entry.residue.observedAt),
        'physical trace must exist before its sighting').toBe(true);
        expect(world.chronicle.some((row) => row.kind === 'residue' && row.act === 'observed'
          && row.residueId === entry.residue.id && row.venue === entry.venue
          && row.observer === entry.residue.witness && row.tick === entry.residue.observedAt),
        'the exact physical witness must have a recorded sighting').toBe(true);
        if (entry.receipt === undefined) {
          expect(entry.observer, 'only the spymaster can ingest a direct enemy sighting')
            .toBe(world.network.spymaster);
        } else {
          const receipt = entry.receipt;
          expect(receipt.observer).toBe(world.network.spymaster);
          expect(receipt.tick).toBeGreaterThanOrEqual(entry.residue.observedAt);
          const speech = world.chronicle.find((row) => row.kind === 'network-speech'
            && row.tick === receipt.tick && row.messageId === receipt.messageId
            && row.heardBy.some((hearer) => hearer.id === receipt.observer));
          expect(speech, 'received residue must name the actual heard report envelope').toBeDefined();
          if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') {
            throw new Error('missing residue field-report speech');
          }
          expect(speech.spoken.items.some(({ observation }) => observation.kind === 'arcane-residue'
            && observation.residueId === entry.residue.id && observation.venue === entry.venue
            && observation.witness === entry.residue.witness
            && observation.observedAt === entry.residue.observedAt),
          'the exact residue atom must have been spoken, not merely held in the envelope').toBe(true);
        }
        continue;
      }
```

In the legacy `(1)` evidence finder, prefix its predicate with `e.kind !== 'arcane-residue' &&`. This is the only edit to that branch: it prevents a physical entry with null claim/message ids from shadowing a simultaneous ordinary asking. The feature-kind precondition above is the converse protection: a stripped physical ref cannot borrow a simultaneous ordinary asking. Both are required and neither weakens an ordinary claim/network/asking assertion. Preserve every old claim/network/asking chronicle assertion and both existing emergent positive tests. Update the audit comment to name the third physical channel, its optional actual report receipt, and the feature-kind precondition.

After these edits, mechanically extract the entire audit comment and `auditSketch` function into new `tests/sim/helpers/sketch-audit.ts`, with exactly these imports at the top and `export function auditSketch` in its declaration:

```ts
import { expect } from 'vitest';
import type { WorldState } from '../../../src/sim/types';
```

Replace the extracted declaration in `sketch-faircop.test.ts` with `import { auditSketch } from './helpers/sketch-audit';`. Both existing tests and the new controls call this one permanent auditor. Task 4 can subsequently extend this helper and import it from its own tests without importing another test-registration module. Extraction changes no remaining assertion or legacy test body.

Append these complete controls in that same file:

```ts
function residueAuditWorld(remote: boolean): WorldState {
  const world = scryWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, STANDARD_RULES);
  if (!remote) world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
  world.tick = 1440;
  if (remote) runUntil(world, 1486, STANDARD_RULES);
  else step(world, STANDARD_RULES);
  const decision = enemyDigest(world.enemy, 1, STANDARD_RULES);
  world.enemy.sketch.push(...decision.features);
  expect(world.enemy.sketch.some((feature) => feature.kind === 'arcane-residue')).toBe(true);
  return world;
}

describe('physical residue fair-cop chain', () => {
  it.each([false, true])('accepts a real direct or physically reported sighting (remote=%s)', (remote) => {
    const world = residueAuditWorld(remote);
    const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue')!;
    expect(entry.receipt !== undefined).toBe(remote);
    auditSketch(world);
  });

  it.each([
    'no-evidence', 'no-creation', 'no-sighting', 'wrong-witness', 'no-receipt',
    'wrong-message', 'no-envelope', 'not-heard', 'omitted-atom', 'wrong-spoken-witness',
    'wrong-spoken-venue', 'wrong-spoken-time', 'wrong-ref-channel', 'missing-ref-discriminant',
  ] as const)('rejects a broken remote chain: %s', (fault) => {
    const world = cloneSerializable(residueAuditWorld(true));
    const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue');
    if (entry?.kind !== 'arcane-residue' || entry.receipt === undefined) throw new Error('test needs received residue');
    const feature = world.enemy.sketch.find((row) => row.kind === 'arcane-residue')!;
    const ref = feature.evidence[0]!;
    const receipt = { ...entry.receipt };
    const speech = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === receipt.tick && row.messageId === receipt.messageId);
    if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') throw new Error('test needs actual report');
    const atom = speech.spoken.items.find((item) => item.observation.kind === 'arcane-residue')?.observation;
    if (atom?.kind !== 'arcane-residue') throw new Error('test needs spoken residue');
    if (fault === 'no-evidence') world.enemy.evidence = world.enemy.evidence.filter((row) => row !== entry);
    if (fault === 'no-creation' || fault === 'no-sighting') world.chronicle = world.chronicle.filter((row) =>
      !(row.kind === 'residue' && row.residueId === entry.residue.id
        && row.act === (fault === 'no-creation' ? 'created' : 'observed')));
    if (fault === 'wrong-witness') {
      entry.observer = 'citizen'; entry.residue.witness = 'citizen';
      ref.observer = 'citizen'; ref.residue!.witness = 'citizen';
    }
    if (fault === 'no-receipt') delete entry.receipt;
    if (fault === 'wrong-message') entry.receipt!.messageId = 'missing-message';
    if (fault === 'no-envelope') world.chronicle = world.chronicle.filter((row) => row !== speech);
    if (fault === 'not-heard') speech.heardBy = speech.heardBy.filter((row) => row.id !== receipt.observer);
    if (fault === 'omitted-atom') speech.spoken.items = speech.spoken.items.filter((item) => item.observation !== atom);
    if (fault === 'wrong-spoken-witness') atom.witness = 'citizen';
    if (fault === 'wrong-spoken-venue') atom.venue = 'away';
    if (fault === 'wrong-spoken-time') atom.observedAt += 1;
    if (fault === 'wrong-ref-channel') ref.claimId = 'invented-claim';
    if (fault === 'missing-ref-discriminant') delete ref.residue;
    expect(() => auditSketch(world)).toThrow();
  });
});
```

The negative fixtures mutate only copies after genuine production event flow has made the positive control. Their refusal proves the audit fires. They do not stage those forgeries as legal game actions. The `missing-ref-discriminant` fault is retained, but on its own it is a weak control: in this fixture no ordinary asking shares the sighting's tick and observer, so before the precondition it failed at finder `(1)` for the wrong reason. The two controls below make the absent-marker case non-vacuous.

Append, in the same file, this asking-twin pair. It stages the exact collision the precondition exists for: an ordinary asking that the same witness heard at the same tick and venue as the physical sighting, so the residue ref and a lawful legacy asking ref both carry `tick 1440 / observer guard / claimId null / messageId null`. The staged rows are corrupted-copy fixtures on a clone in the same sense as the fourteen faults: the evidence row uses the exact shape `captureEvidence` writes for an asking (`src/sim/counterintel.ts:48-54`) and the chronicle row the exact shape phase record writes (`src/sim/phases.ts:500-506`), but neither is produced by a legal game action here. Nothing about the positive residue chain is altered.

```ts
/** The same witness heard an ordinary asking at the exact tick and venue of the physical sighting. */
function stageAskingTwin(world: WorldState, ref: SketchEvidenceRef): void {
  world.enemy.evidence.push({
    tick: ref.tick, venue: 'hall', observer: ref.observer, overheard: false,
    speaker: 'citizen', addressedTo: ref.observer, kind: 'asking', mode: null,
    claimId: null, family: 'f-twin', reported: null, about: { family: 'f-twin' },
  });
  world.chronicle.push({
    kind: 'asking', tick: ref.tick, venue: 'hall', speaker: 'citizen', addressedTo: ref.observer,
    about: { family: 'f-twin' }, authority: false,
    heardBy: [{ id: ref.observer, addressed: true }],
  });
}

/** A lawful legacy asking ref: both speech ids null and no physical discriminant. */
const legacyAskingFeature = (ref: SketchEvidenceRef): SketchFeature => ({
  id: 'legacy-asking-twin', kind: 'entry-point', day: 1, family: 'f-twin', subject: null, district: 'd0',
  detail: 'staged legacy asking ref beside a physical sighting',
  evidence: [{ tick: ref.tick, observer: ref.observer, claimId: null, messageId: null }],
});

describe('a physical ref cannot borrow an ordinary asking heard at the same tick', () => {
  function twinWorld(): { world: WorldState; feature: SketchFeature; ref: SketchEvidenceRef } {
    const world = cloneSerializable(residueAuditWorld(true));
    const feature = world.enemy.sketch.find((row) => row.kind === 'arcane-residue')!;
    const ref = feature.evidence[0]!;
    expect(ref).toMatchObject({ tick: 1440, observer: 'guard', claimId: null, messageId: null });
    expect(ref.residue).toBeDefined();
    stageAskingTwin(world, ref);
    world.enemy.sketch.push(legacyAskingFeature(ref));
    return { world, feature, ref };
  }

  it('positive legacy path: an intact residue ref and a lawful asking ref coexist on one tick/observer', () => {
    const { world, ref } = twinWorld();
    // Non-vacuous: two evidence rows now share the ref's tick, observer and null speech ids.
    expect(world.enemy.evidence.filter((row) => row.tick === ref.tick && row.observer === ref.observer
      && row.claimId === null && (row.network?.messageId ?? null) === null).map((row) => row.kind))
      .toEqual(['arcane-residue', 'asking']);
    auditSketch(world);
  });

  it('corrupted copy: a stripped residue discriminant is rejected although the asking twin would resolve', () => {
    const { world, feature, ref } = twinWorld();
    auditSketch(world); // the identical world passes before corruption
    delete ref.residue;
    expect(feature.evidence[0]).toEqual({ tick: 1440, observer: 'guard', claimId: null, messageId: null });
    expect(world.chronicle.some((row) => row.kind === 'asking' && row.tick === ref.tick
      && row.heardBy.some((hearer) => hearer.id === ref.observer))).toBe(true);
    expect(() => auditSketch(world)).toThrow();
  });
});
```

**Meaningful RED/GREEN for the precondition:** with the residue branch present but the feature-kind precondition absent, the positive control passes and the corrupted-copy control FAILS (the audit accepts the stripped ref through the asking twin) — that is the RED. With the precondition in place both pass, and every one of the fourteen faults still throws for its own reason. The controls exercise the permanent auditor exactly as the fourteen faults do; they do not assert a live game route. Fourteen defects, two positive rows and the two asking-twin controls are 18 new fair-cop test cases; existing rumor/network cases remain their own independent positive controls.

Create `tests/app/magic-session.test.ts` using the real session API. No app session production change is needed: the existing distributive nonlocal intent already admits `scry`, and the successful-action log is appended only after `applyAction` returns.

```ts
import { describe, expect, it } from 'vitest';
import { newSession, loadSession } from '../../app/src/loop/session';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';

describe('scry through the real app session', () => {
  it('saves only the paid action and deterministically recreates its live window and trace', () => {
    const session = newSession('cor-1');
    const venue = Object.keys(session.world.venues).sort()[0]!;
    const initialCoin = session.world.coin;
    expect(session.submit({ kind: 'scry', venue, day: 1, from: 0, to: 60 })).toEqual({ queuedFor: 0 });
    expect(session.log).toEqual([]);
    expect(session.save().log).toEqual([]); // queued intents are not successful actions
    expect(session.localOffer()).toBeNull();
    expect(session.advance(1)).toEqual({ advanced: 1, stopped: 'complete' });
    expect(session.world.coin).toBe(initialCoin - 15);
    expect(session.log).toEqual([{ tick: 0, kind: 'scry', venue, day: 1, from: 0, to: 60 }]);
    const save = cloneSerializable(session.save());
    const restored = loadSession(save, session.world.tick);
    expect(stableStringify(restored.world)).toBe(stableStringify(session.world));
    const until = 1501;
    expect(session.advance(until - session.world.tick).stopped).toBe('complete');
    expect(restored.advance(until - restored.world.tick).stopped).toBe('complete');
    expect(session.world.tick).toBe(until);
    expect(session.world.magic!.traces).toHaveLength(1);
    expect(stableStringify(restored.world)).toBe(stableStringify(session.world));
    const replay = loadSession(cloneSerializable(session.save()), until);
    expect(stableStringify(replay.world)).toBe(stableStringify(session.world));
    expect(replay.log).toEqual(session.log);
  });

  it('a rejected paid action never enters save/log and leaves no magic state or debit', () => {
    const session = newSession('cor-1');
    const control = newSession('cor-1');
    const venue = Object.keys(session.world.venues).sort()[0]!;
    session.submit({ kind: 'scry', venue, day: 0, from: 0, to: 60 });
    expect(() => session.advance(1)).toThrow('scry: choose the next day');
    control.advance(1); // the session advances its ordinary tick even after an action rejects
    expect(session.log).toEqual([]);
    expect(session.save().log).toEqual([]);
    expect(Object.hasOwn(session.world, 'magic')).toBe(false);
    expect(stableStringify(session.world)).toBe(stableStringify(control.world));
    expect(stableStringify(loadSession(cloneSerializable(session.save()), session.world.tick).world))
      .toBe(stableStringify(session.world));
  });
});
```

The app acceptance chooses a real venue id without assuming a generated population, venue access class or speech outcome. The mechanism suite proves populated-window captures. `cor-1` must stay running through this two-day bound under the certified base; if the scenario terminates earlier, report the measured cause instead of bypassing `isTerminal` or mutating the session's world to force progress.

## Commit and verification protocol

Controller resolves the actual Task 2 base before dispatch. It also names a `.superpowers/sdd/task-3-validation/` artifact directory and `.superpowers/sdd/task-3-worker-report.md`; those files are implementation-report licenses, not permission for this author to create them. No root ledger, current-plan, current-review, archived snapshot, shared AI file, existing unrelated test, package or configuration edit is licensed to the implementer. Controller owns progress/review updates.

Run these commands separately from the repository root (PowerShell), recording each exit status and complete output in the assigned validation directory. For tests-first work, retain the meaningful RED and the corresponding GREEN output. A missing import proves scaffolding is absent; at least the behavior-specific assertions must also fail against the wrong/missing mechanism before accepting its GREEN.

| Unit | Exact focused command | Commit subject |
|---|---|---|
| 3A | `npm test -- tests/sim/scry-perception.test.ts tests/sim/perception.test.ts tests/intel/magic-provenance.test.ts` | `feat: scrying — add live venue perception and explicit magic sources` |
| 3B | `npm test -- tests/sim/scrying.test.ts tests/app/magic-session.test.ts tests/sim/determinism.test.ts tests/app/jargon.test.ts tests/content/terms.test.ts` | `feat: scrying — schedule paid windows and capture their live scenes` |
| 3C1 | `npm test -- tests/sim/scry-perception.test.ts tests/sim/scry-residue.test.ts tests/directives/field-reports.test.ts` | `feat: scrying — carry physical residue through lawful reports` |
| 3C2 | `npm test -- tests/sim/scry-residue.test.ts tests/sim/scry-ref-runaround.test.ts tests/sim/enemy-runaround.test.ts tests/sim/sketch-faircop.test.ts tests/sim/no-omniscience.test.ts` | `feat: scrying — trace residue features to sightings and spoken receipts` |
| 3D | `npm test -- tests/intel tests/app/magic-provenance.test.tsx tests/app/jargon.test.ts tests/app/assets.test.ts` | `feat: scrying — show honest magic provenance on the existing desk` |

Each unit runs `npm run typecheck` before its scoped commit. Stage only its licensed changed files; inspect the staged diff; use a UTF-8 commit-message file and `git commit -F` as controller conventions require. Independent reviewers check complete accumulated changes as well as each unit, with no less capability than the implementer. If a listed existing focused path has moved at the real Task 2 base, root resolves the corresponding current path in the dispatch note; an omitted suite is never a passing check.

3E runs the complete required gate, each once after focused checks are green: `npm test`, `npm run lint`, `npm run typecheck`, `npm run app:build`, `npm run soak`, `npm run mc`. Record baseline/current test and file counts; every drop needs a per-test disposition. Record the production JS size and gzip size as measured; do not invent a passing performance delta. The no-magic report worlds must preserve every deterministic report block and line. Only the existing explicitly identified wall-clock columns may normalize away.

The controller already has a project comparator at `.superpowers/sdd/compare-report-blocks-2026-09-05.mjs`, with four firing controls. Its baseline marker is historical and must not be relabeled as Task 2. For a direct comparison to the **actual certified Task 2** logs, create `.superpowers/sdd/task-3-validation/compare-reports.mjs` with this exact code. The normalization is copied from the existing comparator; the input interface takes four real log paths instead of a historical marker:

```js
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
```

Exact invocation shape: `node .superpowers/sdd/task-3-validation/compare-reports.mjs` followed by the certified Task 2 soak log path, certified Task 2 mc log path, current Task 3 soak log path, current Task 3 mc log path, and output JSON path, each as a separately quoted shell argument. The dispatch note supplies the actual existing baseline paths and measured counts before this command is run. An output omission, extra deterministic line or changed pin is a failure to report; do not retune, edit the baseline or replace full comparison with selected regex measurements.

## Source-consumer inventory and deferred scope

The source read covered perception's only raw observation projection, the phase capture hooks, counterintel, fieldwork, all raw/reported field-report switches, transport's source completion, EvidenceEntry's digest consumers, IntelEntry/RouteHop, board/web/ledger/report/codex and their existing panels. `directives/evaluator.ts` checks explicit ordinary presence; `directives/execution.ts` supplies its own local presence feed for decision inputs and is not a residue acquisition channel. Neither needs a new branch. `enemy/digest.ts`'s subject/about productivity helpers use null-safe comparisons; only the genuine voicings boundary needs the specified speaker narrowing. `Network` and `Directives` panels consume separately typed network rows, and D1 creates none through magic. `latestPlayerKnownVenue` already reads the actor on scene rows. These are inspected non-edits, not invitations to expand scope.

Sketch-reference consumers at the frozen `a53551d` working tree, re-read during recovery (`SketchEvidenceRef` and `SketchFeature.evidence`): the type and its doc comment (`src/sim/enemy/state.ts:80-103`); the digest's `ref(e)` projection (`src/sim/enemy/digest.ts:188-191`), `sameRefs` with its single runaround call site (`digest.ts:132-135,361`) and the runaround copy (`digest.ts:365`). No other production module reads a ref's fields: `counterintel.ts:266` appends decision features whole, `scenario/exposure.ts:22` counts `(kind, subject)`, `network/turncoats.ts:64,139` and `directives/transport.ts:480` read `subject` only, `harness/montecarlo.ts:67` reads `sketch.length`, and no `app/` panel reads sketch evidence (`Directives.tsx:109-110` renders directive-report evidence, a different type). Test consumers: `tests/sim/enemy-runaround.test.ts` builds eight literal refs and compares trails with `toEqual`; fifteen other test files contain ref-shaped `claimId … messageId` literals (`enemy-digest`, `enemy-pressure`, `no-omniscience`, `scenario-exposure`, `sketch-faircop`, `intel/countersketch`, `app/panels`, `directives/view`, `directives/spoken-content-law`, `directives/red-herring.e2e`, `scenario/ladder.e2e`, `network/debrief`, `network/handler-delivery`, `network/turncoats`, `network/canary-turncoat.e2e`, `network/plan11-proof.e2e`). All stay valid unchanged: legacy refs gain no key, and the comparator's added clauses evaluate `undefined === undefined` for them.

Deferred under the existing approved directions: a scry composer/button/key binding goes to Plan 10; séance generation/action/night-visit consequences stay in separately authored Task 4; artifact witnessing stays under Task 2's explicit deferral; debrief joins/UI stay under Tasks 5–7; magic network-payload observation, trait/capability-gated residue detection, residue expiry, paid cancellation, retries by timer and per-trace feature multiplication remain unapproved alternatives. No new balance constant or capability is silently chosen here.

Reusable work: the permanent fair-cop helper is a project test utility immediately reused by Task 4. The report comparator is an exact project script, cheapest accurate transcription role `mechanical_worker` only under controller ownership, with its four firing controls and full-block equality as the gate. This does not justify a new global skill, dependencies or shared AI writes. The simulation units still require the frontier implementation/review floor because their evidence boundary and ordering have material design risk.

## Completed author-defect self-review

Pass 1 read from constraints through 3A→3E. Termination: active sensor loops are bounded by purchased windows/current events; discovery records stabilize at one per trace/observer; held fingerprints stabilize at one per principal/observer/root; only a later raw physical encounter resets a terminal attempt. Relayed report-of-report roots remain stable and never re-hold an outer envelope. Receipt never clears physical state. Magnitudes: source clock is 1440 ticks/day and speech beat 15; window maximum 60, standard starting coin 20 and scry cost 15; severity uses 1–5 and trait fingerprint tests use an actual 2→4 count transform. Syntax/API: all imports and helpers were checked against the local source, including the exact report receipt switch and real session submit/advance/save/load semantics. Calibration: no future Task 2 hash or suite floor was assumed. Defects corrected: removed the unused reverse shape-conversion helper/test, separated residue Observation widening from earlier sensor commits, provided the missing exact fair-cop/app bodies, and made the missing citizen→guard trust edge explicit in the phase vehicle.

Pass 2 read 3E→3D→3C2→3C1→3B→3A, then constraints. It checked fixture reachability, source-copy semantics, ordinary bytes and staged commit dependencies independently of the first reading order. Defects corrected: ordinary badge ordering now uses the original character ordering; `tests/directives/field-reports.test.ts` is the real path; later-plan vocabulary is added through jargon.test.ts's named subtraction list while its historical eight-term law stays intact; every newly visible residue label has a registered term; the positive claim-bearing voicings narrowing tolerates Task 4's later null-speaker physical arm. The shared helper/PhysicalReceipt seam is explicit and does not implement Task 4. All five tooltips were measured at 106, 99, 75, 93 and 98 characters, within the existing 120-character law. Tests-first file licenses now coincide with their mechanism units; the final gate does not defer test authorship.

Recovery pass 3 (absent-marker collision) read auditor → controls → digest → Task 4 seam. Traced the pre-precondition auditor for an `arcane-residue` feature whose ref has lost `residue`: the "exactly one id" check passes (both ids null); finder `(1)` excludes physical entries, so only a same-tick/same-observer asking evidence row can satisfy it; branch `(2)` then needs only an `asking` chronicle row at that tick heard by the observer. The remote fixture holds no such asking, so the retained `missing-ref-discriminant` fault failed at finder `(1)` for the wrong reason; with the twin staged, the pre-precondition auditor accepts the corrupted ref. Keying the precondition on the feature kind and placing it before dispatch closes this regardless of what else the observer heard. Re-walked all fourteen faults: only `missing-ref-discriminant` now fails at the precondition (earlier, for the right reason); `wrong-ref-channel` keeps `residue`, enters the residue branch and fails at `claimId`; the other twelve fail on their evidence/chronicle/receipt/envelope/atom assertions unchanged. The precondition never fires for `entry-point`, `district-activity`, `origin-vague`, `carrier-profile` or `runaround` features, so the Watchford and network positive tests and the legacy-asking twin are untouched. Known limit, held for root: a copied physical ref inside a later subjectful `runaround` or `carrier-profile` (Task 4's seam) is not covered by a feature-kind precondition; if its `residue` were stripped it would again reach the legacy path. Task 3 emits no such feature (null subject), so this is recorded as a Task 4/root issue rather than widened here.

Recovery pass 4 (nested-ref aliasing) read digest → runaround test → auditor → fixtures. `ref(e)` spreads `{ ...e.residue }`, so a minted sketch ref never aliases the evidence entry's nested object; the runaround's conditional spread gives each derived ref its own nested object; `sameRefs` compares primitives only, so `has(...)` is value-based. `stagedRunaroundState` clones each ref before placing it in a lead, so the captured `refs`, the staged leads and the digest output are three independent object graphs, and the `derived residue refs` test mutates only the derived copy before re-hashing the state. The `exact-*-clone` modes use `cloneSerializable`, so equality there is by value and never by identity. `stageAskingTwin` pushes fresh literals, `legacyAskingFeature` builds its ref from primitives, and `twinWorld` clones the fixture world so no control mutates the positive world. `residueAuditWorld` pushes the decision's freshly minted features into `sketch` exactly as `counterintel.ts:266` does; no evidence-entry object is ever shared with a ref. Byte behavior: legacy refs gain no key because both spreads are conditional, and ordinary key order is retained because `...row` is spread first. Task 4's saved draft appends its `nightVisit` comparisons and conditional copy after Task 3's and already carries the symmetric `if (feature.kind === 'night-visit') expect(ref.nightVisit).toBeDefined();` precondition (`task-4-author-draft.md:937`); root should confirm it lands before Task 3's residue branch, as that draft's seam text requires.

Historical author probes (native Codex session, before the quota interruption) used the installed TypeScript 5.9.3 API entirely in memory. The complete TS/TSX file blocks parsed with zero syntax diagnostics. A limited projection of 22 sources (additive types plus 11 authored root files, including the widened fair-cop test) produced **zero diagnostics in those 11 authored roots**. Its 14 dependency diagnostics were individually inspected: the unpatched economy literal lacked scrying (1), old field-report switches/else needed the specified new arms (7), old digest speaker sorting needed the specified voicings narrowing (2), and old fieldwork's bare network else needed the specified guard (4). Those are precisely the 3B/3C edits already written above; the probe deliberately did not implement their bodies. This is API evidence, not a claim of full production typecheck or successful runtime assertions. Worker/controller gates must execute against the real corrected Task 2 source.

The recovery session (`claude-fable-5-1`) had file tools only and ran no probe of any kind: no parse, typecheck, test, hash or runtime claim below originates from it. The recovered and newly authored blocks were checked by reading against the frozen `a53551d` source (`digest.ts`, `state.ts`, `types.ts`, `perception.ts`, `counterintel.ts`, `phases.ts`, both existing consumer tests). Those `scry-ref-runaround` cases and asking-twin controls with authored RED/GREEN expectations are hypotheses until root executes them.

Test-body checksum before the expensive full gate: 9 sensor cases, 27 action/live-window cases, 7 physical-residue cases, 7 intel-provenance cases, 4 existing-panel cases, 18 fair-cop cases (2 positive rows + 14 corrupted-copy faults + 2 asking-twin controls), 5 physical-reference runaround cases and 2 app-session cases = **79 authored new cases**. The earlier 72 is historical: it predates the five-case `tests/sim/scry-ref-runaround.test.ts` file and the two asking-twin controls. This excludes existing tests and registry-driven cases added automatically by new terms. The historical fair-cop tests move only their shared helper; no old assertion is removed. If transcription yields a different authored count, reconcile the actual code before reporting a passing gate.

Root can reproduce this arithmetic, and a syntax parse of every complete block, without trusting either author. Save the following as `.superpowers/sdd/task-3-validation/count-authored-cases.mjs` and run `node .superpowers/sdd/task-3-validation/count-authored-cases.mjs .superpowers/sdd/task-3-author-draft.md` from the repository root. It counts one case per `it(...)` and one per literal row of an `it.each([...])` / `it.each([...] as const)` table, per fenced `ts`/`tsx` block, and reports `transpileModule` syntax diagnostics for blocks that begin with an `import` line (complete files). Expected: `total` 79; blocks with nonzero counts, in document order, 8 (3A sensor file), 1 (3C1 sensor append), 7 (3D intel provenance), 4 (3D panels), 27 (3E scrying), 7 (3E residue), 5 (3E physical-reference runaround), 16 (3E fair-cop controls), 2 (3E asking-twin controls) and 2 (3E app session); zero diagnostics on complete blocks. A non-literal table throws rather than guessing.

```js
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const draft = readFileSync(process.argv[2], 'utf8');
const fences = [...draft.matchAll(/```(ts|tsx)\r?\n([\s\S]*?)```/g)];
const blocks = [];
let total = 0;
fences.forEach(([, lang, code], index) => {
  const kind = lang === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(`block-${index}.${lang}`, code, ts.ScriptTarget.ES2022, true, kind);
  let cases = 0;
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression)
        && ts.isIdentifier(callee.expression.expression) && callee.expression.expression.text === 'it'
        && callee.expression.name.text === 'each') {
        let table = callee.arguments[0];
        if (table && ts.isAsExpression(table)) table = table.expression;
        if (!table || !ts.isArrayLiteralExpression(table)) throw new Error(`non-literal it.each table in block ${index}`);
        cases += table.elements.length;
      } else if (ts.isIdentifier(callee) && callee.text === 'it') {
        cases += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const complete = /^import /.test(code);
  const diagnostics = complete
    ? ts.transpileModule(code, { reportDiagnostics: true, fileName: `block-${index}.${lang}`,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve } })
      .diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    : null;
  if (cases > 0 || (diagnostics && diagnostics.length > 0)) {
    blocks.push({ block: index, lang, complete, cases, diagnostics, firstLine: code.split('\n')[0] });
  }
  total += cases;
});
process.stdout.write(JSON.stringify({ total, blocks }, null, 2) + '\n');
```

This script reads only the draft and the installed compiler; it neither executes proposed game code nor touches production files. Its diagnostics are syntax-level: it cannot see the projected additive types, so it is not a typecheck.

No unresolved design alternative remains inside this draft: D1–D6 are accepted. Remaining prerequisite work belongs to the controller: certify Task 1/2, compare the actual Task 2 conditional document projections to these additive edits, fill the real base and report paths, and independently review the plan before dispatch. Any new discrepancy is a reported premise failure, not authorization to guess implementation or weaken an acceptance.
