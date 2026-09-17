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

/** The one diagnostic the law actually raises: a collected hit whose id is not in the registry. */
const unregistered = (hits: Hit[]): Hit[] => hits.filter((h) => TERMS[h.id] === undefined);

// ── The law's firing proof (Plan 11 Task 13 fix wave) ────────────────────────────────────────────
// The live sweep above reads repository files only, so — by construction — every id it examines is
// already registered and no assertion in it can ever be OBSERVED firing. This block pushes a
// synthetic unregistered term through the SAME `stripComments` → `collectHits` → `TERMS[id]`
// pipeline the live sweep runs, and asserts the diagnostic appears. The live sweep is untouched.
describe('the no-unregistered-jargon law FIRES on an injected term (proof, not presence)', () => {
  const VIOLATION = [
    'export function Ghost() {',
    '  return <p><Term id="ghost-jsx" /> {TERMS[\'ghost-lookup\']!.label}</p>;',
    '}',
    "const TABS = [{ key: 'ghost', term: 'ghost-record' }];",
    '// <Term id="ghost-comment" /> — a commented-out render is not a render, and must NOT be collected',
  ].join('\n');
  const injected = collectHits(stripComments(VIOLATION), 'synthetic.tsx');

  it('the REAL extractor collects all three literal forms, and skips the commented one', () => {
    expect(injected.map((h) => h.id).sort()).toEqual(['ghost-jsx', 'ghost-lookup', 'ghost-record']);
  });

  it('the REAL diagnostic reports every injected id (this is the assertion the live sweep runs)', () => {
    expect(unregistered(injected).map((h) => h.id).sort())
      .toEqual(['ghost-jsx', 'ghost-lookup', 'ghost-record']);
  });

  it('…and stays silent on the real surface: no live hit is unregistered', () => {
    expect(unregistered(allHits)).toEqual([]);
  });
});

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

// ── Task 13: the directive desk's registry obligation ────────────────────────────────────────────
// The panel glob above ALREADY auto-covers app/src/panels/Directives.tsx (the scan reads the whole
// directory), so every <Term id="..."> the new desk renders is swept by the law with no edit here.
// What the glob cannot check is the registry side of the bargain: that the eight promised nouns
// really landed, that `verb-directive` was NOT double-registered (it shipped in Task 6), and that
// the copy the presets speak no longer PROMISES a remote NPC will comply.
describe('Task 13 registry — exactly eight new nouns, and no copy that promises compliance', () => {
  /** The registry size at Task-12 HEAD (commit 1aad346), counted from the source at dispatch. */
  const TASK_12_HEAD_TERM_COUNT = 133;
  const NEW_TERM_IDS = [
    'directive', 'brief', 'priority', 'purpose', 'report-expectation', 'scrutiny',
    'sound-out', 'runaround',
  ];
  /**
   * Terms registered by LATER plans, named and subtracted so this assertion keeps proving the thing it
   * was written to prove — that Plan 11 Task 13 added exactly EIGHT nouns — instead of decaying into a
   * whole-registry size pin that every subsequent plan must edit blind. Each id here is also asserted
   * to exist, so the subtraction can never quietly absorb a term that was removed rather than added.
   * Plan 9 Task 1 (artifacts) registers the three artifact verbs.
   */
  const LATER_PLAN_TERM_IDS = [
    // Task 7B terminal vocabulary; preserve the original Task 13 growth assertion.
    "terminal-debrief",
    "artifact",
    "forgery",
    "seance",
    "thread",
    "timeline",
    "overlay",
    "phantom",
    "lag",
    "debrief-epigraph",
    "unrecorded",
    "ambiguous",
    "reported-account",
    "actual-attention",
    "claim-change",
    "evidence-arrival",
    "orphan-history",
    'verb-forge', 'verb-plant', 'verb-show', 'verb-scry', 'scrying', 'magic',
    'scene-presence', 'arcane-residue', 'verb-seance', 'the-departed', 'night-visit',
  ];

  it('the registry grew by exactly 8 from Task-12 HEAD (later-plan registrations named and excluded)', () => {
    for (const id of LATER_PLAN_TERM_IDS) {
      expect(TERMS[id], `'${id}' is named as a later-plan term but is not registered`).toBeDefined();
    }
    expect(Object.keys(TERMS).length - LATER_PLAN_TERM_IDS.length)
      .toBe(TASK_12_HEAD_TERM_COUNT + 8);
  });

  it.each(NEW_TERM_IDS)('registers "%s" with a label and a <=120 char short line', (id) => {
    const term = TERMS[id];
    expect(term, `Task 13 owes TERMS a '${id}' entry`).toBeDefined();
    expect(term!.id).toBe(id);
    expect(term!.label.length).toBeGreaterThan(0);
    expect(term!.short.length).toBeGreaterThan(0);
    expect(term!.short.length).toBeLessThanOrEqual(120);
  });

  it('`verb-directive` is NOT re-registered — Task 6 landed it and it still resolves', () => {
    expect(NEW_TERM_IDS).not.toContain('verb-directive');
    expect(TERMS['verb-directive']).toBeDefined();
    expect(VERB_TERM.directive).toBe('verb-directive');
  });

  it('the scrutiny entry says in long form that it is inferred behaviour, never a shown meter', () => {
    const entry = TERMS['scrutiny']!.entry;
    expect(entry, 'scrutiny owes a long-form codex entry').not.toBeNull();
    expect(entry!.toLowerCase()).toContain('infer');
    expect(entry!.toLowerCase()).toMatch(/never a (shown |visible )?meter|no meter|never shown/);
  });

  // "You set the mission; the asset owns the moment": no preset's copy may state that a requested
  // detail WILL happen. These are the four the task names, plus the posting preset the
  // "requested post is not operational post" law reaches.
  it.each(['verb-recruit', 'recruit', 'verb-courier', 'courier', 'verb-meet', 'verb-host', 'hosting', 'verb-post'])(
    '"%s" copy no longer promises compliance',
    (id) => {
      const copy = `${TERMS[id]!.short} ${TERMS[id]!.entry ?? ''}`.toLowerCase();
      for (const promise of [
        'bring an in-circle npc onto your roster',
        'turn a townsperson into an asset',
        'pull one asset to your safehouse',
        'they keep the mid-day post',
        'task an asset to carry your story to a target',
        'you pick the guest circle',
      ]) {
        expect(copy, `${id} still promises: "${promise}"`).not.toContain(promise);
      }
    },
  );
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
