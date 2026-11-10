import { Mark } from './Mark';
import { useEffect, useRef, useState } from 'react';
import type { Board } from '../types';

const KEY = 'dayone-intro-seen';

function seen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function Intro({ board, source, now }: { board: Board | null; source: string; now: number }) {
  const [open, setOpen] = useState(() => !seen());
  const [start] = useState(() => Date.now());
  const btn = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* private mode */
    }
  };

  useEffect(() => {
    if (!open) return;
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const ready = !!board;
  const offline = !board && source === 'offline';
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  const slow = !ready && secs >= 25;
  const passed = board ? board.rows.filter((r) => r.position).length : 0;

  return (
    <div className="intro-backdrop" onClick={close}>
      <div
        className="intro-box panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="intro-top">
          <span className="intro-brand">
            <Mark />
            DAYONE
          </span>
          <button className="intro-x" onClick={close} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <h2 id="intro-title">{ready ? 'The board is ready.' : 'The engine is reading LaunchLab.'}</h2>
        <p className="intro-text">
          Every visit runs a live scan of Raydium LaunchLab: every new coin, every new launchpad and the first hour
          of trades for each pad's own token. The first load can take up to 30 seconds. Stay on the page and the board
          fills in by itself.
        </p>

        <ol className="intro-steps mono">
          <li className="done">
            <i />
            <span>Connected to the engine</span>
            <b>ok</b>
          </li>
          <li className={ready ? 'done' : offline ? 'fail' : 'run'}>
            <i />
            <span>Scanning LaunchLab coins</span>
            <b>{ready ? board!.coinsScanned.toLocaleString('en-US') : offline ? 'no answer' : `${secs}s`}</b>
          </li>
          <li className={ready ? 'done' : 'wait'}>
            <i />
            <span>Replaying first hours</span>
            <b>{ready ? `${board!.rows.length} pads · ${passed} passed` : '—'}</b>
          </li>
        </ol>

        <div className={`intro-bar ${ready ? 'full' : offline ? 'stop' : ''}`} aria-hidden>
          <span />
        </div>

        {slow && <p className="intro-note mono">Still scanning. LaunchLab is busy right now, give it a few more seconds.</p>}
        {offline && <p className="intro-note mono">The engine can't reach LaunchLab right now. Try again in a minute.</p>}

        <div className="intro-foot">
          <span className="intro-risk">Positions are paper until auto-buys ship. Not financial advice.</span>
          <button ref={btn} className={`btn ${ready ? 'primary' : ''}`} onClick={close}>
            {ready ? 'Show the board' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
