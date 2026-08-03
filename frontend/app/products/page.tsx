"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isLoggedIn } from "@/lib/api";
import { uploadProductPhoto } from "@/lib/supabase";
import Nav from "@/components/Nav";


type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  pieces_per_box: number;
  sqft_per_box: number | null;
  reorder_level: number;
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
  });
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }
 console.log("Products loaded:", products);
  

  function load() {
    api.listProducts().then((p) => setProducts(p ?? [])).finally(() => setLoading(false));
   
  }

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
        image_url,
      });
      setForm({ brand: "", series_name: "", size: "", finish: "", pieces_per_box: 1, sqft_per_box: "", reorder_level: 10 });
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

  if (loading) return <div className="p-8" style={{ color: "var(--color-ink-soft)" }}>Loading…</div>;

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
            className="text-white text-sm px-4 py-2 rounded-md font-medium"
            style={{ background: showForm ? "var(--color-ink-soft)" : "var(--color-glaze)" }}
          >
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-lg grout-border p-4 grid grid-cols-2 gap-3">
            {error && <p className="col-span-2 text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
            <input placeholder="Brand" required value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className={inputClass} style={inputStyle} />
            <input placeholder="Series name" required value={form.series_name}
              onChange={(e) => setForm({ ...form, series_name: e.target.value })}
              className={inputClass} style={inputStyle} />
            <input placeholder="Size (e.g. 600x600)" required value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className={inputClass} style={inputStyle} />
            <input placeholder="Finish (glossy, matte…)" value={form.finish}
              onChange={(e) => setForm({ ...form, finish: e.target.value })}
              className={inputClass} style={inputStyle} />
            <input type="number" min={1} placeholder="Pieces per box" required value={form.pieces_per_box}
              onChange={(e) => setForm({ ...form, pieces_per_box: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
              className={inputClass} style={inputStyle} />
            <input type="number" step="0.01" placeholder="Sq.ft per box" value={form.sqft_per_box}
              onChange={(e) => setForm({ ...form, sqft_per_box: e.target.value })}
              className={inputClass} style={inputStyle} />
            <input type="number" min={0} placeholder="Reorder level (boxes)" required value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
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

        <div className="bg-white rounded-lg overflow-hidden grout-border">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium"></th>
                <th className="px-4 py-2.5 font-medium">Brand</th>
                <th className="px-4 py-2.5 font-medium">Series</th>
                <th className="px-4 py-2.5 font-medium">Size</th>
                <th className="px-4 py-2.5 font-medium">Finish</th>
                <th className="px-4 py-2.5 font-medium">Reorder at</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="grout-divide">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.series_name} className="w-9 h-9 object-cover rounded" />
                    ) : (
                      <div className="w-9 h-9 rounded" style={{ background: "var(--color-kiln-dim)" }} />
                    )}
                  </td>
                  <td className="px-4 py-2.5">{p.brand}</td>
                  <td className="px-4 py-2.5">{p.series_name}</td>
                  <td className="px-4 py-2.5">{p.size}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-ink-soft)" }}>{p.finish || "—"}</td>
                  <td className="px-4 py-2.5 font-[family-name:var(--font-mono)]">{p.reorder_level}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-xs hover:underline"
                      style={{ color: "var(--color-oxide)" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--color-ink-soft)" }}>
                    No products yet.
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
