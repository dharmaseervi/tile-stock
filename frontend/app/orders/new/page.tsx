"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type Product = { id: string; brand: string; series_name: string; size: string; finish: string | null; price_per_box: number };
type Customer = { id: string; name: string; phone: string | null };

type LineItem = {
  product_id: string;
  boxes: string;
  price_per_box: string;
  notes: string;
};

const inputClass = "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 w-full";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { product_id: "", boxes: "", price_per_box: "", notes: "" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    Promise.all([api.listProducts(), api.listCustomers()]).then(([p, c]) => {
      setProducts(p ?? []);
      setCustomers(c ?? []);
    });
  }, [router]);

  function addItem() {
    setItems([...items, { product_id: "", boxes: "", price_per_box: "", notes: "" }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, key: keyof LineItem, value: string) {
    const updated = [...items];
    updated[i] = { ...updated[i], [key]: value };
    // Auto-fill price when product is selected
    if (key === "product_id") {
      const p = products.find((p) => p.id === value);
      if (p && p.price_per_box > 0) updated[i].price_per_box = String(p.price_per_box);
    }
    setItems(updated);
  }

  function productLabel(p: Product) {
    return `${p.brand} — ${p.series_name} (${p.size}${p.finish ? `, ${p.finish}` : ""})`;
  }

  const totalBoxes = items.reduce((s, i) => s + (parseFloat(i.boxes) || 0), 0);
  const totalValue = items.reduce((s, i) => s + (parseFloat(i.boxes) || 0) * (parseFloat(i.price_per_box) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validItems = items.filter((i) => i.product_id && parseFloat(i.boxes) > 0);
    if (validItems.length === 0) {
      setError("Add at least one item with a product and box quantity.");
      return;
    }
    setLoading(true);
    try {
      const { id } = await api.createOrder({
        customer_id: customerId || undefined,
        delivery_address: deliveryAddress,
        notes,
        items: validItems.map((i) => ({
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

          <div className="bg-white rounded-lg grout-border p-4 space-y-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>Customer Details</h2>
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

          <div className="bg-white rounded-lg grout-border p-4 space-y-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>Line Items</h2>
            {items.map((item, i) => (
              <div key={i} className="space-y-2 pb-3" style={{ borderBottom: i < items.length - 1 ? "1px solid var(--color-grout)" : "none" }}>
                <div className="flex gap-2 items-start">
                  <select
                    required
                    value={item.product_id}
                    onChange={(e) => updateItem(i, "product_id", e.target.value)}
                    className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
                    style={inputStyle}
                  >
                    <option value="" disabled>Select tile</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{productLabel(p)}</option>
                    ))}
                  </select>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 shrink-0" style={{ color: "var(--color-oxide)" }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number" step="0.01" min="0.01" required
                    placeholder="Boxes"
                    value={item.boxes}
                    onChange={(e) => updateItem(i, "boxes", e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
                    style={inputStyle}
                  />
                  <input
                    type="number" step="0.01" min="0"
                    placeholder="₹ per box"
                    value={item.price_per_box}
                    onChange={(e) => updateItem(i, "price_per_box", e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
                    style={inputStyle}
                  />
                </div>
                <input
                  placeholder="Design no., notes for this item"
                  value={item.notes}
                  onChange={(e) => updateItem(i, "notes", e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 w-full"
                  style={inputStyle}
                />
              </div>
            ))}
            <button
              type="button" onClick={addItem}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md"
              style={{ color: "var(--color-glaze)", background: "var(--color-glaze-tint)" }}
            >
              <Plus size={14} /> Add another tile
            </button>
          </div>

          {(totalBoxes > 0 || totalValue > 0) && (
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
