/**
 * The mark is a 2×2 tile layout with grout seams and one glazed cell —
 * the smallest thing that reads as "tiles" without being a literal icon
 * of a tile. The filled cell is the one being tracked.
 */
export default function LogoMark({ size = 22 }: { size?: number }) {
  const gap = size * 0.09;
  const cell = (size - gap) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* three unglazed tiles */}
      <rect x="0" y="0" width={cell} height={cell} rx={size * 0.06} fill="currentColor" opacity=".22" />
      <rect x={cell + gap} y="0" width={cell} height={cell} rx={size * 0.06} fill="currentColor" opacity=".22" />
      <rect x="0" y={cell + gap} width={cell} height={cell} rx={size * 0.06} fill="currentColor" opacity=".22" />
      {/* the tracked one */}
      <rect x={cell + gap} y={cell + gap} width={cell} height={cell} rx={size * 0.06} fill="currentColor" />
    </svg>
  );
}
