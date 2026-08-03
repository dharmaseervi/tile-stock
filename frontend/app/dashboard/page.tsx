"use client";

import { useEffect, useState } from "react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";
import { useRouter } from "next/dist/client/components/navigation";

type StockRow = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  reorder_level: number;
  boxes_in_stock: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [stock, setStock] = useState<StockRow[]>([]);
  const [lowStock, setLowStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    Promise.all([api.currentStock(), api.lowStock()])
      .then(([current, low]) => {
        setStock(current ?? []);
        setLowStock(low ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="p-8" style={{ color: "var(--color-ink-soft)" }}>Loading…</div>;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-6 max-w-5xl mx-auto space-y-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
          Dashboard
        </h1>

        {lowStock.length > 0 && (
          <div
            className="rounded-lg p-4 border"
            style={{ background: "var(--color-ochre-tint)", borderColor: "var(--color-ochre)" }}
          >
            <h2 className="font-medium mb-2 text-sm" style={{ color: "var(--color-ochre)" }}>
              Low stock — {lowStock.length} product{lowStock.length > 1 ? "s" : ""} at or below reorder level
            </h2>
            <ul className="text-sm space-y-1" style={{ color: "var(--color-ink)" }}>
              {lowStock.map((p) => (
                <li key={p.product_id} className="flex items-baseline justify-between">
                  <span>
                    {p.brand} — {p.series_name} ({p.size}
                    {p.finish ? `, ${p.finish}` : ""})
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs">
                    {p.boxes_in_stock} / {p.reorder_level} boxes
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--color-ink-soft)" }}>
            Current Stock
          </h2>
          <div className="bg-white rounded-lg overflow-hidden grout-border">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium">Brand</th>
                  <th className="px-4 py-2.5 font-medium">Series</th>
                  <th className="px-4 py-2.5 font-medium">Size</th>
                  <th className="px-4 py-2.5 font-medium">Finish</th>
                  <th className="px-4 py-2.5 font-medium text-right">Boxes in stock</th>
                </tr>
              </thead>
              <tbody className="grout-divide">
                {stock.map((p) => {
                  const low = p.boxes_in_stock <= p.reorder_level;
                  return (
                    <tr key={p.product_id}>
                      <td className="px-4 py-2.5">{p.brand}</td>
                      <td className="px-4 py-2.5">{p.series_name}</td>
                      <td className="px-4 py-2.5">{p.size}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-ink-soft)" }}>
                        {p.finish || "—"}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]"
                        style={{ color: low ? "var(--color-ochre)" : "var(--color-ink)", fontWeight: low ? 600 : 400 }}
                      >
                        {p.boxes_in_stock}
                      </td>
                    </tr>
                  );
                })}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--color-ink-soft)" }}>
                      No products yet — add one to start tracking stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
