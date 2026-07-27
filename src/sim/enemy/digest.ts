import { SOMEONE } from '../rumors/claim';
import type { EntityId } from '../rumors/claim';
import type { Rules } from '../rules';
import type {
  EnemyActionLedgerEntry, EnemyDecision, EnemyState, EvidenceEntry, InquiryKeyData, InquiryOrder,
  InterrogationOrder, SketchEvidenceRef, SketchFeature, TailDrop, TownMapPerson, WatchOrder,
} from './state';
import { INTERROGATION, RUNAROUND_COOLDOWN_DAYS, RUNAROUND_WASTED_NIGHTS, WATCH } from './state';
import { dayOf, minuteOfDay } from '../../core/time';

/** A single evidence reference on a sketch feature — a fair-cop pointer, never a belief. */
type EvidenceRef = SketchEvidenceRef;

/** Total lexicographic order — the only ordering the digest is allowed to use (zero entropy). */
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The enemy cannot mistake its OWN paperwork for a hostile lead, and cannot let it corroborate
 * one either. Authority is Task 9's lawful `issuedDirectiveIds` ledger — never the spoken
 * `claimedIssuer`, which any relay may have rewritten in transit.
 */
const isOwnOrder = (state: EnemyState, entry: EvidenceEntry): boolean => {
  const id = entry.network === undefined ? null
    : entry.network.sourceDirectiveId
      ?? (entry.network.spoken.kind === 'directive'
        || entry.network.spoken.kind === 'directive-report'
        ? entry.network.spoken.directiveId : null);
  return id !== null && (state.issuedDirectiveIds ?? []).includes(id);
};

/** The one exact decoy-subject precedence rule, evaluated top-down against a CAPTURED mission. */
type BriefLead =
  | { kind: 'carrier-profile'; subject: EntityId }
  | { kind: 'district-activity'; district: string };

type CapturedSpeech = Extract<EvidenceEntry, { kind: 'network' }>['network']['spoken'];
type CapturedBrief = Extract<CapturedSpeech, { kind: 'directive' | 'handler-brief' }>;
type CapturedMission = CapturedBrief['brief']['mission'];

function briefLeadFor(
  mission: CapturedMission,
  personOf: Map<string, TownMapPerson>,
  districtOf: Map<string, string>,
): BriefLead | null {
  const known = (id: string): boolean => id !== SOMEONE && personOf.has(id);
  const venueLead = (id: string): BriefLead | null => {
    const district = districtOf.get(id);
    return district === undefined ? null : { kind: 'district-activity', district };
  };
  if (mission.kind === 'learn') {
    // Arm 1: a learn brief that names a person is asking about a carrier.
    if (mission.target.kind === 'person') {
      return known(mission.target.id) ? { kind: 'carrier-profile', subject: mission.target.id } : null;
    }
    // Arm 5 (learn half): a venue target is district interest, never a person.
    if (mission.target.kind === 'venue') return venueLead(mission.target.id);
    return null; // Arm 6: a story target is the inquiry machinery's job, not a lead.
  }
  if (mission.kind !== 'shape') return null; // Arm 6: sound-out seeds nothing in v1.
  // Arm 2: the operation is ABOUT whoever the story names — the red-herring aiming lever.
  const claimSubject = mission.payload.claim.subject;
  if (known(claimSubject)) return { kind: 'carrier-profile', subject: claimSubject };
  // Arm 3: a redirect pins the story on a named source; attribution is already carrier evidence.
  if (mission.operation === 'redirect' && known(mission.redirectTo)) {
    return { kind: 'carrier-profile', subject: mission.redirectTo };
  }
  // Arm 4: the observable delivery connection.
  if (mission.audience.kind === 'person') {
    return known(mission.audience.id) ? { kind: 'carrier-profile', subject: mission.audience.id } : null;
  }
  // Arm 5 (shape half).
  return venueLead(mission.audience.id);
}

/** Does this captured entry touch the person the order was bought to watch? */
const touchesSubject = (e: EvidenceEntry, subject: EntityId | null): boolean =>
  subject !== null && (e.speaker === subject || e.addressedTo === subject
    || e.reported?.subject === subject || e.reported?.object === subject
    || e.reported?.attribution === subject);

const sameAbout = (a: InquiryKeyData | null, b: InquiryKeyData | null): boolean => {
  if (a === null || b === null) return false;
  if ('family' in a) return 'family' in b && a.family === b.family;
  return 'subject' in b && a.subject === b.subject;
};

const touchesAbout = (e: EvidenceEntry, about: InquiryKeyData | null): boolean => {
  if (about === null) return false;
  if (sameAbout(e.about, about)) return true;
  return 'family' in about ? e.family === about.family : touchesSubject(e, about.subject);
};

/**
 * Was one spent action night PRODUCTIVE? Every clause is a fact about what the enemy's own posted
 * guard could have heard while standing there: the right day, inside the order's own window, at an
 * accepted post, not its own paperwork, and actually answering what the order was bought for.
 *
 * The last clause is the ONE place the two order kinds differ, exactly as the plan splits them. A
 * WATCH takes the broad subject-touch rule: standing in a district hoping to hear the subject named,
 * so speaker, addressee, any reported field, or a matching about all count. An INTERROGATION takes
 * "its exact guard/venue/about rule": HQ compelled one specific answer, so only evidence matching
 * the interrogation's own `about` is that answer. The target talking about an unrelated story at
 * the right table in the right minute is precisely the wasted night the runaround exists to price.
 */
function productiveNight(state: EnemyState, row: EnemyActionLedgerEntry, workedDay: number): boolean {
  const window = row.kind === 'watch' ? WATCH : INTERROGATION;
  return state.evidence.some((e) => {
    if (dayOf(e.tick) !== workedDay) return false;
    const minute = minuteOfDay(e.tick);
    if (minute < window.from || minute >= window.to) return false;
    if (!row.posts.some((post) => post.guard === e.observer && post.venue === e.venue)) return false;
    if (isOwnOrder(state, e)) return false;
    if (row.kind === 'interrogation') return touchesAbout(e, row.about);
    return touchesSubject(e, row.subject) || touchesAbout(e, row.about);
  });
}

/** A watch row spends its worked days; an interrogation row spends the one day it actually asked. */
const spentDays = (row: EnemyActionLedgerEntry): number[] =>
  row.kind === 'interrogation'
    ? (row.askedAt === null ? [] : [dayOf(row.askedAt)])
    : row.workedDays;

const byStart = (a: EnemyActionLedgerEntry, b: EnemyActionLedgerEntry): number =>
  a.scheduleStartDay - b.scheduleStartDay || byId(a.orderKey, b.orderKey);

/**
 * "One runaround per LEAD." A runaround deep-copies its lead's exact refs, so the copied trail IS
 * the lead's identity — no new serialized field, and two genuinely distinct leads that happen to
 * name the same person, district, and family each still get priced.
 */
const sameRefs = (a: readonly SketchEvidenceRef[], b: readonly SketchEvidenceRef[]): boolean =>
  a.length === b.length && a.every((ref, i) => ref.tick === b[i]!.tick
    && ref.observer === b[i]!.observer && ref.claimId === b[i]!.claimId
    && ref.messageId === b[i]!.messageId);

/**
 * Plan 8 Task 10 — exposure escalation tiers (P6 deferral #2). How hard the PLAYER'S OWN
 * exposure score pushes the enemy's nightly countermeasure caps. `runEnemyDay` (world-side;
 * `exposureStatus` is adjudicator-only, but runEnemyDay reads it the same way the referee
 * does — the no-omniscience law's "same class as the referee" carve-out) computes a single
 * integer `pressure` from `exposureStatus(world).score` against these bands and hands it to
 * the digest as a plain argument — the ONLY channel through which your own exposure can ever
 * reach the digest's cap logic (the caps are digest-INTERNAL: heuristics 7/8 below). Both the
 * score bands and the cap tables live HERE, in one place — a retune surface (T11 enriches);
 * term-registered as a minimal `pressure` term for now.
 *
 * Tiers STACK (escalation, not a single-band switch): pressure 2 keeps pressure 1's watch
 * relief AND adds the interrogation relief. Pressure never edits WHICH candidates qualify —
 * only how many of the SAME lexicographically-sorted pool the digest is allowed to act on.
 */
export const PRESSURE_TIERS = { tier1: 3, tier2: 5 } as const; // score 0-2 -> 0; 3-4 -> 1; >=5 -> 2
export const WATCH_CAP: Record<0 | 1 | 2, number> = { 0: 1, 1: 2, 2: 2 };
export const INTERROGATION_CAP: Record<0 | 1 | 2, number> = { 0: 1, 1: 1, 2: 2 };

/** Exposure score -> pressure tier. The plan's exact bands: 0-2 -> 0; 3-4 -> 1; >=5 -> 2. */
export function pressureFor(score: number): 0 | 1 | 2 {
  if (score >= PRESSURE_TIERS.tier2) return 2;
  if (score >= PRESSURE_TIERS.tier1) return 1;
  return 0;
}

/**
 * The enemy's mind: a pure fold from the evidence log to a decision. Zero entropy,
 * zero world access, zero mutation. Attribution corruption by answerer traits is
 * CHASED, not seen through — the enemy trusts testimony the way testimony deserves.
 *
 * The nine digest heuristics appear below as named sections, in the spec's order.
 * `pressure` defaults to 0 (the pre-Task-10 shape) so every existing call site — the
 * no-omniscience pillar test included — stays byte-identical without touching a single
 * call.
 */
export function enemyDigest(state: EnemyState, day: number, rules: Rules, pressure: 0 | 1 | 2 = 0): EnemyDecision {
  // Street knowledge only — venue→district and person directory (never beliefs/traits/edges).
  const districtOf = new Map(state.map.venues.map((v) => [v.id, v.district] as const));
  const personOf = new Map(state.map.directory.map((p) => [p.id, p] as const));

  const features: SketchFeature[] = [];
  const inquiries: InquiryOrder[] = [];
  const interrogations: InterrogationOrder[] = [];
  const watches: WatchOrder[] = [];
  const pending = new Set((state.pendingOrders ?? [])
    .filter((order) => day <= order.reconsiderAfterDay).map((order) => order.key));

  // Dedupe consults the persisted sketch PLUS features already grown this digest.
  const has = (pred: (f: SketchFeature) => boolean): boolean =>
    state.sketch.some(pred) || features.some(pred);
  const ref = (e: EvidenceEntry): EvidenceRef => ({
    tick: e.tick, observer: e.observer, claimId: e.claimId,
    messageId: e.network?.messageId ?? null,
  });

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
    if (firstObserver !== null && !state.inquiriesIssued.includes(`s:${s}`)
      && !pending.has(`inquiry:s:${s}`)) {
      inquiries.push({ asker: firstObserver, about: { subject: s }, expiresDay: day + 3 });
    }
  }

  // ── Task 12a: the lawful brief lead ───────────────────────────────────────
  // Only a lawfully ingested spoken `directive` / `handler-brief` can seed one — the digest reads
  // `EvidenceEntry.kind === 'network'` and nothing else, so a DirectiveRecord, a player tag, or a
  // hidden payload field the spoken projection never exposed simply is not here to read. The lead
  // derives from the version the enemy ACTUALLY CAPTURED: a relay that retargeted the subject in
  // transit retargets the lead. That is channel physics, not a bug.
  for (const e of state.evidence) {
    if (e.kind !== 'network') continue;
    const spoken = e.network.spoken;
    if (spoken.kind !== 'directive' && spoken.kind !== 'handler-brief') continue;
    if (isOwnOrder(state, e)) continue;
    const mission = spoken.brief.mission;
    const lead = briefLeadFor(mission, personOf, districtOf);
    if (lead === null) continue;
    const family = mission.kind === 'shape' ? mission.payload.family : null;
    if (lead.kind === 'carrier-profile') {
      const person = personOf.get(lead.subject)!;
      if (has((f) => f.kind === 'carrier-profile' && f.subject === lead.subject)) continue;
      addFeature({
        kind: 'carrier-profile', day, family, subject: lead.subject, district: person.district,
        detail: `brief lead: a captured brief points at ${lead.subject} (${person.occupation}, ${person.district})`,
        evidence: [ref(e)],
      });
      continue;
    }
    if (has((f) => f.kind === 'district-activity' && f.family === family
      && f.district === lead.district)) continue;
    addFeature({
      kind: 'district-activity', day, family, subject: null, district: lead.district,
      detail: `brief lead: a captured brief points into ${lead.district}`,
      evidence: [ref(e)],
    });
  }

  // ── Task 12b: the runaround — attention the enemy provably WASTED ──────────
  // Reads ONLY Task 9's receipt-built `actionLedger`: an intended `WatchOrder`, an accepted
  // schedule nobody stood, a delayed message, and a failed route all leave no worked day and
  // therefore spend nothing. Multiple guards on one day spend ONE night.
  const ledger = state.actionLedger ?? [];
  const tailDrops: TailDrop[] = [];
  const leadIds = [...new Set(ledger.map((row) => row.leadFeatureId)
    .filter((id): id is string => id !== null))].sort(byId);
  for (const leadId of leadIds) {
    const rows = ledger.filter((row) => row.leadFeatureId === leadId);
    const nights = new Map<number, EnemyActionLedgerEntry[]>();
    for (const row of rows) {
      for (const spent of spentDays(row)) {
        if (spent >= day) continue; // tonight's work has not come home yet
        const bucket = nights.get(spent) ?? nights.set(spent, []).get(spent)!;
        bucket.push(row);
      }
    }
    let streak = 0;
    for (const workedDay of [...nights.keys()].sort((a, b) => a - b)) {
      const productive = nights.get(workedDay)!.some((row) => productiveNight(state, row, workedDay));
      streak = productive ? 0 : streak + 1;
    }
    if (streak < RUNAROUND_WASTED_NIGHTS) continue;
    // Resolve the lead from the PERSISTED sketch; missing, mismatched, or empty means no runaround.
    const lead = state.sketch.find((f) => f.id === leadId);
    if (!lead || lead.subject === null || lead.district === null || lead.evidence.length === 0) continue;
    if (has((f) => f.kind === 'runaround' && sameRefs(f.evidence, lead.evidence))) continue;
    addFeature({
      kind: 'runaround', day, family: lead.family, subject: lead.subject, district: lead.district,
      detail: `runaround: ${streak} worked night(s) on ${lead.subject} in ${lead.district} produced nothing (lead ${lead.id})`,
      evidence: lead.evidence.map((row) => ({ ...row })),
    });
    const watchRows = rows.filter((row) => row.kind === 'watch').sort(byStart);
    const startRow = watchRows[0] ?? [...rows].sort(byStart)[0]!;
    tailDrops.push({
      leadFeatureId: leadId, subject: lead.subject, district: lead.district,
      watchStartDay: startRow.scheduleStartDay, untilDay: day + RUNAROUND_COOLDOWN_DAYS,
    });
  }

  // A burnt subject leaves the FRESH-lead pool for the cooldown; the feature itself stays forever,
  // so long-term suspicion (and `exposureStatus`) keeps counting it — inherit their file.
  const burnt = new Set<EntityId>();
  for (const f of [...state.sketch, ...features]) {
    if (f.kind === 'runaround' && f.subject !== null && day < f.day + RUNAROUND_COOLDOWN_DAYS) {
      burnt.add(f.subject);
    }
  }
  const leadAmong = (candidates: readonly SketchFeature[]): SketchFeature | null => candidates
    .filter((f) => f.subject !== null && !burnt.has(f.subject))
    .sort((a, b) => a.day - b.day || byId(a.id, b.id))[0] ?? null;

  // ── Heuristic 6: Inquiries — ask around about a moving suspicious story ─────
  // Suspicious family + a district-activity feature + no origin-vague yet + dedupe
  // key `f:${family}` unissued → up to 2 observers (by id) ask around.
  for (const family of suspiciousFamilies) {
    if (!has((f) => f.kind === 'district-activity' && f.family === family)) continue;
    if (has((f) => f.kind === 'origin-vague' && f.family === family)) continue;
    if (state.inquiriesIssued.includes(`f:${family}`)) continue;
    if (pending.has(`inquiry:f:${family}`)) continue;
    for (const asker of observerIds.slice(0, 2)) {
      inquiries.push({ asker, about: { family }, expiresDay: day + 3 });
    }
  }

  // ── Heuristic 7: Interrogations (cap 1, or 2 at pressure tier 2 — Task 10) ──
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
    if (state.interrogated.includes(`${a}:f:${e.family}`)
      || pending.has(`interrogation:${a}:f:${e.family}`)) continue;
    candidates.push({ target: a, family: e.family });
  }
  candidates.sort((x, y) => byId(x.target, y.target) || byId(x.family, y.family));
  if (candidates.length > 0 && observerIds.length > 0) {
    const invitational = state.map.venues.filter((v) => v.access === 'invitational').map((v) => v.id).sort(byId);
    // Pressure 2 lifts the cap 1 -> 2, taking the NEXT candidate off the SAME sorted pool —
    // never a new selection rule, just more of the same one. Each extra slot rotates to the
    // NEXT observer (round-robin by id, wrapping when guards are scarce). `usedVenues` then
    // guarantees the true post-fix property: no two interrogation orders from ONE digest call
    // ever resolve to the same venue+window — keyed on the VENUE (not merely the guard id),
    // because two DISTINCT guards who simply live in the same district would otherwise still
    // land at that district's one invitational venue and merge. When a slot's assigned guard
    // would land at an already-claimed venue, the slot is DROPPED — honest degradation (cap
    // unmet) rather than a silent multi-way circle.
    const usedVenues = new Set<string>();
    candidates.slice(0, INTERROGATION_CAP[pressure]).forEach(({ target, family }, i) => {
      const guard = observerIds[i % observerIds.length]!;
      const guardDistrict = personOf.get(guard)?.district ?? null;
      const inDistrict = state.map.venues
        .filter((v) => v.access === 'invitational' && v.district === guardDistrict)
        .map((v) => v.id).sort(byId);
      const venue = inDistrict[0] ?? invitational[0] ?? null;
      if (venue === null || usedVenues.has(venue)) return;
      usedVenues.add(venue);
      // Task 12: an interrogation binds only a matching PERSISTED feature for its target/about.
      // Without one the optional key is absent and it can never generate a runaround.
      const lead = leadAmong(state.sketch.filter((f) => f.subject === target && f.family === family));
      interrogations.push(lead === null
        ? { target, guard, day: day + 1, about: { family }, venue }
        : { target, guard, day: day + 1, about: { family }, venue, leadFeatureId: lead.id });
    });
  }

  // ── Heuristic 8: Watches (cap 1, or 2 at pressure tier >= 1 — Task 10) ─────
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
      .filter(([d, n]) => n >= 2 && !state.watchedDistricts.includes(d)
        && !pending.has(`watch:${d}`) && publicVenuesOf(d).length > 0)
      .map(([d]) => d)
      .sort(byId);
    // Pressure >= 1 lifts the cap 1 -> 2, taking the NEXT watchable district off the SAME
    // sorted pool. `usedGuards` prevents the second watch from double-booking a guard the
    // first watch already posted (a guard can only stand in one place at once) — the true
    // post-fix guarantee: a watch order's posts are ALWAYS guards not already committed to an
    // earlier watch this same digest call. `addOverride` only appends (never replaces), so a
    // reused guard's position would silently resolve to whichever watch was processed FIRST,
    // making the later watch's own posts a phantom nobody actually stands. When the unclaimed
    // pool is empty for a later district, that watch's posts shrink to fewer guards — or to
    // zero, in which case the order is DROPPED entirely — rather than reusing a committed guard.
    const usedGuards = new Set<EntityId>();
    for (const district of watchable.slice(0, WATCH_CAP[pressure])) {
      const venues = publicVenuesOf(district);
      const available = observerIds.filter((o) => !usedGuards.has(o));
      const matched = available.filter((o) => personOf.get(o)?.district === district);
      const rest = available.filter((o) => personOf.get(o)?.district !== district);
      const posts = [...matched, ...rest].slice(0, 2)
        .map((guard, i) => ({ guard, venue: venues[i % venues.length]! }));
      for (const p of posts) usedGuards.add(p.guard);
      if (posts.length === 0) continue;
      // Task 12: one subject, one rule, end to end. The oldest un-burnt subject-bearing feature in
      // THIS district is what the watch is for; its subject flows unchanged into the order, the
      // report, the ledger row, and the runaround touch test. No lead → the optional keys are absent
      // (lazy serialization, byte-identical to the pre-Task-12 order shape), and such a watch can
      // never generate a runaround.
      const lead = leadAmong(allFeatures.filter((f) => f.district === district));
      watches.push(lead === null
        ? { district, posts, startDay: day + 1 }
        : {
            district, posts, startDay: day + 1, subject: lead.subject,
            about: lead.family !== null ? { family: lead.family } : { subject: lead.subject! },
            leadFeatureId: lead.id,
          });
    }
  }

  return {
    day, features, inquiries, watches, interrogations,
    ...(tailDrops.length > 0 ? { tailDrops } : {}),
  };
}
