import { useState } from 'react';
import { img } from '../lib/format';

export function Logo({ src, alt, size = 28 }: { src: string; alt: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const letter = (alt.replace(/[^a-z0-9]/gi, '')[0] || '?').toUpperCase();
  if (!src || broken) {
    return (
      <span className="logo logo-fallback" style={{ width: size, height: size }} aria-hidden>
        {letter}
      </span>
    );
  }
  return (
    <img
      className="logo"
      src={img(src, size * 2)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
