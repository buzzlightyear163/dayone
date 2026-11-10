export function usd(n: number): string {
  if (!isFinite(n) || n <= 0) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

export function pct(n: number, digits = 0): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) < 0.5) return '0%';
  const v = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toFixed(digits);
  return (n > 0 ? '+' : n < 0 ? '−' : '') + v.replace('-', '') + '%';
}

export function sol(n: number, signed = false): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  const v = abs >= 100 ? abs.toFixed(0) : abs >= 10 ? abs.toFixed(1) : abs.toFixed(2);
  if (!signed) return v + ' SOL';
  return (n > 0 ? '+' : n < 0 ? '−' : '') + v + ' SOL';
}

export function dur(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m`;
  return `${sec % 60}s`;
}

export function short(addr: string, n = 4): string {
  return addr.length > n * 2 + 1 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr;
}

export function ago(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${dur(s)} ago`;
}

export const tone = (n: number) => (n > 0.5 ? 'up' : n < -0.5 ? 'down' : 'flat');

export function day(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}`;
export const solscanAccount = (a: string) => `https://solscan.io/account/${a}`;
