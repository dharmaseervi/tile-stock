/**
 * Ledger palette. Tailwind classes cover most cases; these exports are for
 * places where a class can't reach — SVG strokes, conditional colours,
 * navigator options, and RefreshControl tints.
 */
export const C = {
  bg: "#191713",
  field: "#211E19",
  band: "#141210",

  ink: "#F3EFE7",
  inkHi: "#F7F3EB",
  ink2: "#B5AC9E",
  ink3: "#9E968A",
  ink4: "#8F877A",
  inkOut: "#B8AFA3",
  inkSoft: "#D9D3C8",

  accent: "#2FB8AE",
  onAccent: "#161410",
  amber: "#E8A33D",
  amberTxt: "#EFC489",
  red: "#E0533F",

  rule: "rgba(255,255,255,0.09)",
  hairline: "rgba(255,255,255,0.05)",
  ghost: "rgba(255,255,255,0.16)",
  link: "rgba(255,255,255,0.18)",
  raised: "rgba(255,255,255,0.035)",
  amberWash: "rgba(232,163,61,0.10)",
} as const;

/** Tailwind has no fontVariant utility — figures need this inline. */
export const TNUM = { fontVariant: ["tabular-nums" as const] };

export const money = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export const shortMoney = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : money(n);