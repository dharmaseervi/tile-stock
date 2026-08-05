"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, CheckSquare, Square, Truck, CheckCircle2, XCircle, Download, Eye, EyeOff } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type OrderItem = {
  id: string;
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  boxes: number;
  price_per_box: number;
  loaded: boolean;
  notes: string | null;
};

type Order = {
  id: string;
  challan_number: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_FLOW: Record<string, string> = {
  draft: "confirmed",
  confirmed: "dispatched",
  dispatched: "delivered",
};

const STATUS_LABELS: Record<string, { label: string; next: string; color: string; icon: any }> = {
  draft: { label: "Draft", next: "Mark Confirmed", color: "var(--color-glaze)", icon: CheckCircle2 },
  confirmed: { label: "Confirmed", next: "Mark Dispatched", color: "var(--color-moss)", icon: Truck },
  dispatched: { label: "Dispatched", next: "Mark Delivered", color: "var(--color-moss)", icon: CheckCircle2 },
  delivered: { label: "Delivered", next: "", color: "var(--color-moss)", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", next: "", color: "var(--color-oxide)", icon: XCircle },
};

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrices, setShowPrices] = useState(false);

  function load() {
    api.getOrder(id).then(({ order: o, items: i }) => {
      setOrder(o);
      setItems(i ?? []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    load();
  }, [id, router]);

  async function toggleLoaded(itemId: string) {
    await api.toggleItemLoaded(id, itemId);
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, loaded: !it.loaded } : it));
  }

  async function advanceStatus() {
    if (!order) return;
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    await api.updateOrderStatus(id, next);
    load();
  }

  async function cancel() {
    if (!confirm("Cancel this challan?")) return;
    await api.updateOrderStatus(id, "cancelled");
    load();
  }

  if (loading || !order) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
        <Nav />
        <main className="p-6"><div className="h-6 w-40 rounded animate-pulse" style={{ background: "var(--color-grout)" }} /></main>
      </div>
    );
  }

  const totalBoxes = items.reduce((s, i) => s + i.boxes, 0);
  const totalValue = items.reduce((s, i) => s + i.boxes * i.price_per_box, 0);
  const allLoaded = items.length > 0 && items.every((i) => i.loaded);
  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.draft;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <div className="print:hidden"><Nav /></div>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-10 print:p-0 print:max-w-full">

        {/* Screen-only top bar */}
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => router.push("/orders")} className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-ink-soft)" }}>
            <ArrowLeft size={15} /> All challans
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrices((p) => !p)}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md grout-border transition-colors"
              style={showPrices
                ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)" }
                : { color: "var(--color-ink-soft)" }}
            >
              {showPrices ? <Eye size={14} /> : <EyeOff size={14} />}
              {showPrices ? "Prices on" : "Show prices"}
            </button>
            <button onClick={() => api.downloadOrderPDF(id)} className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md grout-border" style={{ color: "var(--color-glaze-deep)" }}>
              <Download size={14} /> Download PDF
            </button>
            <button onClick={() => window.print()} className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md grout-border" style={{ color: "var(--color-ink-soft)" }}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Challan header */}
        <div className="bg-white rounded-lg grout-border p-5 space-y-2 print:border print:rounded-none print:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl print:text-3xl" style={{ color: "var(--color-ink)" }}>
                Delivery Challan
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-sm mt-0.5" style={{ color: "var(--color-glaze-deep)" }}>
                {order.challan_number}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${statusInfo.color}18`, color: statusInfo.color }}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {(order.customer_name || order.delivery_address) && (
            <div className="pt-1 text-sm space-y-0.5">
              {order.customer_name && (
                <p><span style={{ color: "var(--color-ink-soft)" }}>To: </span>{order.customer_name}{order.customer_phone ? ` (${order.customer_phone})` : ""}</p>
              )}
              {order.delivery_address && (
                <p style={{ color: "var(--color-ink-soft)" }}>{order.delivery_address}</p>
              )}
              {order.notes && (
                <p className="text-xs mt-1 italic" style={{ color: "var(--color-ink-soft)" }}>{order.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-lg grout-border overflow-hidden print:border print:rounded-none">
          {/* Header */}
          <div className="px-4 py-2 text-xs font-medium flex items-center gap-3" style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
            <span className="w-7 shrink-0 print:hidden">✓</span>
            <span className="flex-1">Tile</span>
            <span className="w-20 text-right shrink-0">Boxes</span>
           {showPrices && <span className="w-24 text-right shrink-0" data-print="hidden">Amount</span>}
          </div>

          <div className="grout-divide">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                {/* Tick button */}
                <button onClick={() => toggleLoaded(item.id)} className="w-7 shrink-0 print:hidden"
                  style={{ color: item.loaded ? "var(--color-moss)" : "var(--color-grout-strong)" }}>
                  {item.loaded ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
                {/* Print checkbox */}
                <div className="hidden print:block w-7 h-5 border-2 rounded shrink-0" style={{ borderColor: "var(--color-grout-strong)" }} />

                {/* Tile name — takes all remaining space */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{
                    color: "var(--color-ink)",
                    textDecoration: item.loaded ? "line-through" : "none",
                    opacity: item.loaded ? 0.5 : 1,
                  }}>
                    {item.brand} — {item.series_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                    {item.size}{item.finish ? ` · ${item.finish}` : ""}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </p>
                </div>

                {/* Boxes — fixed width, right aligned */}
                <div className="w-20 text-right shrink-0">
                  <span className="font-[family-name:var(--font-mono)] text-sm">{item.boxes}</span>
                  <span className="text-xs ml-1" style={{ color: "var(--color-ink-soft)" }}>bx</span>
                </div>

                {/* Amount — only when showPrices */}

                {showPrices && (
                  <div className="w-24 text-right shrink-0" data-print="hidden">
                    {item.price_per_box > 0 && (
                      <span className="text-sm font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink-soft)" }}>
                        ₹{(item.boxes * item.price_per_box).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          {/* Totals */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--color-grout)", background: "var(--color-kiln-dim)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Total</span>
            <div className="flex items-center gap-4">
              <span className="font-[family-name:var(--font-mono)] text-sm">{totalBoxes} boxes</span>
              {showPrices && totalValue > 0 && (
                <span
                  className="font-[family-name:var(--font-mono)] text-sm font-medium"
                  style={{ color: "var(--color-ink)" }}
                  data-print="hidden"
                >
                  ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Print signature lines */}
        <div className="hidden print:grid grid-cols-2 gap-8 pt-8">
          <div>
            <div className="border-t pt-2" style={{ borderColor: "var(--color-grout)" }}>
              <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Prepared by</p>
            </div>
          </div>
          <div>
            <div className="border-t pt-2" style={{ borderColor: "var(--color-grout)" }}>
              <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Received by</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="flex gap-3 print:hidden">
            {STATUS_FLOW[order.status] && (
              <button
                onClick={advanceStatus}
                disabled={order.status === "confirmed" && !allLoaded}
                className="flex-1 text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ background: "var(--color-glaze)" }}
                title={order.status === "confirmed" && !allLoaded ? "Tick all items as loaded first" : ""}
              >
                <statusInfo.icon size={15} />
                {statusInfo.next}
              </button>
            )}
            <button
              onClick={cancel}
              className="px-4 py-2.5 rounded-md text-sm grout-border"
              style={{ color: "var(--color-oxide)" }}
            >
              Cancel
            </button>
          </div>
        )}

        {order.status === "confirmed" && !allLoaded && (
          <p className="text-xs text-center print:hidden" style={{ color: "var(--color-ink-soft)" }}>
            Tick all items as loaded before dispatching.
          </p>
        )}
      </main>
    </div>
  );
}