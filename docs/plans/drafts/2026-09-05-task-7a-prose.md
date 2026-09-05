# Task 7A — prose foundation author draft

**Authored-by:** root Codex (GPT-6), 2026-09-05. **Source base:** d79e9ff52d35755adcc435ac3f2e2a14c7245166 (game/test code dc114da).
**Status:** COMPLETE AUTHOR PROPOSAL — pending independent plan review and actual Task4-base reconciliation. No production/test files changed by this authoring work. Do not execute the old-base snapshots as whole-file replacements.
**Spec:** docs/design-spec.md:60,108–109,192–198; archived Plan9 Task7; current R10 split and task-7a-author-brief-2026-09-05.md.
**Order:** actual approved Task4 base reconciliation ->7A1 renderer/public labels ->7A2 reported-claim reading surfaces -> independent review. Prose authoring is independent of the pending magic implementation.
**Gate:** npm test; npm run lint; npm run typecheck; npm run app:build. Actual baseline now1780/114; resolve the real predecessor floor later, never invent a future hash/count.

## Binding constraints and decisions

- Authoring only. Root's direct authoring follows Ellie's renewed go-ahead after worker role/quota restrictions were disclosed. All files remain in Hearsay. Questions/issues live in HTML; no shared AI writes, worker dispatch, pushes or dependencies.
- Preserve mechanics and all received data. Render only seven reported fields; no fabricated Claim id/family, no lookup of truth, sources, schedules, relationships or hidden reports. Panels receive props; no engine import-fence changes.
- Preserve Task3/4 magic provenance/corroboration/medium and action vocabulary during actual-base reconciliation. Task7B owns debrief terms and slots; this renderer adds none.
- All24 registry members have explicit templates. Compiler completeness is tied to the actual registry's literal keys while its existing public Record<string,PredicateDef> facade remains compatible.
- Severity adverbs change narrative emphasis, not certainty; the renderer neither introduces nor reads credence. Null optional slots remain absent. An unnamed subject/object renders someone without a label lookup. An unnamed source stays visibly unnamed.
- Count has no unit metadata in Claim/PredicateDef, so prose says the count given rather than inventing coins, people or occasions. Place is explicitly the place named, preserving even a contradictory received combination. Non-relational predicates retain an extra supplied object as a person named in the account, rather than inventing a relationship.
- Unknown predicate keys get an explicit unfamiliar-tale fallback; the structured detail retains the raw field. Prototype keys are checked as own keys. This does not expand the ontology or change any validation law.
- New premise: current PlayerView/TownMap exposes ids, occupation and district, but not Npc.name. Plan a separate transient public-name selector in fieldwork, keyed only by the existing street directory/venue map plus avatar. Read Npc.name only; add no world-state/map field. Composition root builds nameOf and supplies it to panels. Known venue ids have no separate stored name; use their existing public labels, with only typographic hyphen spacing. Unknown names retain the supplied id, never invent identities. Exact code/tests are included in the 7A1b/7A2 patch below.
- Original private fair-cop helper consolidation belongs to Task3, not this task. All game/scanner laws and tests remain intact.

## 7A1 — renderer and structural registry completeness

**Model:** implementer capability for an approved complete plan; independent reviewer at least implementer capability. Root must resolve actual enforceable seat at dispatch. No worker has run.
**Files:** src/content/predicates.ts (type-preserving facade only), src/content/render.ts (new), tests/content/render.test.ts (new).

In predicates.ts change exactly the declaration:

```ts
export const PREDICATES: Record<PredicateId, PredicateDef> = {
```

to:

```ts
const DEFINITIONS = {
```

Change the file's terminal object closure from `};` to the following (all24 entries and every value are byte-preserved):

```ts
} satisfies Record<PredicateId, PredicateDef>;

export type RegisteredPredicate = keyof typeof DEFINITIONS;
export const PREDICATES: Record<PredicateId, PredicateDef> = DEFINITIONS;
```

Create src/content/render.ts exactly:

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
const involving = (object: string | null): string =>
  object === null ? '' : `; ${object} is named in the account`;

/** Total at compile time against the actual predicate registry, not a second list of IDs. */
const TEMPLATES: Record<RegisteredPredicate, Template> = {
  'met-secretly-with': ({ subject, object }) => `${subject} met ${object ?? 'an unnamed companion'} in secret`,
  'is-having-an-affair-with': ({ subject, object }) =>
    `${subject} is carrying on an affair${object === null ? '' : ` with ${object}`}`,
  'stole': ({ subject, object }) => `${subject} stole${object === null ? '' : ` from ${object}`}`,
  'is-bankrupt': ({ subject, object }) => `${subject} has fallen into bankruptcy${involving(object)}`,
  'owes-money-to': ({ subject, object }) => `${subject} owes money to ${object ?? 'an unnamed creditor'}`,
  'poisoned': ({ subject, object }) => `${subject} poisoned ${object ?? 'someone'}`,
  'forged-the-lineage': ({ subject, object }) =>
    `${subject} forged ${object === null ? 'a lineage' : `the lineage of ${object}`}`,
  'plans-to-seize-the-throne': ({ subject, object }) =>
    `${subject} means to seize the throne${object === null ? '' : ` from ${object}`}`,
  'bribed-the-council': ({ subject, object }) => `${subject} bribed ${object ?? 'the council'}`,
  'embezzles-guild-funds': ({ subject, object }) =>
    `${subject} is taking guild funds for private use${involving(object)}`,
  'consorts-with-smugglers': ({ subject, object }) =>
    `${subject} keeps company with smugglers${involving(object)}`,
  'cheats-at-cards': ({ subject, object }) =>
    `${subject} cheats at cards${object === null ? '' : ` against ${object}`}`,
  'fathered-a-bastard': ({ subject, object }) =>
    `${subject} fathered a child out of wedlock${involving(object)}`,
  'broke-a-betrothal': ({ subject, object }) =>
    `${subject} broke a betrothal${object === null ? '' : ` with ${object}`}`,
  'publicly-quarreled-with': ({ subject, object }) =>
    `${subject} quarreled openly with ${object ?? 'someone'}`,
  'shuttered-the-shop': ({ subject, object }) => `${subject} shut the shop${involving(object)}`,
  'blessed-the-harvest': ({ subject, object }) => `${subject} blessed the harvest${involving(object)}`,
  'rescued-the-drowning-child': ({ subject, object }) =>
    `${subject} saved ${object ?? 'a drowning child'} from the water`,
  'gave-alms-to-the-poor': ({ subject, object }) => `${subject} gave alms to ${object ?? 'the poor'}`,
  'won-the-regatta': ({ subject, object }) =>
    `${subject} won the regatta${object === null ? '' : ` against ${object}`}`,
  'is-favored-at-court': ({ subject, object }) => `${subject} enjoys favor at court${involving(object)}`,
  'nursed-the-sick-through-fever': ({ subject, object }) =>
    `${subject} nursed ${object ?? 'the sick'} through fever`,
  'is-the-true-heir-of': ({ subject, object }) =>
    `${subject} is the rightful heir of ${object ?? 'an unnamed line'}`,
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
    : `${words.subject} figures in an unfamiliar tale${involving(words.object)}`;
  const qualifiers = [
    ...(claim.place === null ? [] : [`the place named is ${name(claim.place)}`]),
    ...(claim.count === null ? [] : [`the count given is ${claim.count}`]),
  ];
  const source = claim.attribution === SOMEONE ? 'The source is unnamed.' : `${name(claim.attribution)} swears it.`;
  return `They ${EMPHASIS[claim.severity]} say that ${clause}`
    + qualifiers.map((part) => `; ${part}`).join('') + `. ${source}`;
}
```

Tests first: add tests/content/render.test.ts exactly. Initial RED is a missing renderer module (a new-module boundary); after creating the module, the registry loop must exercise all24 actual templates and the edge cases below. Do not count loader/path errors as assertion failures.

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
```

Checks: 24 registry cases +9 edge cases =33 cases. Independently compile a virtual future registry entry and verify a missing-template diagnostic; restore no files because the mutation is in memory. Verify the current virtual source with TypeScript plus execute its renderer through native esbuild before publishing the plan. These are planning probes, not native production tests.

## 7A1b and 7A2 — public names and reported-claim reading surfaces

**Model:** implementer capability after approved-plan/base reconciliation; reviewer at least that capability in a separate thread.
**7A1b files:** src/sim/fieldwork.ts, tests/sim/claim-names.test.ts. Include these with renderer unit7A1 in one commit (+37 tests in two new files).
**7A2 files:** app/src/panels/ClaimReading.tsx (new), EvidenceBoard.tsx, Directives.tsx, DayPlanner.tsx, app/src/main.tsx, tests/app/claim-prose.test.ts (new). Second commit adds7 cases in one new file.
**Expected arithmetic:** actual predecessor B tests/F files ->B+37/F+2 ->B+44/F+3; no removals. The authoring source has1780/114 but is not the future Task4 predecessor. Never use a fictional future count.

For new files use the exact additions below. For existing files apply these additive hunks to the reconciled predecessor; the JSON source snapshots are for probes/reference ONLY. Never overwrite future magic controls/provenance with these old-base complete-file snapshots. Run git apply --check on a frozen patch before application; if a predecessor moved a seam, author a narrow reconciled hunk, disclose it, and repeat relevant probes instead of inventing a new UI/knowledge rule.

The patch includes the tests. Add test files before their corresponding source changes and record the actual failing missing-export/reading-line results against the real predecessor. A new-module resolution failure establishes only that the module is absent, not every behavioral acceptance; preserve the positive/runtime controls as the implementation fills in. No loader/access error is RED evidence.

The data boundary remains explicit: claimNames reads only names for the existing public directory, known venue labels and avatar. It changes no world or enemy-map shape. The composition root creates nameOf; panels receive it. The renderer takes exactly the seven received fields and requires no fabricated identity. Exact reported fields remain available in details. Cluster diff cells and earned routes remain unchanged. The five family pickers retain their option VALUES and only change the displayed labels; current payload previews read the same delivered versions. No action, gating, offer or handoff/payload construction function changes.

Optional panel nameOf defaults preserve existing caller compatibility; the actual composition root always supplies the public-name lookup. That lookup uses own-key checking to avoid prototype-key fall-through. ClaimReading uses React text children, not HTML insertion, so names are escaped. Its dt/dd nodes remain direct dl children via Fragment, preserving the existing grid layout. ClusterDetail is exported only to allow the actual component's static-render regression, with no new gameplay input or state.

Exact patch SHA-256 (UTF-8/LF): f58606f977d265ea0b0f5c2c3b77637c385f4edc5b3266512629ea13624015fa.

```diff
--- /dev/null
+++ b/app/src/panels/ClaimReading.tsx
@@ -0,0 +1,19 @@
+import { Fragment } from 'react';
+import { renderClaim, type ClaimText, type NameOf } from '../../../src/content/render';
+import { Term } from './Term';
+
+export const CLAIM_DETAIL_FIELDS = ['subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution'] as const;
+
+/** The received words are the reading line; the exact seven fields remain inspectable. */
+export function ClaimReading({ claim, nameOf = (id) => id, detail = true }: {
+  claim: ClaimText; nameOf?: NameOf; detail?: boolean;
+}) {
+  return <div className="claim-reading">
+    <p>{renderClaim(claim, nameOf)}</p>
+    {detail && <details><summary>Read the fields</summary>
+      <dl className="desk-fields">{CLAIM_DETAIL_FIELDS.map((field) => <Fragment key={field}>
+        <dt><Term id={field} /></dt><dd>{claim[field] === null ? '—' : String(claim[field])}</dd>
+      </Fragment>)}</dl>
+    </details>}
+  </div>;
+}
--- a/src/sim/fieldwork.ts
+++ b/src/sim/fieldwork.ts
@@ -174,6 +174,17 @@
   return buildTownMap({ venues: Object.values(world.venues), npcs: Object.values(world.npcs) });
 }
 
+/** Public display labels only: the existing street directory, venues, and your avatar.
+ * Transient view data; no names are added to serialized world state or the enemy map. */
+export function claimNames(world: WorldState): Record<string, string> {
+  const map = townMapFor(world);
+  return Object.fromEntries([
+    ...map.venues.map((venue) => [venue.id, venue.id.replaceAll('-', ' ')]),
+    ...map.directory.map((person) => [person.id, world.npcs[person.id]?.name ?? person.id]),
+    ...(world.playerId === null ? [] : [[world.playerId, 'you']]),
+  ]);
+}
+
 export function playerView(world: WorldState): PlayerView {
   const tick = world.tick;
   const playerId = world.playerId;
--- a/app/src/panels/EvidenceBoard.tsx
+++ b/app/src/panels/EvidenceBoard.tsx
@@ -1,3 +1,5 @@
+import { renderClaim, type NameOf } from '../../../src/content/render';
+import { ClaimReading, CLAIM_DETAIL_FIELDS } from './ClaimReading';
 import type { BoardView, Cluster, TagNote } from '../../../src/intel/types';
 import { useState } from 'react';
 import { Term } from './Term';
@@ -7,7 +9,7 @@
  *  Exported so the jargon scan (tests/app/jargon.test.ts) can sweep them registry-style — these ids
  *  reach <Term> by ITERATION, not as string literals in JSX, so the literal scan alone never sees
  *  them (renaming one of the seven TERMS entries would otherwise throw at runtime with no failing test). */
-export const FIELDS = ['subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution'] as const;
+export const FIELDS = CLAIM_DETAIL_FIELDS;
 
 /**
  * The Evidence Board — the broadsheet that auto-collects what you lawfully heard. Task-8 upgrades:
@@ -16,8 +18,8 @@
  * BoardView plus the tags + tag verbs (tags are sim-blind by law, so they only ride the UI).
  */
 export function EvidenceBoard({
-  view, tags, onAddTag, onRemoveTag,
-}: { view: BoardView; tags: TagNote[]; onAddTag(target: string, text: string): void; onRemoveTag(id: string): void }) {
+  view, tags, onAddTag, onRemoveTag, nameOf = (id) => id,
+}: { view: BoardView; nameOf?: NameOf; tags: TagNote[]; onAddTag(target: string, text: string): void; onRemoveTag(id: string): void }) {
   const [selected, setSelected] = useState<string | null>(null);
   const clusters = view.clusters ?? [];
   const cluster = clusters.find((c) => c.family === selected) ?? null;
@@ -25,13 +27,14 @@
   return (
     <section className="panel">
       <h2><Term id="evidence-board" /> <span className="desk-note">(<Term id="assist-level" /> {view.level}; {view.entries.length} entries)</span></h2>
-      {view.clusters === null ? <RawNotes view={view} /> : (
+      {view.clusters === null ? <RawNotes view={view} nameOf={nameOf} /> : (
         <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
           <ul>
             {clusters.map((c) => (
               <li key={c.family}>
                 <button className="desk-btn" onClick={() => setSelected(c.family)}>
-                  {c.family} — {c.versions.length} <Term id="version" />(s)
+                  {c.family} — {c.versions[0] ? renderClaim(c.versions[0].reported, nameOf) : 'No account recorded.'}
+                  {' '}· {c.versions.length} <Term id="version" />(s)
                 </button>
                 {' '}{viasOf(c.entryIndexes).map((v) => <span key={v} className="badge badge-via">{v}</span>)}
                 {view.suggestions?.[c.family]?.length ? <span className="desk-note"> · candidates: {view.suggestions[c.family]!.join(', ')}</span> : ''}
@@ -39,29 +42,33 @@
               </li>
             ))}
           </ul>
-          {cluster && <ClusterDetail cluster={cluster} view={view} />}
+          {cluster && <ClusterDetail cluster={cluster} view={view} nameOf={nameOf} />}
         </div>
       )}
     </section>
   );
 }
 
-function RawNotes({ view }: { view: BoardView }) {
+function RawNotes({ view, nameOf }: { view: BoardView; nameOf: NameOf }) {
   return <ol>{view.entries.map((e, i) => (
     <li key={i}>
       t{e.tick} {e.kind} @{e.venue} <span className="badge badge-via"><Term id="via" /> {e.via}</span>
-      {e.reported ? ` — "${e.reported.subject} ${e.reported.predicate}"` : ''}
+      {e.reported && <ClaimReading claim={e.reported} nameOf={nameOf} />}
     </li>
   ))}</ol>;
 }
 
-function ClusterDetail({ cluster, view }: { cluster: Cluster; view: BoardView }) {
+export function ClusterDetail({ cluster, view, nameOf = (id) => id }: { cluster: Cluster; view: BoardView; nameOf?: NameOf }) {
   const diffs = view.diffs?.[cluster.family] ?? [];
   const changedByVersion = new Map<number, Set<string>>();
   for (const d of diffs) changedByVersion.set(d.toVersion, new Set(d.changes.map((c) => c.field)));
   return (
     <div>
       <h3>{cluster.family}</h3>
+      <ol>{cluster.versions.map((version, index) => <li key={index}>
+        <ClaimReading claim={version.reported} nameOf={nameOf} detail={false} />
+      </li>)}</ol>
+      <details><summary>Compare the fields</summary>
       <table className="board-table"><thead><tr><th>field</th>{cluster.versions.map((_, i) => <th key={i}>v{i}</th>)}</tr></thead>
         <tbody>{FIELDS.map((f) => (
           <tr key={f}><td><Term id={f} /></td>{cluster.versions.map((v, i) => (
@@ -69,7 +76,7 @@
               {String(v.reported[f])}
             </td>))}
           </tr>))}
-        </tbody></table>
+        </tbody></table></details>
       {view.routes?.[cluster.family] && (
         <ol>{view.routes[cluster.family]!.map((h, i) => (
           <li key={i}>t{h.tick}: {h.speaker} → {h.addressedTo} @{h.venue} <span className="badge badge-via"><Term id="via" /> {h.via}</span></li>))}
--- a/app/src/panels/Directives.tsx
+++ b/app/src/panels/Directives.tsx
@@ -1,3 +1,5 @@
+import type { NameOf } from '../../../src/content/render';
+import { ClaimReading } from './ClaimReading';
 import { dayOf, minuteOfDay } from '../../../src/core/time';
 import type {
   AdvisoryGuidance, DirectiveLedgerRow, DirectiveLedgerView, DirectiveMission,
@@ -24,7 +26,7 @@
 const pad = (n: number) => String(n).padStart(2, '0');
 const fmtTick = (t: number) => `day ${dayOf(t)} · ${pad(Math.floor(minuteOfDay(t) / 60))}:${pad(minuteOfDay(t) % 60)}`;
 
-export function Directives({ view }: { view: DirectiveLedgerView }) {
+export function Directives({ view, nameOf = (id) => id }: { view: DirectiveLedgerView; nameOf?: NameOf }) {
   return (
     <section className="panel">
       <h2><Term id="directive" /></h2>
@@ -34,7 +36,7 @@
             Nothing on the desk. Hand a <Term id="brief" /> to someone standing in front of you.
           </p>
         )
-        : view.rows.map((row) => <DirectiveRow key={row.id} row={row} />)}
+        : view.rows.map((row) => <DirectiveRow key={row.id} row={row} nameOf={nameOf} />)}
       <p className="desk-note">
         Every line here is your own paperwork or a report that physically reached you. Whether the{' '}
         <Term id="brief" /> arrived, and what was made of it, is not the desk&apos;s to say.
@@ -43,7 +45,7 @@
   );
 }
 
-function DirectiveRow({ row }: { row: DirectiveLedgerRow }) {
+function DirectiveRow({ row, nameOf }: { row: DirectiveLedgerRow; nameOf: NameOf }) {
   const brief = row.authored;
   return (
     <article className="desk-record" aria-label={`directive ${row.id}`}>
@@ -79,19 +81,19 @@
         <dt><Term id="purpose" /></dt>
         <dd>{brief.purpose === null ? <span className="desk-note">withheld</span> : brief.purpose}</dd>
       </dl>
-      <Reports rows={row.reports} />
+      <Reports rows={row.reports} nameOf={nameOf} />
     </article>
   );
 }
 
-function Reports({ rows }: { rows: DirectiveLedgerRow['reports'] }) {
+function Reports({ rows, nameOf }: { rows: DirectiveLedgerRow['reports']; nameOf: NameOf }) {
   if (rows.length === 0) return <p className="desk-note">Nothing has come back yet.</p>;
   return (
     <ul aria-label="returned reports">
       {rows.map((row, index) => (
         <li key={index}>
           <span className="desk-note">{fmtTick(row.receivedAt)} · via {row.via}</span>
-          <ReportFields report={row.report} />
+          <ReportFields report={row.report} nameOf={nameOf} />
         </li>
       ))}
     </ul>
@@ -99,7 +101,7 @@
 }
 
 /** A label appears ONLY where the returned field is non-null: silence is data, a blank row is noise. */
-function ReportFields({ report }: { report: DirectiveReportPayload }) {
+function ReportFields({ report, nameOf }: { report: DirectiveReportPayload; nameOf: NameOf }) {
   return (
     <dl className="desk-fields">
       {report.outcome !== null && <><dt>outcome</dt><dd>{report.outcome}</dd></>}
@@ -108,17 +110,17 @@
       {report.uncertainty !== null && <><dt>uncertainty</dt><dd>{report.uncertainty}</dd></>}
       {report.evidence !== null && (
         <><dt>evidence</dt><dd><ul>{report.evidence.map((item, index) => (
-          <li key={index}>{evidenceLine(item)}</li>
+          <li key={index}><EvidenceLine item={item} nameOf={nameOf} /></li>
         ))}</ul></dd></>
       )}
     </dl>
   );
 }
 
-function evidenceLine(item: DirectiveReportEvidence): string {
+function EvidenceLine({ item, nameOf }: { item: DirectiveReportEvidence; nameOf: NameOf }) {
   return item.kind === 'observation'
     ? item.text
-    : `${item.reported.subject} ${item.reported.predicate}${item.reported.object === null ? '' : ` ${item.reported.object}`}`;
+    : <ClaimReading claim={item.reported} nameOf={nameOf} />;
 }
 
 function missionLine(mission: DirectiveMission): string {
--- a/app/src/panels/DayPlanner.tsx
+++ b/app/src/panels/DayPlanner.tsx
@@ -1,3 +1,5 @@
+import { renderClaim, type NameOf } from '../../../src/content/render';
+import { ClaimReading } from './ClaimReading';
 import { useState } from 'react';
 import { TERMS } from '../../../src/content/terms';
 import { TICKS_PER_DAY } from '../../../src/core/time';
@@ -294,6 +296,7 @@
 // ── The panel ────────────────────────────────────────────────────────────────────────────────────
 
 export interface DayPlannerProps {
+  nameOf?: NameOf;
   view: PlayerView;
   paused: boolean;
   coin: number;
@@ -387,13 +390,16 @@
 // ── The offered local moment ─────────────────────────────────────────────────────────────────────
 
 function LocalMoment(props: DayPlannerProps & { offer: LocalOffer }) {
-  const { view, coin, economy, offer, net, board, onLocal } = props;
+  const { view, coin, economy, offer, net, board, onLocal, nameOf = (id: string) => id } = props;
   const circle = sortedIds(offer.circleMembers);
   const roster = new Set(rosterIds(net));
   const informants = new Set(view.informants.map((row) => row.id));
   const assetsHere = circle.filter((id) => roster.has(id));
   const informantsHere = circle.filter((id) => informants.has(id));
-  const families = Object.keys(payloadsFrom(board)).sort();
+  const payloads = payloadsFrom(board);
+  const families = Object.keys(payloads).sort();
+  const familyLabels = Object.fromEntries(families.map((family) =>
+    [family, `${family} — ${renderClaim(payloads[family]!.claim, nameOf)}`]));
 
   return (
     <section aria-label="local moment" className="desk-record">
@@ -401,17 +407,17 @@
         You are at {offer.venue}. In this moment, with these people: {circle.length === 0 ? 'nobody' : circle.join(', ')}.
       </p>
       <TellComposer circle={circle} people={directoryIds(view)} venues={venueIds(view)} onLocal={onLocal} />
-      <AskComposer circle={circle} people={directoryIds(view)} families={families} onLocal={onLocal} />
-      <SellComposer circle={circle} families={families} onLocal={onLocal} />
+      <AskComposer circle={circle} people={directoryIds(view)} families={families} familyLabels={familyLabels} onLocal={onLocal} />
+      <SellComposer circle={circle} families={families} familyLabels={familyLabels} onLocal={onLocal} />
       <RecruitComposer
-        candidates={circle.filter((id) => !roster.has(id))} families={families}
+        candidates={circle.filter((id) => !roster.has(id))} families={families} familyLabels={familyLabels}
         coin={coin} economy={economy} onLocal={onLocal} />
       <DebriefComposer assets={assetsHere} atSafehouse={offer.venue === 'safehouse'} onLocal={onLocal} />
       <HostComposer circle={circle} station={view.station} venues={venueIds(view)}
         coin={coin} economy={economy} onLocal={onLocal} />
       <PresetComposer
         assetsHere={assetsHere} informantsHere={informantsHere} people={directoryIds(view)}
-        venues={venueIds(view)} board={board} coin={coin} economy={economy} onLocal={onLocal} />
+        venues={venueIds(view)} board={board} coin={coin} economy={economy} nameOf={nameOf} onLocal={onLocal} />
       <DirectiveComposer {...props} />
     </section>
   );
@@ -464,8 +470,8 @@
 }
 
 function AskComposer({
-  circle, people, families, onLocal,
-}: { circle: string[]; people: string[]; families: string[]; onLocal(i: LocalActionIntent): void }) {
+  circle, people, families, familyLabels, onLocal,
+}: { circle: string[]; people: string[]; families: string[]; familyLabels: Record<string, string>; onLocal(i: LocalActionIntent): void }) {
   const [to, setTo] = useState('');
   const [mode, setMode] = useState<'family' | 'subject'>('subject');
   const [family, setFamily] = useState('');
@@ -487,7 +493,7 @@
           {families.length > 0 && <option value="family">{TERMS['family']!.label}</option>}</select></label>
         {useFamily
           ? <select className="desk-btn" aria-label="ask story" value={fam} onChange={(e) => setFamily(e.target.value)}>
-              {families.map((f) => <option key={f} value={f}>{f}</option>)}</select>
+              {families.map((f) => <option key={f} value={f}>{familyLabels[f] ?? f}</option>)}</select>
           : <select className="desk-btn" aria-label="ask person" value={subj} onChange={(e) => setSubject(e.target.value)}>
               {people.map((p) => <option key={p} value={p}>{p}</option>)}</select>}
         <button className="desk-btn" aria-label="submit ask"
@@ -498,8 +504,8 @@
 }
 
 function SellComposer({
-  circle, families, onLocal,
-}: { circle: string[]; families: string[]; onLocal(i: LocalActionIntent): void }) {
+  circle, families, familyLabels, onLocal,
+}: { circle: string[]; families: string[]; familyLabels: Record<string, string>; onLocal(i: LocalActionIntent): void }) {
   const [to, setTo] = useState('');
   const [family, setFamily] = useState('');
   const target = to || circle[0] || '';
@@ -512,7 +518,7 @@
         : (
           <div className="tag-row">
             <label>sell <select className="desk-btn" aria-label="sell story" value={fam} onChange={(e) => setFamily(e.target.value)}>
-              {families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
+              {families.map((f) => <option key={f} value={f}>{familyLabels[f] ?? f}</option>)}</select></label>
             <label>to <select className="desk-btn" aria-label="sell buyer" value={target} onChange={(e) => setTo(e.target.value)}>
               {circle.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
             <button className="desk-btn" aria-label="submit sell"
@@ -524,9 +530,9 @@
 }
 
 function RecruitComposer({
-  candidates, families, coin, economy, onLocal,
+  candidates, families, familyLabels, coin, economy, onLocal,
 }: {
-  candidates: string[]; families: string[]; coin: number; economy: EconomyDef;
+  candidates: string[]; families: string[]; familyLabels: Record<string, string>; coin: number; economy: EconomyDef;
   onLocal(i: LocalActionIntent): void;
 }) {
   const [target, setTarget] = useState('');
@@ -553,7 +559,7 @@
                 onChange={(e) => setLeverage(e.target.value)}>
                 {families.length === 0
                   ? <option value="">— none held —</option>
-                  : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
+                  : families.map((f) => <option key={f} value={f}>{familyLabels[f] ?? f}</option>)}</select></label>
             )}
             <span className="desk-note">{cost} coin</span>
             <button className="desk-btn" aria-label="submit recruit" disabled={!affordable}
@@ -632,10 +638,10 @@
 /** The three COMPATIBILITY shortcuts. Each is labelled a preset: the fully composed directive below
  *  reaches the same typed application with every route/envelope/report/purpose lever still editable. */
 function PresetComposer({
-  assetsHere, informantsHere, people, venues, board, coin, economy, onLocal,
+  assetsHere, informantsHere, people, venues, board, coin, economy, nameOf, onLocal,
 }: {
   assetsHere: string[]; informantsHere: string[]; people: string[]; venues: string[];
-  board: BoardView; coin: number; economy: EconomyDef; onLocal(i: LocalActionIntent): void;
+  board: BoardView; nameOf: NameOf; coin: number; economy: EconomyDef; onLocal(i: LocalActionIntent): void;
 }) {
   const payloads = payloadsFrom(board);
   const families = Object.keys(payloads).sort();
@@ -679,7 +685,7 @@
               <label><Term id="family" /> <select className="desk-btn" aria-label="courier story" value={family} onChange={(e) => setCourierFamily(e.target.value)}>
                 {families.length === 0
                   ? <option value="">— none held —</option>
-                  : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
+                  : families.map((f) => <option key={f} value={f}>{f} — {renderClaim(payloads[f]!.claim, nameOf)}</option>)}</select></label>
               <label>to <select className="desk-btn" aria-label="courier target" value={to} onChange={(e) => setCourierTarget(e.target.value)}>
                 {people.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
               <span className="desk-note">{economy.courierRun} coin</span>
@@ -689,6 +695,7 @@
                   kind: 'courier', asset: carrier, target: to, viaDrop: null, spec: payload!.claim,
                 })}>preset · hand it over</button>
             </div>
+            {payload && <ClaimReading claim={payload.claim} nameOf={nameOf} />}
             <div className="tag-row">
               <label>meet <select className="desk-btn" aria-label="meet asset" value={meeter} onChange={(e) => setMeetAsset(e.target.value)}>
                 {assetsHere.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
@@ -704,7 +711,7 @@
 // ── The full directive composer: ten independent levers ──────────────────────────────────────────
 
 function DirectiveComposer(props: DayPlannerProps & { offer: LocalOffer }) {
-  const { view, net, board, offer, onLocal } = props;
+  const { view, net, board, offer, onLocal, nameOf = (id: string) => id } = props;
   const sources: ComposerSources = { view, net, board, offer };
   const [draft, setDraft] = useState<DirectiveDraft>(() => defaultDirectiveDraft(sources));
   const set = <K extends keyof DirectiveDraft>(key: K, value: DirectiveDraft[K]) =>
@@ -715,6 +722,7 @@
   const people = directoryIds(view);
   const venues = venueIds(view);
   const families = Object.keys(draft.payloads).sort();
+  const selectedStory = draft.payloads[missionFamilyOf(draft, families)];
   const missionOptions: MissionOptions = { people, venues, families, tick: offer.tick };
   const issues = directiveIssues(draft, sources);
   const rendezvous = rendezvousWindowOf(draft, offer.tick);
@@ -796,7 +804,8 @@
           onChange={(e) => set('mission', withMissionFamily(draft, e.target.value))}>
           {families.length === 0
             ? <option value="">— none held —</option>
-            : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
+            : families.map((f) => <option key={f} value={f}>{f} — {renderClaim(draft.payloads[f]!.claim, nameOf)}</option>)}</select></label>
+        {selectedStory && <ClaimReading claim={selectedStory.claim} nameOf={nameOf} />}
         {families.length === 0 && (
           <span className="desk-note" aria-label="directive payload note">no delivered story to send</span>
         )}
--- a/app/src/main.tsx
+++ b/app/src/main.tsx
@@ -10,7 +10,7 @@
 import { TERMS } from '../../src/content/terms';
 import { computeLayout } from './town/layout';
 import { TownCanvas } from './town/TownCanvas';
-import { playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
+import { claimNames, playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
 import { directiveView } from '../../src/sim/directives/view';
 import { recruitmentHistoryView } from '../../src/sim/network/recruitment';
 import { boardView } from '../../src/intel/board';
@@ -210,6 +210,8 @@
 
   // ── View models: every surface below is a pure fold the composition root computes ──
   const view = playerView(world);
+  const names = claimNames(world);
+  const nameOf = (id: string): string => Object.prototype.hasOwnProperty.call(names, id) ? names[id]! : id;
   const log = world.intel.log;
   const tags = world.intel.tags;
   const watchSightings = new Set(log.filter((e) => e.kind === 'presence').map((e) => e.venue));
@@ -271,7 +273,7 @@
             ))}
           </div>
 
-          {panel === 'board' && <EvidenceBoard view={board} tags={tags} onAddTag={addTag} onRemoveTag={removeTag} />}
+          {panel === 'board' && <EvidenceBoard view={board} nameOf={nameOf} tags={tags} onAddTag={addTag} onRemoveTag={removeTag} />}
           {panel === 'codex' && <Codex rows={codexDetailView(log, world.intel.codex, STANDARD_RULES)} />}
           {panel === 'counter' && <CounterSketch view={counterSketchView(log, world.intel.cards)} />}
           {panel === 'web' && (
@@ -290,14 +292,14 @@
           )}
           {panel === 'planner' && (
             <DayPlanner
-              view={view} paused={speed === 0}
+              view={view} nameOf={nameOf} paused={speed === 0}
               coin={world.coin} economy={STANDARD_RULES.economy} onVerb={submitVerb}
               onRequestLocal={requestLocal}
               offer={localOffer} net={net} board={board} onLocal={chooseLocal}
               localPending={localRequested || localOffer !== null} />
           )}
           {panel === 'network' && <Network view={net} history={approaches} />}
-          {panel === 'directives' && <Directives view={directives} />}
+          {panel === 'directives' && <Directives view={directives} nameOf={nameOf} />}
           {panel === 'treasury' && <Treasury coin={world.coin} stipendDay={stipendDay} economy={STANDARD_RULES.economy} />}
           {panel === 'report' && <EveningReport report={eveningReport(log, view.scenario?.day ?? dayOf(world.tick))} onOpenBoard={() => setPanel('board')} />}
           {panel === 'terms' && <TermsCodex />}
--- /dev/null
+++ b/tests/app/claim-prose.test.ts
@@ -0,0 +1,121 @@
+import { describe, expect, it } from 'vitest';
+import { createElement } from 'react';
+import { renderToStaticMarkup } from 'react-dom/server';
+import { ClaimReading } from '../../app/src/panels/ClaimReading';
+import { EvidenceBoard, ClusterDetail } from '../../app/src/panels/EvidenceBoard';
+import { Directives } from '../../app/src/panels/Directives';
+import { DayPlanner } from '../../app/src/panels/DayPlanner';
+import { boardView } from '../../src/intel/board';
+import type { IntelEntry } from '../../src/intel/entry';
+import { STANDARD_RULES as RULES } from '../../src/content/rules';
+import { buildWorld, enrollPlayer } from '../../src/sim/world';
+import { claimNames, playerView, networkView } from '../../src/sim/fieldwork';
+import type { DirectiveLedgerRow } from '../../src/sim/directives/view';
+import { miniTown } from '../sim/helpers/minitown';
+
+const claim = { subject: 'ada', predicate: 'met-secretly-with', object: 'bez', count: 0,
+  severity: 4 as const, place: 'backroom', attribution: 'cyn' };
+const names: Record<string, string> = { ada: 'Adelaide', bez: 'Benedict', backroom: 'the back room', cyn: 'Cecily' };
+const nameOf = (id: string) => names[id] ?? id;
+const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
+const noop = () => {};
+function heard(over: Partial<IntelEntry> = {}): IntelEntry {
+  return { tick: 0, venue: 'square', via: 'self', kind: 'utterance', overheard: false,
+    speaker: 'cyn', addressedTo: 'you', mode: 'telling', authority: false,
+    claimId: 'c0', family: 'f0', reported: { ...claim }, about: null, actor: null,
+    npc: null, trait: null, edgeFrom: null, edgeTo: null, edgeKind: null,
+    hintAbout: null, hintWitness: null, ...over };
+}
+
+describe('received claim prose on the existing panels', () => {
+  it('keeps the reading line and the exact structured detail, including zero', () => {
+    const page = html(createElement(ClaimReading, { claim, nameOf }));
+    expect(page).toContain('Adelaide met Benedict in secret');
+    expect(page).toContain('Cecily swears it');
+    expect(page).toContain('<details>');
+    expect(page).toContain('met-secretly-with');
+    expect(page).toContain('<dd>0</dd>');
+    expect(page).toContain('<dd>ada</dd>');
+  });
+
+  it('escapes names as text instead of admitting markup', () => {
+    const page = html(createElement(ClaimReading, { claim, nameOf: () => '<script>bad</script>' }));
+    expect(page).not.toContain('<script>');
+    expect(page).toContain('&lt;script&gt;');
+  });
+
+  it('the raw board reads the reported claim and preserves its provenance badge', () => {
+    const view = boardView([heard()], 0, RULES);
+    const page = html(createElement(EvidenceBoard, {
+      view, nameOf, tags: [], onAddTag: noop, onRemoveTag: noop,
+    }));
+    expect(page).toContain('Adelaide met Benedict in secret');
+    expect(page).toContain('badge-via');
+    expect(page).toContain('self');
+    expect(page).toContain('Read the fields');
+  });
+
+  it('cluster prose and exact changed-field detail both survive', () => {
+    const view = boardView([heard(), heard({ tick: 15, claimId: 'c1', reported: { ...claim, count: 2 } })], 1, RULES);
+    const page = html(createElement(ClusterDetail, { cluster: view.clusters![0]!, view, nameOf }));
+    expect(page).toContain('count given is 0');
+    expect(page).toContain('count given is 2');
+    expect(page).toContain('Compare the fields');
+    expect(page).toContain('class="diff-cell"');
+  });
+
+  it('the directive desk renders only the report copy and keeps non-claim observations verbatim', () => {
+    const row: DirectiveLedgerRow = {
+      id: 'd0', recipient: 'ada', issuedAt: 0, clock: 'active', handoff: { outboundVia: [], reportVia: [] },
+      authored: { mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
+        priority: 'routine', authority: 'request', discretion: 'open', specificity: 'guided',
+        guidance: [], active: { from: 0, until: 1440 }, report: 'full', reportBy: null, purpose: null },
+      reports: [{ receivedAt: 15, via: 'ada', report: { outcome: null, reason: null, source: null,
+        uncertainty: null, evidence: [{ kind: 'claim', claimId: 'c0', reported: claim },
+          { kind: 'observation', text: 'The shutters were closed.' }] } }],
+    };
+    const page = html(createElement(Directives, { view: { rows: [row] }, nameOf }));
+    expect(page).toContain('Adelaide met Benedict in secret');
+    expect(page).toContain('The shutters were closed.');
+    expect(page).toContain('met-secretly-with');
+    row.reports = [];
+    const empty = html(createElement(Directives, { view: { rows: [row] }, nameOf }));
+    expect(empty).not.toContain('Adelaide met Benedict in secret');
+    expect(empty).toContain('Nothing has come back yet.');
+  });
+
+  function planner(entries: IntelEntry[]) {
+    const fixture = miniTown();
+    fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
+    for (const npc of fixture.npcs) npc.edges = npc.edges.filter((edge) => edge.to !== 'dov');
+    const world = buildWorld(fixture, 'prose-panel', RULES);
+    enrollPlayer(world, { home: 'square' });
+    world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
+    const view = playerView(world);
+    const labels = claimNames(world);
+    return html(createElement(DayPlanner, { view, paused: true, coin: world.coin, economy: RULES.economy,
+      onVerb: noop, onRequestLocal: noop, localPending: false, onLocal: noop,
+      nameOf: (id: string) => labels[id] ?? id, net: networkView(world), board: boardView(entries, 0, RULES),
+      offer: { tick: view.tick, venue: view.avatar.venue!, circleMembers: view.avatar.circleMembers, token: 'test-offer' },
+    }));
+  }
+
+  it('story controls keep family values while displaying the delivered version and exact preview', () => {
+    const page = planner([heard()]);
+    for (const label of ['sell story', 'courier story', 'directive mission story']) {
+      const select = page.match(new RegExp('<select[^>]*aria-label="' + label + '"[^>]*>([\\s\\S]*?)</select>'));
+      expect(select, label).not.toBeNull();
+      expect(select![1]).toContain('value="f0"');
+      expect(select![1]).toContain('Ada met Bez in secret');
+    }
+    expect(page).toContain('Read the fields');
+    expect(page).not.toContain('no delivered story to send');
+  });
+
+  it('an empty board keeps its honest refusal and offers no fabricated story', () => {
+    const page = planner([]);
+    expect(page).toContain('no delivered story to send');
+    expect(page).not.toContain('value="f0"');
+    expect(page).not.toContain('They loudly say');
+  });
+});
--- /dev/null
+++ b/tests/sim/claim-names.test.ts
@@ -0,0 +1,42 @@
+import { describe, expect, it } from 'vitest';
+import { buildWorld, buildTownMap, enrollPlayer } from '../../src/sim/world';
+import { claimNames } from '../../src/sim/fieldwork';
+import { cloneSerializable, stableStringify } from '../../src/sim/hash';
+import { miniTown } from './helpers/minitown';
+
+describe('claim labels expose public names without changing the simulation', () => {
+  it('uses stored person names, existing venue labels, and the avatar label', () => {
+    const world = buildWorld(miniTown(), 'claim-names');
+    enrollPlayer(world, { home: 'square' });
+    expect(claimNames(world)).toMatchObject({ ada: 'Ada', bez: 'Bez', you: 'you', 'home-0': 'home 0' });
+    world.npcs['ada']!.name = 'Adelaide';
+    expect(claimNames(world)['ada']).toBe('Adelaide');
+  });
+
+  it('returns no hidden roster names outside the public directory', () => {
+    const fixture = miniTown();
+    const world = buildWorld(fixture, 'claim-name-scope');
+    world.enemy.map = buildTownMap(fixture);
+    world.enemy.map.directory = world.enemy.map.directory.filter((person) => person.id !== 'dov');
+    expect(claimNames(world)).not.toHaveProperty('dov');
+  });
+
+  it('ignores hidden traits, relationships, schedules and enemy activity', () => {
+    const world = buildWorld(miniTown(), 'claim-name-twins');
+    const twin = cloneSerializable(world);
+    for (const npc of Object.values(twin.npcs)) {
+      npc.traits = ['vaguener']; npc.rivals = []; npc.edges = []; npc.schedule = [];
+    }
+    twin.enemy.observers = [{ id: 'ada', vigilance: 1 }];
+    expect(claimNames(twin)).toEqual(claimNames(world));
+  });
+
+  it('is a pure transient projection with no new serialized state', () => {
+    const world = buildWorld(miniTown(), 'claim-name-pure');
+    const before = stableStringify(world);
+    const names = claimNames(world);
+    names['ada'] = 'scribbled on the view';
+    expect(stableStringify(world)).toBe(before);
+    expect(claimNames(world)['ada']).toBe('Ada');
+  });
+});
```

## Verification and author self-review

Planning evidence only: all11 virtual proposed files typecheck against the current source; the separate app configuration is also checked. ESLint's actual configuration reports zero errors on the virtual files. All24 predicate metadata values compare equal to the current production registry. A virtual future-predicate addition produces a missing-template compiler diagnostic. No file is mutated for that firing proof. 44 exact authored tests execute through native Vitest and a scoped in-memory Vite source plugin (one probe entry, not three landed test files). Logs and the virtual-source map are under task-7a-validation/. These results do not replace real predecessor RED/GREEN, full final gates, or independent implementation review.

First author pass (API/syntax/count/scale): all24 template keys read from the real registry; all7 content fields preserved;33 renderer+4 name-view+7 panel cases=44. PredicateId is currently string, so a separately typed literal definition object preserves the public Record facade while making renderer completeness structural. Existing plain-English predicates stole/poisoned may legitimately appear in prose: corrected the initial test draft to forbid raw hyphenated IDs only. The source/styled-detail shape uses existing classes and React Fragment rather than nesting grid children under div. The new name-view gap is a required presentation seam, not a new information mechanic. Compiler/native probes passed after those author edits.

Second author pass (reverse order; termination/provenance/calibration): panel action callbacks, disabled expressions, family values, payloadsFrom and all offer/mission construction remain unchanged by the exact patch. Name views do not inspect hidden knowledge and do not mutate state. Unnamed sentinels bypass name lookup; null qualifiers are omitted and count0 remains meaningful. Unknown predicate/prototype keys have an explicit fallback and never invoke inherited properties. No loops wait on replenishing resources: all folds are over finite passed views/registries. Template count and the future-key firing proof bind to this actual source, not the old plan's illustrative24 alone. Separate compilers, virtual lint and44 native proposal cases provide syntax/API evidence; future magic-base compatibility remains explicitly unverified and mandatory.

Probe-host correction: an initial expanded TypeScript run produced37 casing diagnostics because root added lowercased Windows root paths. Preserve the original diagnostic JSON/stdout/stderr; the host now keeps canonical path casing while normalizing only map lookup keys. Planned production code did not change for that correction. No false gameplay RED or approval is claimed.

## Deferred scope and exact checkpoint protocol

- Task7B retains new debrief vocabulary/slots and the original final Task7 commit subject; Task3/4 retain their own spell terms/slots. No art, packages, gameplay balance or world fields are added here.
- Task6's segmented/changed-span prose API may extend this pure seven-field renderer later; this unit preserves the current exact field comparison and does not invent that debrief API.
- Current SSR tests exercise default-visible Sell/Courier/Directive pickers; Ask story and coercive Recruit controls use the same authored labels but are hidden by their existing default modes. Independent review must inspect those two additive hunks; actual-mode controls may be tested when the existing DOM-test deferral changes. No initial mode is altered merely for a test.
- End each landed unit with its native focused tests, typechecks and lint, then root scoped commit and3–6 line progress append. Final Task7A gate: npm test, literal npm run lint, npm run typecheck, npm run app:build; report suite arithmetic and bundle size. No soak/MC is claimed necessary for pure presentation/metadata facade changes; any actual runtime semantic departure changes that determination and must be disclosed.
- Suggested subjects: feat: authored prose for the complete claim registry; feat: read reported claims as prose across the desk. Independent review at the actual committed endpoint; no push.

## Escalation and handoff

Emergent assertions are hypotheses. Stop and report untraceable failures with evidence; never weaken thresholds, formulas, physics, seeds, gates or the spec. Record local vehicle adjustments with mandate. Final pinned Task7 subject remains assigned to 7B's completion; 7A uses scoped prose-foundation subjects and a per-chunk report. Do not self-approve or execute this proposal before independent plan review and actual-predecessor reconciliation. Both author self-reviews are recorded above; implemented-code review remains a separate requirement.

