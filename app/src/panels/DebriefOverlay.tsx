import type { DebriefView } from '../townview';
import { DebriefClaim, DebriefReport, nameFrom, RetainedDetails, When } from './DebriefReading';
import { Term } from './Term';

const STATUS: Record<DebriefView['calendar']['days'][number]['overlay']['signals'][number]['status'], string> = {
  'corroborated-attention': 'Corroborated by actual attention; this alone does not prove a resulting feature.',
  'partly-corroborated': 'Partly corroborated; unmatched original entries remain unproved.',
  'unrecorded-work': 'Related work history is unrecorded; absence is not proved.',
  'issued-unproved': 'An instruction was issued, but this does not prove it was performed.',
  'unproved-signal': 'No retained causal match; this signal is unproved, not established as a phantom.',
};

export function DebriefOverlay({ view, names }: { view: DebriefView; names: Readonly<Record<string, string>> }) {
  const nameOf = nameFrom(names);
  return <section className="panel debrief-surface" aria-label="Overlay">
    <h2><Term id="overlay" /></h2>
    <p>Compare your received signals with actual attention, reported accounts and resulting features. Each is a separate fact.</p>
    <p>A <Term id="phantom" /> needs evidence of fabrication. An unproved signal or missing history cannot establish one.</p>
    {view.calendar.days.map((day) => <article className="debrief-card" key={day.day}>
      <h3>Day {day.day}</h3><p>Through <When tick={day.through} />.</p>
      <h4>Your signals</h4>
      {day.overlay.signals.length === 0 && <p>No received signal at this date.</p>}
      <ul>{day.overlay.signals.map((signal, index) => <li key={`${signal.id}:${index}`}>
        <p>{signal.kind} · {signal.key}</p><p className={signal.status === 'corroborated-attention' ? 'debrief-corroborated' : 'debrief-uncertain'}>
          {STATUS[signal.status]}</p>
        <p>Original entries: {signal.entryIndexes.join(', ')}. Matched entries: {signal.matchedEntryIndexes.join(', ') || 'none'}.
          {' '}Unproved entries: {signal.unmatchedEntryIndexes.join(', ') || 'none'}.</p>
        <p>Actual attention: {signal.attentionIds.join(', ') || 'none linked'}.
          {' '}Resulting feature links: {signal.featureIds.join(', ') || 'none linked'}.</p>
        <RetainedDetails value={signal} label="Read the exact signal correspondence" /></li>)}</ul>
      <h4><Term id="actual-attention" /></h4>
      {day.overlay.attention.actual.length === 0 && <p>No actual attention retained through this date.</p>}
      <ul>{day.overlay.attention.actual.map((act) => <li key={act.id}>{nameOf(act.actor)} · {act.kind} at {act.venue}
        {' '}· performed <When tick={act.occurredAt} /> · {act.id}<RetainedDetails value={act} /></li>)}</ul>
      <h4><Term id="lag" /></h4>
      <p>Actual attention without a matched received signal: {day.overlay.lag.unseenAttentionIds.join(', ') || 'none'}.</p>
      <p>Features without a counter-signal link: {day.overlay.lag.featuresWithoutCounterLinkIds.join(', ') || 'none'}.
        {' '}An absent link is not proof that you knew nothing.</p>
      <h4>Resulting features</h4>
      <RetainedDetails value={day.overlay.features} label="Read features and their causal reference states" />
      <p>Unresolved semantic feature links: {day.overlay.unresolvedFeatureIds.join(', ') || 'none'}.
        {' '}Physical references may have a valid receipt and deliberately no semantic attention act.</p>
      <h4>Copies you actually heard</h4>
      <ul>{day.overlay.receivedReportItems.map((item, index) => <li key={index}>{item.rootFingerprint} · {item.stage.status}
        {' '}· {nameOf(item.stage.speaker)} at <When tick={item.stage.tick} />
        {item.stage.status === 'spoken' && item.stage.item?.observation.kind === 'utterance'
          && <DebriefClaim claim={item.stage.item.observation.reported} names={names} />}
        <RetainedDetails value={item} label="Read the received copy and recorded changes" /></li>)}</ul>
      <h4><Term id="reported-account">Headquarters' reported accounts</Term></h4>
      <p>Recorded speeches, not proof that every claim was true or accepted into a ledger.</p>
      <ul>{day.overlay.headquartersAccounts.map((account) => <li key={account.chronicleIndex}>Headquarters heard or said this account at <When tick={account.receivedAt} />
        <DebriefReport report={account.copy.report} names={names} />
        <RetainedDetails value={account.copy} /></li>)}</ul>
    </article>)}
    <h3>Current headquarters bookkeeping</h3><p>Update times are unrecorded; these rows are not reconstructed on earlier days.</p>
    <RetainedDetails value={view.headquartersLedger.entries} />
    <h3><Term id="hypothesis-card">Your terminal notes</Term></h3>
    <p>Current player-authored notes. Ungraded; their earlier edits are not retained and they are outside the historical calendar.</p>
    {view.annotations.cards.length === 0 ? <p>No retained hypothesis cards.</p> : <ul>{view.annotations.cards.map((card, index) => <li key={`${card.id}:${index}`}>
      <p>{card.text}</p><RetainedDetails value={card} label="Read this current annotation" /></li>)}</ul>}
  </section>;
}
