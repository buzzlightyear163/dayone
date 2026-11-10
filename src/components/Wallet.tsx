import { useEffect, useState } from 'react';
import { ENGINE_WALLET } from '../config';
import { solscanAccount } from '../lib/format';

async function balance(addr: string): Promise<number | null> {
  try {
    const r = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [addr] }),
    });
    const j = await r.json();
    return typeof j?.result?.value === 'number' ? j.result.value / 1e9 : null;
  } catch {
    return null;
  }
}

export function Wallet() {
  const [bal, setBal] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const has = ENGINE_WALLET.length > 30;

  useEffect(() => {
    if (!has) return;
    let alive = true;
    const load = () => balance(ENGINE_WALLET).then((b) => alive && setBal(b));
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [has]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ENGINE_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section className="section" id="wallet">
      <div className="section-head">
        <div>
          <h2>Engine wallet</h2>
          <p className="section-lede">One public wallet. Fees from $DAYONE fill it, every buy and sell leaves from it, and profits buy back $DAYONE.</p>
        </div>
      </div>
      <div className="panel wallet">
        <div className="w-addr">
          <span className="w-k">Address</span>
          <span className={`w-v mono ${has ? '' : 'dim'}`}>{has ? ENGINE_WALLET : 'Published at launch'}</span>
          <div className="w-actions">
            <button className="btn" onClick={copy} disabled={!has}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              className={`btn ${has ? '' : 'is-off'}`}
              href={has ? solscanAccount(ENGINE_WALLET) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!has}
            >
              Solscan ↗
            </a>
          </div>
        </div>
        <div className="w-grid">
          <div>
            <span className="w-k">Balance</span>
            <span className="w-big mono">{has ? (bal === null ? '…' : `${bal.toFixed(2)} SOL`) : '—'}</span>
          </div>
          <div>
            <span className="w-k">Live trades</span>
            <span className="w-big mono">0</span>
          </div>
          <div>
            <span className="w-k">Mode</span>
            <span className="w-big mono">Paper</span>
          </div>
          <div>
            <span className="w-k">Auto-buys</span>
            <span className="w-big mono">v1</span>
          </div>
        </div>
      </div>
    </section>
  );
}
