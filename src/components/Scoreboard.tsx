import { useState } from 'react';
import type { Board, ScoreRow, Scoreboard as ScoreboardT } from '../types';
import { day, pct, sol } from '../lib/format';
import { Logo } from './Logo';

const DAY_MS = 86_400_000;

// pads the engine found itself, once they are a day old
function fromBoard(board: Board | null, now: number): ScoreRow[] {
  if (!board) return [];
  return board.rows
    .filter((r) => r.marks && r.marks.day1 !== null && now - r.createdAt >= DAY_MS && r.vol1h > 0)
    .map((r) => ({
      ...(r.marks as NonNullable<typeof r.marks>),
      symbol: r.symbol,
      mint: r.mint,
      pad: r.pad,
      domain: r.domain,
      name: r.name,
      logo: r.logo,
      poolId: r.poolId,
      pair: '',
      createdAt: r.createdAt,
      graduatedMins: 0,
      vol1h: r.vol1h,
      source: 'engine' as const,
      decision: r.status,
    }));
}

function Bars({ d1, d2 }: { d1: number | null; d2: number | null }) {
  const W = 128;
  const mid = W / 2;
  const len = (p: number) => (Math.min(1, Math.log10(1 + Math.abs(p) / 100) / Math.log10(21)) * (mid - 4)) || 1;
  const bar = (p: number | null, y: number) => {
    if (p === null) return <rect x={mid - 1} y={y} width={2} height={5} rx={1} className="bar-none" />;
    const w = Math.max(2, len(p));
    return <rect x={p >= 0 ? mid : mid - w} y={y} width={w} height={5} rx={1.5} className={p >= 0 ? 'bar-up' : 'bar-down'} />;
  };
  return (
    <svg className="bars" width={W} height={18} viewBox={`0 0 ${W} 18`} aria-hidden>
      <line x1={mid} x2={mid} y1={0} y2={18} className="bar-axis" />
      {bar(d1, 2)}
      {bar(d2, 11)}
    </svg>
  );
}

function Pct({ v, live }: { v: number | null; live: boolean }) {
  if (v === null) return <span className="dim">—</span>;
  return (
    <span className={v > 0.5 ? 'up-ice' : v < -0.5 ? 'down' : 'flat'}>
      {pct(v)}
      {live && <em className="live-tag">live</em>}
    </span>
  );
}

export function Scoreboard({ data, board, now }: { data: ScoreboardT | null; board: Board | null; now: number }) {
  const [view, setView] = useState<'passed' | 'all'>('passed');
  const seen = new Set<string>();
  const everything = [...(data?.rows ?? []), ...fromBoard(board, now)]
    .filter((r) => (seen.has(r.mint) ? false : (seen.add(r.mint), true)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const passed = everything.filter((r) => r.source === 'seed' || r.decision === 'passed');
  const rows = view === 'passed' ? passed : everything;

  const settled1 = rows.filter((r) => r.day1 !== null && !r.day1Live);
  const settled2 = rows.filter((r) => r.day2 !== null && !r.day2Live);
  const up1 = settled1.filter((r) => (r.day1 ?? 0) > 0).length;
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const m1 = median(settled1.map((r) => r.day1 as number));
  const m2 = median(settled2.map((r) => r.day2 as number));

  return (
    <section className="section" id="scoreboard">
      <div className="section-head">
        <div>
          <h2>Scoreboard</h2>
          <p className="section-lede">
            Every pad token we track. Day 1 runs from the end of its first hour to 24h, day 2 is the next 24h. The
            engine buys inside the first hour and sells on day two.
          </p>
        </div>
        <div className="head-stats mono">
          <span>
            <b className="up-ice">{settled1.length ? `${up1}/${settled1.length}` : '–'}</b> up on day 1
          </span>
          <span>
            median day 1 <b className={m1 !== null && m1 < 0 ? 'down' : 'up-ice'}>{m1 === null ? '–' : pct(m1)}</b>
          </span>
          <span>
            median day 2 <b className={m2 !== null && m2 < 0 ? 'down' : 'up-ice'}>{m2 === null ? '–' : pct(m2)}</b>
          </span>
        </div>
      </div>

      <div className="panel score">
        <div className="score-tabs">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === 'passed'} className={`tab ${view === 'passed' ? 'on' : ''}`} onClick={() => setView('passed')}>
              Passed filter <span className="count">{passed.length}</span>
            </button>
            <button role="tab" aria-selected={view === 'all'} className={`tab ${view === 'all' ? 'on' : ''}`} onClick={() => setView('all')}>
              All pads <span className="count">{everything.length}</span>
            </button>
          </div>
          <span className="board-meta mono">
            {view === 'passed' ? 'pads the engine would buy, plus pads tracked before it went live' : 'every new pad token, one day old or more'}
          </span>
        </div>
        <div className="sr sh" role="row">
          <span>Pad token</span>
          <span>Launched</span>
          <span className="num">Vol 1h</span>
          <span className="num">Day 1</span>
          <span className="num">Day 2</span>
          <span className="bars-h">
            <i className="k-up" /> up <i className="k-down" /> down
          </span>
        </div>
        {!data &&
          !rows.length &&
          Array.from({ length: 6 }, (_, i) => (
            <div className="sr skeleton" key={i}>
              <span />
            </div>
          ))}
        {rows.map((r) => (
          <a
            className="sr"
            key={r.mint}
            role="row"
            href={`https://dexscreener.com/solana/${r.mint}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="cell-pad">
              <Logo src={r.logo} alt={r.symbol} />
              <span className="pad-txt">
                <span className="pad-name">
                  ${r.symbol.toUpperCase()}
                  <em className="tag">{r.source === 'seed' ? 'tracked' : r.decision === 'passed' ? 'passed' : 'skipped'}</em>
                </span>
                <span className="pad-sub mono">{r.domain}</span>
              </span>
            </span>
            <span className="mono dim-2">{day(r.createdAt)}</span>
            <span className="mono num">{sol(r.vol1h)}</span>
            <span className="mono num">
              <Pct v={r.day1} live={r.day1Live} />
            </span>
            <span className="mono num">
              <Pct v={r.day2} live={r.day2Live} />
            </span>
            <span className="bars-c">
              <Bars d1={r.day1} d2={r.day2} />
            </span>
          </a>
        ))}
      </div>
      <p className="fine mono">
        Prices in SOL from Raydium LaunchLab trades, then hourly closes from the Raydium pool after graduation.
      </p>
    </section>
  );
}
