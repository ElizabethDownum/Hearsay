import { CLAIM_FIELDS, type FieldChange, type RumorId } from '../sim/rumors/claim';
import type { TraitId } from '../sim/rumors/traits';
import type { Rules } from '../sim/rules';
import type { ReportedClaim } from '../sim/enemy/state';
import { stableStringify } from '../sim/hash';
import { suggestTraits } from './codex';
import type { IntelEntry } from './entry';
import type { AssistLevel, BoardView, Cluster, RouteHop, Version, VersionDiff } from './types';

/** A claimful utterance: the only row the board clusters and routes (askings/presence carry no claim). */
function isClaimful(e: IntelEntry): boolean {
  return e.kind === 'utterance' && e.family !== null && e.reported !== null;
}

/** Exact structural diff over the 7 content fields — id/family/parent are lineage, not content. */
export function diffReported(a: ReportedClaim, b: ReportedClaim): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of CLAIM_FIELDS) {
    if (a[field] !== b[field]) changes.push({ field, from: a[field], to: b[field] });
  }
  return changes;
}

/**
 * Auto-cluster the feed: group claimful utterances by rumor family, and within a family fold
 * identical readings into one version (first-seen order). Version identity is exact structural
 * equality of the reported object, keyed by stableStringify so field order never forks a version.
 * Sorted by family for a stable, replay-identical listing.
 */
export function clustersOf(log: readonly IntelEntry[]): Cluster[] {
  interface Bucket { versionKeys: Map<string, number>; versions: Version[]; entryIndexes: number[] }
  const byFamily = new Map<RumorId, Bucket>();

  log.forEach((e, i) => {
    if (!isClaimful(e)) return;
    const family = e.family!;
    const reported = e.reported!;
    let bucket = byFamily.get(family);
    if (!bucket) {
      bucket = { versionKeys: new Map(), versions: [], entryIndexes: [] };
      byFamily.set(family, bucket);
    }
    bucket.entryIndexes.push(i);
    const key = stableStringify(reported);
    const existing = bucket.versionKeys.get(key);
    if (existing === undefined) {
      bucket.versionKeys.set(key, bucket.versions.length);
      bucket.versions.push({ reported, firstSeenTick: e.tick, entryIndexes: [i] });
    } else {
      bucket.versions[existing]!.entryIndexes.push(i);
    }
  });

  return [...byFamily.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([family, b]) => ({ family, versions: b.versions, entryIndexes: b.entryIndexes }));
}

/** The changed fields between each consecutive pair of a cluster's versions; empty diffs are dropped. */
export function versionDiffs(cluster: Cluster): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  for (let i = 0; i + 1 < cluster.versions.length; i++) {
    const changes = diffReported(cluster.versions[i]!.reported, cluster.versions[i + 1]!.reported);
    if (changes.length > 0) diffs.push({ fromVersion: i, toVersion: i + 1, changes });
  }
  return diffs;
}

/** The observed hops of one rumor family, in tick order, with the reporting channel preserved. */
export function routeOf(log: readonly IntelEntry[], family: RumorId): RouteHop[] {
  const hops: RouteHop[] = [];
  log.forEach((e) => {
    if (!isClaimful(e) || e.family !== family) return;
    hops.push({
      tick: e.tick, venue: e.venue, speaker: e.speaker!, addressedTo: e.addressedTo!, via: e.via,
    });
  });
  // Stable tick sort: equal-tick hops keep log order (self is captured before informants).
  return hops.sort((a, b) => a.tick - b.tick);
}

/**
 * The whole board as one serializable, deterministic snapshot. Each pane is revealed only at or
 * above its assist level; `suggestions` (per-family trait candidates from the codex fingerprints)
 * unlocks at level >= 2, so it needs the Rules glossary to deduce against.
 */
export function boardView(log: readonly IntelEntry[], level: AssistLevel, rules: Rules): BoardView {
  const clusters = level >= 1 ? clustersOf(log) : null;
  const diffs = clusters
    ? Object.fromEntries(clusters.map((c): [RumorId, VersionDiff[]] => [c.family, versionDiffs(c)]))
    : null;
  const suggestions = level >= 2 && clusters
    ? Object.fromEntries(clusters.map((c): [RumorId, TraitId[]] => [c.family, suggestTraits(log, c.family, rules)]))
    : null;
  const routes = level >= 3 && clusters
    ? Object.fromEntries(clusters.map((c): [RumorId, RouteHop[]] => [c.family, routeOf(log, c.family)]))
    : null;
  return {
    level,
    entries: [...log],
    clusters,
    diffs,
    suggestions,
    routes,
  };
}
