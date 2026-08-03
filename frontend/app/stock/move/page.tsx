"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";
import { shadeColor } from "@/lib/shade";

type Product = { id: string; brand: string; series_name: string; size: string };
type Batch = { id: string; lot_number: string };

const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function StockMovePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [newLot, setNewLot] = useState("");
  const [movementType, setMovementType] = useState<"in" | "out">("in");
  const [boxes, setBoxes] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.listProducts().then((p) => setProducts(p ?? []));
  }, [router]);

  useEffect(() => {
    if (productId) {
      api.listBatches(productId).then((b) => setBatches(b ?? []));
    } else {
      setBatches([]);
    }
    setBatchId("");
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
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
      });
      setMessage(`Stock ${movementType === "in" ? "in" : "out"} recorded successfully.`);
      setBoxes("");
      setReference("");
      setNewLot("");
      if (productId) api.listBatches(productId).then((b) => setBatches(b ?? []));
    } catch (err: any) {
      setError(err.message);
    }
  }

  const isIn = movementType === "in";
  const accent = isIn ? "var(--color-moss)" : "var(--color-oxide)";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-6 max-w-lg mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-2xl mb-4" style={{ color: "var(--color-ink)" }}>
          Stock In / Out
        </h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg grout-border p-5 space-y-4">
          {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
          {message && <p className="text-sm" style={{ color: "var(--color-moss)" }}>{message}</p>}

          <div className="flex gap-2 p-1 rounded-md" style={{ background: "var(--color-kiln-dim)" }}>
            <button
              type="button"
              onClick={() => setMovementType("in")}
              className="flex-1 py-2 rounded text-sm font-medium transition-colors"
              style={isIn ? { background: "var(--color-moss)", color: "white" } : { color: "var(--color-ink-soft)" }}
            >
              Stock In
            </button>
            <button
              type="button"
              onClick={() => setMovementType("out")}
              className="flex-1 py-2 rounded text-sm font-medium transition-colors"
              style={!isIn ? { background: "var(--color-oxide)", color: "white" } : { color: "var(--color-ink-soft)" }}
            >
              Stock Out
            </button>
          </div>

          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
            style={inputStyle}
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} — {p.series_name} ({p.size})
              </option>
            ))}
          </select>

          {movementType === "out" && batches.length > 0 && (
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
              style={inputStyle}
            >
              <option value="">Any batch / not tracked</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  Lot {b.lot_number}
                </option>
              ))}
            </select>
          )}

          {movementType === "out" && batches.length > 0 && (
            <div className="flex flex-wrap gap-2 -mt-2">
              {batches.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded"
                  style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
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
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Boxes"
            value={boxes}
            onChange={(e) => setBoxes(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
            style={inputStyle}
          />

          <input
            placeholder="Reference (invoice / PO number)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
            style={inputStyle}
          />

          <button
            type="submit"
            className="w-full text-white rounded-md py-2 text-sm font-medium"
            style={{ background: accent }}
          >
            Record {isIn ? "Stock In" : "Stock Out"}
          </button>
        </form>
      </main>
    </div>
  );
}
