import { Board } from './components/Board';
import { useBoard, useNow } from './lib/useBoard';
import { buyUrl } from './config';

function Wordmark() {
  return (
    <a className="wordmark" href="#top" aria-label="DAYONE home">
      <span className="mark mono" aria-hidden>
        D1
      </span>
      DAYONE
    </a>
  );
}

export default function App() {
  const { board, source } = useBoard();
  const now = useNow(1000);
  const live = source === 'live' || source === 'loading';

  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <Wordmark />
          <nav className="links" aria-label="Main">
            <a href="#board" className="on">
              Board
            </a>
            <a href="#scoreboard">Scoreboard</a>
            <a href="#wallet">Wallet</a>
            <a href="#docs">Docs</a>
          </nav>
          <a className="btn primary" href={buyUrl} target="_blank" rel="noreferrer">
            Buy $DAYONE
          </a>
        </div>
      </header>

      <main className="wrap" id="top">
        <section className="intro">
          <h1>Buys every new launchpad on day one.</h1>
          <p className="lede">
            DAYONE watches Raydium LaunchLab for new launchpads, buys each pad's own token in its first hour and sells
            on day two. Profits buy back $DAYONE.
          </p>
          <span className={`status ${live ? 'is-live' : ''}`}>
            <i className="dot" />
            {live ? 'Engine live · watching LaunchLab' : 'Engine paused · showing last snapshot'}
          </span>
        </section>

        <Board board={board} source={source} now={now} />
      </main>
    </>
  );
}
