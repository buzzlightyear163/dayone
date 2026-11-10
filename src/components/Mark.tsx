import type { ReactElement } from 'react';
// The DAYONE pixel "1" with its live dot — same drawing as the X profile picture.
const ONE = ['..#..', '.##..', '###..', '..#..', '..#..', '..#..', '#####'];

export function Mark({ cell = 3 }: { cell?: number }) {
  const rects: ReactElement[] = [];
  ONE.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== '#') return;
      const top = y === 0 || ONE[y - 1][x] !== '#';
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={top ? '#D9F0FF' : '#9FD8FF'} />);
    }),
  );
  return (
    <span className="mark-box" aria-hidden>
    <svg className="mark-px" width={8 * cell} height={7 * cell} viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
      {rects}
      <rect x={7} y={0} width={1} height={1} fill="#79E2CF" />
    </svg>
    </span>
  );
}
