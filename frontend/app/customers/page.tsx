"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, ArrowRight, Phone } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  total_orders: number;
  total_value: number;
};

const inputClass = "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 w-full";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", credit_limit: "" });
  const [error, setError] = useState("");

  function load() {
    api.listCustomers().then((c) => setCustomers(c ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    load();
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createCustomer({ ...form, credit_limit: parseFloat(form.credit_limit) || 0 });
      setForm({ name: "", phone: "", address: "", credit_limit: "" });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>Customers</h1>
          <button onClick={() => setShowForm((s) => !s)}
            className="text-white text-sm px-4 py-2 rounded-md font-medium inline-flex items-center gap-1.5"
            style={{ background: showForm ? "var(--color-ink-soft)" : "var(--color-glaze)" }}>
            <Plus size={15} />{showForm ? "Cancel" : "Add Customer"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-lg grout-border p-4 grid grid-cols-2 gap-3">
            {error && <p className="col-span-2 text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
            <input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputClass} col-span-2`} style={inputStyle} />
            <input type="number" placeholder="Credit limit (₹)" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className={inputClass} style={inputStyle} />
            <button type="submit" className="text-white rounded-md py-2 text-sm font-medium" style={{ background: "var(--color-glaze)" }}>Save</button>
          </form>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--color-grout)" }} />)}</div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-lg grout-border p-10 text-center">
            <Users size={28} className="mx-auto mb-2" style={{ color: "var(--color-ink-soft)" }} />
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>No customers yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg grout-border overflow-hidden">
            <div className="grout-divide">
              {customers.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{c.name}</p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                        {c.phone && <><Phone size={10} />{c.phone} · </>}
                        {c.total_orders} orders
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink)" }}>
                        ₹{c.total_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>total</p>
                    </div>
                    <ArrowRight size={15} style={{ color: "var(--color-grout-strong)" }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
