import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TERMS } from '../../src/content/terms';
import { PREDICATES } from '../../src/content/predicates';
import { TRAITS } from '../../src/content/traits';
import { VERB_TERM } from '../../app/src/input/actions';
import { FIELDS } from '../../app/src/panels/EvidenceBoard';

/**
 * The no-unregistered-jargon law (amendment #5c), given teeth: every player-facing label in the
 * playable surface renders through a REGISTERED `TERMS` id, or this test goes red. This is a plain
 * fs source-scan (same idiom as tests/app/assets.test.ts's manifest read and
 * tests/lint/determinism-law.test.ts's comment-stripped statement scan) — deliberately NOT a DOM/
 * render test (the brief's "fs, not DOM" instruction; the standing DOM-testing deferral #8 holds).
 *
 * Scope: every app/src/panels/*.tsx source PLUS app/src/main.tsx. The brief scopes the scan to
 * panels/*.tsx; main.tsx is the composition root but it ALSO renders player-facing text directly —
 * the ending cards (EndingScreen's <Term id={e.term} />) and the playback toast
 * (`${TERMS[VERB_TERM[intent.kind]]!.label} queued...`) both resolve through the very same TERMS
 * registry the panels law protects. Excluding main.tsx would leave the loudest player-facing text
 * in the whole app (how the campaign ends) outside the law's reach, so this scan generalizes
 * cleanly to include it: same file shape (.tsx), same collection rules, same registry.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const panelsDir = path.join(repoRoot, 'app/src/panels');
const mainFile = path.join(repoRoot, 'app/src/main.tsx');

const panelFiles = fs.readdirSync(panelsDir)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => path.join(panelsDir, f));
const scannedPaths = [...panelFiles, mainFile];

// Comments must not fool the scan (a commented-out `<Term id="ghost-id" />` in diff noise should
// never count as a real render either way). A SINGLE combined pass (not block-then-line as two
// separate passes) is required: main.tsx's own header prose has a `//` line comment mentioning
// "loop/**" — a block-comment-style opener that never actually opens one. Two separate passes
// would let the block-comment regex find that `/*`-look-alike (it doesn't know it's already inside
// a `//` line) and swallow everything up to the NEXT real `*/` two doc-comments later, silently
// deleting real code (the TABS array) from the scan. One alternation, scanned left-to-right, lets
// the `//` line comment claim the whole line (including its embedded `/**`) before the block
// alternative ever gets a chance to misfire on it.
//
// Known blind spot (accepted): comment markers INSIDE string literals ("http://…", 'a /* b') would
// be mis-stripped — this is a regex scan, not a lexer, and it has no notion of string context. No
// scanned file triggers it today; if one ever does, the non-vacuity floor and the per-file hit
// counts are the tripwire (real hits would silently vanish, dropping the count).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m.startsWith('/*') ? ' ' : ''));
}

type Hit = { file: string; id: string };

/** Collects every STRING-LITERAL jargon reference the brief names: `<Term id="...">` (either quote
 *  style) and `TERMS['...']` / `TERMS["..."]` bracket-literal lookups, plus the `term: '...'` object-
 *  literal field main.tsx's ENDINGS/TABS maps use to carry a term id one level of indirection away
 *  from the JSX (`<Term id={e.term} />` / `<Term id={t.term} />` — the id itself is still a source
 *  string literal, just spelled as a record VALUE instead of a JSX attribute). */
function collectHits(strippedSrc: string, file: string): Hit[] {
  const hits: Hit[] = [];
  for (const m of strippedSrc.matchAll(/<Term\s+id=["']([^"']+)["']/g)) hits.push({ file, id: m[1]! });
  for (const m of strippedSrc.matchAll(/TERMS\[\s*["']([^"']+)["']\s*\]/g)) hits.push({ file, id: m[1]! });
  for (const m of strippedSrc.matchAll(/\bterm:\s*["']([^"']+)["']/g)) hits.push({ file, id: m[1]! });
  return hits;
}

const scanned = scannedPaths.map((p) => {
  const rel = path.relative(repoRoot, p).replace(/\\/g, '/');
  const raw = fs.readFileSync(p, 'utf8');
  const stripped = stripComments(raw);
  return { file: rel, raw, stripped };
});

const allHits: Hit[] = scanned.flatMap(({ file, stripped }) => collectHits(stripped, file));

describe('no-unregistered-jargon scan (amendment #5c) — every string-literal Term/TERMS reference resolves', () => {
  it('the scan is not vacuous: it really finds <Term id> / TERMS[...] / term: literals across panels + main.tsx', () => {
    expect(allHits.length).toBeGreaterThan(50);
  });

  it.each(allHits.map((h, i) => ({ ...h, i })))(
    '#$i $file -> "$id" resolves in TERMS',
    ({ file, id }) => {
      expect(TERMS[id], `unregistered term id '${id}' rendered in ${file}`).toBeDefined();
    },
  );
});

describe('registry-driven wiring — ids rendered by ITERATING a registry, not by a source string literal', () => {
  // The tell composer (DayPlanner) builds its predicate <option> list by iterating TERMS' own
  // predicate-* keys, so it can never drift from TERMS by construction. The real drift risk runs
  // the OTHER way: src/content/predicates.ts (the sim's actual predicate registry) growing a
  // predicate that TERMS never learned a label for — silently dropping it from the tell UI with no
  // failing test anywhere. This proves every PREDICATES id has a live predicate-<id> TERMS entry.
  it('every PREDICATES id has a registered predicate-<id> TERMS entry', () => {
    expect(Object.keys(PREDICATES).length).toBeGreaterThan(0); // the check below would be vacuous otherwise
  });
  it.each(Object.keys(PREDICATES))('predicate-%s resolves in TERMS', (id) => {
    expect(TERMS[`predicate-${id}`], `PREDICATES has '${id}' but TERMS has no 'predicate-${id}'`).toBeDefined();
  });

  // The Codex panel renders `<Term id={\`trait-${r.trait}\`} />` — a template literal driven by
  // world.intel.codex hypotheses, whose `trait` field ranges over TRAITS' own ids. Same shape of
  // risk: a new trait added to src/content/traits.ts without a matching TERMS entry would render a
  // Codex row that throws (Term.tsx's runtime law) the first time a player locks that trait.
  it('every TRAITS id has a registered trait-<id> TERMS entry', () => {
    expect(Object.keys(TRAITS).length).toBeGreaterThan(0);
  });
  it.each(Object.keys(TRAITS))('trait-%s resolves in TERMS', (id) => {
    expect(TERMS[`trait-${id}`], `TRAITS has '${id}' but TERMS has no 'trait-${id}'`).toBeDefined();
  });

  // main.tsx's toast speaks `TERMS[VERB_TERM[intent.kind]]!.label` — VERB_TERM (app/src/input/
  // actions.ts) is a total map from every Action['kind'] to a TERMS id, keyed by the TYPE union, so
  // TypeScript already guarantees VERB_TERM is total. What it can't guarantee is that every VALUE
  // in that map is still a REGISTERED term id — this closes that loop cheaply, verb by verb.
  it('every VERB_TERM value resolves in TERMS (closes the toast loop)', () => {
    expect(Object.keys(VERB_TERM).length).toBeGreaterThan(0);
  });
  it.each(Object.entries(VERB_TERM))('VERB_TERM.%s -> "%s" resolves in TERMS', (kind, termId) => {
    expect(TERMS[termId], `VERB_TERM['${kind}'] -> '${termId}' is not registered in TERMS`).toBeDefined();
  });

  // EvidenceBoard's cluster-detail table renders its seven field row-headers by ITERATING its
  // exported FIELDS array through `<Term id={f} />` — non-literal ids the literal scan above never
  // sees. All seven resolve today, but rename/remove one of those TERMS entries and Term.tsx throws
  // at runtime with no failing test anywhere — this sweep (importing the panel's own array, so the
  // check can never drift from the source) closes that gap.
  it('EvidenceBoard.FIELDS is non-empty (the sweep below would be vacuous otherwise)', () => {
    expect(FIELDS.length).toBeGreaterThan(0);
  });
  it.each([...FIELDS])('EvidenceBoard field "%s" resolves in TERMS', (field) => {
    expect(TERMS[field], `EvidenceBoard renders <Term id="${field}"> via FIELDS but TERMS has no '${field}'`).toBeDefined();
  });
});

describe('raw-label sweep (deferred scope #6 — warning list, report-only, never a failing gate in v1)', () => {
  // A label rendered as a bare JSX text node (not through <Term>) is not (yet) illegal — deferred
  // scope #6 pins the raw-label sweep at "warns", hard-fail arrives once the panel surface
  // stabilizes (Plan 9/10). This walks JSX text nodes (text runs between `>` and `<`, stopping at
  // any `{` so an inline expression container never gets swallowed into the run) and flags any
  // node whose FULL trimmed text is byte-identical to a registered label. It's a scan, not a
  // parser — exactly the cheap-and-over-strict idiom the townview law uses.
  const labels = new Set(Object.values(TERMS).map((t) => t.label));
  type Warning = { file: string; label: string };
  const warnings: Warning[] = [];
  for (const { file, stripped } of scanned) {
    for (const m of stripped.matchAll(/>([^<>{}]+)</g)) {
      const text = m[1]!.trim();
      if (text.length > 0 && labels.has(text)) warnings.push({ file, label: text });
    }
  }

  it('records (never fails on) raw JSX text nodes that literally equal a registered label', () => {
    if (warnings.length > 0) {
      console.log('[jargon scan] raw-label warnings (deferred #6, not a failure):', JSON.stringify(warnings));
    }
    expect(Array.isArray(warnings)).toBe(true); // this describe block can never go red — warning list only
  });
});
