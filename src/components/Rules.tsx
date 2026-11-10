import type { Board } from '../types';

export function Rules({ board }: { board: Board | null }) {
  const r = board?.rules;
  const rows = board?.rows ?? [];
  const blocked = (prefix: string) => rows.filter((x) => x.status === 'skipped' && x.reason.startsWith(prefix)).length;
  const n = (k: string) => (board ? `${blocked(k)} skipped · ${board.windowHours}h` : '');

  const items = [
    { k: 'Min volume, first hour', d: 'Real money has to show up before the engine does.', v: r ? `≥ ${r.minVol1hSol} SOL` : '–', s: n('Vol') },
    { k: 'Min holders', d: 'Wallets still holding. Catches devs trading with themselves.', v: r ? `≥ ${r.minHolders}` : '–', s: n('Holders') },
    { k: 'Max dev share', d: "The creator's bag when the engine buys.", v: r ? `≤ ${r.maxDevPct}%` : '–', s: n('Dev') },
    { k: 'Buy size', d: 'One buy per pad, inside its first hour.', v: r ? `${r.sizeSol} SOL` : '–', s: '' },
    { k: 'Sell', d: 'Day two, or earlier if it triples.', v: r ? `${r.sellAfterH}h · ${r.takeProfitX}x` : '–', s: '' },
    { k: 'Stop-loss', d: 'Off. Day-one coins wick hard and a stop sells the bottom.', v: r ? (r.stopLossPct === null ? 'off' : `${r.stopLossPct}%`) : '–', s: '' },
  ];

  return (
    <div className="rules panel">
      <div className="rc-head">
        <span>Filter</span>
        <span className="rc-when mono">applied to every new pad</span>
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.k}>
            <div className="rl-txt">
              <span className="rl-k">{it.k}</span>
              <span className="rl-d">{it.d}</span>
            </div>
            <div className="rl-v">
              <span className="rl-chip mono">{it.v}</span>
              {it.s && <span className="rl-s mono">{it.s}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
