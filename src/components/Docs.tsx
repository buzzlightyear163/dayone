import type { Board } from '../types';

export function Docs({ board }: { board: Board | null }) {
  const r = board?.rules;
  return (
    <section className="section" id="docs">
      <div className="section-head">
        <div>
          <h2>Docs</h2>
          <p className="section-lede">What the engine reads, how it decides, and what can go wrong.</p>
        </div>
      </div>

      <div className="docs panel">
        <article id="docs-what">
          <h3>What DAYONE does</h3>
          <p>
            DAYONE is a buy engine for Raydium LaunchLab. When a new launchpad releases its own token, DAYONE buys it in
            the first hour and sells on day two. Profits buy back $DAYONE. Every trade is public.
          </p>
        </article>

        <article id="docs-find">
          <h3>Finding a new pad</h3>
          <p>
            Every LaunchLab coin carries the platform config it launched from. A config the engine has not seen before is
            a new launchpad. Its own token is the coin whose website is the pad's domain and whose name or ticker is the
            pad's name. Domain alone is not enough: memes launched on a pad point at the pad's site too. If a pad
            relaunches its token, the engine follows the one the market traded.
          </p>
        </article>

        <article id="docs-rules">
          <h3>The rules</h3>
          <ul>
            <li>Buy only if the first hour shows at least {r?.minVol1hSol ?? 60} SOL of volume.</li>
            <li>At least {r?.minHolders ?? 40} wallets holding, so a dev trading with themselves doesn't count.</li>
            <li>The creator holds no more than {r?.maxDevPct ?? 5}% when the engine buys.</li>
            <li>
              Buy {r?.sizeSol ?? 2} SOL. Sell after {r?.sellAfterH ?? 24}h, or earlier at {r?.takeProfitX ?? 3}x. No
              stop-loss.
            </li>
            <li>Pads that miss a rule show as Skipped on the board, with the reason.</li>
          </ul>
        </article>

        <article id="docs-data">
          <h3>Where the numbers come from</h3>
          <ul>
            <li>New coins and platforms: Raydium LaunchLab API.</li>
            <li>First-hour volume, holders and dev share: every trade on the pad token's curve, replayed in order.</li>
            <li>After a token graduates: hourly closes from its Raydium pool (GeckoTerminal) and prices from DexScreener.</li>
            <li>The board refreshes every minute. The scoreboard every five.</li>
          </ul>
        </article>

        <article id="docs-risk" className="risk">
          <h3>Risk</h3>
          <p>
            The strategy can lose money. Nothing here is financial advice. Most new pads die in their first hour, and a pad
            that pumped on day one before can dump on the next. Until automatic buys ship in v1, positions on this site
            are paper trades replayed from real LaunchLab trades, not fills from the engine wallet.
          </p>
        </article>
      </div>
    </section>
  );
}
