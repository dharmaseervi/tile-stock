"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, AlertTriangle, Package, Plus, IndianRupee, Download } from "lucide-react";
import Link from "next/link";
import { api, isLoggedIn } from "@/lib/api";import Nav from "@/components/Nav";

type StockRow = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  reorder_level: number;
  price_per_box: number;
  boxes_in_stock: number;
  stock_value: number;
};

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-white rounded-lg grout-border p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: `${accent}1A` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <div className="font-[family-name:var(--font-mono)] text-lg leading-none" style={{ color: "var(--color-ink)" }}>
          {value}
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>{label}</div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden grout-border">
      <div className="animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4" style={{ borderTop: i ? "1px solid var(--color-grout)" : "none" }}>
            <div className="h-3 rounded w-24" style={{ background: "var(--color-grout)" }} />
            <div className="h-3 rounded w-32" style={{ background: "var(--color-grout)" }} />
            <div className="h-3 rounded w-16" style={{ background: "var(--color-grout)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const totalBoxes = stock.reduce((sum, p) => sum + p.boxes_in_stock, 0);
  const totalValue = stock.reduce((sum, p) => sum + (p.stock_value || 0), 0);
  const formattedValue = totalValue >= 100000
    ? `₹${(totalValue / 100000).toFixed(2)}L`
    : `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
            Dashboard
          </h1>
          {!loading && stock.length > 0 && (
            <button
              onClick={() => api.downloadStockPDF()}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md grout-border"
              style={{ color: "var(--color-glaze-deep)" }}
            >
              <Download size={14} /> Stock Report
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg grout-border p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Package} label="Products tracked" value={stock.length} accent="var(--color-glaze)" />
            <StatCard icon={Boxes} label="Total boxes in stock" value={totalBoxes} accent="var(--color-moss)" />
            <StatCard icon={IndianRupee} label="Stock value" value={formattedValue} accent="var(--color-glaze-deep)" />
            <StatCard icon={AlertTriangle} label="Low stock alerts" value={lowStock.length} accent="var(--color-ochre)" />
          </div>
        )}

        {!loading && lowStock.length > 0 && (
          <div
            className="rounded-lg p-4 border"
            style={{ background: "var(--color-ochre-tint)", borderColor: "var(--color-ochre)" }}
          >
            <h2 className="font-medium mb-2 text-sm flex items-center gap-1.5" style={{ color: "var(--color-ochre)" }}>
              <AlertTriangle size={15} />
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

          {loading ? (
            <TableSkeleton />
          ) : stock.length === 0 ? (
            <div className="bg-white rounded-lg grout-border p-10 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--color-kiln-dim)" }}>
                <Package size={22} style={{ color: "var(--color-ink-soft)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>No products yet</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                  Add your first tile design to start tracking stock.
                </p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-sm text-white px-4 py-2 rounded-md font-medium mt-1"
                style={{ background: "var(--color-glaze)" }}
              >
                <Plus size={15} />
                Add Product
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden grout-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium">Brand</th>
                    <th className="px-4 py-2.5 font-medium">Series</th>
                    <th className="px-4 py-2.5 font-medium">Size</th>
                    <th className="px-4 py-2.5 font-medium">Finish</th>
                    <th className="px-4 py-2.5 font-medium text-right">Boxes in stock</th>
                    <th className="px-4 py-2.5 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="grout-divide">
                  {stock.map((p) => {
                    const low = p.boxes_in_stock <= p.reorder_level;
                    return (
                      <tr key={p.product_id} className="hover:bg-[var(--color-kiln-dim)] transition-colors">
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
                        <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink-soft)" }}>
                          {p.stock_value > 0 ? `₹${p.stock_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
