import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tile-stock-orcin.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The app itself is behind login — no value in crawling it, and
      // price-list pages belong to individual dealers to share, not to index.
      disallow: [
        "/dashboard",
        "/products",
        "/orders",
        "/customers",
        "/analytics",
        "/reorder",
        "/activity",
        "/settings",
        "/stock",
        "/price-list",
        "/accept-invite",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
