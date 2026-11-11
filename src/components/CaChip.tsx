import { useState } from 'react';
import { CA, buyUrl } from '../config';

export function CaChip() {
  const [copied, setCopied] = useState(false);
  if (!CA) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked: the address is selectable */
    }
  };
  return (
    <div className="ca-chip">
      <span className="ca-k mono">$DAYONE</span>
      <span className="ca-sep" />
      <span className="ca-k mono">CA</span>
      <span className="ca-v mono" title={CA}>
        {CA}
      </span>
      <button className="ca-btn" onClick={copy} aria-label="Copy contract address">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <a className="ca-btn buy" href={buyUrl} target="_blank" rel="noreferrer">
        Buy ↗
      </a>
    </div>
  );
}
