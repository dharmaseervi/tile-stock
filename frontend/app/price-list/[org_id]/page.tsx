"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ImageOff, Search } from "lucide-react";
import { api } from "@/lib/api";

type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  sqft_per_box: number | null;
  price_per_box: number;
  image_url: string | null;
  in_stock: number;
};

export default function PublicPriceListPage() {
  const { org_id } = useParams<{ org_id: string }>();
  const [org, setOrg] = useState<{ name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getPublicPriceList(org_id).then((data) => {
      setOrg(data.org);
      setProducts(data.products ?? []);
    }).finally(() => setLoading(false));
  }, [org_id]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return !q ||
      p.brand.toLowerCase().includes(q) ||
      p.series_name.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      (p.finish || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-kiln)" }}>
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <div className="bg-white border-b sticky top-0 z-10" style={{ borderColor: "var(--color-grout)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="font-[family-name:var(--font-display)] text-lg italic" style={{ color: "var(--color-glaze-deep)" }}>
            {org?.name || "Price List"}
          </h1>
        </div>
      </div>

      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }} />
          <input
            type="text"
            placeholder="Search tiles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md pl-9 pr-3 py-2 text-sm outline-none grout-border"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-lg grout-border overflow-hidden flex">
              {p.image_url ? (
                <img src={p.image_url} alt={p.series_name} className="w-20 h-20 object-cover shrink-0" />
              ) : (
                <div className="w-20 h-20 flex items-center justify-center shrink-0" style={{ background: "var(--color-kiln-dim)" }}>
                  <ImageOff size={16} style={{ color: "var(--color-ink-soft)" }} />
                </div>
              )}
              <div className="p-3 flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>
                  {p.brand} — {p.series_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                  {p.size}{p.finish ? ` · ${p.finish}` : ""}
                  {p.sqft_per_box ? ` · ${p.sqft_per_box} sq.ft/box` : ""}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium font-[family-name:var(--font-mono)]" style={{ color: "var(--color-glaze-deep)" }}>
                    ₹{p.price_per_box.toFixed(2)}/box
                  </span>
                  <span className="text-xs" style={{ color: p.in_stock > 0 ? "var(--color-moss)" : "var(--color-oxide)" }}>
                    {p.in_stock > 0 ? "In stock" : "Out of stock"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: "var(--color-ink-soft)" }}>No products found.</p>
        )}

        <p className="text-xs text-center pt-4" style={{ color: "var(--color-ink-soft)" }}>
          Powered by Tiles Stock Manager
        </p>
      </main>
    </div>
  );
}
