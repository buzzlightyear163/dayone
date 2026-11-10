import { buildScoreboard } from '../engine/engine.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  try {
    const sb = await buildScoreboard();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).json(sb);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
}
