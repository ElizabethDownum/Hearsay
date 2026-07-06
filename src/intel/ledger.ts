import type { Tick } from '../core/time';
import type { RumorId } from '../sim/rumors/claim';
import type { IntelEntry } from './entry';

export interface LedgerRow {
  entryIndex: number; tick: Tick; kind: IntelEntry['kind']; family: RumorId | null; summary: string;
}

export interface LedgerView {
  via: IntelEntry['via'];
  rows: LedgerRow[];
  /** Families this channel reported that OTHER channels also reported — the cross-check surface. */
  corroboratedElsewhere: { family: RumorId; otherVias: IntelEntry['via'][] }[];
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Display string, not physics: the claim content for an utterance, else the row's own kind. */
function summaryOf(e: IntelEntry): string {
  if (e.kind === 'utterance' && e.reported !== null) return `${e.reported.subject} ${e.reported.predicate}`;
  return e.kind;
}

/**
 * Everything one channel (`via`) ever reported, plus the informant-audit surface: which of its
 * families were ALSO carried by at least one other channel (amendment #4's passive detector).
 */
export function informantLedger(log: readonly IntelEntry[], via: IntelEntry['via']): LedgerView {
  const rows: LedgerRow[] = [];
  log.forEach((e, i) => {
    if (e.via !== via) return;
    rows.push({ entryIndex: i, tick: e.tick, kind: e.kind, family: e.family, summary: summaryOf(e) });
  });

  // For every family this via carried, the set of OTHER vias also seen carrying it (log-wide).
  const ownFamilies = new Set<RumorId>();
  for (const row of rows) if (row.family !== null) ownFamilies.add(row.family);

  const otherViasByFamily = new Map<RumorId, Set<IntelEntry['via']>>();
  log.forEach((e) => {
    if (e.family === null || e.via === via || !ownFamilies.has(e.family)) return;
    let vias = otherViasByFamily.get(e.family);
    if (!vias) {
      vias = new Set();
      otherViasByFamily.set(e.family, vias);
    }
    vias.add(e.via);
  });

  const corroboratedElsewhere = [...ownFamilies]
    .filter((family) => (otherViasByFamily.get(family)?.size ?? 0) > 0)
    .sort(byId)
    .map((family) => ({ family, otherVias: [...otherViasByFamily.get(family)!].sort(byId) }));

  return { via, rows, corroboratedElsewhere };
}
