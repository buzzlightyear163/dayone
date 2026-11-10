import { Mark } from './components/Mark';
import { Board } from './components/Board';
import { Docs } from './components/Docs';
import { Footer } from './components/Footer';
import { Intro } from './components/Intro';
import { Receipt } from './components/Receipt';
import { Rules } from './components/Rules';
import { Scoreboard } from './components/Scoreboard';
import { Stats } from './components/Stats';
import { Wallet } from './components/Wallet';
import { useBoard, useNow, useScoreboard } from './lib/useBoard';
import { buyUrl } from './config';

function Wordmark() {
  return (
    <a className="wordmark" href="#top" aria-label="DAYONE home">
      <Mark />
      DAYONE
    </a>
  );
}

export default function App() {
  const { board, source } = useBoard();
  const score = useScoreboard();
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

        <Stats board={board} />

        <Scoreboard data={score} board={board} now={now} />

        <section className="section" id="engine">
          <div className="section-head">
            <div>
              <h2>Every trade, line by line</h2>
              <p className="section-lede">The last closed trade, and the rules every new pad has to pass first.</p>
            </div>
          </div>
          <div className="two">
            <Receipt board={board} now={now} />
            <Rules board={board} />
          </div>
        </section>

        <Wallet />

        <Docs board={board} />
      </main>

      <Footer />

      <Intro board={board} source={source} now={now} />
    </>
  );
}
