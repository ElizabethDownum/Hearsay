import { Fragment } from 'react';
import { renderClaim, type ClaimText, type NameOf } from '../../../src/content/render';
import { Term } from './Term';

export const CLAIM_DETAIL_FIELDS = ['subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution'] as const;

/** The received words are the reading line; the exact seven fields remain inspectable. */
export function ClaimReading({ claim, nameOf = (id) => id, detail = true }: {
  claim: ClaimText; nameOf?: NameOf; detail?: boolean;
}) {
  return <div className="claim-reading">
    <p>{renderClaim(claim, nameOf)}</p>
    {detail && <details><summary>Read the fields</summary>
      <dl className="desk-fields">{CLAIM_DETAIL_FIELDS.map((field) => <Fragment key={field}>
        <dt><Term id={field} /></dt><dd>{claim[field] === null ? '—' : String(claim[field])}</dd>
      </Fragment>)}</dl>
    </details>}
  </div>;
}
