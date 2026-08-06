"use client"
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, ScanLine, Boxes, AlertTriangle, Minus } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import ProductPicker, { PickerProduct } from "@/components/ProductPicker";
import QrScanner from "@/components/QrScanner";
import Nav from "@/components/Nav";

type Product = PickerProduct & { price_per_box: number };
type Customer = { id: string; name: string; phone: string | null };

type LineItem = {
  product_id: string;
  boxes: string;
  price_per_box: string;
  notes: string;
  /** Live stock at the time it was added — flags over-selling before dispatch. */
  in_stock?: number;
};

const inputClass = "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 w-full";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const [customerId, setCustomerId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login?next=%2Forders%2Fnew"); return; }
    Promise.all([api.listProducts(), api.listCustomers(), api.currentStock()])
      .then(([p, c, stock]) => {
        setProducts(p ?? []);
        setCustomers(c ?? []);
        const m: Record<string, number> = {};
        (stock ?? []).forEach((s: any) => { m[s.product_id] = s.boxes_in_stock; });
        setStockMap(m);
      });
  }, [router]);

  function addRow(productId = "") {
    const p = products.find((x) => x.id === productId);
    setItems((prev) => [...prev, {
      product_id: productId,
      boxes: "",
      price_per_box: p?.price_per_box ? String(p.price_per_box) : "",
      notes: "",
      in_stock: productId ? stockMap[productId] : undefined,
    }]);
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, key: keyof LineItem, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      if (key === "product_id") {
        const p = products.find((x) => x.id === value);
        if (p?.price_per_box) next[i].price_per_box = String(p.price_per_box);
        next[i].in_stock = stockMap[value];
      }
      return next;
    });
  }

  /** A scanned tile joins the challan directly; scanning it twice bumps the count. */
  const handleScan = useCallback((productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      setScanMsg("That code isn't a tile in your catalogue.");
      return;
    }
    setItems((prev) => {
      const at = prev.findIndex((it) => it.product_id === productId);
      if (at >= 0) {
        const next = [...prev];
        next[at] = { ...next[at], boxes: String((parseFloat(next[at].boxes) || 0) + 1) };
        return next;
      }
      return [...prev, {
        product_id: productId,
        boxes: "1",
        price_per_box: p.price_per_box ? String(p.price_per_box) : "",
        notes: "",
        in_stock: stockMap[productId],
      }];
    });
    setScanMsg(`Added ${p.brand} — ${p.series_name}`);
    setTimeout(() => setScanMsg(""), 2200);
  }, [products, stockMap]);

  const totalBoxes = items.reduce((s, i) => s + (parseFloat(i.boxes) || 0), 0);
  const totalValue = items.reduce((s, i) => s + (parseFloat(i.boxes) || 0) * (parseFloat(i.price_per_box) || 0), 0);
  const chosenIds = items.map((i) => i.product_id).filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valid = items.filter((i) => i.product_id && parseFloat(i.boxes) > 0);
    if (valid.length === 0) {
      setError("Add at least one tile with a box quantity.");
      return;
    }
    setLoading(true);
    try {
      const { id } = await api.createOrder({
        customer_id: customerId || undefined,
        delivery_address: deliveryAddress,
        notes,
        items: valid.map((i) => ({
          product_id: i.product_id,
          boxes: parseFloat(i.boxes),
          price_per_box: parseFloat(i.price_per_box) || 0,
          notes: i.notes,
        })),
      });
      router.push(`/orders/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-10">
        <button onClick={() => router.back()} className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-ink-soft)" }}>
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
          New Delivery Challan
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}

          {/* Customer */}
          <div className="bg-white rounded-lg grout-border p-4 space-y-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>Customer</h2>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Select customer (optional)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>
              ))}
            </select>
            <input placeholder="Delivery address" value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)} className={inputClass} style={inputStyle} />
            <input placeholder="Notes (optional)" value={notes}
              onChange={(e) => setNotes(e.target.value)} className={inputClass} style={inputStyle} />
          </div>

          {/* Tiles */}
          <div className="bg-white rounded-lg grout-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>
                Tiles {items.length > 0 && `(${items.length})`}
              </h2>
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
              <div className="space-y-2">
                <QrScanner
                  onHit={handleScan}
                  onClose={() => setScanning(false)}
                  hint="Point at each tile's QR label to add it"
                />
                {scanMsg && (
                  <p className="text-xs text-center" style={{ color: "var(--color-moss)" }}>{scanMsg}</p>
                )}
              </div>
            )}

            {items.length === 0 && !scanning && (
              <p className="text-sm py-4 text-center" style={{ color: "var(--color-ink-soft)" }}>
                Scan the tiles the customer picked, or add them by name below.
              </p>
            )}

            {items.map((item, i) => {
              const p = products.find((x) => x.id === item.product_id);
              const qty = parseFloat(item.boxes) || 0;
              const short = item.in_stock !== undefined && qty > item.in_stock;
              return (
                <div key={i} className="space-y-2 pb-3"
                  style={{ borderBottom: i < items.length - 1 ? "1px solid var(--color-grout)" : "none" }}>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      <ProductPicker
                        products={products}
                        value={item.product_id}
                        onChange={(id) => updateRow(i, "product_id", id)}
                        disabledIds={chosenIds.filter((id) => id !== item.product_id)}
                      />
                    </div>
                    <button type="button" onClick={() => removeRow(i)} className="p-2 shrink-0" style={{ color: "var(--color-oxide)" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Live stock for the chosen tile */}
                  {p && item.in_stock !== undefined && (
                    <p className="text-xs flex items-center gap-1.5"
                      style={{ color: short ? "var(--color-oxide)" : "var(--color-ink-soft)" }}>
                      {short ? <AlertTriangle size={11} /> : <Boxes size={11} />}
                      {short
                        ? `Only ${item.in_stock} boxes in stock — this challan asks for ${qty}`
                        : `${item.in_stock} boxes in stock`}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {/* Stepper — scanned rows land at 1 box and get bumped by hand */}
                    <div className="flex items-center rounded-md overflow-hidden shrink-0" style={{ border: "1px solid var(--color-grout)" }}>
                      <button type="button"
                        onClick={() => updateRow(i, "boxes", String(Math.max(0, qty - 1)))}
                        className="px-2.5 py-2 hover:bg-[var(--color-kiln-dim)]" style={{ color: "var(--color-ink-soft)" }}>
                        <Minus size={12} />
                      </button>
                      <input
                        type="number" step="0.01" min="0.01" required inputMode="decimal"
                        placeholder="Boxes" value={item.boxes}
                        onChange={(e) => updateRow(i, "boxes", e.target.value)}
                        className="w-16 text-center text-sm py-2 outline-none font-[family-name:var(--font-mono)]"
                      />
                      <button type="button"
                        onClick={() => updateRow(i, "boxes", String(qty + 1))}
                        className="px-2.5 py-2 hover:bg-[var(--color-kiln-dim)]" style={{ color: "var(--color-ink-soft)" }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <input
                      type="number" step="0.01" min="0" placeholder="₹ per box"
                      value={item.price_per_box}
                      onChange={(e) => updateRow(i, "price_per_box", e.target.value)}
                      className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
                      style={inputStyle}
                    />
                  </div>

                  <input
                    placeholder="Design no. / note for this tile"
                    value={item.notes}
                    onChange={(e) => updateRow(i, "notes", e.target.value)}
                    className={inputClass} style={inputStyle}
                  />
                </div>
              );
            })}

            <button
              type="button" onClick={() => addRow()}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md"
              style={{ color: "var(--color-glaze)", background: "var(--color-glaze-tint)" }}
            >
              <Plus size={14} /> Add tile by name
            </button>
          </div>

          {items.length > 0 && (
            <div className="bg-white rounded-lg grout-border px-4 py-3 flex items-center justify-between text-sm">
              <span style={{ color: "var(--color-ink-soft)" }}>{totalBoxes} boxes</span>
              <span className="font-[family-name:var(--font-mono)] font-medium" style={{ color: "var(--color-ink)" }}>
                ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full text-white rounded-md py-3 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--color-glaze)" }}
          >
            {loading ? "Creating…" : "Create Challan"}
          </button>
        </form>
      </main>
    </div>
  );
}