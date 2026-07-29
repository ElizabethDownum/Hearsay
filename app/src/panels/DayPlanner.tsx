import { useState } from 'react';
import { TERMS } from '../../../src/content/terms';
import { TICKS_PER_DAY } from '../../../src/core/time';
import type {
  AdvisoryGuidance, DirectiveAuthority, DirectiveDiscretion, DirectiveMission, DirectivePriority,
  DirectiveSpecificity, EconomyDef, InjectSpec, LocalActionIntent, LocalOffer, Mice, NetworkView,
  NonLocalActionIntent, PlayerDirectiveApplication, PlayerView, ReportExpectation, ShapePayload,
} from '../townview';
import type { BoardView } from '../../../src/intel/types';
import { Term } from './Term';

/**
 * The planner — and, once a local moment is OFFERED, the whole local interaction surface.
 *
 * Offer/execution identity (the constraints' law): there is no "choose a target now, act later".
 * A mid-beat request chooses nothing; the session projects prior setup, freezes the venue and the
 * circle into a token, and hands back a `LocalOffer`. ONLY then does this panel render a single
 * control that can submit a local act, and every addressee it offers for a direct verb comes from
 * that frozen `offer.circleMembers` — never from a live projection, never from `world.npcs`.
 *
 * Every option list is pinned to exactly one lawful, PLAYER-KNOWN feed:
 *   · direct-verb addressees + the first directive hop → `offer.circleMembers` (frozen)
 *   · final recipient, later outbound relays, return relays → `NetworkView.assets` (your roster)
 *   · mission / guidance people → `PlayerView.map.directory` (street knowledge)
 *   · venues → `PlayerView.map.venues` (street knowledge)
 *   · story family / parent / payload → DELIVERED `BoardView.entries` only, and the version SUBMITTED
 *     is the one the player actually heard (`reported`), never world truth.
 * Nothing here reads raw claims, schedules, beliefs, the enemy roster, message state, or hidden
 * directive state — structurally: those names are not in its props, and the app-wide source scan in
 * tests/directives/view.test.ts fires if any app file so much as spells them.
 *
 * A control is greyed ONLY on a public fact — the treasury, your own roster bookkeeping, where your
 * avatar is standing, whether you hold the intel. Traits, relationships, enemy linkage, eligibility,
 * and likely outcome NEVER hide or grey an option; the engine is the real gate and its refusal
 * surfaces as a toast. That is what makes the honest/compromised twin worlds render byte-identically.
 *
 * `SOMEONE` mirrors the sim's vague-source sentinel (src/sim/rumors/claim, value 'someone') and
 * `BEAT` mirrors CONVERSATION_BEAT (src/sim/rumors/propagation, value 15): both live behind the
 * panels fence, so they are restated here as the stable public tokens they are.
 */
const SOMEONE = 'someone';
const BEAT = 15;
const MICE = ['money', 'ideology', 'coercion', 'ego'] as const;
const PREDICATES = Object.keys(TERMS)
  .filter((key) => key.startsWith('predicate-'))
  .map((key) => ({ id: key.slice('predicate-'.length), termId: key }))
  .sort((a, b) => a.id.localeCompare(b.id));

const PRIORITIES: DirectivePriority[] = ['routine', 'important', 'urgent'];
const AUTHORITIES: DirectiveAuthority[] = ['request', 'relationship', 'office', 'compel'];
const DISCRETIONS: DirectiveDiscretion[] = ['open', 'quiet', 'compartmented'];
const SPECIFICITIES: DirectiveSpecificity[] = ['outcome-only', 'guided', 'detailed'];
const REPORTS: ReportExpectation[] = ['none', 'outcome', 'reasoned', 'full'];
const GUIDANCE_KINDS = ['expected-presence', 'avoid-person', 'avoid-venue', 'not-before', 'not-after', 'note'] as const;

// ── The composer's form state: ten levers, each its own field ────────────────────────────────────

export type DirectiveMissionDraft =
  | { application: 'standard'; mission: 'learn-person'; person: string }
  | { application: 'standard'; mission: 'learn-venue'; venue: string }
  | { application: 'standard'; mission: 'learn-story'; family: string }
  | { application: 'standard'; mission: 'shape'; operation: 'spread' | 'suppress'; audience: string; payload: ShapePayload }
  | { application: 'standard'; mission: 'shape-redirect'; audience: string; redirectTo: string; payload: ShapePayload }
  | { application: 'standard'; mission: 'sound-out'; target: string; topic: 'recruitment' | 'cooperation'; handle: Mice | null }
  | { application: 'posting'; venue: string }
  | { application: 'rendezvous'; venue: string; from: number; until: number }
  | { application: 'courier'; target: string; payload: ShapePayload };

export interface DirectiveDraft {
  /** 1 — the final recipient (roster). */
  recipient: string;
  /** 2 — the outbound relay list. Element 0 is the FIRST addressed hop and must be locally present. */
  outboundVia: string[];
  /** 2 — the return relay list. */
  reportVia: string[];
  /** 3 — the application and its structured target/payload. */
  mission: DirectiveMissionDraft;
  /** 4 — specificity plus zero-or-more guidance rows. */
  specificity: DirectiveSpecificity;
  guidance: AdvisoryGuidance[];
  /** 5 */ priority: DirectivePriority;
  /** 6 */ authority: DirectiveAuthority;
  /** 7 */ discretion: DirectiveDiscretion;
  /** 8 */ activeFrom: number;
  activeUntil: number;
  /** 9 */ report: ReportExpectation;
  reportBy: number | null;
  /** 10 — the shared purpose, or null for "withhold purpose". */
  purpose: string | null;
  /** The delivered board rows, keyed by family — the ONLY lawful payload source. */
  payloads: Record<string, ShapePayload>;
}

/** Delivered board rows → the payload the player may submit: THEIR heard version, parented on the
 *  claim they heard it as. Rows without a family, a claim id, or a reported version are not intel
 *  the player can hand on, so they are not offered. */
export function payloadsFrom(board: BoardView): Record<string, ShapePayload> {
  const out: Record<string, ShapePayload> = {};
  for (const entry of board.entries) {
    if (entry.family === null || entry.claimId === null || entry.reported === null) continue;
    if (out[entry.family] !== undefined) continue;
    out[entry.family] = {
      family: entry.family,
      parent: entry.claimId,
      claim: {
        subject: entry.reported.subject, predicate: entry.reported.predicate,
        object: entry.reported.object, count: entry.reported.count,
        severity: entry.reported.severity, place: entry.reported.place,
        attribution: entry.reported.attribution,
      },
    };
  }
  return out;
}

const sortedIds = (ids: readonly string[]): string[] => [...new Set(ids)].sort();

export interface ComposerSources {
  view: PlayerView;
  net: NetworkView;
  board: BoardView;
  offer: LocalOffer | null;
}

const rosterIds = (net: NetworkView): string[] => sortedIds(net.assets.map((a) => a.id));
const directoryIds = (view: PlayerView): string[] =>
  sortedIds(view.map.directory.map((p) => p.id)).filter((id) => id !== view.avatar.id);
const venueIds = (view: PlayerView): string[] => sortedIds(view.map.venues.map((v) => v.id));
const localAssets = (sources: ComposerSources): string[] => {
  const roster = new Set(rosterIds(sources.net));
  return sortedIds(sources.offer?.circleMembers ?? []).filter((id) => roster.has(id));
};

export function defaultDirectiveDraft(sources: ComposerSources): DirectiveDraft {
  const roster = rosterIds(sources.net);
  const people = directoryIds(sources.view);
  const recipient = roster[0] ?? '';
  const tick = sources.offer?.tick ?? sources.view.tick;
  return {
    recipient,
    outboundVia: [],
    reportVia: [],
    mission: {
      application: 'standard', mission: 'learn-person',
      person: people.find((id) => id !== recipient) ?? people[0] ?? '',
    },
    specificity: 'guided',
    guidance: [],
    priority: 'routine',
    authority: 'relationship',
    discretion: 'quiet',
    activeFrom: tick + BEAT,
    activeUntil: tick + 3 * TICKS_PER_DAY,
    report: 'outcome',
    reportBy: tick + 2 * TICKS_PER_DAY,
    purpose: null,
    payloads: payloadsFrom(sources.board),
  };
}

function missionOf(draft: DirectiveMissionDraft): DirectiveMission {
  if (draft.application === 'posting' || draft.application === 'rendezvous') {
    return { kind: 'learn', target: { kind: 'venue', id: draft.venue } };
  }
  if (draft.application === 'courier') {
    return {
      kind: 'shape', operation: 'spread', payload: draft.payload,
      audience: { kind: 'person', id: draft.target }, redirectTo: null,
    };
  }
  switch (draft.mission) {
    case 'learn-person': return { kind: 'learn', target: { kind: 'person', id: draft.person } };
    case 'learn-venue': return { kind: 'learn', target: { kind: 'venue', id: draft.venue } };
    case 'learn-story': return { kind: 'learn', target: { kind: 'story', family: draft.family } };
    case 'shape': return {
      kind: 'shape', operation: draft.operation, payload: draft.payload,
      audience: { kind: 'person', id: draft.audience }, redirectTo: null,
    };
    case 'shape-redirect': return {
      kind: 'shape', operation: 'redirect', payload: draft.payload,
      audience: { kind: 'person', id: draft.audience }, redirectTo: draft.redirectTo,
    };
    default: return {
      kind: 'sound-out', target: draft.target, topic: draft.topic, handle: draft.handle, meeting: null,
    };
  }
}

function applicationOfDraft(draft: DirectiveMissionDraft): PlayerDirectiveApplication {
  switch (draft.application) {
    case 'posting': return { kind: 'posting', venue: draft.venue };
    case 'rendezvous': return { kind: 'rendezvous', venue: draft.venue, from: draft.from, until: draft.until };
    case 'courier': return { kind: 'courier', target: draft.target };
    default: return { kind: 'standard' };
  }
}

/** The whole composer, as a PURE function of its form state: ten levers in, one typed action out.
 *  Nothing here consults the world — which is why changing one lever can only move one field. */
export function directiveIntentFrom(draft: DirectiveDraft): LocalActionIntent {
  return {
    kind: 'directive',
    recipient: draft.recipient,
    handoff: { outboundVia: [...draft.outboundVia], reportVia: [...draft.reportVia] },
    brief: {
      mission: missionOf(draft.mission),
      priority: draft.priority,
      authority: draft.authority,
      discretion: draft.discretion,
      specificity: draft.specificity,
      guidance: draft.guidance,
      active: { from: draft.activeFrom, until: draft.activeUntil },
      report: draft.report,
      reportBy: draft.reportBy,
      purpose: draft.purpose,
    },
    application: applicationOfDraft(draft.mission),
  };
}

// ── The panel ────────────────────────────────────────────────────────────────────────────────────

export interface DayPlannerProps {
  view: PlayerView;
  paused: boolean;
  coin: number;
  economy: EconomyDef;
  onVerb(intent: NonLocalActionIntent): void;
  onRequestLocal(): void;
  localPending: boolean;
  /** The session's frozen offer, or null. The local surface renders ONLY when this is non-null. */
  offer: LocalOffer | null;
  net: NetworkView;
  board: BoardView;
  onLocal(intent: LocalActionIntent): void;
}

export function DayPlanner(props: DayPlannerProps) {
  const { view, paused, coin, economy, onVerb, onRequestLocal, localPending, offer } = props;
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
      {offer === null
        ? <p className="desk-note">No moment offered. Request one, then unpause to reach its beat.</p>
        : <LocalMoment {...props} offer={offer} />}

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
            <label>at <select className="desk-btn" disabled={off} value={selected} aria-label="dead drop venue"
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

// ── The offered local moment ─────────────────────────────────────────────────────────────────────

function LocalMoment(props: DayPlannerProps & { offer: LocalOffer }) {
  const { view, coin, economy, offer, net, board, onLocal } = props;
  const circle = sortedIds(offer.circleMembers);
  const roster = new Set(rosterIds(net));
  const informants = new Set(view.informants.map((row) => row.id));
  const assetsHere = circle.filter((id) => roster.has(id));
  const informantsHere = circle.filter((id) => informants.has(id));
  const families = Object.keys(payloadsFrom(board)).sort();

  return (
    <section aria-label="local moment" className="desk-record">
      <p className="desk-note">
        You are at {offer.venue}. In this moment, with these people: {circle.length === 0 ? 'nobody' : circle.join(', ')}.
      </p>
      <TellComposer circle={circle} people={directoryIds(view)} venues={venueIds(view)} onLocal={onLocal} />
      <AskComposer circle={circle} people={directoryIds(view)} families={families} onLocal={onLocal} />
      <SellComposer circle={circle} families={families} onLocal={onLocal} />
      <RecruitComposer
        candidates={circle.filter((id) => !roster.has(id))} families={families}
        coin={coin} economy={economy} onLocal={onLocal} />
      <DebriefComposer assets={assetsHere} atSafehouse={offer.venue === 'safehouse'} onLocal={onLocal} />
      <HostComposer circle={circle} station={view.station} venues={venueIds(view)}
        coin={coin} economy={economy} onLocal={onLocal} />
      <PresetComposer
        assetsHere={assetsHere} informantsHere={informantsHere} people={directoryIds(view)}
        venues={venueIds(view)} board={board} coin={coin} economy={economy} onLocal={onLocal} />
      <DirectiveComposer {...props} />
    </section>
  );
}

function TellComposer({
  circle, people, venues, onLocal,
}: { circle: string[]; people: string[]; venues: string[]; onLocal(i: LocalActionIntent): void }) {
  const [to, setTo] = useState('');
  const [spec, setSpec] = useState({
    subject: SOMEONE, predicate: PREDICATES[0]!.id, object: '', count: '', severity: '3',
    place: '', attribution: SOMEONE,
  });
  const set = (key: keyof typeof spec) => (e: { target: { value: string } }) =>
    setSpec({ ...spec, [key]: e.target.value });
  const target = to || circle[0] || '';
  const withSomeone = [SOMEONE, ...people];
  if (circle.length === 0) return <p className="desk-note">No one in earshot to <Term id="verb-tell" />.</p>;
  const built: InjectSpec = {
    subject: spec.subject, predicate: spec.predicate, object: spec.object || null,
    count: spec.count === '' ? null : Number(spec.count),
    severity: Number(spec.severity) as 1 | 2 | 3 | 4 | 5,
    place: spec.place || null, attribution: spec.attribution,
  };
  return (
    <>
      <h3><Term id="verb-tell" /></h3>
      <div className="tag-row">
        <label><Term id="subject" /> <select className="desk-btn" aria-label="tell subject" value={spec.subject} onChange={set('subject')}>
          {withSomeone.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label><Term id="predicate" /> <select className="desk-btn" aria-label="tell predicate" value={spec.predicate} onChange={set('predicate')}>
          {PREDICATES.map((p) => <option key={p.id} value={p.id}>{TERMS[p.termId]!.label}</option>)}</select></label>
        <label><Term id="object" /> <select className="desk-btn" aria-label="tell object" value={spec.object} onChange={set('object')}>
          <option value="">—</option>{withSomeone.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label><Term id="count" /> <input className="desk-btn" style={{ width: 44 }} type="number"
          aria-label="tell count" value={spec.count} onChange={set('count')} /></label>
        <label><Term id="severity" /> <select className="desk-btn" aria-label="tell severity" value={spec.severity} onChange={set('severity')}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label><Term id="place" /> <select className="desk-btn" aria-label="tell place" value={spec.place} onChange={set('place')}>
          <option value="">—</option>{venues.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label><Term id="attribution" /> <select className="desk-btn" aria-label="tell attribution" value={spec.attribution} onChange={set('attribution')}>
          {withSomeone.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>to <select className="desk-btn" aria-label="tell addressee" value={target} onChange={(e) => setTo(e.target.value)}>
          {circle.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <button className="desk-btn" aria-label="submit tell"
          onClick={() => onLocal({ kind: 'tell', to: target, spec: built })}>tell</button>
      </div>
    </>
  );
}

function AskComposer({
  circle, people, families, onLocal,
}: { circle: string[]; people: string[]; families: string[]; onLocal(i: LocalActionIntent): void }) {
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<'family' | 'subject'>('subject');
  const [family, setFamily] = useState('');
  const [subject, setSubject] = useState('');
  const target = to || circle[0] || '';
  const fam = family || families[0] || '';
  const subj = subject || people[0] || '';
  if (circle.length === 0) return <p className="desk-note">No one in earshot to <Term id="verb-ask" />.</p>;
  const useFamily = mode === 'family' && fam !== '';
  return (
    <>
      <h3><Term id="verb-ask" /></h3>
      <div className="tag-row">
        <label>ask <select className="desk-btn" aria-label="ask addressee" value={target} onChange={(e) => setTo(e.target.value)}>
          {circle.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>about <select className="desk-btn" aria-label="ask about" value={mode}
          onChange={(e) => setMode(e.target.value as 'family' | 'subject')}>
          <option value="subject">{TERMS['subject']!.label}</option>
          {families.length > 0 && <option value="family">{TERMS['family']!.label}</option>}</select></label>
        {useFamily
          ? <select className="desk-btn" aria-label="ask story" value={fam} onChange={(e) => setFamily(e.target.value)}>
              {families.map((f) => <option key={f} value={f}>{f}</option>)}</select>
          : <select className="desk-btn" aria-label="ask person" value={subj} onChange={(e) => setSubject(e.target.value)}>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}</select>}
        <button className="desk-btn" aria-label="submit ask"
          onClick={() => onLocal({ kind: 'ask', to: target, about: useFamily ? { family: fam } : { subject: subj } })}>ask</button>
      </div>
    </>
  );
}

function SellComposer({
  circle, families, onLocal,
}: { circle: string[]; families: string[]; onLocal(i: LocalActionIntent): void }) {
  const [to, setTo] = useState('');
  const [family, setFamily] = useState('');
  const target = to || circle[0] || '';
  const fam = family || families[0] || '';
  return (
    <>
      <h3><Term id="brokerage" /></h3>
      {circle.length === 0 || families.length === 0
        ? <p className="desk-note">A sale needs a buyer in this moment and a <Term id="family" /> you hold.</p>
        : (
          <div className="tag-row">
            <label>sell <select className="desk-btn" aria-label="sell story" value={fam} onChange={(e) => setFamily(e.target.value)}>
              {families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
            <label>to <select className="desk-btn" aria-label="sell buyer" value={target} onChange={(e) => setTo(e.target.value)}>
              {circle.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
            <button className="desk-btn" aria-label="submit sell"
              onClick={() => onLocal({ kind: 'sell', family: fam, buyer: target })}>sell</button>
          </div>
        )}
    </>
  );
}

function RecruitComposer({
  candidates, families, coin, economy, onLocal,
}: {
  candidates: string[]; families: string[]; coin: number; economy: EconomyDef;
  onLocal(i: LocalActionIntent): void;
}) {
  const [target, setTarget] = useState('');
  const [mice, setMice] = useState<Mice>('money');
  const [leverage, setLeverage] = useState('');
  const who = target || candidates[0] || '';
  const family = leverage || families[0] || '';
  const cost = economy.recruitCost[mice];
  const affordable = coin >= cost;
  return (
    <>
      <h3><Term id="verb-recruit" /></h3>
      {candidates.length === 0
        ? <p className="desk-note">Everyone in this moment is already yours, or there is no one here.</p>
        : (
          <div className="tag-row">
            <label>ask <select className="desk-btn" aria-label="recruit target" value={who} onChange={(e) => setTarget(e.target.value)}>
              {candidates.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
            <label>via <select className="desk-btn" aria-label="recruit handle" value={mice}
              onChange={(e) => setMice(e.target.value as Mice)}>
              {MICE.map((m) => <option key={m} value={m}>{TERMS[`mice-${m}`]!.label}</option>)}</select></label>
            {mice === 'coercion' && (
              <label><Term id="family" /> <select className="desk-btn" aria-label="recruit leverage" value={family}
                onChange={(e) => setLeverage(e.target.value)}>
                {families.length === 0
                  ? <option value="">— none held —</option>
                  : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
            )}
            <span className="desk-note">{cost} coin</span>
            <button className="desk-btn" aria-label="submit recruit" disabled={!affordable}
              onClick={() => onLocal({
                kind: 'recruit', target: who, mice,
                leverageFamily: mice === 'coercion' ? (family || null) : null,
              })}>ask</button>
            <span className="desk-note">They answer for themselves: accept, refuse, or ask for time.</span>
            {!affordable && <span className="desk-note">the <Term id="treasury" /> cannot cover this ({cost} needed)</span>}
          </div>
        )}
    </>
  );
}

function DebriefComposer({
  assets, atSafehouse, onLocal,
}: { assets: string[]; atSafehouse: boolean; onLocal(i: LocalActionIntent): void }) {
  const [asset, setAsset] = useState('');
  const who = asset || assets[0] || '';
  return (
    <>
      <h3><Term id="verb-debrief" /></h3>
      {assets.length === 0
        ? <p className="desk-note">None of your assets is in this moment.</p>
        : (
          <div className="tag-row">
            <label>press <select className="desk-btn" aria-label="debrief asset" value={who} onChange={(e) => setAsset(e.target.value)}>
              {assets.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
            <button className="desk-btn" aria-label="submit debrief" disabled={!atSafehouse}
              onClick={() => onLocal({ kind: 'debrief', asset: who })}>debrief</button>
            {!atSafehouse && <p className="desk-note">A debrief happens at the safehouse.</p>}
          </div>
        )}
    </>
  );
}

function HostComposer({
  circle, station, venues, coin, economy, onLocal,
}: {
  circle: string[]; station: 'noble' | 'lowlife' | null; venues: string[];
  coin: number; economy: EconomyDef; onLocal(i: LocalActionIntent): void;
}) {
  const [pick, setPick] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const room = station === 'noble'
    ? venues.find((id) => id === 'salon') ?? null
    : station === 'lowlife' ? venues.find((id) => id.startsWith('back-room-')) ?? null : null;
  const cost = station === 'noble' ? economy.salonEvent : economy.backRoomEvent;
  const candidate = pick || circle[0] || '';
  if (circle.length === 0 || room === null) {
    return (
      <>
        <h3><Term id="verb-host" /></h3>
        <p className="desk-note">Hosting needs your own room and guests in this moment.</p>
      </>
    );
  }
  return (
    <>
      <h3><Term id="verb-host" /></h3>
      <div className="tag-row">
        <label>invite <select className="desk-btn" aria-label="host invitee" value={candidate} onChange={(e) => setPick(e.target.value)}>
          {circle.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <button className="desk-btn" aria-label="add invitee"
          onClick={() => setInvitees(invitees.includes(candidate) ? invitees : [...invitees, candidate])}>add</button>
        <span className="desk-note">{invitees.length === 0 ? 'no guests yet' : invitees.join(', ')} · at {room} · {cost} coin</span>
        <button className="desk-btn" aria-label="submit host" disabled={coin < cost || invitees.length === 0}
          onClick={() => onLocal({ kind: 'host', venue: room, invitees })}>send invitations</button>
      </div>
    </>
  );
}

/** The three COMPATIBILITY shortcuts. Each is labelled a preset: the fully composed directive below
 *  reaches the same typed application with every route/envelope/report/purpose lever still editable. */
function PresetComposer({
  assetsHere, informantsHere, people, venues, board, coin, economy, onLocal,
}: {
  assetsHere: string[]; informantsHere: string[]; people: string[]; venues: string[];
  board: BoardView; coin: number; economy: EconomyDef; onLocal(i: LocalActionIntent): void;
}) {
  const payloads = payloadsFrom(board);
  const families = Object.keys(payloads).sort();
  const [informant, setInformant] = useState('');
  const [postVenue, setPostVenue] = useState('');
  const [courierAsset, setCourierAsset] = useState('');
  const [courierTarget, setCourierTarget] = useState('');
  const [courierFamily, setCourierFamily] = useState('');
  const [meetAsset, setMeetAsset] = useState('');

  const post = informant || informantsHere[0] || '';
  const at = postVenue || venues[0] || '';
  const carrier = courierAsset || assetsHere[0] || '';
  const to = courierTarget || people[0] || '';
  const family = courierFamily || families[0] || '';
  const meeter = meetAsset || assetsHere[0] || '';
  const payload = payloads[family];

  return (
    <>
      <h3>presets <span className="desk-note">(shortcuts — the composer below does all three, with every lever)</span></h3>
      {informantsHere.length === 0
        ? <p className="desk-note">No informant of yours is in this moment to ask for a post.</p>
        : (
          <div className="tag-row">
            <label>post <select className="desk-btn" aria-label="post informant" value={post} onChange={(e) => setInformant(e.target.value)}>
              {informantsHere.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
            <label>at <select className="desk-btn" aria-label="post venue" value={at} onChange={(e) => setPostVenue(e.target.value)}>
              {venues.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
            <button className="desk-btn" aria-label="preset posting"
              onClick={() => onLocal({ kind: 'assignInformant', informant: post, venue: at })}>preset · request post</button>
          </div>
        )}
      {assetsHere.length === 0
        ? <p className="desk-note">None of your assets is in this moment to carry or meet.</p>
        : (
          <>
            <div className="tag-row">
              <label>carry <select className="desk-btn" aria-label="courier asset" value={carrier} onChange={(e) => setCourierAsset(e.target.value)}>
                {assetsHere.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
              <label><Term id="family" /> <select className="desk-btn" aria-label="courier story" value={family} onChange={(e) => setCourierFamily(e.target.value)}>
                {families.length === 0
                  ? <option value="">— none held —</option>
                  : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
              <label>to <select className="desk-btn" aria-label="courier target" value={to} onChange={(e) => setCourierTarget(e.target.value)}>
                {people.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
              <span className="desk-note">{economy.courierRun} coin</span>
              <button className="desk-btn" aria-label="preset courier"
                disabled={coin < economy.courierRun || payload === undefined}
                onClick={() => onLocal({
                  kind: 'courier', asset: carrier, target: to, viaDrop: null, spec: payload!.claim,
                })}>preset · hand it over</button>
            </div>
            <div className="tag-row">
              <label>meet <select className="desk-btn" aria-label="meet asset" value={meeter} onChange={(e) => setMeetAsset(e.target.value)}>
                {assetsHere.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
              <button className="desk-btn" aria-label="preset rendezvous"
                onClick={() => onLocal({ kind: 'meet', asset: meeter })}>preset · offer a rendezvous</button>
            </div>
          </>
        )}
    </>
  );
}

// ── The full directive composer: ten independent levers ──────────────────────────────────────────

function DirectiveComposer(props: DayPlannerProps & { offer: LocalOffer }) {
  const { view, net, board, offer, onLocal } = props;
  const sources: ComposerSources = { view, net, board, offer };
  const [draft, setDraft] = useState<DirectiveDraft>(() => defaultDirectiveDraft(sources));
  const set = <K extends keyof DirectiveDraft>(key: K, value: DirectiveDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  const roster = rosterIds(net);
  const local = localAssets(sources);
  const people = directoryIds(view);
  const venues = venueIds(view);
  const families = Object.keys(draft.payloads).sort();
  const firstHop = draft.outboundVia[0] ?? '';
  const laterHops = draft.outboundVia.slice(1);
  const [relay, setRelay] = useState('');
  const [reportRelay, setReportRelay] = useState('');
  const [guidanceKind, setGuidanceKind] = useState<(typeof GUIDANCE_KINDS)[number]>('avoid-person');
  const [guidancePerson, setGuidancePerson] = useState('');
  const [guidanceVenue, setGuidanceVenue] = useState('');
  const [guidanceTick, setGuidanceTick] = useState('');
  const [guidanceNote, setGuidanceNote] = useState('');

  const addGuidance = () => {
    const person = guidancePerson || people[0] || '';
    const venue = guidanceVenue || venues[0] || '';
    const tick = guidanceTick === '' ? draft.activeFrom : Number(guidanceTick);
    const row: AdvisoryGuidance = guidanceKind === 'expected-presence'
      ? { kind: 'expected-presence', person, venue, at: tick }
      : guidanceKind === 'avoid-person' ? { kind: 'avoid-person', person }
        : guidanceKind === 'avoid-venue' ? { kind: 'avoid-venue', venue }
          : guidanceKind === 'not-before' ? { kind: 'not-before', tick }
            : guidanceKind === 'not-after' ? { kind: 'not-after', tick }
              : { kind: 'note', text: guidanceNote };
    set('guidance', [...draft.guidance, row]);
  };

  return (
    <>
      <h3><Term id="directive" /> <span className="desk-note">— every lever is yours, and yours alone</span></h3>
      <fieldset className="desk-fieldset">
        <legend>1 · recipient &amp; route</legend>
        <label>to <select className="desk-btn" aria-label="directive recipient" value={draft.recipient}
          onChange={(e) => set('recipient', e.target.value)}>
          {roster.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>first hop <select className="desk-btn" aria-label="directive first hop" value={firstHop}
          onChange={(e) => set('outboundVia', e.target.value === '' ? laterHops : [e.target.value, ...laterHops])}>
          <option value="">— hand it to them yourself —</option>
          {local.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>relay on <select className="desk-btn" aria-label="directive outbound relay" value={relay || roster[0] || ''}
          onChange={(e) => setRelay(e.target.value)}>
          {roster.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <button className="desk-btn" aria-label="add outbound relay"
          onClick={() => set('outboundVia', [...draft.outboundVia, relay || roster[0] || ''])}>add</button>
        <label>report via <select className="desk-btn" aria-label="directive report relay" value={reportRelay || roster[0] || ''}
          onChange={(e) => setReportRelay(e.target.value)}>
          {roster.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <button className="desk-btn" aria-label="add report relay"
          onClick={() => set('reportVia', [...draft.reportVia, reportRelay || roster[0] || ''])}>add</button>
        <p className="desk-note">
          out: {draft.outboundVia.length === 0 ? 'in person' : draft.outboundVia.join(' → ')} ·
          back: {draft.reportVia.length === 0 ? 'straight to you' : draft.reportVia.join(' → ')}
        </p>
      </fieldset>

      <fieldset className="desk-fieldset">
        <legend>3 · mission</legend>
        <label>application <select className="desk-btn" aria-label="directive application"
          value={draft.mission.application}
          onChange={(e) => set('mission', missionDraftFor(e.target.value, draft, { people, venues, families }))}>
          {['standard', 'posting', 'rendezvous', 'courier'].map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>mission <select className="desk-btn" aria-label="directive mission"
          value={draft.mission.application === 'standard' ? draft.mission.mission : draft.mission.application}
          onChange={(e) => set('mission', standardMissionFor(e.target.value, draft, { people, venues, families }))}>
          {['learn-person', 'learn-venue', 'learn-story', 'shape', 'shape-redirect', 'sound-out']
            .map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>person <select className="desk-btn" aria-label="directive mission person" value={missionPersonOf(draft)}
          onChange={(e) => set('mission', withMissionPerson(draft, e.target.value))}>
          {people.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>venue <select className="desk-btn" aria-label="directive mission venue" value={missionVenueOf(draft, venues)}
          onChange={(e) => set('mission', withMissionVenue(draft, e.target.value))}>
          {venues.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label><Term id="family" /> <select className="desk-btn" aria-label="directive mission story" value={missionFamilyOf(draft, families)}
          onChange={(e) => set('mission', withMissionFamily(draft, e.target.value))}>
          {families.length === 0
            ? <option value="">— none held —</option>
            : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
        <label>redirect to <select className="desk-btn" aria-label="directive redirect to" value={redirectOf(draft, people)}
          onChange={(e) => set('mission', withRedirect(draft, e.target.value))}>
          {people.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label><Term id="sound-out" /> <select className="desk-btn" aria-label="directive sound-out target"
          value={soundOutTargetOf(draft, people, draft.recipient)}
          onChange={(e) => set('mission', withSoundOutTarget(draft, e.target.value))}>
          {people.filter((id) => id !== draft.recipient).map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>topic <select className="desk-btn" aria-label="directive sound-out topic" value={soundOutTopicOf(draft)}
          onChange={(e) => set('mission', withSoundOutTopic(draft, e.target.value as 'recruitment' | 'cooperation'))}>
          {['recruitment', 'cooperation'].map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>handle <select className="desk-btn" aria-label="directive sound-out handle" value={soundOutHandleOf(draft)}
          onChange={(e) => set('mission', withSoundOutHandle(draft, e.target.value === '' ? null : e.target.value as Mice))}>
          <option value="">— none —</option>
          {MICE.map((m) => <option key={m} value={m}>{TERMS[`mice-${m}`]!.label}</option>)}</select></label>
      </fieldset>

      <fieldset className="desk-fieldset">
        <legend>4 · specificity &amp; guidance</legend>
        <label>specificity <select className="desk-btn" aria-label="directive specificity" value={draft.specificity}
          onChange={(e) => set('specificity', e.target.value as DirectiveSpecificity)}>
          {SPECIFICITIES.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>guidance <select className="desk-btn" aria-label="directive guidance kind" value={guidanceKind}
          onChange={(e) => setGuidanceKind(e.target.value as (typeof GUIDANCE_KINDS)[number])}>
          {GUIDANCE_KINDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>who <select className="desk-btn" aria-label="directive guidance person" value={guidancePerson || people[0] || ''}
          onChange={(e) => setGuidancePerson(e.target.value)}>
          {people.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>where <select className="desk-btn" aria-label="directive guidance venue" value={guidanceVenue || venues[0] || ''}
          onChange={(e) => setGuidanceVenue(e.target.value)}>
          {venues.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>when <input className="desk-btn" style={{ width: 88 }} type="number" aria-label="directive guidance tick"
          value={guidanceTick} onChange={(e) => setGuidanceTick(e.target.value)} /></label>
        <label>note <input className="desk-btn" style={{ width: 140 }} aria-label="directive guidance note"
          value={guidanceNote} onChange={(e) => setGuidanceNote(e.target.value)} /></label>
        <button className="desk-btn" aria-label="add guidance" onClick={addGuidance}>add</button>
        <button className="desk-btn" aria-label="clear guidance" onClick={() => set('guidance', [])}>clear</button>
        <span className="desk-note">{draft.guidance.length} guidance row(s)</span>
      </fieldset>

      <fieldset className="desk-fieldset">
        <legend>5-7 · <Term id="priority" />, authority, discretion</legend>
        <label><Term id="priority" /> <select className="desk-btn" aria-label="directive priority" value={draft.priority}
          onChange={(e) => set('priority', e.target.value as DirectivePriority)}>
          {PRIORITIES.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>authority <select className="desk-btn" aria-label="directive authority" value={draft.authority}
          onChange={(e) => set('authority', e.target.value as DirectiveAuthority)}>
          {AUTHORITIES.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>discretion <select className="desk-btn" aria-label="directive discretion" value={draft.discretion}
          onChange={(e) => set('discretion', e.target.value as DirectiveDiscretion)}>
          {DISCRETIONS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      </fieldset>

      <fieldset className="desk-fieldset">
        <legend>8-10 · window, <Term id="report-expectation" />, <Term id="purpose" /></legend>
        <label>from <input className="desk-btn" style={{ width: 88 }} type="number" aria-label="directive active from"
          value={draft.activeFrom} onChange={(e) => set('activeFrom', Number(e.target.value))} /></label>
        <label>until <input className="desk-btn" style={{ width: 88 }} type="number" aria-label="directive active until"
          value={draft.activeUntil} onChange={(e) => set('activeUntil', Number(e.target.value))} /></label>
        <label>expect <select className="desk-btn" aria-label="directive report expectation" value={draft.report}
          onChange={(e) => set('report', e.target.value as ReportExpectation)}>
          {REPORTS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>by <input className="desk-btn" style={{ width: 88 }} type="number" aria-label="directive report by"
          value={draft.reportBy ?? ''} onChange={(e) => set('reportBy', e.target.value === '' ? null : Number(e.target.value))} /></label>
        <label><Term id="purpose" /> <input className="desk-btn" style={{ width: 180 }} aria-label="directive purpose"
          value={draft.purpose ?? ''} onChange={(e) => set('purpose', e.target.value)} /></label>
        <label><input type="checkbox" aria-label="withhold purpose" checked={draft.purpose === null}
          onChange={(e) => set('purpose', e.target.checked ? null : '')} /> withhold <Term id="purpose" /></label>
      </fieldset>

      <button className="desk-btn" aria-label="submit directive"
        onClick={() => onLocal(directiveIntentFrom(draft))}>hand over the <Term id="brief" /></button>
      <p className="desk-note">
        Times are ticks. Well-formed times and routes are checked here; everything else is the
        engine&apos;s to judge, and theirs.
      </p>
    </>
  );
}

// ── Mission-draft transitions. Each one rewrites ONLY lever 3; no other lever is ever touched. ────

interface MissionOptions { people: string[]; venues: string[]; families: string[] }

function firstPayload(draft: DirectiveDraft, families: string[]): ShapePayload {
  const family = families[0];
  return family === undefined
    ? { family: null, parent: null, claim: {
      subject: SOMEONE, predicate: PREDICATES[0]!.id, object: null, count: null,
      severity: 3, place: null, attribution: SOMEONE,
    } }
    : draft.payloads[family]!;
}

function missionDraftFor(kind: string, draft: DirectiveDraft, o: MissionOptions): DirectiveMissionDraft {
  switch (kind) {
    case 'posting': return { application: 'posting', venue: o.venues[0] ?? '' };
    case 'rendezvous': return {
      application: 'rendezvous', venue: o.venues[0] ?? '',
      from: draft.activeFrom, until: draft.activeFrom + BEAT,
    };
    case 'courier': return {
      application: 'courier', target: o.people[0] ?? '', payload: firstPayload(draft, o.families),
    };
    default: return { application: 'standard', mission: 'learn-person', person: o.people[0] ?? '' };
  }
}

function standardMissionFor(kind: string, draft: DirectiveDraft, o: MissionOptions): DirectiveMissionDraft {
  switch (kind) {
    case 'learn-venue': return { application: 'standard', mission: 'learn-venue', venue: o.venues[0] ?? '' };
    case 'learn-story': return { application: 'standard', mission: 'learn-story', family: o.families[0] ?? '' };
    case 'shape': return {
      application: 'standard', mission: 'shape', operation: 'spread',
      audience: o.people[0] ?? '', payload: firstPayload(draft, o.families),
    };
    case 'shape-redirect': return {
      application: 'standard', mission: 'shape-redirect', audience: o.people[0] ?? '',
      redirectTo: o.people[1] ?? o.people[0] ?? '', payload: firstPayload(draft, o.families),
    };
    case 'sound-out': return {
      application: 'standard', mission: 'sound-out',
      target: o.people.find((id) => id !== draft.recipient) ?? '', topic: 'recruitment', handle: null,
    };
    default: return { application: 'standard', mission: 'learn-person', person: o.people[0] ?? '' };
  }
}

const missionPersonOf = (draft: DirectiveDraft): string => {
  const m = draft.mission;
  if (m.application === 'courier') return m.target;
  if (m.application !== 'standard') return '';
  if (m.mission === 'learn-person') return m.person;
  if (m.mission === 'shape' || m.mission === 'shape-redirect') return m.audience;
  return '';
};
const withMissionPerson = (draft: DirectiveDraft, id: string): DirectiveMissionDraft => {
  const m = draft.mission;
  if (m.application === 'courier') return { ...m, target: id };
  if (m.application !== 'standard') return m;
  if (m.mission === 'learn-person') return { ...m, person: id };
  if (m.mission === 'shape' || m.mission === 'shape-redirect') return { ...m, audience: id };
  return m;
};
const missionVenueOf = (draft: DirectiveDraft, venues: string[]): string => {
  const m = draft.mission;
  if (m.application === 'posting' || m.application === 'rendezvous') return m.venue;
  if (m.application === 'standard' && m.mission === 'learn-venue') return m.venue;
  return venues[0] ?? '';
};
const withMissionVenue = (draft: DirectiveDraft, venue: string): DirectiveMissionDraft => {
  const m = draft.mission;
  if (m.application === 'posting' || m.application === 'rendezvous') return { ...m, venue };
  if (m.application === 'standard' && m.mission === 'learn-venue') return { ...m, venue };
  return m;
};
const missionFamilyOf = (draft: DirectiveDraft, families: string[]): string => {
  const m = draft.mission;
  if (m.application === 'standard' && m.mission === 'learn-story') return m.family;
  if (m.application === 'courier') return m.payload.family ?? '';
  if (m.application === 'standard' && (m.mission === 'shape' || m.mission === 'shape-redirect')) {
    return m.payload.family ?? '';
  }
  return families[0] ?? '';
};
const withMissionFamily = (draft: DirectiveDraft, family: string): DirectiveMissionDraft => {
  const m = draft.mission;
  const payload = draft.payloads[family];
  if (m.application === 'standard' && m.mission === 'learn-story') return { ...m, family };
  if (payload === undefined) return m;
  if (m.application === 'courier') return { ...m, payload };
  if (m.application === 'standard' && (m.mission === 'shape' || m.mission === 'shape-redirect')) {
    return { ...m, payload };
  }
  return m;
};
const redirectOf = (draft: DirectiveDraft, people: string[]): string => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'shape-redirect' ? m.redirectTo : people[0] ?? '';
};
const withRedirect = (draft: DirectiveDraft, redirectTo: string): DirectiveMissionDraft => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'shape-redirect' ? { ...m, redirectTo } : m;
};
const soundOutTargetOf = (draft: DirectiveDraft, people: string[], recipient: string): string => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'sound-out'
    ? m.target : people.find((id) => id !== recipient) ?? '';
};
const withSoundOutTarget = (draft: DirectiveDraft, target: string): DirectiveMissionDraft => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'sound-out' ? { ...m, target } : m;
};
const soundOutTopicOf = (draft: DirectiveDraft): 'recruitment' | 'cooperation' => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'sound-out' ? m.topic : 'recruitment';
};
const withSoundOutTopic = (draft: DirectiveDraft, topic: 'recruitment' | 'cooperation'): DirectiveMissionDraft => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'sound-out' ? { ...m, topic } : m;
};
const soundOutHandleOf = (draft: DirectiveDraft): string => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'sound-out' ? m.handle ?? '' : '';
};
const withSoundOutHandle = (draft: DirectiveDraft, handle: Mice | null): DirectiveMissionDraft => {
  const m = draft.mission;
  return m.application === 'standard' && m.mission === 'sound-out' ? { ...m, handle } : m;
};
