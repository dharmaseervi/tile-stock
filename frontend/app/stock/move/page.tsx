"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  AlertTriangle, CheckCircle2, Boxes,
} from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { shadeColor } from "@/lib/shade";
import Nav from "@/components/Nav";
import ProductPicker from "@/components/ProductPicker";

type Product = { id: string; brand: string; series_name: string; size: string; finish: string | null; price_per_box?: number };
type Batch = { id: string; lot_number: string };

type MoveType = "in" | "out" | "adjustment" | "damage";

const TYPES: { key: MoveType; label: string; icon: any; color: string; bg: string }[] = [
  { key: "in",         label: "Stock In",    icon: ArrowDownToLine, color: "var(--color-moss)",  bg: "var(--color-moss)" },
  { key: "out",        label: "Stock Out",   icon: ArrowUpFromLine, color: "var(--color-oxide)", bg: "var(--color-oxide)" },
  { key: "adjustment", label: "Adjustment",  icon: RefreshCw,       color: "var(--color-glaze)", bg: "var(--color-glaze)" },
  { key: "damage",     label: "Damage",      icon: AlertTriangle,   color: "var(--color-ochre)", bg: "var(--color-ochre)" },
];

const inputStyle = {
  borderColor: "var(--color-grout)",
  ["--tw-ring-color" as any]: "var(--color-glaze)",
};

export default function StockMovePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [newLot, setNewLot] = useState("");
  const [movementType, setMovementType] = useState<MoveType>("in");
  const [boxes, setBoxes] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentBoxes, setCurrentBoxes] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.listProducts().then((p) => setProducts(p ?? []));
  }, [router]);

  useEffect(() => {
    if (productId) {
      api.listBatches(productId).then((b) => setBatches(b ?? []));
      // Fetch current stock for this product so the dealer can see
      // what they have before recording the movement.
      api.getProduct(productId).then((d) => {
        setCurrentBoxes(d?.stock?.boxes_in_stock ?? null);
      }).catch(() => setCurrentBoxes(null));
    } else {
      setBatches([]);
      setCurrentBoxes(null);
    }
    setBatchId("");
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    if (!productId) { setError("Select a tile first."); return; }
    try {
      let finalBatchId = batchId;
      if (movementType === "in" && newLot.trim()) {
        const { id } = await api.createBatch({ product_id: productId, lot_number: newLot.trim() });
        finalBatchId = id;
      }
      await api.recordMovement({
        product_id: productId,
        batch_id: finalBatchId || undefined,
        movement_type: movementType,
        boxes: parseFloat(boxes),
        reference,
        reason,
      });
      const typeLabel = TYPES.find((t) => t.key === movementType)?.label || movementType;
      setMessage(`${typeLabel} recorded successfully.`);
      // Update the displayed stock count immediately
      if (currentBoxes !== null) {
        const delta = movementType === "in" ? parseFloat(boxes) : -parseFloat(boxes);
        setCurrentBoxes(Math.max(0, currentBoxes + delta));
      }
      setBoxes(""); setReference(""); setReason(""); setNewLot("");
      if (productId) api.listBatches(productId).then((b) => setBatches(b ?? []));
    } catch (err: any) {
      setError(err.message);
    }
  }

  const activeType = TYPES.find((t) => t.key === movementType)!;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-lg mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-2xl mb-4" style={{ color: "var(--color-ink)" }}>
          Stock Movement
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg grout-border p-5 space-y-4">
          {error && (
            <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-oxide)" }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-moss)" }}>
              <CheckCircle2 size={14} /> {message}
            </p>
          )}

          {/* Current stock — shown as soon as a product is picked */}
          {productId && currentBoxes !== null && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{
                background: currentBoxes === 0
                  ? "var(--color-oxide-tint)"
                  : currentBoxes <= 20
                  ? "var(--color-ochre-tint)"
                  : "var(--color-moss-tint)",
                border: "1px solid",
                borderColor: currentBoxes === 0
                  ? "var(--color-oxide)"
                  : currentBoxes <= 20
                  ? "var(--color-ochre)"
                  : "var(--color-moss)",
              }}
            >
              <Boxes size={18} style={{
                color: currentBoxes === 0
                  ? "var(--color-oxide)"
                  : currentBoxes <= 20
                  ? "var(--color-ochre)"
                  : "var(--color-moss)",
              }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                  <span className="font-[family-name:var(--font-mono)] text-lg">{currentBoxes}</span>
                  {" "}boxes currently in stock
                </p>
                {currentBoxes === 0 && (
                  <p className="text-xs" style={{ color: "var(--color-oxide)" }}>Out of stock</p>
                )}
                {currentBoxes > 0 && currentBoxes <= 20 && (
                  <p className="text-xs" style={{ color: "var(--color-ochre)" }}>Low stock</p>
                )}
              </div>
            </div>
          )}

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = movementType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMovementType(t.key)}
                  className="py-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors"
                  style={active
                    ? { background: t.bg, color: "white" }
                    : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Adjustment/damage explanation */}
          {(movementType === "adjustment" || movementType === "damage") && (
            <p className="text-xs px-1" style={{ color: "var(--color-ink-soft)" }}>
              {movementType === "adjustment"
                ? "Use for stock count corrections — reduces stock without counting as a sale."
                : "Use for broken or unusable tiles — tracked separately from sales in analytics."}
            </p>
          )}

          <ProductPicker
            products={products}
            value={productId}
            onChange={setProductId}
            placeholder="Search brand, series, or size…"
          />

          {movementType !== "in" && batches.length > 0 && (
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
              style={inputStyle}
            >
              <option value="">Any batch / not tracked</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>Lot {b.lot_number}</option>
              ))}
            </select>
          )}

          {batches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {batches.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white grout-border">
                  <span className="shade-swatch" style={{ background: shadeColor(b.lot_number) }} />
                  {b.lot_number}
                </span>
              ))}
            </div>
          )}

          {movementType === "in" && (
            <input
              placeholder="Shade / lot number (optional)"
              value={newLot}
              onChange={(e) => setNewLot(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
              style={inputStyle}
            />
          )}

          <input
            type="number" step="0.01" min="0.01" required
            placeholder="Boxes"
            value={boxes}
            onChange={(e) => setBoxes(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
            style={inputStyle}
          />

          <input
            placeholder="Reference / invoice number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
            style={inputStyle}
          />

          {(movementType === "adjustment" || movementType === "damage") && (
            <input
              placeholder={movementType === "damage" ? "Reason for damage (e.g. breakage during transport)" : "Reason for adjustment (e.g. physical count correction)"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
              style={inputStyle}
            />
          )}

          <button
            type="submit"
            className="w-full text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
            style={{ background: activeType.bg }}
          >
            <activeType.icon size={14} />
            Record {activeType.label}
          </button>
        </form>
      </main>
    </div>
  );
}