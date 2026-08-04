"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ArrowRight } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

export default function CustomerLedgerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.getCustomerLedger(id).then(setData).finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !data) return <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}><Nav /></div>;

  const { customer, orders, total_value } = data;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        <button onClick={() => router.push("/customers")} className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-ink-soft)" }}>
          <ArrowLeft size={15} /> All customers
        </button>

        <div className="bg-white rounded-lg grout-border p-5">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>{customer.name}</h1>
          {customer.phone && <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>{customer.phone}</p>}
          <div className="mt-3 flex gap-4">
            <div>
              <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Total business</p>
              <p className="font-[family-name:var(--font-mono)] text-lg" style={{ color: "var(--color-ink)" }}>
                ₹{total_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            {customer.credit_limit > 0 && (
              <div>
                <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Credit limit</p>
                <p className="font-[family-name:var(--font-mono)] text-lg" style={{ color: "var(--color-ink)" }}>
                  ₹{customer.credit_limit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium mb-2" style={{ color: "var(--color-ink-soft)" }}>Order History</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-ink-soft)" }}>No orders yet.</p>
          ) : (
            <div className="bg-white rounded-lg grout-border overflow-hidden">
              <div className="grout-divide">
                {orders.map((o: any) => (
                  <Link key={o.id} href={`/orders/${o.id}`}>
                    <div className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
                      <FileText size={15} style={{ color: "var(--color-ink-soft)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink)" }}>{o.challan_number}</p>
                        <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{o.status}
                        </p>
                      </div>
                      <span className="font-[family-name:var(--font-mono)] text-sm" style={{ color: "var(--color-ink)" }}>
                        ₹{o.total_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                      <ArrowRight size={14} style={{ color: "var(--color-grout-strong)" }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
