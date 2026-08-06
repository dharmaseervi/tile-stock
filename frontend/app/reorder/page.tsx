"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, Plus, Minus, ShoppingCart,
  FileDown, CheckCircle2, X, ScanLine,
} from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";
import QrScanner from "@/components/QrScanner";

type Suggestion = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  boxes_in_stock: number;
  reorder_level: number;
  price_per_box: number;
  boxes_per_week: number;
  weeks_of_stock: number | null;
  suggested_reorder_qty: number;
};

type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  price_per_box: number;
};

type CartItem = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  boxes: number;
  price_per_box: number;
};

type Supplier = { id: string; name: string; phone: string | null };

const inputStyle = {
  borderColor: "var(--color-grout)",
  ["--tw-ring-color" as any]: "var(--color-glaze)",
};

export default function ReorderPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login?next=%2Freorder"); return; }
    // The full product list is needed too — a dealer may want to top up a
    // tile that hasn't dropped below its reorder level yet.
    Promise.all([api.reorderSuggestions(), api.listSuppliers(), api.listProducts()])
      .then(([s, sup, prods]) => {
        setSuggestions(s ?? []);
        setSuppliers(sup ?? []);
        setAllProducts(prods ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  function addToCart(s: Suggestion) {
    setCart((prev) => {
      if (prev.some((c) => c.product_id === s.product_id)) return prev;
      return [...prev, {
        product_id: s.product_id,
        brand: s.brand,
        series_name: s.series_name,
        size: s.size,
        finish: s.finish,
        boxes: s.suggested_reorder_qty > 0 ? s.suggested_reorder_qty : s.reorder_level,
        price_per_box: s.price_per_box,
      }];
    });
  }

  const handleScan = useCallback((productId: string) => {
    const s = suggestions.find((x) => x.product_id === productId);
    if (s) {
      addToCart(s);
      setScanMsg(`Added ${s.brand} — ${s.series_name}`);
      setTimeout(() => setScanMsg(""), 2200);
      return;
    }
    // Not below reorder level, so it isn't in suggestions — pull it from the
    // full catalogue instead so any tile can be topped up by scanning.
    const p = allProducts.find((x) => x.id === productId);
    if (!p) {
      setScanMsg("That code isn't a tile in your catalogue.");
      setTimeout(() => setScanMsg(""), 2200);
      return;
    }
    setCart((prev) => prev.some((c) => c.product_id === productId) ? prev : [...prev, {
      product_id: p.id,
      brand: p.brand,
      series_name: p.series_name,
      size: p.size,
      finish: p.finish,
      boxes: 1,
      price_per_box: p.price_per_box,
    }]);
    setScanMsg(`Added ${p.brand} — ${p.series_name}`);
    setTimeout(() => setScanMsg(""), 2200);
  }, [suggestions, allProducts]);

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  function updateBoxes(id: string, boxes: number) {
    setCart((prev) => prev.map((c) => c.product_id === id ? { ...c, boxes } : c));
  }

  function updatePrice(id: string, price: number) {
    setCart((prev) => prev.map((c) => c.product_id === id ? { ...c, price_per_box: price } : c));
  }

  const totalBoxes = cart.reduce((s, c) => s + c.boxes, 0);
  const totalValue = cart.reduce((s, c) => s + c.boxes * c.price_per_box, 0);
  const inCart = (id: string) => cart.some((c) => c.product_id === id);

  async function generatePO() {
    if (cart.length === 0) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
      const res = await fetch(`${apiUrl}/reorder/po-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          supplier_id: supplierId || undefined,
          notes,
          items: cart.map((c) => ({
            product_id: c.product_id,
            boxes: c.boxes,
            price_per_box: c.price_per_box,
          })),
        }),
      });
      if (!res.ok) throw new Error("Couldn't generate the purchase order.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-order-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Purchase order downloaded.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setSuccess(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-10">

        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
            Reorder
          </h1>
          {cart.length > 0 && (
            <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-glaze-deep)" }}>
              <ShoppingCart size={15} />
              {cart.length} item{cart.length > 1 ? "s" : ""} in order
            </span>
          )}
        </div>

        {/* ── Suggestions ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} style={{ color: "var(--color-ochre)" }} />
            <h2 className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Suggested — below reorder level
            </h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--color-grout)" }} />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white rounded-xl grout-border p-5 flex items-center gap-3">
              <CheckCircle2 size={18} style={{ color: "var(--color-moss)" }} />
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                All tiles are above reorder level — nothing urgent.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl grout-border overflow-hidden">
              <div className="grout-divide">
                {suggestions.map((s) => {
                  const urgent = s.weeks_of_stock !== null && s.weeks_of_stock <= 1;
                  const added = inCart(s.product_id);
                  return (
                    <div key={s.product_id} className="px-4 py-3 flex items-center gap-3">
                      <Clock size={13} className="shrink-0"
                        style={{ color: urgent ? "var(--color-oxide)" : "var(--color-ochre)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>
                          {s.brand} — {s.series_name}
                          <span className="font-normal ml-1" style={{ color: "var(--color-ink-soft)" }}>
                            ({s.size}{s.finish ? `, ${s.finish}` : ""})
                          </span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                          {s.boxes_in_stock} in stock
                          {s.boxes_per_week > 0 && ` · ${s.boxes_per_week.toFixed(1)} bx/wk`}
                          {s.weeks_of_stock !== null && (
                            <span style={{ color: urgent ? "var(--color-oxide)" : "var(--color-ochre)", fontWeight: 500 }}>
                              {" · "}~{s.weeks_of_stock}w left
                            </span>
                          )}
                          {s.suggested_reorder_qty > 0 && (
                            <span style={{ color: "var(--color-glaze)" }}>
                              {" · "}suggest {s.suggested_reorder_qty} boxes
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => added ? removeFromCart(s.product_id) : addToCart(s)}
                        className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={added
                          ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)" }
                          : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                      >
                        {added ? "✓ Added" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Purchase order cart ──────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={14} style={{ color: "var(--color-glaze)" }} />
              <h2 className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                Purchase Order
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setScanning((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors"
              style={scanning
                ? { background: "var(--color-ink-soft)", color: "#fff" }
                : { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)" }}
            >
              <ScanLine size={13} />
              {scanning ? "Stop scanning" : "Scan tiles"}
            </button>
          </div>

          {scanning && (
            <div className="mb-3 space-y-2">
              <QrScanner
                onHit={handleScan}
                onClose={() => setScanning(false)}
                seenIds={cart.map((c) => c.product_id)}
                hint="Scan tiles to add to this purchase order"
              />
              {scanMsg && (
                <p className="text-xs text-center" style={{ color: "var(--color-moss)" }}>{scanMsg}</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl grout-border overflow-hidden">
            {cart.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <ShoppingCart size={22} className="mx-auto mb-2" style={{ color: "var(--color-grout-strong)" }} />
                <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  Add tiles from the suggestions above, or scan them off the wall.
                </p>
              </div>
            ) : (
              <>
                <div className="grout-divide">
                  {cart.map((item) => (
                    <div key={item.product_id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                            {item.brand} — {item.series_name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                            {item.size}{item.finish ? ` · ${item.finish}` : ""}
                          </p>
                        </div>
                        <button onClick={() => removeFromCart(item.product_id)} className="p-1 shrink-0" style={{ color: "var(--color-oxide)" }}>
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center rounded-md overflow-hidden grout-border">
                          <button onClick={() => updateBoxes(item.product_id, Math.max(1, item.boxes - 1))}
                            className="px-2 py-1.5 hover:bg-[var(--color-kiln-dim)] transition-colors"
                            style={{ color: "var(--color-ink-soft)" }}>
                            <Minus size={12} />
                          </button>
                          <input
                            type="number" min={1} value={item.boxes} inputMode="decimal"
                            onChange={(e) => updateBoxes(item.product_id, parseFloat(e.target.value) || 1)}
                            className="w-12 text-center text-sm py-1.5 outline-none font-[family-name:var(--font-mono)]"
                            style={{ color: "var(--color-ink)" }}
                          />
                          <span className="text-xs px-1" style={{ color: "var(--color-ink-soft)" }}>bx</span>
                          <button onClick={() => updateBoxes(item.product_id, item.boxes + 1)}
                            className="px-2 py-1.5 hover:bg-[var(--color-kiln-dim)] transition-colors"
                            style={{ color: "var(--color-ink-soft)" }}>
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 rounded-md grout-border px-2 py-1.5" style={{ minWidth: "120px" }}>
                          <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>₹</span>
                          <input
                            type="number" step="0.01" min={0} placeholder="Cost/box"
                            value={item.price_per_box || ""}
                            onChange={(e) => updatePrice(item.product_id, parseFloat(e.target.value) || 0)}
                            className="w-full text-sm outline-none font-[family-name:var(--font-mono)]"
                            style={{ color: "var(--color-ink)" }}
                          />
                        </div>

                        {item.price_per_box > 0 && (
                          <span className="text-sm font-medium font-[family-name:var(--font-mono)]" style={{ color: "var(--color-glaze-deep)" }}>
                            = ₹{(item.boxes * item.price_per_box).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 flex items-center justify-between border-t"
                  style={{ borderColor: "var(--color-grout)", background: "var(--color-kiln-dim)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                    {totalBoxes} boxes total
                  </span>
                  {totalValue > 0 && (
                    <span className="font-[family-name:var(--font-mono)] font-medium" style={{ color: "var(--color-ink)" }}>
                      ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="px-4 py-4 space-y-3 border-t" style={{ borderColor: "var(--color-grout)" }}>
              {suppliers.length > 0 && (
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
                  style={inputStyle}>
                  <option value="">Select supplier (optional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.phone ? ` — ${s.phone}` : ""}</option>
                  ))}
                </select>
              )}
              <input
                placeholder="Notes / remarks (optional)" value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
                style={inputStyle}
              />
              {success && (
                <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-moss)" }}>
                  <CheckCircle2 size={13} /> {success}
                </p>
              )}
              <button
                onClick={generatePO}
                disabled={cart.length === 0 || generating}
                className="w-full text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
                style={{ background: "var(--color-glaze)" }}
              >
                <FileDown size={15} />
                {generating ? "Generating…" : "Download Purchase Order PDF"}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}