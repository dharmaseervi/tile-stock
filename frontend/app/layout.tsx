import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tile-stock-orcin.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tiles Stock — stock management for tile dealers",
    template: "%s · Tiles Stock",
  },
  description:
    "Track every box by design, size, and shade lot. Catch fast movers before they hit zero, and hand your loaders a delivery challan they can tick off. Built for Indian tile dealers.",
  keywords: [
    "tile stock management",
    "tile dealer software",
    "tiles inventory software India",
    "shade lot tracking",
    "delivery challan software",
    "godown stock management",
  ],
  openGraph: {
    type: "website",
    siteName: "Tiles Stock",
    title: "Know what's on the godown floor without walking it.",
    description:
      "Stock management for tile dealers — by design, size, and shade lot. QR labels, loading challans, and reorder alerts.",
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiles Stock — stock management for tile dealers",
    description:
      "Track every box by design, size, and shade lot. QR labels, loading challans, and reorder alerts.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
