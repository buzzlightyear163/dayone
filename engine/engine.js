// DAYONE engine
// Watches Raydium LaunchLab for new launchpads, finds each pad's OWN token,
// replays its first hour of trades against the rules and tracks the position.
// Plain fetch, no dependencies. Runs in a Vercel function and in a browser.

export const RULES = {
  minVol1hSol: 60, // volume in the first hour, SOL
  minHolders: 40, // wallets holding the token during the first hour
  maxDevPct: 5, // creator's share of supply at the moment of the buy
  sizeSol: 2, // buy size
  sellAfterH: 24, // sell on day two
  takeProfitX: 3, // or earlier at 3x
  stopLossPct: null, // off: day-one coins wick hard, a stop sells the bottom
};

const API = {
  list: 'https://launch-mint-v1.raydium.io/get/list?sort=new&size=100&includeNsfw=false',
  platforms: 'https://launch-mint-v1.raydium.io/main/platforms-v2',
  trades: 'https://launch-history-v1.raydium.io/trade?limit=100&poolId=',
  sol: 'https://api-v3.raydium.io/mint/price?mints=So11111111111111111111111111111111111111112',
  dex: 'https://api.dexscreener.com/tokens/v1/solana/',
  byMints: 'https://launch-mint-v1.raydium.io/get/by/mints?ids=',
  gt: 'https://api.geckoterminal.com/api/v2/networks/solana/pools/',
};

const SUPPLY = 1e9;
const WSOL = 'So11111111111111111111111111111111111111112';
const HOUR = 3600;
const GENERIC = new Set([
  '', 'x.com', 'twitter.com', 't.me', 'github.com', 'example.com', 'google.com',
  'youtube.com', 'linktr.ee', 'raydium.io', 'pump.fun', 'dexscreener.com',
]);

export const host = (u) => {
  try {
    return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*%/g, '')
    .replace(/\.(fun|xyz|app|io|cash|tech|live|trade|pro|meme|lol|homes|com|net|org|gg|so|ai|wtf|club|team)$/, '')
    .replace(/[^a-z0-9]/g, '');

async function get(url, tries = 2) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const x = await r.json();
      if (x && x.success === false) throw new Error(x.msg || 'api error');
      return x && x.data !== undefined ? x.data : x;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          out[k] = await fn(items[k], k);
        } catch (e) {
          out[k] = { error: String(e && e.message ? e.message : e) };
        }
      }
    }),
  );
  return out;
}

// 1. every coin launched on LaunchLab since `sinceMs`, newest first
export async function listCoins(sinceMs, maxPages = 50) {
  const rows = [];
  let next = null;
  for (let p = 0; p < maxPages; p++) {
    const d = await get(API.list + (next ? '&nextPageId=' + encodeURIComponent(next) : ''));
    rows.push(...d.rows);
    next = d.nextPageId;
    if (!next || !d.rows.length || d.rows[d.rows.length - 1].createAt < sinceMs) break;
  }
  return rows;
}

// curated, long-running platforms (Raydium, letsbonk, StonkFun …) are never "new"
export async function knownDomains() {
  try {
    const d = await get(API.platforms);
    return new Set(d.data.map((p) => host(p.web)).filter(Boolean));
  } catch {
    return new Set();
  }
}

// 2. group coins by platform (web domain) and pick the pad's own token:
//    website == platform domain AND name/ticker == platform name.
//    Memes launched on a pad also point at the pad's site, so the domain alone is not enough.
export function findPads(rows, known = new Set(), windowStartMs = 0) {
  const byDomain = new Map();
  for (const r of rows) {
    const pi = r.platformInfo || {};
    const d = host(pi.web || '');
    if (GENERIC.has(d) || known.has(d)) continue;
    if (!byDomain.has(d)) byDomain.set(d, { domain: d, names: new Set(), img: pi.img, keys: new Set(), coins: [] });
    const g = byDomain.get(d);
    g.keys.add(pi.pubKey);
    if (norm(pi.name)) g.names.add(norm(pi.name)); // one pad can run several configs with different names
    g.coins.push(r);
  }

  const pads = [];
  for (const g of byDomain.values()) {
    g.coins.sort((a, b) => a.createAt - b.createAt);
    const label = norm(g.domain.split('.')[0]);
    const own = g.coins.filter((c) => {
      const w = host(c.website || '');
      if (w !== g.domain && !w.endsWith('.' + g.domain) && !g.domain.endsWith('.' + w)) return false;
      const n = norm(c.name);
      const s = norm(c.symbol);
      return g.names.has(n) || g.names.has(s) || (label.length > 2 && (n === label || s === label));
    });
    if (!own.length) continue;
    // relaunches happen: keep the one the market actually traded
    const token = own.reduce((a, b) => ((b.volumeB || 0) > (a.volumeB || 0) ? b : a));
    const before = g.coins.filter((c) => c.createAt < token.createAt).length;
    if (before > 10) continue; // an established pad; this is a meme named after it
    if (windowStartMs && token.createAt - windowStartMs < HOUR * 1000) continue; // can't prove it's new
    pads.push({
      domain: g.domain,
      platform: ((token.platformInfo && token.platformInfo.name) || g.domain).replace(/\s*\d+(\.\d+)?\s*%$/, '').trim(),
      platformImg: (token.platformInfo && token.platformInfo.img) || g.img || '',
      configs: g.keys.size,
      coinsOnPad: g.coins.length,
      relaunches: own.length - 1,
      token,
    });
  }
  return pads.sort((a, b) => b.token.createAt - a.token.createAt);
}

// 3. all curve trades for a pool, oldest first
export async function fetchTrades(poolId, sinceSec, maxPages = 40, supply = SUPPLY, decimals = 6) {
  const rows = [];
  let next = null;
  let complete = false;
  for (let p = 0; p < maxPages; p++) {
    const d = await get(API.trades + poolId + (next ? '&nextPageKey=' + encodeURIComponent(next) : ''));
    rows.push(...d.rows);
    next = d.nextPageKey;
    const oldest = d.rows.length ? d.rows[d.rows.length - 1].blockTime : 0;
    if (!next || !d.rows.length || oldest <= sinceSec) {
      complete = true;
      break;
    }
  }
  // the create-tx buy is sometimes reported in raw units
  for (const t of rows) if (t.amountA > supply) t.amountA = t.amountA / 10 ** decimals;
  rows.sort((a, b) => a.blockTime - b.blockTime);
  return { rows, complete };
}

const px = (t) => (t.amountA > 0 ? t.amountB / t.amountA : 0);

// 4. replay the first hour against the rules
export function replay(token, trades, rules = RULES, nowSec = Date.now() / 1000) {
  const supply = token.supply || SUPPLY;
  const t0 = Math.floor(token.createAt / 1000);
  const t1 = t0 + HOUR;
  const bal = new Map();
  let vol = 0;
  let holders = 0;
  let entry = null;
  let lastPrice = Number(token.initPrice) || 0;

  for (const t of trades) {
    if (t.blockTime > t1) break;
    vol += t.amountB;
    const prev = bal.get(t.owner) || 0;
    const nxt = prev + (t.side === 'buy' ? t.amountA : -t.amountA);
    bal.set(t.owner, nxt);
    if (prev <= 0.5 && nxt > 0.5) holders++;
    else if (prev > 0.5 && nxt <= 0.5) holders--;
    lastPrice = px(t) || lastPrice;
    const dev = (Math.max(0, bal.get(token.creator) || 0) / supply) * 100;
    if (!entry && vol >= rules.minVol1hSol && holders >= rules.minHolders && dev <= rules.maxDevPct) {
      entry = { time: t.blockTime, price: px(t), vol, holders, dev, tx: t.txid };
    }
  }
  const devEnd = (Math.max(0, bal.get(token.creator) || 0) / supply) * 100;
  const firstHour = { vol, holders, dev: devEnd, done: nowSec >= t1 };

  let status;
  let reason = '';
  if (entry) status = 'passed';
  else if (!firstHour.done) status = 'watching';
  else {
    status = 'skipped';
    if (vol < rules.minVol1hSol) reason = `Vol 1h ${fmt(vol)} SOL < ${rules.minVol1hSol}`;
    else if (holders < rules.minHolders) reason = `Holders ${holders} < ${rules.minHolders}`;
    else reason = `Dev ${devEnd.toFixed(1)}% > ${rules.maxDevPct}%`;
  }

  let position = null;
  if (entry) {
    const tokens = rules.sizeSol / entry.price;
    const sellAt = entry.time + rules.sellAfterH * HOUR;
    let exit = null;
    let last = entry.price;
    for (const t of trades) {
      if (t.blockTime <= entry.time) continue;
      const p = px(t);
      if (!p) continue;
      if (t.blockTime >= sellAt) {
        exit = { time: sellAt, price: last, why: 'day 2' };
        break;
      }
      last = p;
      if (p >= entry.price * rules.takeProfitX) {
        exit = { time: t.blockTime, price: p, why: 'take-profit', tx: t.txid };
        break;
      }
      if (rules.stopLossPct != null && p <= entry.price * (1 + rules.stopLossPct / 100)) {
        exit = { time: t.blockTime, price: p, why: 'stop-loss', tx: t.txid };
        break;
      }
    }
    if (!exit && nowSec >= sellAt) exit = { time: sellAt, price: last, why: 'day 2' };
    position = {
      entryTime: entry.time,
      entryPrice: entry.price,
      entryTx: entry.tx,
      minsAfterLaunch: Math.round((entry.time - t0) / 60),
      sizeSol: rules.sizeSol,
      tokens,
      sellAt,
      exit,
      atEntry: { vol: entry.vol, holders: entry.holders, dev: entry.dev },
    };
  }
  return { status, reason, firstHour, entry, position, curvePrice: trades.length ? px(trades[trades.length - 1]) : lastPrice };
}

function fmt(n) {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
}

// sparkline: price over the coin's life, 32 points
function spark(trades, t0, nowSec) {
  if (!trades.length) return [];
  const N = 32;
  const span = Math.max(60, nowSec - t0);
  const out = [];
  let k = 0;
  let last = px(trades[0]);
  for (let i = 0; i < N; i++) {
    const until = t0 + (span * (i + 1)) / N;
    while (k < trades.length && trades[k].blockTime <= until) {
      last = px(trades[k]) || last;
      k++;
    }
    out.push(last);
  }
  return out;
}

// day-one / day-two marks from a price series [[time, price, high?], ...] (SOL per token)
// Day 1 = end of the first hour (when the engine has bought) -> 24 h. Day 2 = 24 h -> 48 h.
export function dayMarks(obs, t0, nowSec) {
  const at = (T) => {
    let p = null;
    for (const o of obs) {
      if (o[0] <= T) p = o[1];
      else break;
    }
    return p;
  };
  const last = obs.length ? obs[obs.length - 1][1] : null;
  const p1 = nowSec >= t0 + HOUR ? at(t0 + HOUR) : null;
  const done24 = nowSec >= t0 + 24 * HOUR;
  const done48 = nowSec >= t0 + 48 * HOUR;
  const p24 = done24 ? at(t0 + 24 * HOUR) : last;
  const p48 = done48 ? at(t0 + 48 * HOUR) : last;
  let peak = 0;
  for (const o of obs) if (o[0] <= t0 + 24 * HOUR) peak = Math.max(peak, o[2] || o[1]);
  const pct = (a, b) => (a && b ? (b / a - 1) * 100 : null);
  return {
    p1,
    p24,
    p48,
    day1: pct(p1, p24),
    day2: done24 ? pct(p24, p48) : null,
    day1Live: !done24,
    day2Live: done24 && !done48,
    peak1: pct(p1, peak),
  };
}

async function dexPrices(mints) {
  const map = new Map();
  for (let i = 0; i < mints.length; i += 30) {
    try {
      const pairs = await get(API.dex + mints.slice(i, i + 30).join(','));
      for (const p of Array.isArray(pairs) ? pairs : []) {
        const m = p.baseToken && p.baseToken.address;
        const liq = (p.liquidity && p.liquidity.usd) || 0;
        if (!m) continue;
        const cur = map.get(m);
        if (!cur || liq > cur.liq) map.set(m, { priceNative: Number(p.priceNative), liq, url: p.url });
      }
    } catch {
      /* DexScreener is optional */
    }
  }
  return map;
}

const cache = new Map(); // poolId -> analysis, for coins whose result can no longer change

// 5. the board
export async function buildBoard({ hours = 50, rules = RULES, now = Date.now() } = {}) {
  const nowSec = now / 1000;
  const since = now - hours * HOUR * 1000;
  const [rows, known, solPrice] = await Promise.all([
    listCoins(since),
    knownDomains(),
    get(API.sol).then((d) => Number(d['So11111111111111111111111111111111111111112']) || 0).catch(() => 0),
  ]);
  const windowStart = rows.length ? rows[rows.length - 1].createAt : since;
  const pads = findPads(rows, known, windowStart).filter((p) => p.token.createAt >= since);

  const analysed = await pool(pads, 4, async (p) => {
    const tk = p.token;
    const hit = cache.get(tk.poolId);
    if (hit) return hit;
    const quote = tk.mintB && tk.mintB.address;
    if (quote && quote !== WSOL) {
      const res = { status: 'skipped', reason: `Quote ${(tk.mintB.symbol || '?').trim()}, not SOL`, firstHour: null, spark: [], complete: true, quoteNotSol: true };
      cache.set(tk.poolId, res);
      return res;
    }
    const t0 = Math.floor(tk.createAt / 1000);
    const { rows: trades, complete } = await fetchTrades(tk.poolId, t0, 40, tk.supply || SUPPLY, tk.decimals || 6);
    const r = replay(tk, complete ? trades : [], rules, nowSec);
    if (!complete) {
      r.status = r.status === 'watching' ? 'watching' : 'skipped';
      r.reason = 'Too many trades to replay';
    }
    const obs = trades.filter((t) => t.amountA > 0).map((t) => [t.blockTime, px(t)]);
    const graduatedAt = (tk.finishingRate || 0) >= 100 && obs.length ? obs[obs.length - 1][0] : 0;
    const marks = dayMarks(obs, t0, nowSec);
    // after graduation the curve stops trading; marks past that point are unknown here
    if (graduatedAt && graduatedAt < t0 + 24 * HOUR) Object.assign(marks, { day1: null, day2: null });
    const res = { ...r, complete, spark: spark(trades, t0, nowSec), trades: trades.length, marks };
    const settled = complete && (r.status === 'skipped' || (r.position && r.position.exit));
    if (settled) cache.set(tk.poolId, res);
    return res;
  });

  const graduated = pads.filter((p) => (p.token.finishingRate || 0) >= 100).map((p) => p.token.mint);
  const dex = await dexPrices(graduated);

  const out = pads.map((p, i) => {
    const a = analysed[i] || {};
    const tk = p.token;
    const init = Number(tk.initPrice) || 0;
    const d = dex.get(tk.mint);
    // Raydium's indexed market cap (USD) is fresh with the list; brand-new coins use their last trade
    const indexed = now - tk.createAt > 10 * 60e3 && tk.marketCap > 0 && solPrice > 0;
    const listPrice = indexed ? tk.marketCap / (tk.supply || SUPPLY) / solPrice : 0;
    const price = a.quoteNotSol ? init : (d && d.priceNative) || listPrice || a.curvePrice || init;
    let pos = null;
    if (a.position) {
      const ps = a.position;
      const mark = ps.exit ? ps.exit.price : price;
      const value = ps.tokens * mark;
      pos = {
        ...ps,
        mark,
        pnlSol: value - ps.sizeSol,
        pnlPct: (mark / ps.entryPrice - 1) * 100,
        open: !ps.exit,
      };
    }
    return {
      pad: p.platform,
      domain: p.domain,
      padImg: p.platformImg,
      configs: p.configs,
      coinsOnPad: p.coinsOnPad,
      relaunches: p.relaunches,
      name: tk.name.trim(),
      symbol: tk.symbol.trim(),
      mint: tk.mint,
      poolId: tk.poolId,
      creator: tk.creator,
      logo: tk.imgUrl,
      twitter: tk.twitter || '',
      createdAt: tk.createAt,
      curvePct: Math.min(100, tk.finishingRate || 0),
      price,
      mcapUsd: a.quoteNotSol ? 0 : price * (tk.supply || SUPPLY) * solPrice,
      sinceLaunchPct: a.quoteNotSol ? 0 : init ? (price / init - 1) * 100 : 0,
      quote: (tk.mintB && tk.mintB.symbol) || 'WSOL',
      status: a.error ? 'error' : a.status,
      reason: a.reason || a.error || '',
      vol1h: a.firstHour ? a.firstHour.vol : 0,
      holders1h: a.firstHour ? a.firstHour.holders : 0,
      devPct: a.firstHour ? a.firstHour.dev : 0,
      complete: a.complete !== false,
      spark: a.spark || [],
      position: pos,
      marks: a.marks || null,
    };
  });

  const bought = out.filter((r) => r.position);
  const closed = bought.filter((r) => !r.position.open);
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  return {
    updatedAt: now,
    solPrice,
    rules,
    windowHours: hours,
    coinsScanned: rows.length,
    stats: {
      padsTracked: out.length,
      bought: bought.length,
      closed: closed.length,
      avgReturnPct: avg(bought.map((r) => r.position.pnlPct)),
      pnlSol: bought.reduce((s, r) => s + r.position.pnlSol, 0),
    },
    rows: out,
  };
}

// ── Scoreboard: pad tokens we track from before the engine went live ──────────
export const SEEDS = [
  { symbol: 'FAIR', mint: 'FairDR2UmRqHxsVPdPcetePCjFaDqVYv3oQX9fcQTpTg', pad: 'LaunchFair', domain: 'launchfair.fun' },
  { symbol: 'STOKE', mint: '5BeD1Uc3Rz2Eha5FqGEnVUpGRNRk8khkXLXQNxynPyTx', pad: 'Stoke', domain: 'usestoke.xyz' },
  { symbol: 'CURVD', mint: 'AhMWqC77W2YUx6rPXtoju3N3L1pA89p5JvZxYWN3dHUf', pad: 'Curvd', domain: 'curvd.fun' },
  { symbol: 'FLOAT', mint: 'Bv1a7cEj5aRnJQhMw4kRQqAFesMSd5LwcDnUzq52BMmr', pad: 'Float', domain: 'floatlaunch.xyz' },
  { symbol: 'HIGH', mint: '7ymF66Z6VhgNiwadtVhjTtT6U7iQRpSxeiRrhfufhigh', pad: 'higher.fun', domain: 'higher.fun' },
  { symbol: 'PEAK', mint: 'APLPiTjBWzwfZ5U1TBeqLF9XJ7dV7XKGe7j4BZhkDray', pad: 'Peak', domain: 'launchonpeak.fun' },
];

const seedCache = new Map(); // mint -> settled row (48 h passed)

async function gtHours(pair, beforeSec) {
  try {
    const d = await get(`${API.gt}${pair}/ohlcv/hour?aggregate=1&limit=60&currency=token&before_timestamp=${beforeSec}`, 1);
    return (d && d.attributes && d.attributes.ohlcv_list) || [];
  } catch {
    return [];
  }
}

export async function buildScoreboard({ now = Date.now() } = {}) {
  const nowSec = now / 1000;
  // rows for coins still inside their first 48 h are refreshed every few minutes
  for (const [k, v] of seedCache) if (v.cacheUntil && v.cacheUntil < now) seedCache.delete(k);
  const todo = SEEDS.filter((s) => !seedCache.has(s.mint));
  if (todo.length) {
    const [info, pairs] = await Promise.all([
      get(API.byMints + todo.map((s) => s.mint).join(',')).then((d) => (d && d.rows) || d || []),
      get(API.dex + todo.map((s) => s.mint).join(',')).catch(() => []),
    ]);
    await pool(todo, 3, async (seed) => {
      const tk = info.find((r) => r.mint === seed.mint);
      if (!tk) return;
      const t0 = Math.floor(tk.createAt / 1000);
      const { rows: trades } = await fetchTrades(tk.poolId, t0, 40, tk.supply || SUPPLY, tk.decimals || 6);
      const obs = trades.filter((t) => t.amountA > 0).map((t) => [t.blockTime, px(t)]);
      const lastCurve = obs.length ? obs[obs.length - 1][0] : t0;
      // after graduation: hourly closes from the Raydium pool the coin migrated to
      const pair = (Array.isArray(pairs) ? pairs : [])
        .filter((p) => p.baseToken && p.baseToken.address === seed.mint && p.dexId === 'raydium' && p.quoteToken.address === WSOL)
        .sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0))[0];
      if (pair && (tk.finishingRate || 0) >= 100) {
        const candles = await gtHours(pair.pairAddress, t0 + 50 * HOUR);
        for (const c of candles) if (c[0] + HOUR > lastCurve) obs.push([c[0] + HOUR, c[4], c[2]]);
        obs.sort((a, b) => a[0] - b[0]);
      }
      const vol1h = trades.filter((t) => t.blockTime <= t0 + HOUR).reduce((s, t) => s + t.amountB, 0);
      const row = {
        ...seed,
        name: tk.name.trim(),
        logo: tk.imgUrl || '',
        poolId: tk.poolId,
        pair: pair ? pair.pairAddress : '',
        createdAt: tk.createAt,
        graduatedMins: Math.round((lastCurve - t0) / 60),
        vol1h,
        source: 'seed',
        ...dayMarks(obs, t0, nowSec),
      };
      if (nowSec < t0 + 50 * HOUR) row.cacheUntil = now + 5 * 60e3;
      seedCache.set(seed.mint, row);
    });
  }
  const rows = SEEDS.map((s) => seedCache.get(s.mint)).filter(Boolean);
  return { updatedAt: now, rows };
}
