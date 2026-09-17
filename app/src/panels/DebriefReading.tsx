import { Fragment } from 'react';
import { dayOf, minuteOfDay } from '../../../src/core/time';
import { renderClaim, type ClaimText, type NameOf } from '../../../src/content/render';
import { CLAIM_DETAIL_FIELDS, ClaimReading } from './ClaimReading';
import { Term } from './Term';
import type { DebriefView } from '../townview';

export const nameFrom = (names: Readonly<Record<string, string>>): NameOf => (id) =>
  Object.prototype.hasOwnProperty.call(names, id) ? names[id]! : id;

export function When({ tick }: { tick: number | null }) {
  if (tick === null) return <Term id="unrecorded" />;
  const minute = minuteOfDay(tick);
  return <>day {dayOf(tick)} · {String(Math.floor(minute / 60)).padStart(2, '0')}:{String(minute % 60).padStart(2, '0')}</>;
}

/** Complete retained values stay inspectable; React escapes every string. */
export function RetainedDetails({ value, label = 'Read the retained record' }: { value: unknown; label?: string }) {
  return <details className="debrief-detail"><summary>{label}</summary><pre>{JSON.stringify(value, null, 2) ?? 'Unrecorded'}</pre></details>;
}

type Report = DebriefView['calendar']['days'][number]['overlay']['headquartersAccounts'][number]['copy']['report'];
/** Read the retained reported copy; this presentation never promotes it to an actual result. */
export function DebriefReport({ report, names }: { report: Report; names: Readonly<Record<string, string>> }) {
  return <div className="debrief-reported-copy">
    <p>{report.outcome ?? 'Outcome unrecorded'}{report.reason === null ? '' : ' · '+report.reason}</p>
    <p>Reported source: {report.source === null ? 'unrecorded' : nameFrom(names)(report.source)}.
      {' '}Stated uncertainty: {report.uncertainty ?? 'unrecorded'}.</p>
    {report.evidence === null ? <p>Reported evidence unrecorded.</p> : report.evidence.map((item, index) => item.kind === 'claim'
      ? <DebriefClaim key={index} claim={item.reported} names={names} /> : <p key={index}>{item.text}</p>)}
  </div>;
}

type Change = { field: keyof ClaimText; from: unknown; to: unknown };

/** Mark only text that differs between two actually retained claim copies. Field changes remain the authority. */
function changedWords(before: string, after: string): { word: string; changed: boolean }[] {
  const left = before.match(/\S+\s*/g) ?? []; const right = after.match(/\S+\s*/g) ?? [];
  const lengths = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let a = left.length - 1; a >= 0; a--) for (let b = right.length - 1; b >= 0; b--)
    lengths[a]![b] = left[a] === right[b] ? 1 + lengths[a + 1]![b + 1]!
      : Math.max(lengths[a + 1]![b]!, lengths[a]![b + 1]!);
  const unchanged = new Set<number>(); let a = 0; let b = 0;
  while (a < left.length && b < right.length) {
    if (left[a] === right[b]) { unchanged.add(b); a++; b++; }
    else if (lengths[a + 1]![b]! >= lengths[a]![b + 1]!) a++; else b++;
  }
  return right.map((word, index) => ({ word, changed: !unchanged.has(index) }));
}

export function DebriefClaim({ claim, before = null, changes = null, changedBy = null, names }: {
  claim: ClaimText; before?: ClaimText | null; changes?: readonly Change[] | null;
  changedBy?: string | null; names: Readonly<Record<string, string>>;
}) {
  const nameOf = nameFrom(names); const changed = new Set(changes?.map((row) => row.field) ?? []);
  const comparable = before !== null && changes !== null && changes.length > 0;
  return <div className="claim-reading">
    {comparable ? <>
      <p className="desk-note">Earlier account</p><ClaimReading claim={before} nameOf={nameOf} detail={false} />
      <p className="desk-note">This account — marked words changed</p>
      <p>{changedWords(renderClaim(before, nameOf), renderClaim(claim, nameOf)).map((row, index) => row.changed
        ? <mark key={index} className="debrief-change">{row.word}</mark> : <Fragment key={index}>{row.word}</Fragment>)}</p>
    </> : <ClaimReading claim={claim} nameOf={nameOf} detail={false} />}
    {changes === null ? <p className="desk-note">Earlier comparison <Term id="unrecorded" />.</p>
      : changes.length === 0 ? <p className="desk-note">No recorded change to the claim fields.</p>
        : <p><Term id="claim-change" />: {changedBy === null ? 'the responsible mind is unrecorded' : nameOf(changedBy)}.
          {!comparable && ' The earlier complete copy is unavailable; only the recorded field changes are shown.'}</p>}
    <details><summary>Compare the fields</summary><table className="board-table"><thead><tr>
      <th>Field</th><th>Earlier value</th><th>This value</th><th>Recorded change</th>
    </tr></thead><tbody>{CLAIM_DETAIL_FIELDS.map((field) => {
      const change = changes?.find((row) => row.field === field);
      return <tr key={field}><th scope="row"><Term id={field} /></th>
        <td>{before === null && !change ? 'Unrecorded' : String(change ? change.from : before?.[field])}</td>
        <td className={changed.has(field) ? 'diff-cell' : undefined}>{String(claim[field])}</td>
        <td>{changed.has(field) ? 'Changed' : changes === null ? 'Unknown' : 'Unchanged'}</td></tr>;
    })}</tbody></table></details>
  </div>;
}
