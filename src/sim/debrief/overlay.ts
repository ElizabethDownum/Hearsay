import { TICKS_PER_DAY } from '../../core/time';
import type { SpokenNetworkPayload } from '../directives/types';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import type { AttentionMatch } from './attention';
import { counterFeatureLinks } from './feature-links';
import { fieldReportThreads, type ReportItemStage } from './reports';

export interface OverlaySignal extends AttentionMatch {
  featureIds: string[];
  status: 'corroborated-attention' | 'partly-corroborated' | 'unrecorded-work' | 'issued-unproved' | 'unproved-signal';
}
export interface OverlayDay {
  day: number;
  through: number;
  attention: ReturnType<typeof counterFeatureLinks>['attention'];
  features: ReturnType<typeof counterFeatureLinks>['features'];
  signals: OverlaySignal[];
  /** Separate sets, never a countdown. An absent feature link does not prove player ignorance. */
  lag: { unseenAttentionIds: string[]; featuresWithoutCounterLinkIds: string[] };
  /** Includes physical references with semantic attention deliberately none; inspect their separate receipt resolution. */
  unresolvedFeatureIds: string[];
  receivedReportItems: { rootFingerprint: string; messageId: string; stage: ReportItemStage }[];
  /** Literal report speeches heard/said by HQ, not proof that their claims were true or accepted into the ledger. */
  headquartersAccounts: {
    chronicleIndex: number; receivedAt: number;
    copy: Extract<SpokenNetworkPayload, { kind: 'directive-report' }>;
  }[];
}

/** Compose existing causal matches; neither unmatched signals nor absent features prove a phantom. */
export function counterSketchOverlay(world: WorldState, day: number): OverlayDay {
  const through = Math.min(world.tick, (day + 1) * TICKS_PER_DAY - 1);
  const linked = counterFeatureLinks(world, day);
  const signals = linked.attention.signals.map((signal): OverlaySignal => ({ ...cloneSerializable(signal),
    featureIds: [...(linked.signals.find((row) => row.signalId === signal.id)?.featureIds ?? [])],
    status: signal.matchedEntryIndexes.length > 0 ? signal.unmatchedEntryIndexes.length > 0
      ? 'partly-corroborated' : 'corroborated-attention'
      : signal.missingWorkHistoryIds.length > 0 ? 'unrecorded-work'
        : signal.issuedDirectiveIds.length > 0 ? 'issued-unproved' : 'unproved-signal' }));
  const linkedFeatures = new Set(signals.flatMap((signal) => signal.featureIds));
  const avatar = world.playerId;
  const receivedReportItems = fieldReportThreads(world).flatMap((thread) => thread.packets.flatMap((packet) =>
    packet.stages.filter((stage) => stage.tick <= through && avatar !== null
      && (stage.speaker === avatar || stage.heardBy.some((hearer) => hearer.id === avatar)))
      .map((stage) => ({ rootFingerprint: thread.rootFingerprint, messageId: packet.messageId, stage: cloneSerializable(stage) }))))
    .sort((a, b) => a.stage.tick - b.stage.tick || a.stage.chronicleIndex - b.stage.chronicleIndex
      || a.rootFingerprint.localeCompare(b.rootFingerprint));
  const headquartersAccounts = world.chronicle.flatMap((row, chronicleIndex) => row.kind === 'network-speech'
    && row.tick <= through && row.spoken.kind === 'directive-report'
    && (row.speaker === world.network.spymaster || row.heardBy.some((hearer) => hearer.id === world.network.spymaster))
    ? [{ chronicleIndex, receivedAt: row.tick, copy: cloneSerializable(row.spoken) }] : [])
    .sort((a, b) => a.receivedAt - b.receivedAt || a.chronicleIndex - b.chronicleIndex);
  return { day, through, attention: cloneSerializable(linked.attention), features: cloneSerializable(linked.features), signals,
    lag: { unseenAttentionIds: [...linked.attention.unseenAttentionIds],
      featuresWithoutCounterLinkIds: linked.features.filter((row) => !linkedFeatures.has(row.feature.id)).map((row) => row.feature.id) },
    unresolvedFeatureIds: [...linked.unresolvedFeatureIds], receivedReportItems, headquartersAccounts };
}
