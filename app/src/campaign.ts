import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';

export const DEV_SEED = 'dev-shell-1';
export const DEV_DAYS = 4;

/**
 * One deterministic, replayable campaign the shell renders.
 *
 * ── Action field-name reconciliation (brief license) ────────────────────────────────
 * Every field below matches the REAL union in `src/sim/campaign.ts` + `src/sim/actions.ts`
 * verbatim — NO field-name adjustments were needed:
 *   goTo → {tick,kind,venue} · assignInformant → {tick,kind,informant,venue}
 *   inject → {tick,kind,target,spec:InjectSpec} where
 *     InjectSpec = {subject,predicate,object,count,severity,place,attribution}
 *   card(add) → {tick,kind,op,id,text,confidence,links} (validator requires non-null text +
 *     confidence ∈ [0,1] — satisfied). (main.tsx calls the real 3-arg boardView(log,level,rules).)
 *
 * ── Empty-board premise fix (escalation license — encode intent, documented) ─────────
 * The brief's script injected `subject: firstNpc` into `firstNpc` and stationed the player away
 * from that npc. On the real seed this yields an EMPTY board, for two mechanical reasons:
 *   1. `passesGates` (propagation.ts) forbids a teller from retelling a DAMAGING claim whose
 *      subject IS the teller — so a "firstNpc stole" rumor injected INTO firstNpc is never
 *      spoken, and nothing spreads. The subject MUST be a third party.
 *   2. The avatar only overhears tellings inside its own conversation circle, so the teller must
 *      actually frequent the venue the avatar sits at.
 * Fix (deterministic, self-adjusting per seed): the rumor is "a market regular stole at the
 * market", injected into a DIFFERENT market regular who gossips it. `teller`/`subject` are the
 * two alphabetically-first non-player NPCs scheduled at the avatar's market venue. On seed
 * `dev-shell-1` this makes the theft family spread and mutate through the market crowd, so the
 * avatar + informant capture ~14 utterances → a 7-version cluster with diff highlights and
 * level-2 trait candidates. Physics untouched; only the probe (target/subject) is encoded.
 */
export function runDevCampaign(): { world: WorldState } {
  const { town } = generateValidTown(DEV_SEED, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  const world = worldFromTown(town, DEV_SEED);
  attachPlayer(world, town);
  const informants = world.intel.informants.map((i) => i.id);
  const market = Object.keys(world.venues).filter((v) => v.startsWith('market')).sort()[0]!;
  // NPCs whose schedule posts them at the avatar's market — co-present gossips, sorted for determinism.
  const regulars = Object.values(world.npcs)
    .filter((n) => n.id !== world.playerId && n.schedule.some((s) => s.venue === market))
    .map((n) => n.id).sort();
  const teller = regulars[0]!;
  const subject = regulars[1] ?? teller; // ≥2 regulars on this seed; fallback keeps the call total
  const log: Action[] = [
    { tick: at(0, 7), kind: 'goTo', venue: market },
    { tick: at(0, 7, 15), kind: 'assignInformant', informant: informants[0]!, venue: market },
    { tick: at(0, 8), kind: 'inject', target: teller, spec: {
      subject, predicate: 'stole', object: null, count: 2, severity: 4,
      place: market, attribution: SOMEONE } },
    { tick: at(0, 9), kind: 'card', op: 'add', id: 'card-0',
      text: 'Someone will come asking about the theft story — watch the guards.',
      confidence: 0.4, links: [] },
  ];
  runLogOn(world, STANDARD_RULES, log, DEV_DAYS * TICKS_PER_DAY);
  return { world };
}
