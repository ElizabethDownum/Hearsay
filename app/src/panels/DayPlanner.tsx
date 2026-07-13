import { useState } from 'react';
import type { PlayerView, EconomyDef } from '../townview';
import type { NonLocalActionIntent } from '../loop/session';
import { Term } from './Term';

export function DayPlanner({
  view, paused, coin, economy, onVerb, onRequestLocal, offeredNames, localPending,
}: {
  view: PlayerView;
  paused: boolean;
  coin: number;
  economy: EconomyDef;
  onVerb(intent: NonLocalActionIntent): void;
  onRequestLocal(): void;
  offeredNames: string[];
  localPending: boolean;
}) {
  const off = !paused;
  const venues = [...view.map.venues].sort((a, b) => a.id.localeCompare(b.id));
  const canGo = (venue: { id: string; access: string }): boolean =>
    venue.access === 'public' || venue.id === 'safehouse'
    || view.station === null
    || (view.station === 'noble' && venue.id === 'salon')
    || (view.station === 'lowlife' && venue.id.startsWith('back-room-'));

  return (
    <section className="panel">
      <h2><Term id="day-planner" /></h2>
      {off && <p className="desk-note">The sim is running — pause (Space) to plan.</p>}

      <h3><Term id="access" /> · <Term id="verb-travel" /> · <Term id="standing" />: {view.station ?? 'any'}</h3>
      <div>
        {venues.map((venue) => canGo(venue)
          ? <button key={venue.id} className="desk-btn" disabled={off || localPending}
              onClick={() => onVerb({ kind: 'goTo', venue: venue.id })}>{venue.id}</button>
          : <span key={venue.id} className="desk-note" title="your standing does not open this door">
              {venue.id} — no <Term id="standing" />
            </span>)}
      </div>

      <h3><Term id="circle" /> · local moment</h3>
      <button className="desk-btn" aria-label="request local interaction"
        disabled={off || localPending} onClick={onRequestLocal}>
        request local interaction
      </button>
      {offeredNames.length > 0
        ? <ul aria-label="offered local names">{offeredNames.map((name) => <li key={name}>{name}</li>)}</ul>
        : <p className="desk-note">No offered names. Request a moment, then unpause to reach its beat.</p>}

      <DropComposer
        venues={venues.filter((venue) => venue.access === 'public').map((venue) => venue.id)}
        coin={coin} economy={economy} off={off || localPending} onVerb={onVerb} />
    </section>
  );
}

function DropComposer({
  venues, coin, economy, off, onVerb,
}: {
  venues: string[];
  coin: number;
  economy: EconomyDef;
  off: boolean;
  onVerb(intent: NonLocalActionIntent): void;
}) {
  const [id, setId] = useState('');
  const [venue, setVenue] = useState('');
  const selected = venue || venues[0] || '';
  const cost = economy.deadDropSetup;
  const affordable = coin >= cost;
  return (
    <>
      <h3><Term id="verb-set-drop" /></h3>
      {venues.length === 0
        ? <p className="desk-note">No public venue to hide a <Term id="dead-drop" /> in.</p>
        : <div className="tag-row">
            <label>id <input className="desk-btn" style={{ width: 88 }} disabled={off} value={id}
              aria-label="dead drop id" onChange={(event) => setId(event.target.value)} /></label>
            <label>at <select className="desk-btn" disabled={off} value={selected}
              onChange={(event) => setVenue(event.target.value)}>
              {venues.map((item) => <option key={item} value={item}>{item}</option>)}
            </select></label>
            <span className="desk-note">{cost} coin</span>
            <button className="desk-btn" aria-label="submit drop" disabled={off || !affordable || id === ''}
              onClick={() => onVerb({ kind: 'setDrop', id, venue: selected })}>set drop</button>
            {!affordable && <span className="desk-note">the <Term id="treasury" /> cannot cover this ({cost} needed)</span>}
          </div>}
    </>
  );
}
