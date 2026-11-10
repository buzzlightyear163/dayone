import { useState } from 'react';

// Vercel's image service first (small, cached), then the original file, then a letter.
const sources = (url: string, size: number) =>
  url ? [`/_vercel/image?url=${encodeURIComponent(url)}&w=${size * 2 > 64 ? 128 : 64}&q=75`, url] : [];

export function Logo({ src, alt, size = 28 }: { src: string; alt: string; size?: number }) {
  const [step, setStep] = useState(0);
  const list = sources(src, size);
  const letter = (alt.replace(/[^a-z0-9]/gi, '')[0] || '?').toUpperCase();
  if (step >= list.length) {
    return (
      <span className="logo logo-fallback" style={{ width: size, height: size }} aria-hidden>
        {letter}
      </span>
    );
  }
  return (
    <img
      className="logo"
      src={list[step]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setStep((s) => s + 1)}
    />
  );
}
