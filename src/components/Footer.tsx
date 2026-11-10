import { Mark } from './Mark';
import { X_URL, buyUrl } from '../config';

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="f-top">
          <div className="f-brand">
            <span className="wordmark">
              <Mark />
              DAYONE
            </span>
            <p>Buys every new launchpad on day one.</p>
          </div>
          <nav className="f-cols" aria-label="Footer">
            <div>
              <span className="f-h">Product</span>
              <a href="#board">Board</a>
              <a href="#scoreboard">Scoreboard</a>
              <a href="#wallet">Engine wallet</a>
              <a href={buyUrl} target="_blank" rel="noreferrer">
                Buy $DAYONE
              </a>
            </div>
            <div>
              <span className="f-h">Learn</span>
              <a href="#docs-what">What it does</a>
              <a href="#docs-find">Finding a pad</a>
              <a href="#docs-rules">The rules</a>
              <a href="#docs-data">Data sources</a>
            </div>
            <div>
              <span className="f-h">Legal</span>
              <a href="#docs-risk">Risk</a>
              <a href="#docs-risk">Not financial advice</a>
              <a href={X_URL} target="_blank" rel="noreferrer">
                X
              </a>
            </div>
          </nav>
        </div>
        <p className="f-risk">
          The strategy can lose money. Nothing on this site is financial advice. Positions are paper until auto-buys ship.
        </p>
      </div>
    </footer>
  );
}
