import { useEffect, useRef, useState } from 'react';
import type { Board, Scoreboard } from '../types';

type Source = 'loading' | 'live' | 'snapshot' | 'offline';

export function useBoard(intervalMs = 60_000) {
  const [board, setBoard] = useState<Board | null>(null);
  const [source, setSource] = useState<Source>('loading');
  const has = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/board', { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const b = (await r.json()) as Board;
        if (!alive || !b.rows) return;
        has.current = true;
        setBoard(b);
        setSource('live');
      } catch {
        if (has.current) return;
        try {
          const s = (await fetch('/snapshot.json').then((r) => r.json())) as Board;
          if (!alive) return;
          has.current = true;
          setBoard(s);
          setSource('snapshot');
        } catch {
          if (alive) setSource('offline');
        }
      }
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { board, source };
}

export function useNow(stepMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

export function useScoreboard(intervalMs = 300_000) {
  const [data, setData] = useState<Scoreboard | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/scoreboard');
        if (!r.ok) return;
        const s = (await r.json()) as Scoreboard;
        if (alive && s.rows) setData(s);
      } catch {
        /* keep the last one */
      }
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return data;
}
