import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyForge } from '../../src/sim/artifacts';
import { applyAction } from '../../src/sim/campaign';
import { captureEvidence } from '../../src/sim/counterintel';
import { queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { chooseAnswer } from '../../src/sim/inquiry';
import { observationsFor, type Asking, type TickEvents } from '../../src/sim/perception';
import { prepareTick } from '../../src/sim/phases';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';

const SPEC = {
  subject: 'cyn', predicate: 'met-secretly-with', object: null,
  count: 2, severity: 4 as const, place: 'square', attribution: SOMEONE,
};
const ANSWER_AT = at(1, 9);

function answerWorld(paper: boolean) {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
  for (const npc of fixture.npcs) {
    npc.edges = npc.edges.filter((edge) => edge.to !== 'dov');
    npc.traits = npc.id === 'bez' ? ['moralizer'] : [];
  }
  const world = buildWorld(fixture, 'forensics-boundaries', RULES);
  enrollPlayer(world, { home: 'square' });
  if (paper) {
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = at(1, 8);
    applyAction(world, { tick: world.tick, kind: 'plant', artifact: 'a0', to: 'ada', venue: null },
      RULES, prepareTick(world, RULES));
  } else {
    applyInject(world, 'ada', SPEC);
  }
  world.tick = ANSWER_AT;
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  const asking: Asking = {
    tick: ANSWER_AT, venue: 'backroom', circleMembers: ['ada', 'bez'],
    speaker: 'bez', addressedTo: 'ada', about: { family }, authority: true,
  };
  const answer = chooseAnswer(world, 'ada', asking, ANSWER_AT, RULES)!;
  expect(answer).not.toBeNull();
  const events: TickEvents = {
    tick: ANSWER_AT, positions: { ada: 'backroom', bez: 'backroom', cyn: 'square' },
    utterances: [answer], askings: [asking],
  };
  return { world, answer, events };
}

function medium(value: object, paper: boolean) {
  expect(Object.prototype.hasOwnProperty.call(value, 'document')).toBe(paper);
  if (paper) expect(value).toHaveProperty('document', true);
}

describe('a letter is learned only through the words actually heard', () => {
  for (const paper of [true, false]) {
    const label = paper ? 'paper' : 'ordinary hearsay';
    it(label + ': answer and direct spymaster observation preserve the medium lazily', () => {
      const { world, answer, events } = answerWorld(paper);
      medium(answer, paper);
      const observation = observationsFor('bez', events).observations
        .find((entry) => entry.kind === 'utterance')!;
      medium(observation, paper);
      world.network.spymaster = 'bez';
      world.enemy.observers = [];
      captureEvidence(world, events, RULES);
      const evidence = world.enemy.evidence.filter((entry) => entry.kind === 'utterance');
      expect(evidence).toHaveLength(1);
      medium(evidence[0]!, paper);
      expect(evidence[0]!.reported.predicate).toBe('is-having-an-affair-with');
    });

    it(label + ': remote evidence waits for a spoken report and survives its trait projection', () => {
      const { world, answer, events } = answerWorld(paper);
      world.network.spymaster = 'cyn';
      world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
      captureEvidence(world, events, RULES);
      expect(world.enemy.evidence).toEqual([]);
      const held = world.network.directiveState!.heldObservations.find((row) =>
        row.content.observation.kind === 'utterance')!;
      medium(held.content.observation, paper);
      expect(held.deliveredAt).toBeNull();
      queueUnqueuedFieldReports(world);
      expect(world.enemy.evidence).toEqual([]);
      const message = world.network.directiveState!.messages[0]!;
      const speech = realizeNetworkForward(world, message.id,
        { venue: 'square', members: ['bez', 'cyn'] }, message.availableAfter, RULES)!;
      expect(speech.spoken.kind).toBe('field-report');
      if (speech.spoken.kind !== 'field-report') throw new Error('missing spoken field report');
      const reported = speech.spoken.items.find((item) =>
        item.observation.kind === 'utterance')!.observation;
      medium(reported, paper);
      expect(reported).toMatchObject({
        claimId: answer.claim.id, reported: { predicate: 'is-having-an-affair-with' },
      });
      expect(world.enemy.evidence).toEqual([]);
      captureEvidence(world, {
        tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
      }, RULES);
      const evidence = world.enemy.evidence.filter((entry) => entry.kind === 'utterance');
      expect(evidence).toHaveLength(1);
      medium(evidence[0]!, paper);
      expect(evidence[0]).toMatchObject({
        tick: answer.tick, observer: 'bez', speaker: 'ada', claimId: answer.claim.id,
        reported: { predicate: 'is-having-an-affair-with' },
      });
      expect(held.deliveredAt).toBe(speech.tick);
    });
  }
});
