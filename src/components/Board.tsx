import { useMemo, useState } from 'react';
import type { Board as BoardT, Row } from '../types';
import { ago, dur, pct, sol, tone, usd } from '../lib/format';
import { Logo } from './Logo';
import { Spark } from './Spark';

type Tab = 'today' | 'holding' | 'sold' | 'skipped';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'holding', label: 'Holding' },
  { id: 'sold', label: 'Sold' },
  { id: 'skipped', label: 'Skipped' },
];

const DAY = 86_400_000;

function pick(rows: Row[], tab: Tab, now: number): Row[] {
  switch (tab) {
    case 'today':
      return rows.filter((r) => now - r.createdAt < DAY).sort((a, b) => b.createdAt - a.createdAt);
    case 'holding':
      return rows.filter((r) => r.position?.open).sort((a, b) => a.position!.sellAt - b.position!.sellAt);
    case 'sold':
      return rows
        .filter((r) => r.position && !r.position.open)
        .sort((a, b) => b.position!.exit!.time - a.position!.exit!.time);
    case 'skipped':
      return rows.filter((r) => r.status === 'skipped').sort((a, b) => b.createdAt - a.createdAt);
  }
}

const FOLD = 10;

export function Board({ board, source, now }: { board: BoardT | null; source: string; now: number }) {
  const [tab, setTab] = useState<Tab>('today');
  const [all, setAll] = useState(false);
  const rows = board?.rows ?? [];
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, pick(rows, t.id, now).length])) as Record<Tab, number>,
    // counts only need to move when the data or the minute changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, Math.floor(now / 60_000)],
  );
  const full = pick(rows, tab, now);
  const list = all ? full : full.slice(0, FOLD);
  const r = board?.rules;

  return (
    <section className="board panel" id="board" aria-label="Board">
      <div className="board-head">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'on' : ''}`}
              onClick={() => {
                setTab(t.id);
                setAll(false);
              }}
            >
              {t.label}
              <span className="count">{board ? counts[t.id] : '–'}</span>
            </button>
          ))}
        </div>
        <div className="board-meta mono">
          {board ? (
            <>
              <span>{board.coinsScanned.toLocaleString('en-US')} LaunchLab coins scanned</span>
              <span className="sep">·</span>
              <span>{source === 'snapshot' ? 'snapshot ' : 'updated '}{ago(board.updatedAt, now)}</span>
            </>
          ) : (
            <span>{source === 'offline' ? 'engine offline' : 'scanning LaunchLab…'}</span>
          )}
        </div>
      </div>

      <div className="table" role="table">
        <div className="tr th" role="row">
          <span role="columnheader">Pad</span>
          <span role="columnheader">Age</span>
          <span role="columnheader" className="num">Mcap</span>
          <span role="columnheader">Since launch</span>
          <span role="columnheader" className="num">Vol 1h</span>
          <span role="columnheader">Filter</span>
          <span role="columnheader">
            Position <em className="tag">paper</em>
          </span>
          <span role="columnheader" className="num">Sells in</span>
        </div>

        {!board &&
          Array.from({ length: 7 }, (_, i) => (
            <div className="tr skeleton" key={i} role="row">
              <span />
            </div>
          ))}

        {board && list.length === 0 && <div className="empty">Nothing here yet. The engine checks LaunchLab every minute.</div>}

        {list.map((row) => (
          <BoardRow key={row.poolId} row={row} now={now} rules={r!} />
        ))}
        {full.length > FOLD && (
          <button className="more" onClick={() => setAll(!all)}>
            {all ? 'Show less' : `Show all ${full.length}`}
          </button>
        )}
      </div>

      {r && (
        <div className="board-foot mono">
          <span>
            Rules: vol 1h ≥ {r.minVol1hSol} SOL · holders ≥ {r.minHolders} · dev ≤ {r.maxDevPct}% · buy {r.sizeSol} SOL ·
            sell after {r.sellAfterH}h or {r.takeProfitX}x
          </span>
          <span className="dim">Positions replay live LaunchLab trades. Auto-buys from the engine wallet ship in v1.</span>
        </div>
      )}
    </section>
  );
}

function BoardRow({ row, now, rules }: { row: Row; now: number; rules: BoardT['rules'] }) {
  const nowSec = now / 1000;
  const age = (now - row.createdAt) / 1000;
  const p = row.position;
  const t = tone(row.sinceLaunchPct);
  const raydium = `https://raydium.io/launchpad/token/?mint=${row.mint}`;

  return (
    <a className={`tr ${row.status}`} role="row" href={raydium} target="_blank" rel="noreferrer">
      <span className="cell-pad" role="cell">
        <Logo src={row.logo} alt={row.symbol} />
        <span className="pad-txt">
          <span className="pad-name">{row.name}</span>
          <span className="pad-sub mono">
            ${row.symbol.toUpperCase()} <span className="dim">· {row.domain}</span>
          </span>
        </span>
      </span>

      <span className="mono" role="cell">
        {dur(age)}
      </span>

      <span className="mono num" role="cell">
        {row.quote !== 'WSOL' ? <span className="dim">—</span> : usd(row.mcapUsd)}
      </span>

      <span className="cell-since" role="cell">
        <span className={`mono ${t}`}>{row.quote !== 'WSOL' ? '—' : pct(row.sinceLaunchPct)}</span>
        <Spark data={row.spark} tone={t} />
      </span>

      <span className="mono num" role="cell">
        {row.quote !== 'WSOL' ? <span className="dim">—</span> : sol(row.vol1h)}
      </span>

      <span className="cell-filter" role="cell">
        <Decision row={row} nowSec={nowSec} />
      </span>

      <span className="cell-pos mono" role="cell">
        {p ? (
          <>
            <span className="dim">
              {p.sizeSol} SOL @ {p.minsAfterLaunch < 1 ? '<1m' : `${p.minsAfterLaunch}m`}
            </span>
            <span className={tone(p.pnlPct)}>
              {sol(p.pnlSol, true)} <span className="pp">{pct(p.pnlPct)}</span>
            </span>
          </>
        ) : (
          <span className="dim">—</span>
        )}
      </span>

      <span className="mono num cell-sell" role="cell">
        {p && p.open && <span>{dur(p.sellAt - nowSec)}</span>}
        {p && !p.open && (
          <span className="dim">{p.exit!.why === 'take-profit' ? `Sold · ${rules.takeProfitX}x` : 'Sold · day 2'}</span>
        )}
        {!p && <span className="dim">—</span>}
      </span>
    </a>
  );
}

function Decision({ row, nowSec }: { row: Row; nowSec: number }) {
  if (row.status === 'passed') {
    const e = row.position?.atEntry;
    return (
      <>
        <span className="chip pass">Passed</span>
        <span className="why mono">
          {e ? `${sol(e.vol)} · ${e.holders} holders` : `${row.holders1h} holders · dev ${row.devPct.toFixed(1)}%`}
        </span>
      </>
    );
  }
  if (row.status === 'watching') {
    const left = row.createdAt / 1000 + 3600 - nowSec;
    return (
      <>
        <span className="chip watch">
          <i className="dot" /> Watching
        </span>
        <span className="why mono">{left > 0 ? `decides in ${dur(left)}` : 'deciding…'}</span>
      </>
    );
  }
  return (
    <>
      <span className="chip skip">Skipped</span>
      <span className="why mono">{row.reason}</span>
    </>
  );
}
