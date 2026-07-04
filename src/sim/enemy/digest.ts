import { SOMEONE } from '../rumors/claim';
import type { EntityId } from '../rumors/claim';
import type { Rules } from '../rules';
import type {
  EnemyDecision, EnemyState, EvidenceEntry, InquiryOrder,
  InterrogationOrder, SketchFeature, WatchOrder,
} from './state';
import { dayOf } from '../../core/time';

/** A single evidence reference on a sketch feature — a fair-cop pointer, never a belief. */
type EvidenceRef = SketchFeature['evidence'][number];

/** Total lexicographic order — the only ordering the digest is allowed to use (zero entropy). */
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The enemy's mind: a pure fold from the evidence log to a decision. Zero entropy,
 * zero world access, zero mutation. Attribution corruption by answerer traits is
 * CHASED, not seen through — the enemy trusts testimony the way testimony deserves.
 *
 * The nine digest heuristics appear below as named sections, in the spec's order.
 */
export function enemyDigest(state: EnemyState, day: number, rules: Rules): EnemyDecision {
  // Street knowledge only — venue→district and person directory (never beliefs/traits/edges).
  const districtOf = new Map(state.map.venues.map((v) => [v.id, v.district] as const));
  const personOf = new Map(state.map.directory.map((p) => [p.id, p] as const));

  const features: SketchFeature[] = [];
  const inquiries: InquiryOrder[] = [];
  const interrogations: InterrogationOrder[] = [];
  const watches: WatchOrder[] = [];

  // Dedupe consults the persisted sketch PLUS features already grown this digest.
  const has = (pred: (f: SketchFeature) => boolean): boolean =>
    state.sketch.some(pred) || features.some(pred);
  const ref = (e: EvidenceEntry): EvidenceRef => ({ tick: e.tick, observer: e.observer, claimId: e.claimId });

  // ── Heuristic 9: feature ids `sf${counter + i}` in emission order — reads the counter, never writes it.
  const addFeature = (f: Omit<SketchFeature, 'id'>): SketchFeature => {
    const full: SketchFeature = { id: `sf${state.featureCounter + features.length}`, ...f };
    features.push(full);
    return full;
  };

  // Enemy assets, sorted by id — every observer pick is lexicographic.
  const observerIds = state.observers.map((o) => o.id).sort(byId);
  const firstObserver = observerIds[0] ?? null;

  // ── Heuristic 1: Suspicious family ─────────────────────────────────────────
  // A family is suspicious iff some reported claim carries a predicate that is BOTH
  // `valence === 'damaging'` AND base `juiciness >= 0.6`. Keying on VALENCE (not
  // juiciness alone) means flattering counter-spin (e.g. rescued-the-drowning-child
  // at 0.65) is never suspected — it is the player's tool, not the enemy's quarry.
  const suspicious = new Set<string>();
  for (const e of state.evidence) {
    if (e.family === null || e.reported === null) continue;
    const pred = rules.predicates[e.reported.predicate];
    if (pred && pred.valence === 'damaging' && pred.juiciness >= 0.6) suspicious.add(e.family);
  }
  const suspiciousFamilies = [...suspicious].sort(byId);

  for (const family of suspiciousFamilies) {
    const familyEntries = state.evidence.filter((e) => e.family === family);
    // Story-bearing entries (an asking carries no claim, so it is not a "voicing").
    const voicings = familyEntries.filter((e) => e.reported !== null);

    // ── Heuristic 2: entry-point (once per family) ──────────────────────────
    // The family's FIRST evidence entry — where the ENEMY first sampled it (honest
    // lag: not where the story started). District is the venue's district from the map.
    if (!has((f) => f.kind === 'entry-point' && f.family === family)) {
      const first = familyEntries[0];
      if (first) {
        addFeature({
          kind: 'entry-point', day, family, subject: null,
          district: districtOf.get(first.venue) ?? null,
          detail: `story ${family} first sampled at ${first.venue} (day ${dayOf(first.tick)}) from ${first.speaker}`,
          evidence: [ref(first)],
        });
      }
    }

    // ── Heuristic 3: district-activity (once per family × district) ─────────
    // >= 2 distinct voicing speakers for that family in venues of one district.
    const districts = [...new Set(
      voicings.map((e) => districtOf.get(e.venue)).filter((d): d is string => d != null),
    )].sort(byId);
    for (const district of districts) {
      if (has((f) => f.kind === 'district-activity' && f.family === family && f.district === district)) continue;
      const here = voicings.filter((e) => districtOf.get(e.venue) === district);
      const speakers = [...new Set(here.map((e) => e.speaker))].sort(byId);
      if (speakers.length < 2) continue;
      addFeature({
        kind: 'district-activity', day, family, subject: null, district,
        detail: `${family} voiced by ${speakers.length} speakers in ${district} (${speakers.join(', ')})`,
        evidence: here.slice(0, 3).map(ref),
      });
    }

    // ── Heuristic 4: origin-vague (once per family × speaker) ───────────────
    // An `answer`-mode entry that names nobody (attribution === SOMEONE): someone was
    // asked where the story came from and could name no one. A planted story smells so.
    const vagueAnswers = voicings.filter(
      (e) => e.mode === 'answer' && e.reported!.attribution === SOMEONE,
    );
    const vagueSpeakers = [...new Set(vagueAnswers.map((e) => e.speaker))].sort(byId);
    for (const speaker of vagueSpeakers) {
      if (has((f) => f.kind === 'origin-vague' && f.family === family && f.subject === speaker)) continue;
      const entry = vagueAnswers.find((e) => e.speaker === speaker)!;
      addFeature({
        kind: 'origin-vague', day, family, subject: speaker,
        district: districtOf.get(entry.venue) ?? null,
        detail: `${speaker} answered about ${family} but could name no source (day ${dayOf(entry.tick)})`,
        evidence: [ref(entry)],
      });
    }
  }

  // ── Heuristic 5: carrier-profile (once per subject) + a subject-keyed inquiry ──
  // For each origin-vague speaker S: profile them from street knowledge as a hop-zero
  // candidate, and start asking around about S herself (dedupe key `s:${S}`).
  const originVagueSpeakers = [...new Set(
    [...state.sketch, ...features]
      .filter((f) => f.kind === 'origin-vague' && f.subject !== null)
      .map((f) => f.subject as EntityId),
  )].sort(byId);
  for (const s of originVagueSpeakers) {
    const answer = state.evidence.find(
      (e) => e.speaker === s && e.mode === 'answer' && e.reported !== null &&
        e.reported.attribution === SOMEONE && e.family !== null && suspicious.has(e.family),
    );
    const person = personOf.get(s);
    if (person && answer && !has((f) => f.kind === 'carrier-profile' && f.subject === s)) {
      addFeature({
        kind: 'carrier-profile', day, family: null, subject: s, district: person.district,
        detail: `hop-zero candidate: ${s} (${person.occupation}, ${person.district})`,
        evidence: [ref(answer)],
      });
    }
    if (firstObserver !== null && !state.inquiriesIssued.includes(`s:${s}`)) {
      inquiries.push({ asker: firstObserver, about: { subject: s }, expiresDay: day + 3 });
    }
  }

  // ── Heuristic 6: Inquiries — ask around about a moving suspicious story ─────
  // Suspicious family + a district-activity feature + no origin-vague yet + dedupe
  // key `f:${family}` unissued → up to 2 observers (by id) ask around.
  for (const family of suspiciousFamilies) {
    if (!has((f) => f.kind === 'district-activity' && f.family === family)) continue;
    if (has((f) => f.kind === 'origin-vague' && f.family === family)) continue;
    if (state.inquiriesIssued.includes(`f:${family}`)) continue;
    for (const asker of observerIds.slice(0, 2)) {
      inquiries.push({ asker, about: { family }, expiresDay: day + 3 });
    }
  }

  // ── Heuristic 7: Interrogations (<= 1 per digest — v1 pacing) ───────────────
  // A suspicious family's `answer` names a source A (an EntityId, not the answerer),
  // A un-interrogated (key `${A}:f:${family}`), no origin-vague for that family yet.
  // Ties broken lexicographically by target id.
  const candidates: { target: EntityId; family: string }[] = [];
  for (const e of state.evidence) {
    if (e.family === null || e.mode !== 'answer' || e.reported === null) continue;
    if (!suspicious.has(e.family)) continue;
    const a = e.reported.attribution;
    if (a === SOMEONE || a === e.speaker) continue;
    if (has((f) => f.kind === 'origin-vague' && f.family === e.family)) continue;
    if (state.interrogated.includes(`${a}:f:${e.family}`)) continue;
    candidates.push({ target: a, family: e.family });
  }
  candidates.sort((x, y) => byId(x.target, y.target) || byId(x.family, y.family));
  if (candidates.length > 0 && firstObserver !== null) {
    const { target, family } = candidates[0]!;
    const guardDistrict = personOf.get(firstObserver)?.district ?? null;
    const invitational = state.map.venues.filter((v) => v.access === 'invitational').map((v) => v.id).sort(byId);
    const inDistrict = state.map.venues
      .filter((v) => v.access === 'invitational' && v.district === guardDistrict)
      .map((v) => v.id).sort(byId);
    const venue = inDistrict[0] ?? invitational[0] ?? null;
    if (venue !== null) {
      interrogations.push({ target, guard: firstObserver, day: day + 1, about: { family }, venue });
    }
  }

  // ── Heuristic 8: Watches (<= 1 per digest) ─────────────────────────────────
  // A district with >= 2 sketch features (district non-null) while >= 1 origin-vague
  // exists anywhere, not already watched → post 2 observers round-robin over the
  // district's PUBLIC venues (prefer observers whose directory district matches).
  const allFeatures = [...state.sketch, ...features];
  const originVagueAnywhere = allFeatures.some((f) => f.kind === 'origin-vague');
  if (originVagueAnywhere) {
    const publicVenuesOf = (d: string): string[] =>
      state.map.venues.filter((v) => v.district === d && v.access === 'public').map((v) => v.id).sort(byId);
    const countByDistrict = new Map<string, number>();
    for (const f of allFeatures) {
      if (f.district === null) continue;
      countByDistrict.set(f.district, (countByDistrict.get(f.district) ?? 0) + 1);
    }
    const watchable = [...countByDistrict.entries()]
      .filter(([d, n]) => n >= 2 && !state.watchedDistricts.includes(d) && publicVenuesOf(d).length > 0)
      .map(([d]) => d)
      .sort(byId);
    const district = watchable[0];
    if (district !== undefined) {
      const venues = publicVenuesOf(district);
      const matched = observerIds.filter((o) => personOf.get(o)?.district === district);
      const rest = observerIds.filter((o) => personOf.get(o)?.district !== district);
      const posts = [...matched, ...rest].slice(0, 2)
        .map((guard, i) => ({ guard, venue: venues[i % venues.length]! }));
      watches.push({ district, posts, startDay: day + 1 });
    }
  }

  return { day, features, inquiries, watches, interrogations };
}
