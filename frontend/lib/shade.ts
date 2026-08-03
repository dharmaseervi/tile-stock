// Deterministically derives a swatch color from a lot/batch string, so the
// same lot number always renders the same color — a lightweight visual
// stand-in for tracking actual tile shade variation between production lots.
export function shadeColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 38%, 62%)`;
}
