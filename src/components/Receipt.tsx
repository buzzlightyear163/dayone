import type { Board } from '../types';
import { ago, dur, pct, sol, solscanTx, usd } from '../lib/format';
import { Logo } from './Logo';

export function Receipt({ board, now }: { board: Board | null; now: number }) {
  const last = board?.rows
    .filter((r) => r.position && !r.position.open && r.position.exit)
    .sort((a, b) => b.position!.exit!.time - a.position!.exit!.time)[0];

  if (!board || !last) {
    return (
      <div className="receipt panel">
        <div className="rc-head">
          <span>Last trade</span>
          <em className="tag">paper</em>
        </div>
        <div className="rc-empty">{board ? 'No closed trade in the last 50h yet.' : 'Loading…'}</div>
      </div>
    );
  }

  const p = last.position!;
  const ex = p.exit!;
  const mc = (price: number) => usd(price * 1e9 * board.solPrice);
  const held = ex.time - p.entryTime;
  const why = ex.why === 'take-profit' ? `take-profit at ${board.rules.takeProfitX}x` : ex.why === 'day 2' ? 'day two' : 'stop-loss';

  return (
    <div className="receipt panel">
      <div className="rc-head">
        <span>Last trade</span>
        <em className="tag">paper</em>
        <span className="rc-when mono">{ago(ex.time * 1000, now)}</span>
      </div>

      <div className="rc-pad">
        <Logo src={last.logo} alt={last.symbol} size={32} />
        <div>
          <div className="pad-name">{last.name}</div>
          <div className="pad-sub mono">
            ${last.symbol.toUpperCase()} · {last.domain}
          </div>
        </div>
      </div>

      <ul className="rc-lines mono">
        <li>
          <span className="rc-k">Bought</span>
          <span>
            {sol(p.sizeSol)} · {p.minsAfterLaunch < 1 ? '<1m' : `${p.minsAfterLaunch}m`} after launch
          </span>
          <a href={solscanTx(p.entryTx)} target="_blank" rel="noreferrer" className="rc-tx">
            {mc(p.entryPrice)} mcap ↗
          </a>
        </li>
        <li>
          <span className="rc-k">Sold</span>
          <span>
            {why} · held {dur(held)}
          </span>
          {ex.tx ? (
            <a href={solscanTx(ex.tx)} target="_blank" rel="noreferrer" className="rc-tx">
              {mc(ex.price)} mcap ↗
            </a>
          ) : (
            <span className="rc-tx dim">{mc(ex.price)} mcap</span>
          )}
        </li>
        <li className="rc-total">
          <span className="rc-k">Result</span>
          <span className={p.pnlSol >= 0 ? 'up' : 'down'}>
            {sol(p.pnlSol, true)} <span className="pp">{pct(p.pnlPct)}</span>
          </span>
          <span />
        </li>
        <li>
          <span className="rc-k">Buyback</span>
          <span className="dim">{p.pnlSol > 0 ? `${sol(p.pnlSol)} → $DAYONE` : 'no profit, no buyback'}</span>
          <span className="rc-tx dim">live after launch</span>
        </li>
      </ul>

      <p className="rc-note">
        Entry and exit are real LaunchLab trades; the links show the trade that set each price. The engine wallet makes
        these buys itself once auto-buys ship.
      </p>
    </div>
  );
}
