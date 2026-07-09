import { UI_GLYPHS } from '../assets';
import type { EconomyDef } from '../townview';
import { Term } from './Term';

/**
 * The treasury panel (Plan 8 Task 11) — coin, the next stipend, and the whole price list, every row
 * named through a registered <Term>. Money prices choices, it is never a second game: flat integer
 * coin, a fixed weekly stipend, visible prices from the ONE economy table (src/content/economy.ts).
 * Props-only — coin + the next stipend day + the economy table are folded in the composition root.
 */
export function Treasury({ coin, stipendDay, economy }: { coin: number; stipendDay: number; economy: EconomyDef }) {
  return (
    <section className="panel">
      <h2><Term id="treasury" /></h2>
      <p><b>{UI_GLYPHS['coin']} {coin}</b> in the treasury.</p>
      <p className="desk-note">
        <Term id="stipend" />: <b>+{economy.weeklyStipend}</b> next lands on day {stipendDay}.{' · '}
        <Term id="wage" />: <b>−{economy.wagePerInformantPerWeek}</b> per asset each week.
      </p>
      <h3>price list</h3>
      <table className="board-table">
        <thead><tr><th>verb</th><th>coin</th></tr></thead>
        <tbody>
          <tr><td><Term id="verb-recruit" /> · <Term id="mice-money" /></td><td>{economy.recruitCost.money}</td></tr>
          <tr><td><Term id="verb-recruit" /> · <Term id="mice-ideology" /></td><td>{economy.recruitCost.ideology}</td></tr>
          <tr><td><Term id="verb-recruit" /> · <Term id="mice-coercion" /></td><td>{economy.recruitCost.coercion}</td></tr>
          <tr><td><Term id="verb-recruit" /> · <Term id="mice-ego" /></td><td>{economy.recruitCost.ego}</td></tr>
          <tr><td><Term id="verb-courier" /></td><td>{economy.courierRun}</td></tr>
          <tr><td><Term id="verb-set-drop" /></td><td>{economy.deadDropSetup}</td></tr>
          <tr><td><Term id="verb-host" /> · <Term id="salon" /></td><td>{economy.salonEvent}</td></tr>
          <tr><td><Term id="verb-host" /> · <Term id="back-room" /></td><td>{economy.backRoomEvent}</td></tr>
          <tr><td><Term id="brokerage" /></td><td>{economy.brokerSaleBase} × <Term id="severity" /></td></tr>
        </tbody>
      </table>
      <p className="desk-note">
        <Term id="verb-meet" /> and <Term id="verb-debrief" /> cost no coin — the walk, and the trust, is the price.
      </p>
    </section>
  );
}
