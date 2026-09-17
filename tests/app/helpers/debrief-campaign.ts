import { STANDARD_RULES as R } from '../../../src/content/rules';
import { applyInject } from '../../../src/sim/actions';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../../src/sim/directives/field-reports';
import { runUntil } from '../../../src/sim/step';
import { buildWorld, enrollPlayer } from '../../../src/sim/world';
import { miniTown } from '../../sim/helpers/minitown';

/** Staged retained witness, real two-hop reporting/trait mutation and a complete nightly campaign ending. */
export function terminalStory() {
  const town = miniTown();
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  town.npcs.find((npc) => npc.id === 'bez')!.traits = ['exaggerator'];
  town.npcs.find((npc) => npc.id === 'bez')!.schedule = [
    { days: 'all', from: 0, to: 30, venue: 'square' }, { days: 'all', from: 30, to: 1440, venue: 'backroom' },
  ];
  for (const id of ['cyn', 'dov']) town.npcs.find((npc) => npc.id === id)!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'home-0' }];
  const world = buildWorld(town, 'debrief-ui-lesson', R); enrollPlayer(world, { home: 'backroom' });
  world.enemy.observers = [];
  world.scenario = { defId: 'debrief-ui-lesson', days: 1, win: { kind: 'council-turns', quorum: 2 },
    cast: { usurper: 'dov', council: ['ada', 'cyn'] }, status: 'running', resolution: null };
  const claim = applyInject(world, 'ada', { subject: 'bez', predicate: 'stole', object: null, count: 2,
    severity: 4, place: 'square', attribution: 'someone' });
  holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: { kind: 'utterance', tick: 0,
    venue: 'square', speaker: 'ada', addressedTo: 'bez', claim, overheard: false, mode: 'telling' } }, null, ['bez', 'you'], null, []);
  queueUnqueuedFieldReports(world);
  world.tick = 15; runUntil(world, 1440, R);
  return { world, claimId: claim.id };
}
