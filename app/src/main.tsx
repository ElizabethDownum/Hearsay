import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { runDevCampaign, DEV_SEED, DEV_DAYS } from './campaign';
import { STANDARD_RULES } from '../../src/content/rules';
import { boardView } from '../../src/intel/board';
import { codexStatus } from '../../src/intel/codex';
import { counterSketchView } from '../../src/intel/countersketch';
import type { AssistLevel } from '../../src/intel/types';
import { EvidenceBoard } from './panels/EvidenceBoard';
import { Codex } from './panels/Codex';
import { CounterSketch } from './panels/CounterSketch';
import { AssistPicker } from './panels/AssistPicker';

// Composition root: engine imports are legal HERE (and in ./campaign) — the panels are the fenced,
// props-only zone. Run the seeded scripted campaign once at module load; the views are pure folds.
const { world } = runDevCampaign();
const npcCount = Object.keys(world.npcs).length;
const venueCount = Object.keys(world.venues).length;

// Minimal legibility CSS — the standing UI law: text/CSS only, no images/sprites.
const CSS = `
  body { margin: 0; }
  main { font-family: system-ui, -apple-system, sans-serif; line-height: 1.4; color: #1a1a1a; }
  section { border-top: 1px solid #ddd; margin-top: 20px; padding-top: 8px; }
  h1 { margin-bottom: 4px; } h2 { margin-bottom: 8px; } small { color: #666; font-weight: 400; }
  table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 3px 8px; text-align: left; font-size: 13px; }
  th { background: #f4f4f4; }
  button { cursor: pointer; font: inherit; text-align: left; }
  code { background: #f0f0f0; padding: 1px 5px; border-radius: 3px; }
  ul, ol { margin: 4px 0; }
`;

function App() {
  const [level, setLevel] = useState<AssistLevel>(1);
  const board = boardView(world.intel.log, level, STANDARD_RULES);
  const codex = codexStatus(world.intel.log, world.intel.codex, STANDARD_RULES);
  const counter = counterSketchView(world.intel.log, world.intel.cards);
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <style>{CSS}</style>
      <header>
        <h1>Hearsay — dev shell</h1>
        <p>
          seed <code>{DEV_SEED}</code> · {DEV_DAYS} days · {npcCount} agents (incl. avatar) ·{' '}
          {venueCount} venues · {world.intel.log.length} intel entries
        </p>
      </header>
      <AssistPicker level={level} onChange={setLevel} />
      <EvidenceBoard view={board} />
      <Codex rows={codex} />
      <CounterSketch view={counter} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
