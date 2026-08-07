"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Pencil, Printer, QrCode, Boxes, IndianRupee,
  AlertTriangle, ImageOff, ArrowDownToLine, ArrowUpFromLine, X,
} from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { shadeColor } from "@/lib/shade";
import Nav from "@/components/Nav";

type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  hsn_code: string | null;
  location: string | null;
  pieces_per_box: number;
  sqft_per_box: number | null;
  reorder_level: number;
  price_per_box: number;
  image_url: string | null;
};

type Stock = { boxes_in_stock: number; stock_value: number };
type Batch = { id: string; lot_number: string; created_at: string };
type Movement = {
  id: string;
  movement_type: "in" | "out";
  boxes: number;
  reference: string | null;
  created_at: string;
};

const inputClass = "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 w-full";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<Stock | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [quickMove, setQuickMove] = useState<"in" | "out" | null>(null);
  const [moveBoxes, setMoveBoxes] = useState("");
  const [moveRef, setMoveRef] = useState("");
  const [moveMsg, setMoveMsg] = useState("");
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState("");

  const productURL = typeof window !== "undefined" ? `${window.location.origin}/products/${id}` : "";

  function load() {
    Promise.all([api.getProduct(id), api.listBatches(id), api.history(id)])
      .then(([detail, b, h]) => {
        setProduct(detail.product);
        setStock(detail.stock);
        setBatches(b ?? []);
        setMovements(h ?? []);
        setForm({
          brand: detail.product.brand,
          series_name: detail.product.series_name,
          size: detail.product.size,
          finish: detail.product.finish || "",
          hsn_code: detail.product.hsn_code || "",
          location: detail.product.location || "",
          pieces_per_box: detail.product.pieces_per_box,
          sqft_per_box: detail.product.sqft_per_box ?? "",
          reorder_level: detail.product.reorder_level,
          price_per_box: detail.product.price_per_box || "",
        });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      // Preserve the destination — a QR scan lands here, and dropping the
      // product id would send the scanner to a bare dashboard instead.
      router.push(`/login?next=${encodeURIComponent(`/products/${id}`)}`);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  async function handleQuickMove(e: React.FormEvent) {
    e.preventDefault();
    if (!quickMove) return;
    try {
      await api.recordMovement({
        product_id: id,
        movement_type: quickMove,
        boxes: parseFloat(moveBoxes),
        reference: moveRef || undefined,
      });
      setMoveMsg(`Stock ${quickMove === "in" ? "in" : "out"} recorded.`);
      setMoveBoxes("");
      setMoveRef("");
      setTimeout(() => { setQuickMove(null); setMoveMsg(""); }, 1500);
      load();
    } catch (err: any) {
      setMoveMsg(err.message);
    }
  }

  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUploading(true);
    try {
      let image_url = product?.image_url || "";
      if (editPhoto) {
        const { uploadProductPhoto } = await import("@/lib/supabase");
        image_url = await uploadProductPhoto(editPhoto);
      }
      await api.updateProduct(id, {
        ...form,
        sqft_per_box: form.sqft_per_box ? parseFloat(form.sqft_per_box) : 0,
        price_per_box: form.price_per_box ? parseFloat(form.price_per_box) : 0,
        image_url,
      });
      setEditing(false);
      setEditPhoto(null);
      setEditPhotoPreview(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading || !product) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
        <Nav />
        <main className="p-6 max-w-3xl mx-auto">
          <div className="h-7 w-40 rounded animate-pulse" style={{ background: "var(--color-grout)" }} />
        </main>
      </div>
    );
  }

  const low = stock && stock.boxes_in_stock <= product.reorder_level;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <div className="print:hidden">
        <Nav />
      </div>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 print:hidden">
        <button
          onClick={() => router.push("/products")}
          className="text-sm flex items-center gap-1.5"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <ArrowLeft size={15} />
          All products
        </button>

        <div className="bg-white rounded-lg grout-border p-5 flex flex-col sm:flex-row gap-5">
          {product.image_url ? (
            <img src={product.image_url} alt={product.series_name} className="w-full sm:w-40 h-40 object-cover rounded-lg" />
          ) : (
            <div className="w-full sm:w-40 h-40 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-kiln-dim)" }}>
              <ImageOff size={28} style={{ color: "var(--color-ink-soft)" }} />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
                  {product.brand} — {product.series_name}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                  {product.size}{product.finish ? ` · ${product.finish}` : ""}{product.hsn_code ? ` · HSN ${product.hsn_code}` : ""}
                </p>
                {product.location && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--color-glaze-deep)" }}>
                    📍 {product.location}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setShowQR(true)}
                  className="p-2 rounded-md grout-border"
                  style={{ color: "var(--color-glaze-deep)" }}
                  aria-label="Show QR code"
                >
                  <QrCode size={17} />
                </button>
                <button
                  onClick={() => setEditing((e) => !e)}
                  className="p-2 rounded-md grout-border"
                  style={{ color: editing ? "var(--color-oxide)" : "var(--color-ink-soft)" }}
                  aria-label="Edit product"
                >
                  {editing ? <X size={17} /> : <Pencil size={17} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                  <Boxes size={13} /> In stock
                </div>
                <div className="font-[family-name:var(--font-mono)] text-lg" style={{ color: low ? "var(--color-ochre)" : "var(--color-ink)" }}>
                  {stock?.boxes_in_stock ?? 0} boxes
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                  <IndianRupee size={13} /> Stock value
                </div>
                <div className="font-[family-name:var(--font-mono)] text-lg" style={{ color: "var(--color-ink)" }}>
                  ₹{(stock?.stock_value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                  <IndianRupee size={13} /> Price / box
                </div>
                <div className="font-[family-name:var(--font-mono)] text-lg" style={{ color: "var(--color-ink)" }}>
                  {product.price_per_box > 0 ? `₹${product.price_per_box.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>

            {low && (
              <div className="flex items-center gap-1.5 text-sm pt-1" style={{ color: "var(--color-ochre)" }}>
                <AlertTriangle size={14} />
                At or below reorder level ({product.reorder_level} boxes)
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setQuickMove(quickMove === "in" ? null : "in")}
                className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                style={quickMove === "in"
                  ? { background: "var(--color-moss)", color: "white" }
                  : { background: "var(--color-moss-tint)", color: "var(--color-moss)" }}
              >
                <ArrowDownToLine size={14} /> Stock In
              </button>
              <button
                onClick={() => setQuickMove(quickMove === "out" ? null : "out")}
                className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                style={quickMove === "out"
                  ? { background: "var(--color-oxide)", color: "white" }
                  : { background: "var(--color-oxide-tint)", color: "var(--color-oxide)" }}
              >
                <ArrowUpFromLine size={14} /> Stock Out
              </button>
            </div>
          </div>
        </div>

        {quickMove && (
          <form onSubmit={handleQuickMove} className="bg-white rounded-lg p-4 space-y-3" style={{ border: `1px solid var(--color-grout)` }}>
            {moveMsg && (
              <p className="text-sm" style={{ color: quickMove === "in" ? "var(--color-moss)" : "var(--color-oxide)" }}>
                {moveMsg}
              </p>
            )}
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Boxes"
              value={moveBoxes}
              onChange={(e) => setMoveBoxes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
              style={{ borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" }}
            />
            <input
              placeholder="Reference / invoice (optional)"
              value={moveRef}
              onChange={(e) => setMoveRef(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" }}
            />
            <button
              type="submit"
              className="w-full text-white rounded-md py-2 text-sm font-medium"
              style={{ background: quickMove === "in" ? "var(--color-moss)" : "var(--color-oxide)" }}
            >
              Record {quickMove === "in" ? "Stock In" : "Stock Out"}
            </button>
          </form>
        )}

        {editing && form && (
          <form onSubmit={handleSave} className="bg-white rounded-lg grout-border p-4 grid grid-cols-2 gap-3">
            {error && <p className="col-span-2 text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
            <input placeholder="Brand" required value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Series name" required value={form.series_name}
              onChange={(e) => setForm({ ...form, series_name: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Size" required value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Finish" value={form.finish}
              onChange={(e) => setForm({ ...form, finish: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="HSN code" value={form.hsn_code}
              onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Godown location (Rack B3, Front wall…)" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} className={`${inputClass} col-span-2`} style={inputStyle} />
            <input type="number" min={1} placeholder="Pieces per box" required value={form.pieces_per_box}
              onChange={(e) => setForm({ ...form, pieces_per_box: parseInt(e.target.value) || 1 })} className={inputClass} style={inputStyle} />
            <input type="number" step="0.01" placeholder="Sq.ft per box" value={form.sqft_per_box}
              onChange={(e) => setForm({ ...form, sqft_per_box: e.target.value })} className={inputClass} style={inputStyle} />
            <input type="number" min={0} placeholder="Reorder level" required value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: parseInt(e.target.value) || 0 })} className={inputClass} style={inputStyle} />
            <input type="number" step="0.01" min={0} placeholder="Price per box (₹)" value={form.price_per_box}
              onChange={(e) => setForm({ ...form, price_per_box: e.target.value })} className={inputClass} style={inputStyle} />
            <input type="number" step="0.01" min={0} placeholder="Cost price per box (₹)" value={form.cost_price || ""}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className={inputClass} style={inputStyle} />

            {/* Photo upload */}
            <div className="col-span-2 flex items-center gap-3">
              {(editPhotoPreview || product.image_url) && (
                <img
                  src={editPhotoPreview || product.image_url!}
                  alt="Preview"
                  className="w-14 h-14 object-cover rounded-md shrink-0"
                  style={{ border: "1px solid var(--color-grout)" }}
                />
              )}
              <label className="flex-1 text-sm px-3 py-2 rounded-md cursor-pointer text-center grout-border hover:bg-[var(--color-kiln-dim)] transition-colors"
                style={{ color: "var(--color-ink-soft)" }}>
                {editPhoto ? editPhoto.name : product.image_url ? "Change photo" : "Add photo (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEditPhoto(f);
                    setEditPhotoPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
              {(editPhoto || product.image_url) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditPhoto(null);
                    setEditPhotoPreview(null);
                    setForm({ ...form, image_url: "" });
                  }}
                  className="text-xs px-2 py-1.5 rounded-md grout-border"
                  style={{ color: "var(--color-oxide)" }}
                >
                  Remove
                </button>
              )}
            </div>

            <button type="submit" disabled={uploading} className="col-span-2 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50" style={{ background: "var(--color-glaze)" }}>
              {uploading ? "Uploading photo…" : "Save Changes"}
            </button>
          </form>
        )}

        {batches.length > 0 && (
          <div>
            <h2 className="text-sm font-medium mb-2" style={{ color: "var(--color-ink-soft)" }}>Batches / Shade Lots</h2>
            <div className="flex flex-wrap gap-2">
              {batches.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-white grout-border">
                  <span className="shade-swatch" style={{ background: shadeColor(b.lot_number) }} />
                  Lot {b.lot_number}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium mb-2" style={{ color: "var(--color-ink-soft)" }}>Movement History</h2>
          <div className="bg-white rounded-lg grout-border overflow-hidden">
            <div className="grout-divide">
              {movements.length === 0 && (
                <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--color-ink-soft)" }}>
                  No stock movements recorded yet.
                </p>
              )}
              {movements.map((m) => (
                <div key={m.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {m.movement_type === "in" ? (
                      <ArrowDownToLine size={15} style={{ color: "var(--color-moss)" }} />
                    ) : (
                      <ArrowUpFromLine size={15} style={{ color: "var(--color-oxide)" }} />
                    )}
                    <span style={{ color: "var(--color-ink)" }}>
                      {m.movement_type === "in" ? "Stock in" : "Stock out"}
                      {m.reference ? ` · ${m.reference}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-[family-name:var(--font-mono)]"
                      style={{ color: m.movement_type === "in" ? "var(--color-moss)" : "var(--color-oxide)" }}>
                      {m.movement_type === "in" ? "+" : "−"}{m.boxes}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showQR && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(30, 36, 34, 0.85)" }}
            onClick={() => setShowQR(false)}
          >
            <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
              <QRCodeSVG value={productURL} size={200} level="M" />
              <div className="text-center">
                <p className="font-medium text-sm" style={{ color: "var(--color-ink)" }}>
                  {product.brand} — {product.series_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                  {product.size}{product.finish ? ` · ${product.finish}` : ""}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handlePrint}
                  className="flex-1 text-white rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: "var(--color-glaze)" }}
                >
                  <Printer size={15} />
                  Print label
                </button>
                <button
                  onClick={() => setShowQR(false)}
                  className="flex-1 rounded-md py-2 text-sm font-medium grout-border"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Print-only label: hidden on screen, becomes the whole page when printing */}
      <div className="hidden print:flex flex-col items-center justify-center gap-3 p-10">
        <QRCodeSVG value={productURL} size={260} level="M" />
        <p className="font-medium text-lg text-black">{product.brand} — {product.series_name}</p>
        <p className="text-sm text-black">{product.size}{product.finish ? ` · ${product.finish}` : ""}</p>
        {product.price_per_box > 0 && (
          <p className="text-sm text-black">₹{product.price_per_box.toFixed(2)} / box</p>
        )}
      </div>
    </div>
  );
}