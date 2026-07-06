import type { EntityId, RumorId } from '../sim/rumors/claim';
import type { ReportedClaim } from '../sim/enemy/state';
import { stableStringify } from '../sim/hash';
import type { IntelEntry } from './entry';

/** The subject a web is drawn around: one npc's profile, or the succession objective's principals. */
export type WebSubject =
  | { kind: 'npc'; id: EntityId }
  | { kind: 'objective'; usurper: EntityId; council: EntityId[] };

export interface WebSpoke {
  /** Who carried word about the subject to you (speaker or reporting via). */
  carrier: EntityId;
  via: IntelEntry['via'];
  families: RumorId[];
  entryIndexes: number[];
}

export interface WebView {
  subject: WebSubject;
  /** Families whose reported.subject is the subject (or any principal, for objectives). */
  families: { family: RumorId; versions: number; entryIndexes: number[] }[];
  spokes: WebSpoke[];               // sorted by carrier id — zero entropy
  /** For objectives: how close you are — principals with ANY damaging family known to you. */
  principalsTouched: EntityId[];
}

/** A claimful utterance: the only row kind whose reported.subject a web can read. */
function isClaimful(e: IntelEntry): e is IntelEntry & { family: RumorId; reported: ReportedClaim } {
  return e.kind === 'utterance' && e.family !== null && e.reported !== null;
}

/** The set of ids a web's "subject" matches: one npc, or every principal of an objective plot. */
function principalsOf(subject: WebSubject): Set<EntityId> {
  return subject.kind === 'npc' ? new Set([subject.id]) : new Set([subject.usurper, ...subject.council]);
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The provenance web around a subject: which rumor families are about it, who carried each hop
 * to you, and (for the succession objective) how many principals you've touched with damaging
 * word. `damagingIds` is computed by the CALLER from Rules (a set of family ids judged damaging) —
 * intel itself never reads Rules, so the fence stays clean.
 */
export function webView(
  log: readonly IntelEntry[],
  subject: WebSubject,
  damagingIds: ReadonlySet<string> = new Set(),
): WebView {
  const principals = principalsOf(subject);

  interface Bucket { versionKeys: Set<string>; entryIndexes: number[]; matches: boolean }
  const byFamily = new Map<RumorId, Bucket>();
  log.forEach((e, i) => {
    if (!isClaimful(e)) return;
    let bucket = byFamily.get(e.family);
    if (!bucket) {
      bucket = { versionKeys: new Set(), entryIndexes: [], matches: false };
      byFamily.set(e.family, bucket);
    }
    bucket.entryIndexes.push(i);
    bucket.versionKeys.add(stableStringify(e.reported));
    if (principals.has(e.reported.subject)) bucket.matches = true;
  });

  const families = [...byFamily.entries()]
    .filter(([, b]) => b.matches)
    .sort(([a], [b]) => byId(a, b))
    .map(([family, b]) => ({ family, versions: b.versionKeys.size, entryIndexes: b.entryIndexes }));

  const matchedFamilies = new Set(families.map((f) => f.family));

  interface SpokeBucket { via: IntelEntry['via']; families: Set<RumorId>; entryIndexes: number[] }
  const byCarrier = new Map<EntityId, SpokeBucket>();
  log.forEach((e, i) => {
    if (!isClaimful(e) || !matchedFamilies.has(e.family)) return;
    const carrier = e.via === 'self' ? (e.speaker ?? 'self') : e.via;
    let sb = byCarrier.get(carrier);
    if (!sb) {
      sb = { via: e.via, families: new Set(), entryIndexes: [] };
      byCarrier.set(carrier, sb);
    }
    sb.families.add(e.family);
    sb.entryIndexes.push(i);
  });
  const spokes: WebSpoke[] = [...byCarrier.entries()]
    .sort(([a], [b]) => byId(a, b))
    .map(([carrier, sb]) => ({
      carrier, via: sb.via, families: [...sb.families].sort(byId), entryIndexes: sb.entryIndexes,
    }));

  let principalsTouched: EntityId[] = [];
  if (subject.kind === 'objective') {
    const touched = new Set<EntityId>();
    log.forEach((e) => {
      if (!isClaimful(e)) return;
      if (damagingIds.has(e.family) && principals.has(e.reported.subject)) touched.add(e.reported.subject);
    });
    principalsTouched = [...touched].sort(byId);
  }

  return { subject, families, spokes, principalsTouched };
}
