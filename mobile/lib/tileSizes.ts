/** Nominal sq.ft per piece for the tile sizes common in Indian retail. */
export const TILE_SIZES = [
  { label: "200 × 200", value: "200x200", sqftPerPiece: 0.43 },
  { label: "300 × 300", value: "300x300", sqftPerPiece: 0.97 },
  { label: "300 × 450", value: "300x450", sqftPerPiece: 1.45 },
  { label: "300 × 600", value: "300x600", sqftPerPiece: 1.94 },
  { label: "600 × 600", value: "600x600", sqftPerPiece: 3.88 },
  { label: "600 × 1200", value: "600x1200", sqftPerPiece: 7.75 },
  { label: "800 × 800", value: "800x800", sqftPerPiece: 6.89 },
  { label: "800 × 1600", value: "800x1600", sqftPerPiece: 13.78 },
  { label: "1200 × 1200", value: "1200x1200", sqftPerPiece: 15.5 },
];

export function calcSqftPerBox(sizeValue: string, piecesPerBox: number) {
  const s = TILE_SIZES.find((t) => t.value === sizeValue);
  if (!s || !piecesPerBox) return "";
  return (s.sqftPerPiece * piecesPerBox).toFixed(2);
}