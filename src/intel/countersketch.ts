import type { HypothesisCard, IntelEntry } from './entry';

/**
 * Counter-intelligence is just intelligence whose subject is your own ghost (spec, verbatim) —
 * no new physics, no world reads. Every signal below is a pure fold over the SAME captured log
 * the Evidence Board reads: authority askings (guards asking around), watch presence
 * (countermeasures as observations), and answers the log shows were compelled out of someone.
 */
export interface CounterSignal {
  kind: 'questioning' | 'watch' | 'compelled-answer';
  entryIndexes: number[];
  key: string;
  detail: string;
}

function pushIndex(byKey: Map<string, number[]>, key: string, index: number): void {
  const existing = byKey.get(key);
  if (existing) existing.push(index);
  else byKey.set(key, [index]);
}

function sortedByKey(byKey: Map<string, number[]>): [string, number[]][] {
  return [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Authority askings — guards asking around under the watch's mandate — grouped by about-key. */
function questioningSignals(log: readonly IntelEntry[]): CounterSignal[] {
  const byKey = new Map<string, number[]>();
  log.forEach((e, i) => {
    if (e.kind !== 'asking' || !e.authority || e.about === null) return;
    const key = 'family' in e.about ? `f:${e.about.family}` : `s:${e.about.subject}`;
    pushIndex(byKey, key, i);
  });
  return sortedByKey(byKey).map(([key, entryIndexes]) => ({
    kind: 'questioning', key, entryIndexes,
    detail: `authority asked about ${key} (${entryIndexes.length} time(s))`,
  }));
}

/** Watch presence — a countermeasure, observed like anything else — grouped by (actor, venue). */
function watchSignals(log: readonly IntelEntry[]): CounterSignal[] {
  const byKey = new Map<string, number[]>();
  log.forEach((e, i) => {
    if (e.kind !== 'presence' || e.actor === null) return;
    const key = `${e.actor}@${e.venue}`;
    pushIndex(byKey, key, i);
  });
  return sortedByKey(byKey).map(([key, entryIndexes]) => ({
    kind: 'watch', key, entryIndexes,
    detail: `watch presence at ${key} (${entryIndexes.length} day(s))`,
  }));
}

/**
 * Compelled answers: a mode-'answer' utterance addressed to someone who — earlier in this very
 * log — issued an authority asking. A single forward pass keeps "earlier" honest: an entry's
 * `speaker` only joins the authority-asker set on ITS row, so a later row can never see itself.
 * Grouped by the asker (the one who compelled it), mirroring watch's actor-keyed grouping.
 */
function compelledAnswerSignals(log: readonly IntelEntry[]): CounterSignal[] {
  const byKey = new Map<string, number[]>();
  const authorityAskers = new Set<string>();
  log.forEach((e, i) => {
    if (e.kind === 'asking' && e.authority && e.speaker !== null) authorityAskers.add(e.speaker);
    if (e.kind === 'utterance' && e.mode === 'answer' && e.addressedTo !== null
      && authorityAskers.has(e.addressedTo)) {
      pushIndex(byKey, e.addressedTo, i);
    }
  });
  return sortedByKey(byKey).map(([key, entryIndexes]) => ({
    kind: 'compelled-answer', key, entryIndexes,
    detail: `${entryIndexes.length} answer(s) compelled by ${key}`,
  }));
}

/** Every counter-sketch signal, deterministically ordered by kind then key. */
export function counterSignals(log: readonly IntelEntry[]): CounterSignal[] {
  return [
    ...questioningSignals(log),
    ...watchSignals(log),
    ...compelledAnswerSignals(log),
  ].sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * The whole Counter-Sketch board: signals folded from the log, plus the player's own cards —
 * player-authored, never graded (pillar 6) — passed through untouched and sorted by id. The
 * board never touches `world.enemy`: everything here comes from what the player actually heard
 * or saw, the same discipline the Evidence Board applies to the enemy's own hunt.
 */
export function counterSketchView(
  log: readonly IntelEntry[], cards: readonly HypothesisCard[],
): { signals: CounterSignal[]; cards: HypothesisCard[] } {
  return {
    signals: counterSignals(log),
    cards: [...cards].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}
