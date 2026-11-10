import { buildBoard } from '../engine/engine.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  try {
    const board = await buildBoard({ hours: 50 });
    // CDN keeps a fresh copy for 60 s and serves the last good one while it refreshes
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    res.status(200).json(board);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
}
