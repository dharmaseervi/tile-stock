"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, ArrowRight, CheckCircle2, Truck, Package, XCircle } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type Order = {
  id: string;
  challan_number: string;
  status: string;
  customer_name: string | null;
  total_boxes: number;
  total_value: number;
  created_at: string;
};

const STATUS_STYLES: Record<string, { bg: string; color: string; icon: any; label: string }> = {
  draft:      { bg: "#F7F8F6", color: "#52605B", icon: FileText, label: "Draft" },
  confirmed:  { bg: "#E4F0EE", color: "#1F6F6B", icon: CheckCircle2, label: "Confirmed" },
  dispatched: { bg: "#E7F0E5", color: "#3F7248", icon: Truck, label: "Dispatched" },
  delivered:  { bg: "#E7F0E5", color: "#3F7248", icon: Package, label: "Delivered" },
  cancelled:  { bg: "#F7E9E4", color: "#A6432E", icon: XCircle, label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
      <Icon size={11} />
      {s.label}
    </span>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.listOrders().then((o) => setOrders(o ?? [])).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
            Delivery Challans
          </h1>
          <Link
            href="/orders/new"
            className="text-white text-sm px-4 py-2 rounded-md font-medium inline-flex items-center gap-1.5"
            style={{ background: "var(--color-glaze)" }}
          >
            <Plus size={15} />
            New Challan
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "var(--color-grout)" }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg grout-border p-10 text-center">
            <FileText size={28} className="mx-auto mb-2" style={{ color: "var(--color-ink-soft)" }} />
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>No challans yet — create your first delivery challan.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg grout-border overflow-hidden">
            <div className="grout-divide">
              {orders.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`}>
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-mono)] text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                          {o.challan_number}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                        {o.customer_name || "No customer"} ·{" "}
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink)" }}>
                        ₹{o.total_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>{o.total_boxes} boxes</p>
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
