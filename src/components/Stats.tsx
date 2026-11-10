import type { Board } from '../types';
import { pct } from '../lib/format';

export function Stats({ board }: { board: Board | null }) {
  const s = board?.stats;
  const avg = s && s.bought ? s.avgReturnPct : null;
  const items = [
    { k: 'Pads tracked', v: s ? String(s.padsTracked) : '–', sub: `New launchpads on LaunchLab · last ${board?.windowHours ?? 50}h` },
    { k: 'Bought', v: s ? String(s.bought) : '–', sub: 'Passed the filter in the first hour' },
    {
      k: 'Avg day-one return',
      v: avg === null ? '–' : pct(avg),
      sub: `Per trade, ${board?.rules.sizeSol ?? 2} SOL each · paper`,
      tone: avg === null ? '' : avg > 0 ? 'up' : 'down',
    },
    { k: '$DAYONE bought back', v: '0', sub: 'Starts with the first live sell' },
  ];
  return (
    <section className="stats" aria-label="Engine numbers">
      {items.map((it) => (
        <div className="stat panel" key={it.k}>
          <span className="stat-k">{it.k}</span>
          <span className={`stat-v mono ${it.tone ?? ''}`}>{it.v}</span>
          <span className="stat-sub">{it.sub}</span>
        </div>
      ))}
    </section>
  );
}
