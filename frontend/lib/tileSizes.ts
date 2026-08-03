// Common tile sizes sold in the Indian market, with sq.ft per piece using
// standard TRADE (nominal) values — not a raw mm-to-feet conversion.
// The industry rounds mm labels to clean foot/inch equivalents for pricing
// (e.g. 600mm is sold as a nominal 2ft, 1200mm as a nominal 4ft), so
// 600x1200mm is invoiced as 2 x 4 = 8 sq.ft, not the literal 7.75 sq.ft
// you'd get from 600/304.8 x 1200/304.8.
export const TILE_SIZES = [
  { label: "200 x 200 mm", sqftPerPiece: 0.44 },
  { label: "200 x 300 mm", sqftPerPiece: 0.67 },
  { label: "250 x 375 mm", sqftPerPiece: 1.04 },
  { label: "300 x 300 mm", sqftPerPiece: 1 },
  { label: "300 x 450 mm", sqftPerPiece: 1.5 },
  { label: "300 x 600 mm", sqftPerPiece: 2 },
  { label: "400 x 400 mm", sqftPerPiece: 1.78 },
  { label: "450 x 450 mm", sqftPerPiece: 2.25 },
  { label: "600 x 600 mm", sqftPerPiece: 4 },
  { label: "600 x 1200 mm", sqftPerPiece: 8 },
  { label: "800 x 800 mm", sqftPerPiece: 7.11 },
  { label: "1200 x 1200 mm", sqftPerPiece: 16 },
  { label: "Custom size", sqftPerPiece: null },
] as const;

// Converts a size label's trade sq.ft-per-piece into total sq.ft per box.
export function calcSqftPerBox(sqftPerPiece: number, piecesPerBox: number): number {
  return Math.round(sqftPerPiece * piecesPerBox * 100) / 100;
}

// Maps a stored "LxW" size string (e.g. "600x1200") back to its label,
// so the dropdown can re-select the right option when editing.
export function sizeStringToLabel(size: string): string | undefined {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return undefined;
  const label = `${match[1]} x ${match[2]} mm`;
  return TILE_SIZES.find((s) => s.label === label)?.label;
}
