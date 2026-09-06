# Task 7A — exact correction amendment for I1/M1

**Authored-by:** inherited highest controller/author capability (native Codex); same thread switched explicitly from completed independent review to authoring. **Date:** 2026-09-05.
**Spec:** docs/design-spec.md:108; docs/review/current.md R10; original Task7A preservation rules; task-7a-native-plan-review-2026-09-05-report.md I1/M1, accepted by root in task-7a-correction-author-brief-2026-09-05.md.
**Authoring base:** 3bc637ff82d6a5588e6d91462715f3e4a640ba95; relevant production prose/UI source still equals dc114da. **Actual implementation predecessor:** the future independently approved Task4 base, UNKNOWN.
**Constraints:** .superpowers/sdd/task-7a-correction-constraints.md, plus the original Task7A constraints and Plan6/7/8/11 laws.
**Dependency order:** independent correction-plan review -> actual Task4-base reconciliation ->7A1 renderer/public names ->7A2 reading surfaces -> full native gate and separate code review.
**Gate:** npm test; npm run lint; npm run typecheck; npm run app:build. Virtual checks below are author evidence only. No implementation or independent approval is claimed.

## Exact application contract and premises

This is an exact amendment to .superpowers/sdd/task-7a-author-draft.md, SHA256 `4E75A99545ACCC5269E5BA9CB23E8C02F0EE8EA48687F2ABE5B8A60C5E6AA0A7`. Verify that hash before using this amendment; mismatch -> STOP. Keep the original frozen artifact and its Needs-fixes verdict unchanged.

In the original proposed implementation replace exactly three proposed file bodies with the complete bodies below: `src/content/render.ts`, `tests/content/render.test.ts`, `tests/sim/claim-names.test.ts`. All other original executable code/hunks remain unchanged, including registry values/facade, `claimNames`, main, ClaimReading, EvidenceBoard, Directives, DayPlanner and the seven UI tests. The original new-file and existing-file licenses still apply. Never install the old/new virtual snapshots over actual production files.

This amendment supersedes the original renderer code, these two test bodies, any conflicting second-person/object prose descriptions, authored counts, and author-validation summary. All other constraints, future-base reconciliation, escalation rules, implementation gates and independent-review requirements remain binding. There are no retired or migrated old cases: all44 prior authored cases remain, and34 are appended.

Controller re-verifies: original SHA; all24 registry definitions unchanged; actual delivered claim type still seven fields; public directory/name selector contract; unknown future magic controls/provenance/vocabulary preserved through additive reconciliation. R20's digest/forensics fix is separate and never belongs in this proposal.

## Presentation choices and exact predicate dispositions

M1 uses the smallest strategy compatible with current public labels: retain `NameOf(id): string` and the existing `you` avatar label. The local `agree(person, third, second)` helper recognizes exactly that explicit display pronoun; it never consults an entity id or engine state. Subject verbs and neutral object qualifiers use it; attribution uses `You swear it.` with sentence capitalization. Tradeoff: a future localization or richer grammatical-person system must extend this formatting contract. This correction does not introduce such a system or infer hidden identity.

I1 retains each fixed proposition when object alone changes. The extra person is explicitly named in the account with no invented role. Exact semantic branch changes:

| Predicate | Preserved proposition; removed assumption |
| --- | --- |
| stole | theft; a named extra person is not asserted to be the victim |
| forged-the-lineage | falsified lineage; the extra person is not asserted to own that lineage |
| plans-to-seize-the-throne | plotting to seize the throne; the extra person is not asserted to hold it |
| bribed-the-council | bribing the council; an extra person does not replace the council |
| cheats-at-cards | cheating at cards; the extra person is not asserted to be an opponent |
| broke-a-betrothal | broken betrothal; the extra person is not asserted to be the fiance |
| rescued-the-drowning-child | rescuing a drowning child; an extra person does not replace that fact |
| gave-alms-to-the-poor | charity to the poor; an extra person does not replace the poor |
| won-the-regatta | regatta victory; the extra person is not asserted to be an opponent |
| nursed-the-sick-through-fever | nursing the sick through fever; the extra person is not asserted to be a patient |

Seven already-neutral fixed predicates keep their clauses and neutral object treatment: is-bankrupt, embezzles-guild-funds, consorts-with-smugglers, fathered-a-bastard, shuttered-the-shop, blessed-the-harvest, is-favored-at-court. Some present-tense verbs receive M1 agreement only.

Seven explicit relational/transitive predicates retain their object roles: met-secretly-with (companion), is-having-an-affair-with (partner), owes-money-to (creditor), poisoned (patient), publicly-quarreled-with (other party), is-the-true-heir-of (line/person), met-at-the-docks-by-night (companion). Only necessary second-person agreement changes; null/SOMEONE behavior remains. These 17+7 rows partition the actual24 registry keys; the unknown fallback remains outside the registry.

## 7A1 — corrected renderer and permanent regression tests

**Model:** implementer capability after approved-plan/base reconciliation; independent reviewer at least that capability. Root resolves actual enforceable persona at dispatch.
**Files:** original 7A1 set: src/content/predicates.ts; src/content/render.ts; src/sim/fieldwork.ts; tests/content/render.test.ts; tests/sim/claim-names.test.ts.
**Goal:** preserve received predicate facts and English agreement without altering simulation/public-data/action boundaries.

Exact src/content/render.ts:

```ts
import type { Claim } from '../sim/rumors/claim';
import { SOMEONE } from '../sim/rumors/claim';
import type { RegisteredPredicate } from './predicates';

export type ClaimText = Pick<Claim,
  'subject' | 'predicate' | 'object' | 'count' | 'severity' | 'place' | 'attribution'>;
export type NameOf = (id: string) => string;
type Words = { subject: string; object: string | null };
type Template = (words: Words) => string;

// A tale's severity changes the telling's emphasis, never its confidence or truth.
const EMPHASIS: Record<ClaimText['severity'], string> = {
  1: 'softly', 2: 'quietly', 3: 'plainly', 4: 'loudly', 5: 'vehemently',
};
// The public name selector uses exactly "you" for the avatar. Agreement follows
// that explicit display pronoun only; no entity identity or hidden state is read.
const agree = (person: string, third: string, second: string): string =>
  person === 'you' ? second : third;
const involving = (object: string | null): string =>
  object === null ? '' : `; ${object} ${agree(object, 'is', 'are')} named in the account`;

/** Total at compile time against the actual predicate registry, not a second list of IDs. */
const TEMPLATES: Record<RegisteredPredicate, Template> = {
  'met-secretly-with': ({ subject, object }) => `${subject} met ${object ?? 'an unnamed companion'} in secret`,
  'is-having-an-affair-with': ({ subject, object }) =>
    `${subject} ${agree(subject, 'is', 'are')} carrying on an affair${object === null ? '' : ` with ${object}`}`,
  'stole': ({ subject, object }) => `${subject} stole${involving(object)}`,
  'is-bankrupt': ({ subject, object }) => `${subject} ${agree(subject, 'has', 'have')} fallen into bankruptcy${involving(object)}`,
  'owes-money-to': ({ subject, object }) => `${subject} ${agree(subject, 'owes', 'owe')} money to ${object ?? 'an unnamed creditor'}`,
  'poisoned': ({ subject, object }) => `${subject} poisoned ${object ?? 'someone'}`,
  'forged-the-lineage': ({ subject, object }) =>
    `${subject} forged a lineage${involving(object)}`,
  'plans-to-seize-the-throne': ({ subject, object }) =>
    `${subject} ${agree(subject, 'means', 'mean')} to seize the throne${involving(object)}`,
  'bribed-the-council': ({ subject, object }) => `${subject} bribed the council${involving(object)}`,
  'embezzles-guild-funds': ({ subject, object }) =>
    `${subject} ${agree(subject, 'is', 'are')} taking guild funds for private use${involving(object)}`,
  'consorts-with-smugglers': ({ subject, object }) =>
    `${subject} ${agree(subject, 'keeps', 'keep')} company with smugglers${involving(object)}`,
  'cheats-at-cards': ({ subject, object }) =>
    `${subject} ${agree(subject, 'cheats', 'cheat')} at cards${involving(object)}`,
  'fathered-a-bastard': ({ subject, object }) =>
    `${subject} fathered a child out of wedlock${involving(object)}`,
  'broke-a-betrothal': ({ subject, object }) =>
    `${subject} broke a betrothal${involving(object)}`,
  'publicly-quarreled-with': ({ subject, object }) =>
    `${subject} quarreled openly with ${object ?? 'someone'}`,
  'shuttered-the-shop': ({ subject, object }) => `${subject} shut the shop${involving(object)}`,
  'blessed-the-harvest': ({ subject, object }) => `${subject} blessed the harvest${involving(object)}`,
  'rescued-the-drowning-child': ({ subject, object }) =>
    `${subject} saved a drowning child from the water${involving(object)}`,
  'gave-alms-to-the-poor': ({ subject, object }) => `${subject} gave alms to the poor${involving(object)}`,
  'won-the-regatta': ({ subject, object }) =>
    `${subject} won the regatta${involving(object)}`,
  'is-favored-at-court': ({ subject, object }) => `${subject} ${agree(subject, 'enjoys', 'enjoy')} favor at court${involving(object)}`,
  'nursed-the-sick-through-fever': ({ subject, object }) =>
    `${subject} nursed the sick through fever${involving(object)}`,
  'is-the-true-heir-of': ({ subject, object }) =>
    `${subject} ${agree(subject, 'is', 'are')} the rightful heir of ${object ?? 'an unnamed line'}`,
  'met-at-the-docks-by-night': ({ subject, object }) =>
    `${subject} met ${object ?? 'an unnamed companion'} at the docks by night`,
};

/** Prose from the seven received fields only. No claim identity, truth lookup, or world access. */
export function renderClaim(claim: ClaimText, nameOf: NameOf): string {
  const name = (id: string): string => id === SOMEONE ? 'someone' : nameOf(id);
  const words = {
    subject: name(claim.subject),
    object: claim.object === null ? null : name(claim.object),
  };
  const known = Object.prototype.hasOwnProperty.call(TEMPLATES, claim.predicate);
  const clause = known
    ? TEMPLATES[claim.predicate as RegisteredPredicate](words)
    : `${words.subject} ${agree(words.subject, 'figures', 'figure')} in an unfamiliar tale${involving(words.object)}`;
  const qualifiers = [
    ...(claim.place === null ? [] : [`the place named is ${name(claim.place)}`]),
    ...(claim.count === null ? [] : [`the count given is ${claim.count}`]),
  ];
  const sourceName = name(claim.attribution);
  const source = claim.attribution === SOMEONE ? 'The source is unnamed.'
    : sourceName === 'you' ? 'You swear it.' : `${sourceName} swears it.`;
  return `They ${EMPHASIS[claim.severity]} say that ${clause}`
    + qualifiers.map((part) => `; ${part}`).join('') + `. ${source}`;
}
```

Exact tests/content/render.test.ts (original33 cases retained;32 appended =65):

```ts
import { describe, expect, it } from 'vitest';
import { renderClaim, type ClaimText } from '../../src/content/render';
import { PREDICATES } from '../../src/content/predicates';

const BASE: ClaimText = {
  subject: 'actor-id', predicate: 'poisoned', object: 'object-id', count: 0,
  severity: 4, place: 'place-id', attribution: 'source-id',
};
const names: Record<string, string> = {
  'actor-id': 'Adelaide', 'object-id': 'Benedict', 'place-id': 'the old quay',
  'source-id': 'Cecily',
};
const nameOf = (id: string): string => {
  if (id === 'someone') throw new Error('the vague sentinel must not enter a name lookup');
  return names[id] ?? id;
};

describe('period claim prose follows the finite registry and received fields', () => {
  for (const predicate of Object.keys(PREDICATES)) {
    it('renders ' + predicate + ' with all named fields and a meaningful zero count', () => {
      const text = renderClaim({ ...BASE, predicate }, nameOf);
      for (const label of Object.values(names)) expect(text).toContain(label);
      for (const id of Object.keys(names)) expect(text).not.toContain(id);
      if (predicate.includes('-')) expect(text).not.toContain(predicate);
      expect(text).not.toContain('unfamiliar tale');
      expect(text).toContain('count given is 0');
      expect(text).toMatch(/\.$/);
      expect(text).not.toMatch(/undefined|null|NaN/);
    });
  }

  it('does not manufacture the optional place, object or count', () => {
    const text = renderClaim({ ...BASE, predicate: 'is-bankrupt', object: null, count: null, place: null }, nameOf);
    expect(text).toContain('Adelaide has fallen into bankruptcy');
    expect(text).not.toContain('Benedict');
    expect(text).not.toContain('place named');
    expect(text).not.toContain('count given');
    expect(text).toContain('Cecily swears it');
  });

  it('keeps unnamed people and an unnamed source visibly vague', () => {
    const text = renderClaim({ ...BASE, subject: 'someone', object: 'someone', attribution: 'someone' }, nameOf);
    expect(text).toContain('someone poisoned someone');
    expect(text).toContain('source is unnamed');
    expect(text).not.toContain('swears it');
  });

  it('inflects all five severities without changing the allegation or source', () => {
    const texts = ([1, 2, 3, 4, 5] as const).map((severity) => renderClaim({ ...BASE, severity }, nameOf));
    expect(new Set(texts).size).toBe(5);
    for (const text of texts) {
      expect(text).toContain('Adelaide poisoned Benedict');
      expect(text).toContain('Cecily swears it');
    }
  });

  it('uses each supplied name lookup, including a changed spoken source', () => {
    const revised = renderClaim({ ...BASE, attribution: 'object-id' }, nameOf);
    expect(revised).toContain('Benedict swears it');
    expect(revised).not.toContain('Cecily');
  });

  it('renders contradictory supplied place and count explicitly without repairing the claim', () => {
    const text = renderClaim({ ...BASE, predicate: 'met-at-the-docks-by-night', place: 'source-id', count: 2 }, nameOf);
    expect(text).toContain('at the docks by night');
    expect(text).toContain('place named is Cecily');
    expect(text).toContain('count given is 2');
  });

  it('does not mutate a frozen claim or require fabricated identity fields', () => {
    const claim = Object.freeze({ ...BASE });
    const before = JSON.stringify(claim);
    expect(renderClaim(claim, nameOf)).toBe(renderClaim(claim, nameOf));
    expect(JSON.stringify(claim)).toBe(before);
    expect(Object.keys(claim)).not.toContain('family');
  });

  for (const predicate of ['unregistered-tale', 'constructor', '__proto__']) {
    it('handles an unregistered predicate safely: ' + predicate, () => {
      const text = renderClaim({ ...BASE, predicate }, nameOf);
      expect(text).toContain('unfamiliar tale');
      for (const label of Object.values(names)) expect(text).toContain(label);
      expect(text).not.toContain(predicate);
    });
  }
});

import type { Claim } from '../../src/sim/rumors/claim';
import { TRAITS } from '../../src/content/traits';
import { applyTraits } from '../../src/sim/rumors/traits';

// The predicate itself owns these clauses. An extra person does not replace their meaning.
const FIXED_CLAUSES = {
  'stole': 'stole',
  'is-bankrupt': 'has fallen into bankruptcy',
  'forged-the-lineage': 'forged a lineage',
  'plans-to-seize-the-throne': 'means to seize the throne',
  'bribed-the-council': 'bribed the council',
  'embezzles-guild-funds': 'is taking guild funds for private use',
  'consorts-with-smugglers': 'keeps company with smugglers',
  'cheats-at-cards': 'cheats at cards',
  'fathered-a-bastard': 'fathered a child out of wedlock',
  'broke-a-betrothal': 'broke a betrothal',
  'shuttered-the-shop': 'shut the shop',
  'blessed-the-harvest': 'blessed the harvest',
  'rescued-the-drowning-child': 'saved a drowning child from the water',
  'gave-alms-to-the-poor': 'gave alms to the poor',
  'won-the-regatta': 'won the regatta',
  'is-favored-at-court': 'enjoys favor at court',
  'nursed-the-sick-through-fever': 'nursed the sick through fever',
} as const;

describe('predicate meaning survives an extra supplied person', () => {
  for (const [predicate, clause] of Object.entries(FIXED_CLAUSES)) {
    it('preserves ' + predicate + ' for null, named and unnamed objects', () => {
      expect(PREDICATES[predicate]).toBeDefined();
      for (const object of [null, 'object-id', 'someone']) {
        const text = renderClaim({ ...BASE, predicate, object }, nameOf);
        const qualifier = object === null ? ''
          : `; ${object === 'someone' ? 'someone' : 'Benedict'} is named in the account`;
        // The semantic clause is invariant: an object delta cannot rewrite the predicate.
        expect(text.startsWith(`They loudly say that Adelaide ${clause}${qualifier}; the place named is`)).toBe(true);
        expect(text).toContain('the count given is 0');
        expect(text).toContain('Cecily swears it.');
      }
    });
  }

  for (const predicate of ['bribed-the-council', 'rescued-the-drowning-child', 'gave-alms-to-the-poor'] as const) {
    it('preserves ' + predicate + ' through the actual objectifier transform', () => {
      const before: Claim = { ...BASE, id: 'c-prose', family: 'f-prose', parent: null, predicate, object: null };
      const delta = applyTraits([TRAITS['objectifier']!], before,
        { ownerId: 'source-id', faction: 'guild', rivals: ['object-id'], factionOf: () => null });
      expect(delta).toEqual({ object: 'object-id' });
      const after = { ...before, ...delta };
      expect(after.predicate).toBe(before.predicate);
      const clause = `Adelaide ${FIXED_CLAUSES[predicate]}`;
      expect(renderClaim(before, nameOf)).toContain(clause);
      expect(renderClaim(after, nameOf)).toContain(clause + '; Benedict is named in the account');
    });
  }
});

const SECOND_PERSON_CLAUSES = {
  'is-having-an-affair-with': 'you are carrying on an affair',
  'is-bankrupt': 'you have fallen into bankruptcy',
  'owes-money-to': 'you owe money to',
  'plans-to-seize-the-throne': 'you mean to seize the throne',
  'embezzles-guild-funds': 'you are taking guild funds for private use',
  'consorts-with-smugglers': 'you keep company with smugglers',
  'cheats-at-cards': 'you cheat at cards',
  'is-favored-at-court': 'you enjoy favor at court',
  'is-the-true-heir-of': 'you are the rightful heir of',
} as const;

describe('the explicitly supplied you label has matching English agreement', () => {
  for (const [predicate, clause] of Object.entries(SECOND_PERSON_CLAUSES)) {
    it('uses second-person agreement for ' + predicate, () => {
      const text = renderClaim({ ...BASE, predicate }, (id) => id === BASE.subject ? 'you' : nameOf(id));
      expect(text).toContain('They loudly say that ' + clause);
      expect(text).toContain('Cecily swears it.');
    });
  }

  it('agrees in the unfamiliar-tale fallback without inventing a predicate', () => {
    const text = renderClaim({ ...BASE, predicate: 'unregistered-tale' },
      (id) => id === BASE.subject ? 'you' : nameOf(id));
    expect(text).toContain('you figure in an unfamiliar tale');
    expect(text).toContain('Benedict is named in the account');
  });

  it('agrees when you is the neutrally named extra person', () => {
    const text = renderClaim({ ...BASE, predicate: 'is-bankrupt' },
      (id) => id === BASE.object ? 'you' : nameOf(id));
    expect(text).toContain('Adelaide has fallen into bankruptcy; you are named in the account');
  });

  it('agrees and capitalizes the explicitly named you attribution', () => {
    const text = renderClaim(BASE, (id) => id === BASE.attribution ? 'you' : nameOf(id));
    expect(text).toContain('Adelaide poisoned Benedict');
    expect(text.endsWith('. You swear it.')).toBe(true);
  });
});
```

Exact tests/sim/claim-names.test.ts (original4 retained;2 actual enrolled-avatar regressions appended =6):

```ts
import { describe, expect, it } from 'vitest';
import { buildWorld, buildTownMap, enrollPlayer } from '../../src/sim/world';
import { claimNames } from '../../src/sim/fieldwork';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { miniTown } from './helpers/minitown';

describe('claim labels expose public names without changing the simulation', () => {
  it('uses stored person names, existing venue labels, and the avatar label', () => {
    const world = buildWorld(miniTown(), 'claim-names');
    enrollPlayer(world, { home: 'square' });
    expect(claimNames(world)).toMatchObject({ ada: 'Ada', bez: 'Bez', you: 'you', 'home-0': 'home 0' });
    world.npcs['ada']!.name = 'Adelaide';
    expect(claimNames(world)['ada']).toBe('Adelaide');
  });

  it('returns no hidden roster names outside the public directory', () => {
    const fixture = miniTown();
    const world = buildWorld(fixture, 'claim-name-scope');
    world.enemy.map = buildTownMap(fixture);
    world.enemy.map.directory = world.enemy.map.directory.filter((person) => person.id !== 'dov');
    expect(claimNames(world)).not.toHaveProperty('dov');
  });

  it('ignores hidden traits, relationships, schedules and enemy activity', () => {
    const world = buildWorld(miniTown(), 'claim-name-twins');
    const twin = cloneSerializable(world);
    for (const npc of Object.values(twin.npcs)) {
      npc.traits = ['vaguener']; npc.rivals = []; npc.edges = []; npc.schedule = [];
    }
    twin.enemy.observers = [{ id: 'ada', vigilance: 1 }];
    expect(claimNames(twin)).toEqual(claimNames(world));
  });

  it('is a pure transient projection with no new serialized state', () => {
    const world = buildWorld(miniTown(), 'claim-name-pure');
    const before = stableStringify(world);
    const names = claimNames(world);
    names['ada'] = 'scribbled on the view';
    expect(stableStringify(world)).toBe(before);
    expect(claimNames(world)['ada']).toBe('Ada');
  });
});

import { renderClaim } from '../../src/content/render';

describe('actual enrolled-avatar public labels compose with claim prose', () => {
  function enrolledLabels() {
    const world = buildWorld(miniTown(), 'claim-name-avatar-agreement');
    enrollPlayer(world, { home: 'square' });
    const labels = claimNames(world);
    expect(labels[world.playerId!]).toBe('you');
    return { playerId: world.playerId!, nameOf: (id: string) =>
      Object.prototype.hasOwnProperty.call(labels, id) ? labels[id]! : id };
  }

  it('renders the actual public avatar subject with second-person agreement', () => {
    const { playerId, nameOf } = enrolledLabels();
    const text = renderClaim({ subject: playerId, predicate: 'is-bankrupt', object: null,
      count: null, severity: 3, place: null, attribution: 'someone' }, nameOf);
    expect(text).toBe('They plainly say that you have fallen into bankruptcy. The source is unnamed.');
  });

  it('renders the actual public avatar attribution with second-person agreement', () => {
    const { playerId, nameOf } = enrolledLabels();
    const text = renderClaim({ subject: 'ada', predicate: 'poisoned', object: 'bez',
      count: null, severity: 3, place: null, attribution: playerId }, nameOf);
    expect(text).toBe('They plainly say that Ada poisoned Bez. You swear it.');
  });
});
```

**Tests first:** the original proposal's renderer plus these corrected test bodies is the author RED vehicle. Failures must be actual predicate-preservation/agreement assertions; loader failures do not count. On real implementation base, follow the original missing-new-module boundary plus runtime controls; absence alone does not prove all behavior. Do not change the physics or trait to make these tests pass.

**Acceptance:** all original33 renderer and4 selector cases survive;17 fixed-clause cases each cover null/named/SOMEONE;3 real-objectifier regressions prove an object-only delta cannot delete the fixed proposition;9 present-tense subject cases plus unknown/neutral-object/source cases cover the pronoun grammar;2 real-enrolled-avatar tests close the actual selector->renderer seam. Total7A1 =65+6=71 cases in two new files. Native final implementation count is actual predecessor B/F -> B+71/F+2, with no removals.

**Self-checks before implementation:** 24 literal templates;17 neutral fixed propositions +7 explicit relational/transitive roles; all old44 cases preserved;34 additions;78 total. Compiler probe must produce a missing-template diagnostic for a virtual25th key and zero diagnostics without it. New metadata/label code never reads hidden state. On checksum mismatch STOP/report; never repair the spec implicitly.

**Chunk:** focused native tests, both compilers and lint, then root's scoped original7A1 subject/progress entry. No worker index ownership is implied by this author document.

## 7A2 — unchanged reading-surface adoption

**Model:** implementer capability; independent reviewer at least that capability.
**Files:** original ClaimReading/EvidenceBoard/Directives/DayPlanner/main and tests/app/claim-prose.test.ts hunk set, unchanged byte-for-byte from the original proposal.
Apply only original additive hunks reconciled with the actual magic predecessor. Preserve provenance/medium/corroboration, control modes, action values, offer/pending gates and payload construction. No new test retirement;7 UI cases remain. Total after7A2: actual B+78/F+3. Use the original second scoped commit subject. Full gate and separate code review remain required at the actual committed endpoint.

## Author validation and source isolation

Versioned scripts/maps/logs live only in .superpowers/sdd/task-7a-correction-validation/. RED uses original renderer with new permanent tests; GREEN changes only the renderer. Both use the exact unchanged other8 proposal files. The two concurrent R20 inputs (digest.ts, forensics.test.ts) are held separately as validation-only git-show3bc637f snapshots, never included in the11 proposed-file set or a production patch. Host diffs declare only input/output paths, these two baseline read overrides, and updated reported counts; assertion mechanisms remain unchanged.

Both compiler configurations, native Vitest, virtual lint, unchanged24 registry values and actual missing-key firing are required. Preserve old-output hashes before/after. Read task-7a-corrected-author-report.md for measured exits/counts and any failed vehicle corrections; a planned command here is not execution evidence.

## Author self-review, reuse and deferred scope

Reusable-work check: the existing virtual preflight is reused with a mechanically diffed versioned wrapper; no new skill/system is needed for this bounded correction. The lowest accurate implementation floor is the existing implementer role because real-predecessor reconciliation is an integration seam; native assertions and an independent reviewer protect that assignment.

Two adversarial author passes are required and recorded in the report: first scope/API/semantics/counts; second reverse-order tracing of actual-avatar, objectifier, inherited tests and validation isolation. All loops are finite registry/test arrays; no resource-reset loop, timing prediction, gameplay magnitude, threshold or formula is changed.

Actual Task4 base, landed implementation, full gates and separate code review remain open. Task7B owns debrief vocabulary/slots/final subject and later changed-span APIs. Localization/richer grammatical-person metadata is deferred; current explicit public `you` stays the only special pronoun. No hidden-state inference or identifier rename is introduced.

## Binding escalation and handoff

Emergent-behavior assertions are hypotheses. Failing acceptance -> STOP/report with evidence; never weaken thresholds/formulas/physics/seeds or edit the spec. Untraceable existing-suite failure -> BLOCKED. This amendment is not presumed correct and cannot grade its own work. A new independent thread must review the frozen corrected proposal before implementation-base reconciliation. The original reviewer thread is now its author and claims no independent correction approval.
