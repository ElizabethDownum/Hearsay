import type { DebriefView } from '../townview';
import type { Resolved } from '../assets';
import { DebriefClaim, DebriefReport, nameFrom, RetainedDetails, When } from './DebriefReading';
import { Term } from './Term';

export interface DebriefArt {
  paper: Resolved;
  icons: Record<'letter' | 'forgery-quill' | 'scrying' | 'seance', { resolved: Resolved; fallback: string }>;
}

function Icon({ art }: { art: DebriefArt['icons']['letter'] }) {
  return <span aria-hidden="true" className="debrief-icon">{art.resolved.kind === 'asset'
    ? <img src={art.resolved.url} alt="" /> : art.resolved.kind === 'layers'
      ? art.resolved.urls.map((url, index) => <img key={index} src={url} alt="" />) : art.fallback}</span>;
}

/** No identity is inferred from matching words; each reader's unresolved rows stay reachable. */
export function DebriefThreads({ view, names, art }: {
  view: DebriefView; names: Readonly<Record<string, string>>; art: DebriefArt;
}) {
  const op = view.operations; const nameOf = nameFrom(names);
  return <section className="panel debrief-surface" aria-label="Threads">
    <h2><Term id="thread">Threads</Term></h2>
    <p>Follow the recorded copies and actual handoffs. A planned route or a missing record is not proof that a message landed.</p>
    <h3>Stories</h3>
    {op.stories.length === 0 && <p>No story family retained.</p>}
    {op.stories.map((thread, ti) => <article className="debrief-card" key={`${thread.id}:${ti}`}>
      <h4>{thread.family}</h4>
      <p>{thread.died === null ? 'Continuation unrecorded' : thread.died ? 'No active continuation retained' : 'An active continuation remains'}
        {' '}· last recorded activity <When tick={thread.lastActivityAt} />.</p>
      <p>Evidence records: {thread.becameEvidence.length ? thread.becameEvidence.join(', ') : 'none linked'}.
        {' '}Paper links: {thread.artifactIds.length ? thread.artifactIds.join(', ') : 'none recorded'}.</p>
      <ol>{thread.events.map((event) => {
        const versions = thread.versions.filter((row) => row.claim.id === event.claimId);
        const version = versions.length === 1 ? versions[0]! : null;
        const parents = version?.claim.parent === null ? [] : thread.versions.filter((row) => row.claim.id === version?.claim.parent);
        const before = version?.parentState === 'recorded' && parents.length === 1 ? parents[0]!.claim : null;
        return <li key={event.chronicleIndex}><When tick={event.record.tick} /> · {event.record.kind} · record {event.chronicleIndex}
          {version === null ? <><p><Term id="ambiguous" /> claim {event.claimId}: {versions.length} retained candidates. No candidate is chosen.</p>
            <RetainedDetails value={versions} label="Read candidate copies" /></>
            : <DebriefClaim claim={version.claim} before={before} changes={event.changes} changedBy={event.changedBy} names={names} />}
          <RetainedDetails value={event.record} />
        </li>;
      })}</ol>
      <details><summary>Every retained version and belief</summary>
        {thread.versions.map((version, index) => <div key={index}><p>{version.claim.id} · parent {version.parentState}</p>
          <DebriefClaim claim={version.claim} changes={version.changes} names={names} /></div>)}
        <RetainedDetails value={thread.beliefs} label="Read retained beliefs" />
      </details>
    </article>)}

    <h3><Icon art={art.icons.letter} /><Term id="artifact">Artifacts</Term> and <Term id="forgery" /></h3>
    {op.artifacts.length === 0 && <p>No paper history retained.</p>}
    {op.artifacts.map((thread, index) => <article className="debrief-card" key={`${thread.id}:${index}`}>
      <h4><Icon art={art.icons['forgery-quill']} />{thread.artifactId}</h4>
      {thread.artifact ? <><p>Forged <When tick={thread.artifact.forgedTick} />. Current holder: {thread.artifact.heldBy === null ? 'none'
        : nameOf(thread.artifact.heldBy)}. Current placement: {thread.artifact.plantedAt ?? 'none'}.</p>
        <DebriefClaim claim={thread.artifact.spec} names={names} /></> : <p>Paper object <Term id="unrecorded" />; its events remain.</p>}
      <ol>{thread.events.map((event) => <li key={event.chronicleIndex}><When tick={event.record.tick} /> · {event.record.act}
        {' '}· claim link {event.claimLink}{event.family !== null && <> · story {event.family}</>}
        {event.claim && <DebriefClaim claim={event.claim} names={names} />}<RetainedDetails value={event.record} /></li>)}</ol>
    </article>)}

    <h3><Term id="network" /> routes</h3>
    {op.messages.length === 0 && <p>No packet history retained.</p>}
    {op.messages.map((thread, index) => <article className="debrief-card" key={`${thread.id}:${index}`}>
      <h4>{thread.messageId}</h4><p>Transport: {thread.transport} · <When tick={thread.transportAt} />.</p>
      <p>Planned route: {thread.plannedRoute === null ? 'unrecorded' : thread.plannedRoute.map(nameOf).join(' → ') || 'empty'}.</p>
      <ol>{thread.stages.map((stage) => <li key={stage.chronicleIndex}><When tick={stage.tick} /> · {nameOf(stage.speaker)} → {nameOf(stage.addressedTo)}
        {' '}at {stage.venue} · {stage.copy.kind}. Heard by {stage.heardBy.map((row) => nameOf(row.id)).join(', ') || 'no recorded audience'}.
        <p>{stage.changes === null ? 'Earlier copy unrecorded' : stage.changes.length === 0 ? 'No recorded copy change'
          : `Copy changed at ${nameOf(stage.speaker)}'s speech`}. Omitted roots: {stage.omittedRoots === null ? 'unknown' : stage.omittedRoots.join(', ') || 'none proved'}.</p>
        {stage.copy.kind === 'directive-report' && <DebriefReport report={stage.copy.report} names={names} />}
        {stage.copy.kind === 'field-report' && stage.copy.items.map((item, index) => item.observation.kind === 'utterance'
          ? <DebriefClaim key={index} claim={item.observation.reported} names={names} /> : null)}
        <RetainedDetails value={{ copy: stage.copy, changes: stage.changes, reportRoots: stage.reportRoots }} label="Read this spoken copy and changes" /></li>)}</ol>
      <RetainedDetails value={thread.carriedCopy} label="Read the current carried copy (not a pristine original)" />
    </article>)}

    <h3>Reported items</h3>
    {op.reportItems.length === 0 && <p>No report-item roots retained.</p>}
    {op.reportItems.map((thread, index) => <article className="debrief-card" key={`${thread.id}:${index}`}>
      <h4>{thread.rootFingerprint}</h4><RetainedDetails value={thread.held} label="Read original and reported holdings" />
      {thread.packets.map((packet, pi) => <div key={`${packet.messageId}:${pi}`}><p>Packet {packet.messageId} · transport {packet.transport}.</p>
        <ol>{packet.stages.map((stage, si) => {
          const earlier = si > 0 ? packet.stages[si - 1]! : null;
          const observation = stage.item?.observation;
          const previous = earlier?.status === 'spoken' ? earlier.item?.observation : null;
          const claim = observation?.kind === 'utterance' ? observation.reported : null;
          const before = previous?.kind === 'utterance' && stage.changes !== null ? previous.reported : null;
          const changes = claim && before ? Object.keys(claim).filter((key) => claim[key as keyof typeof claim] !== before[key as keyof typeof before])
            .map((key) => ({ field: key as keyof typeof claim, from: before[key as keyof typeof before], to: claim[key as keyof typeof claim] })) : null;
          return <li key={`${stage.chronicleIndex}:${si}`}><When tick={stage.tick} /> · {nameOf(stage.speaker)} → {nameOf(stage.addressedTo)}
            <p>{stage.status === 'omitted' ? 'Omitted from this speech; the envelope did not deliver this item.'
              : stage.status === 'unknown' ? 'Item association unknown; no content is assigned to this root.' : 'This item was spoken.'}</p>
            {claim && <DebriefClaim claim={claim} before={before} changes={changes} changedBy={changes?.length ? stage.speaker : null} names={names} />}
            <RetainedDetails value={{ item: stage.item, changes: stage.changes, heardBy: stage.heardBy }} label="Read this item, audience and changes" /></li>;
        })}</ol></div>)}
    </article>)}

    <h3><Term id="directive">Directives</Term></h3>
    {op.directives.length === 0 && <p>No directives retained.</p>}
    {op.directives.map((thread, index) => <article className="debrief-card" key={`${thread.id}:${index}`}>
      <h4>{thread.directiveId}</h4><p>{nameOf(thread.principalId)} instructed {nameOf(thread.recipient)} at <When tick={thread.issuedAt} />.</p>
      <p>{thread.deliveredCopy === null ? 'Delivery unrecorded' : <>Received <When tick={thread.deliveredCopy.tick} /></>}.
        {' '}Latest execution state: {thread.latestRun?.state ?? 'unrecorded'}.</p>
      <p>Actual local results: {thread.localResults === null ? 'unrecorded, not proof of no work' : `${thread.localResults.length} retained`}.</p>
      <RetainedDetails value={thread.authoredCopy} label="Read the authored instruction" />
      <RetainedDetails value={thread.deliveredCopy} label="Read the received instruction" />
      {thread.localResults?.map((outcome, index) => <div key={index}><p>Actual local result at <When tick={outcome.tick} />: {outcome.result.outcome}.</p>
        {outcome.result.reportedClaim && <DebriefClaim claim={outcome.result.reportedClaim} names={names} />}</div>)}
      <RetainedDetails value={thread.localResults} label="Read actual local results" />
      {thread.returnedAccounts.map((account, index) => <div key={index}><p>Returned account received <When tick={account.receivedAt} /> via {nameOf(account.via)}.</p>
        <DebriefReport report={account.report} names={names} /></div>)}
      <RetainedDetails value={thread.returnedAccounts} label="Read returned accounts (which may differ)" />
      <p>Associated packets: {thread.messageIds.join(', ') || 'none retained'}.</p>
    </article>)}

    <h3><Term id="magic" /></h3>
    {op.magic.operations.length === 0 && <p>No ritual or scrying operation retained.</p>}
    {op.magic.operations.map((thread, index) => <article className="debrief-card" key={`${thread.id}:${index}`}>
      <h4><Icon art={art.icons[thread.spell === 'scrying' ? 'scrying' : 'seance']} /><Term id={thread.spell === 'scrying' ? 'scrying' : 'seance'} /> · {thread.operation}</h4>
      <p>Operation records: {thread.recordState}. Historical price: unrecorded.</p>
      {thread.spell === 'scrying' ? <><p>Window: {thread.window === null ? 'unrecorded or inconsistent' : <><When tick={thread.window.from} /> to <When tick={thread.window.to} /> · {thread.window.phase}</>}.
        {' '}Captures: {thread.captureState}. Residue link: {thread.residue.association}.</p>
        <RetainedDetails value={thread.residue} label="Read the trace, physical reports and evidence links" /></>
        : <><p>Historical claim: {thread.claim.state}. Receipt: {thread.receiptState}. This later testimony is not a newly created story.</p>
          {thread.claim.value && <DebriefClaim claim={thread.claim.value} changes={[]} names={names} />}</>}
      <RetainedDetails value={thread.records} label="Read actual operation records" />
      {thread.intel.map((capture, index) => capture.entry.reported
        ? <div key={index}><p>Captured account · receipt <When tick={capture.learnedAt} /> · {capture.association}.</p>
          <DebriefClaim claim={capture.entry.reported} names={names} /></div> : null)}
      <RetainedDetails value={thread.intel} label="Read actual captures and their receipt associations" />
    </article>)}
    <RetainedDetails value={op.magic.unassociatedIntel} label="Magic captures without a proved operation" />
    <RetainedDetails value={op.magic.residuesWithoutOperation} label="Physical residue history without an operation" />

    <h3>Physical sightings and acquisition</h3>
    <p>A chapel visit does not prove a ritual. Residue does not identify a caster. These records do not create a questioning or watch episode.</p>
    <ol>{op.physical.records.map((row) => <li key={row.chronicleIndex}><When tick={row.record.tick} /> · {row.record.kind} at {row.record.venue}
      <RetainedDetails value={row.record} /></li>)}</ol>
    {op.physical.evidence.map((row) => <article className="debrief-card" key={row.evidenceIndex}><h4>Physical evidence {row.evidenceIndex} · {row.entry.kind}</h4>
      <p>Observed <When tick={row.arrival.observedAt} />; enemy acquired <When tick={row.arrival.learnedAt} /> · {row.arrival.timing}.</p>
      <p>Sighting records: {row.sightingIndexes.join(', ') || 'unrecorded'}.</p><RetainedDetails value={row} /></article>)}

    <h3><Term id="evidence-arrival" /></h3>
    {op.enemyEvidence.map((row) => <article id={`debrief-evidence-${row.evidenceIndex}`} className="debrief-card" key={row.evidenceIndex}>
      <h4>Evidence {row.evidenceIndex} · {row.entry.kind}</h4><p>Observed <When tick={row.arrival.observedAt} />; enemy acquired <When tick={row.arrival.learnedAt} />.</p>
      {row.entry.reported && <DebriefClaim claim={row.entry.reported} names={names} />}<RetainedDetails value={row} /></article>)}
    <RetainedDetails value={op.featureReferences} label="Every feature and its retained reference resolution" />
    <h3><Term id="orphan-history" /></h3>
    <RetainedDetails value={op.unresolvedStories} label="Story events without a resolvable claim" />
    <RetainedDetails value={view.chronicle} label="Every chronological record, including institutions and vignettes" />
    <RetainedDetails value={view.recordsBeyondClock} label="Records beyond the retained clock (kept separately)" />
    {'beyondClock' in op && <><h3>Known future operation records</h3>
      <p>This section holds future evidence and later receipt information. A feature may already be current and appear here again as context for a later receipt; that does not mean it was created again in the future.</p>
      <p>Later receipt context for current feature IDs: {op.beyondClock.featureReferences.filter((later) => op.featureReferences.some((current) => current.feature.id === later.feature.id))
        .map((row) => row.feature.id).join(', ') || 'none'}.</p>
      <RetainedDetails value={op.beyondClock} label="Read future evidence, physical acquisitions and feature references" /></>}
  </section>;
}
