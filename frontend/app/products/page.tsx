"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ImageOff, Package, Search, X } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { uploadProductPhoto } from "@/lib/supabase";
import { TILE_SIZES, calcSqftPerBox } from "@/lib/tileSizes";
import Nav from "@/components/Nav";

// Common Indian tile brands and finishes, offered as suggestions — not a
// strict list, since dealers may carry brands/finishes not shown here.
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
  cost_price: number;
  image_url: string | null;
};

const inputClass =
  "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    brand: "",
    series_name: "",
    size: "",
    finish: "",
    hsn_code: "",
    pieces_per_box: 1,
    sqft_per_box: "",
    reorder_level: 10,
    price_per_box: "",
    cost_price: "",
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
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);

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
    // Store size as "LxW" (mm) for consistency with the rest of the app,
    // derived from the label (e.g. "600 x 1200 mm" -> "600x1200").
    const sizeValue = label.replace(/\s*mm$/, "").replace(/\s*x\s*/, "x");
    const sqft = calcSqftPerBox(preset.sqftPerPiece, form.pieces_per_box || 1);
    setForm({ ...form, size: sizeValue, sqft_per_box: String(sqft) });
  }

  function handlePiecesPerBoxChange(value: number) {
    // Re-derive sq.ft/box whenever pieces-per-box changes, as long as the
    // current size matches a known preset (not a custom free-text size).
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

  // Brands already used in this org's products, merged with the common list —
  // so the suggestion list gets better tailored to this dealer over time.
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

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Only show pills for values actually present in this dealer's products.
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
      setForm({ brand: "", series_name: "", size: "", finish: "", hsn_code: "", pieces_per_box: 1, sqft_per_box: "", reorder_level: 10, price_per_box: "", cost_price: "" });
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
          <form onSubmit={handleAdd} className="bg-white rounded-xl grout-border overflow-hidden">

            {/* Photo hero */}
            <div
              className="relative flex items-center justify-center"
              style={{
                background: photoPreview ? "var(--color-ink)" : "var(--color-kiln-dim)",
                borderBottom: "1px solid var(--color-grout)",
                minHeight: 160,
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 220 }} />
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--color-grout)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-ink-soft)" }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Add a tile photo</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>Shows on your public price list</p>
                </div>
              )}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <label className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors"
                  style={{ background: photoPreview ? "rgba(0,0,0,.55)" : "var(--color-glaze)", color: "#fff" }}>
                  {photo ? "Change" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {photo && (
                  <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    className="text-xs font-medium px-3 py-1.5 rounded-md"
                    style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}

              {/* Identity */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-ink-soft)" }}>Identity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Brand</label>
                    <input placeholder="Kajaria, Somany…" required value={form.brand} list="brand-suggestions"
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                    <datalist id="brand-suggestions">
                      {brandSuggestions.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Series / Design name</label>
                    <input placeholder="Dolomite Grey, Onyx…" required value={form.series_name}
                      onChange={(e) => setForm({ ...form, series_name: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-ink-soft)" }}>Dimensions</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Size</label>
                    {isCustomSize ? (
                      <input placeholder="e.g. 600x600" required value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className={`${inputClass} w-full`} style={inputStyle} />
                    ) : (
                      <select required
                        value={TILE_SIZES.find((s) => s.label === `${form.size.replace("x", " x ")} mm`)?.label || ""}
                        onChange={handleSizeSelect}
                        className={`${inputClass} w-full`} style={inputStyle}>
                        <option value="" disabled>Select size</option>
                        {TILE_SIZES.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Finish</label>
                    <input placeholder="Glossy, Matte, Carving…" value={form.finish} list="finish-suggestions"
                      onChange={(e) => setForm({ ...form, finish: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                    <datalist id="finish-suggestions">
                      {COMMON_FINISHES.map((f) => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Pieces per box</label>
                    <input type="number" min={1} placeholder="2" required value={form.pieces_per_box}
                      onChange={(e) => handlePiecesPerBoxChange(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                      className={`${inputClass} w-full`} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>
                      Sq.ft per box
                      {!isCustomSize && form.size && (
                        <span className="ml-1.5 font-normal" style={{ color: "var(--color-glaze)" }}>Auto-calculated</span>
                      )}
                    </label>
                    <input type="number" step="0.01" placeholder="0.00" value={form.sqft_per_box}
                      onChange={(e) => setForm({ ...form, sqft_per_box: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Stock & pricing */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-ink-soft)" }}>Stock & pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Reorder level (boxes)</label>
                    <input type="number" min={0} placeholder="20" required value={form.reorder_level}
                      onChange={(e) => setForm({ ...form, reorder_level: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                    <p className="text-[11px] mt-1" style={{ color: "var(--color-ink-soft)" }}>Alert fires when stock hits this</p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Selling price per box (₹)</label>
                    <input type="number" step="0.01" min={0} placeholder="0.00" value={form.price_per_box}
                      onChange={(e) => setForm({ ...form, price_per_box: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                    <p className="text-[11px] mt-1" style={{ color: "var(--color-ink-soft)" }}>Shown on public price list</p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>Cost price per box (₹)</label>
                    <input type="number" step="0.01" min={0} placeholder="0.00" value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                    <p className="text-[11px] mt-1" style={{ color: "var(--color-ink-soft)" }}>Used to calculate margin</p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-soft)" }}>HSN code</label>
                    <input placeholder="69072190" value={form.hsn_code}
                      onChange={(e) => setForm({ ...form, hsn_code: e.target.value })}
                      className={`${inputClass} w-full`} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={uploading}
                  className="flex-1 text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: "var(--color-glaze)" }}>
                  {uploading ? "Uploading photo…" : "Add product"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-md text-sm grout-border"
                  style={{ color: "var(--color-ink-soft)" }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }} />
          <input
            type="text"
            placeholder="Search by brand, series, size, or finish…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                <th className="px-4 py-2.5 font-medium text-right">Margin</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="grout-divide">
              {pagedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-[var(--color-kiln-dim)] transition-colors group cursor-pointer"
                  onClick={() => router.push(`/products/${p.id}`)}
                >
                  <td className="px-4 py-2.5">
                    {p.image_url ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ url: p.image_url!, label: `${p.brand} — ${p.series_name}` });
                        }}
                        className="block"
                      >
                        <img
                          src={p.image_url}
                          alt={p.series_name}
                          className="w-9 h-9 object-cover rounded cursor-pointer transition-transform hover:scale-110"
                        />
                      </button>
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
                  <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-right text-xs">
                    {p.cost_price > 0 && p.price_per_box > 0 ? (() => {
                      const margin = ((p.price_per_box - p.cost_price) / p.price_per_box) * 100;
                      return (
                        <span style={{ color: margin < 10 ? "var(--color-oxide)" : margin < 20 ? "var(--color-ochre)" : "var(--color-moss)" }}>
                          {margin.toFixed(0)}%
                        </span>
                      );
                    })() : <span style={{ color: "var(--color-grout-strong)" }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
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
                  <td colSpan={9} className="px-4 py-10">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t"
              style={{ borderColor: "var(--color-grout)", background: "var(--color-kiln-dim)" }}>
              <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded text-xs grout-border bg-white disabled:opacity-40"
                  style={{ color: "var(--color-ink-soft)" }}>
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | "…")[]>((acc, n, i, arr) => {
                    if (i > 0 && (arr[i - 1] as number) < n - 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === "…" ? (
                    <span key={`e${i}`} className="px-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>…</span>
                  ) : (
                    <button key={n} onClick={() => setPage(n as number)}
                      className="w-8 h-8 rounded text-xs font-medium transition-colors"
                      style={page === n
                        ? { background: "var(--color-glaze)", color: "#fff" }
                        : { color: "var(--color-ink-soft)" }}>
                      {n}
                    </button>
                  ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded text-xs grout-border bg-white disabled:opacity-40"
                  style={{ color: "var(--color-ink-soft)" }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(30, 36, 34, 0.85)" }}
            onClick={() => setLightboxImage(null)}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <div className="flex flex-col items-center gap-3 max-w-lg" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.label}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
              <p className="text-sm text-white/90">{lightboxImage.label}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}