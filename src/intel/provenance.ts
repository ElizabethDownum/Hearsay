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
