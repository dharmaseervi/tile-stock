"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ImageOff, Package, Search } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { uploadProductPhoto } from "@/lib/supabase";
import { TILE_SIZES, calcSqftPerBox } from "@/lib/tileSizes";
import Nav from "@/components/Nav";

const COMMON_BRANDS = [
  "Kajaria", "Somany", "Johnson", "Nitco", "Orient Bell",
  "Simpolo", "Asian Granito", "RAK Ceramics", "Varmora", "Cera",
];
const COMMON_FINISHES = [
  "Glossy", "Matte", "Satin", "Rustic", "Polished",
  "Textured", "Wooden", "Stone", "Metallic", "Anti-skid",
];

type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  pieces_per_box: number;
  sqft_per_box: number | null;
  reorder_level: number;
  price_per_box: number;
  image_url: string | null;
};

const inputClass =
  "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    brand: "",
    series_name: "",
    size: "",
    finish: "",
    pieces_per_box: 1,
    sqft_per_box: "",
    reorder_level: 10,
    price_per_box: "",
  });
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFinish, setActiveFinish] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleSizeSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const label = e.target.value;
    if (label === "Custom size") {
      setIsCustomSize(true);
      setForm({ ...form, size: "" });
      return;
    }
    setIsCustomSize(false);
    const preset = TILE_SIZES.find((s) => s.label === label);
    if (!preset || preset.sqftPerPiece === null) return;
    const sizeValue = label.replace(/\s*mm$/, "").replace(/\s*x\s*/, "x");
    const sqft = calcSqftPerBox(preset.sqftPerPiece, form.pieces_per_box || 1);
    setForm({ ...form, size: sizeValue, sqft_per_box: String(sqft) });
  }

  function handlePiecesPerBoxChange(value: number) {
    const currentLabel = `${form.size.replace("x", " x ")} mm`;
    const preset = TILE_SIZES.find((s) => s.label === currentLabel);
    if (preset && preset.sqftPerPiece !== null) {
      const sqft = calcSqftPerBox(preset.sqftPerPiece, value || 1);
      setForm({ ...form, pieces_per_box: value, sqft_per_box: String(sqft) });
    } else {
      setForm({ ...form, pieces_per_box: value });
    }
  }

  function load() {
    api.listProducts().then((p) => setProducts(p ?? [])).finally(() => setLoading(false));
  }

  const brandSuggestions = Array.from(new Set([...products.map((p) => p.brand), ...COMMON_BRANDS])).sort();

  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.brand.toLowerCase().includes(q) ||
      p.series_name.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      (p.finish || "").toLowerCase().includes(q);
    const matchesFinish = !activeFinish || p.finish === activeFinish;
    const matchesBrand = !activeBrand || p.brand === activeBrand;
    const matchesSize = !activeSize || p.size === activeSize;
    return matchesSearch && matchesFinish && matchesBrand && matchesSize;
  });

  const finishPills = Array.from(new Set(products.map((p) => p.finish).filter(Boolean))) as string[];
  const brandPills = Array.from(new Set(products.map((p) => p.brand))).sort();
  const sizePills = Array.from(new Set(products.map((p) => p.size))).sort();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      let image_url = "";
      if (photo) {
        setUploading(true);
        image_url = await uploadProductPhoto(photo);
        setUploading(false);
      }
      await api.createProduct({
        ...form,
        sqft_per_box: form.sqft_per_box ? parseFloat(form.sqft_per_box) : undefined,
        price_per_box: form.price_per_box ? parseFloat(form.price_per_box) : 0,
        image_url,
      });
      setForm({ brand: "", series_name: "", size: "", finish: "", pieces_per_box: 1, sqft_per_box: "", reorder_level: 10, price_per_box: "" });
      setIsCustomSize(false);
      setPhoto(null);
      setPhotoPreview(null);
      setShowForm(false);
      load();
    } catch (err: any) {
      setUploading(false);
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await api.deleteProduct(id);
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
        <Nav />
        <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
          <div className="h-7 w-32 rounded animate-pulse" style={{ background: "var(--color-grout)" }} />
          <div className="bg-white rounded-lg grout-border p-4 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 rounded" style={{ background: "var(--color-grout)", width: `${60 - i * 10}%` }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
            Products
          </h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-white text-sm px-4 py-2 rounded-md font-medium inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
            style={{ background: showForm ? "var(--color-ink-soft)" : "var(--color-glaze)" }}
          >
            <Plus size={15} />
            {showForm ? "Cancel" : "Add Product"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-lg grout-border p-4 grid grid-cols-2 gap-3">
            {error && <p className="col-span-2 text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
            <input placeholder="Brand" required value={form.brand} list="brand-suggestions"
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className={inputClass} style={inputStyle} />
            <datalist id="brand-suggestions">
              {brandSuggestions.map((b) => <option key={b} value={b} />)}
            </datalist>
            <input placeholder="Series name" required value={form.series_name}
              onChange={(e) => setForm({ ...form, series_name: e.target.value })}
              className={inputClass} style={inputStyle} />
            {isCustomSize ? (
              <input placeholder="Size (e.g. 600x600)" required value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className={inputClass} style={inputStyle} />
            ) : (
              <select required value={TILE_SIZES.find((s) => s.label === `${form.size.replace("x", " x ")} mm`)?.label || ""}
                onChange={handleSizeSelect}
                className={inputClass} style={inputStyle}>
                <option value="" disabled>Select size</option>
                {TILE_SIZES.map((s) => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
              </select>
            )}
            <input placeholder="Finish (glossy, matte…)" value={form.finish} list="finish-suggestions"
              onChange={(e) => setForm({ ...form, finish: e.target.value })}
              className={inputClass} style={inputStyle} />
            <datalist id="finish-suggestions">
              {COMMON_FINISHES.map((f) => <option key={f} value={f} />)}
            </datalist>
            <input type="number" min={1} placeholder="Pieces per box" required value={form.pieces_per_box}
              onChange={(e) => handlePiecesPerBoxChange(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
              className={inputClass} style={inputStyle} />
            <div className="flex flex-col gap-1">
              <input type="number" step="0.01" placeholder="Sq.ft per box" value={form.sqft_per_box}
                onChange={(e) => setForm({ ...form, sqft_per_box: e.target.value })}
                className={inputClass} style={inputStyle} />
              {!isCustomSize && form.size && (
                <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Auto-calculated — you can override</span>
              )}
            </div>
            <input type="number" min={0} placeholder="Reorder level (boxes)" required value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
              className={inputClass} style={inputStyle} />
            <input type="number" step="0.01" min={0} placeholder="Price per box (₹)" value={form.price_per_box}
              onChange={(e) => setForm({ ...form, price_per_box: e.target.value })}
              className={inputClass} style={inputStyle} />
            <div className="col-span-2 flex items-center gap-3">
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="w-14 h-14 object-cover rounded-md grout-border" />
              )}
              <label className="text-sm cursor-pointer px-3 py-2 rounded-md grout-border" style={{ color: "var(--color-ink-soft)" }}>
                {photo ? "Change photo" : "Add product photo (optional)"}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
            <button type="submit" disabled={uploading} className="col-span-2 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--color-glaze)" }}>
              {uploading ? "Uploading photo…" : "Save Product"}
            </button>
          </form>
        )}

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }} />
          <input
            type="text"
            placeholder="Search by brand, series, size, or finish…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 grout-border"
            style={{ ["--tw-ring-color" as any]: "var(--color-glaze)" }}
          />
        </div>

        {(brandPills.length > 0 || sizePills.length > 0 || finishPills.length > 0) && (
          <div className="space-y-2">
            {brandPills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs w-14 shrink-0" style={{ color: "var(--color-ink-soft)" }}>Brand</span>
                <button
                  onClick={() => setActiveBrand(null)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={activeBrand === null
                    ? { background: "var(--color-glaze)", color: "white" }
                    : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                >
                  All
                </button>
                {brandPills.map((b) => (
                  <button
                    key={b}
                    onClick={() => setActiveBrand(activeBrand === b ? null : b)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                    style={activeBrand === b
                      ? { background: "var(--color-glaze)", color: "white" }
                      : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
            {sizePills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs w-14 shrink-0" style={{ color: "var(--color-ink-soft)" }}>Size</span>
                <button
                  onClick={() => setActiveSize(null)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={activeSize === null
                    ? { background: "var(--color-glaze)", color: "white" }
                    : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                >
                  All
                </button>
                {sizePills.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(activeSize === s ? null : s)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors font-[family-name:var(--font-mono)]"
                    style={activeSize === s
                      ? { background: "var(--color-glaze)", color: "white" }
                      : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {finishPills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs w-14 shrink-0" style={{ color: "var(--color-ink-soft)" }}>Finish</span>
                <button
                  onClick={() => setActiveFinish(null)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={activeFinish === null
                    ? { background: "var(--color-glaze)", color: "white" }
                    : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                >
                  All
                </button>
                {finishPills.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFinish(activeFinish === f ? null : f)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                    style={activeFinish === f
                      ? { background: "var(--color-glaze)", color: "white" }
                      : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg overflow-hidden grout-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium"></th>
                <th className="px-4 py-2.5 font-medium">Brand</th>
                <th className="px-4 py-2.5 font-medium">Series</th>
                <th className="px-4 py-2.5 font-medium">Size</th>
                <th className="px-4 py-2.5 font-medium">Finish</th>
                <th className="px-4 py-2.5 font-medium">Reorder at</th>
                <th className="px-4 py-2.5 font-medium text-right">Price / box</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="grout-divide">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-kiln-dim)] transition-colors group">
                  <td className="px-4 py-2.5">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.series_name} className="w-9 h-9 object-cover rounded" />
                    ) : (
                      <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: "var(--color-kiln-dim)" }}>
                        <ImageOff size={14} style={{ color: "var(--color-ink-soft)" }} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{p.brand}</td>
                  <td className="px-4 py-2.5">{p.series_name}</td>
                  <td className="px-4 py-2.5">{p.size}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-ink-soft)" }}>{p.finish || "—"}</td>
                  <td className="px-4 py-2.5 font-[family-name:var(--font-mono)]">{p.reorder_level}</td>
                  <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-right">
                    {p.price_per_box > 0 ? `₹${p.price_per_box.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-oxide-tint)]"
                      style={{ color: "var(--color-oxide)" }}
                      aria-label="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-kiln-dim)" }}>
                        <Package size={18} style={{ color: "var(--color-ink-soft)" }} />
                      </div>
                      <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                        {products.length === 0
                          ? "No products yet — add your first tile design above."
                          : "No products match your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}