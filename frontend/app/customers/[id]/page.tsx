"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, ArrowRight, Phone,
  IndianRupee, Boxes, TrendingUp, Layers,
  AlertTriangle, MapPin,
} from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type Order = {
  id: string;
  challan_number: string;
  status: string;
  total_boxes: number;
  total_value: number;
  total_cost: number;
  paid: number;
  created_at: string;
};

type Shade = {
  lot_number: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  boxes: number;
  challan_number: string;
  ordered_at: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  notes: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft:      "var(--color-ink-soft)",
  confirmed:  "var(--color-glaze)",
  dispatched: "var(--color-moss)",
  delivered:  "var(--color-moss)",
  cancelled:  "var(--color-oxide)",
};

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub?: string; accent: string; icon: any;
}) {
  return (
    <div className="bg-white rounded-xl p-4 grout-border flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}18` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-mono)] text-lg leading-none" style={{ color: "var(--color-ink)" }}>
          {value}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-soft)", opacity: 0.7 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function CustomerLedgerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "shades">("orders");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.getCustomerLedger(id).then(setData).finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !data) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
        <Nav />
        <main className="p-6 max-w-3xl mx-auto space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-grout)" }} />
          ))}
        </main>
      </div>
    );
  }

  const { customer, orders, shades, total_value, total_boxes,
          outstanding, gross_profit, margin } = data as {
    customer: Customer;
    orders: Order[];
    shades: Shade[];
    total_value: number;
    total_boxes: number;
    outstanding: number;
    gross_profit: number;
    margin: number;
  };

  const safeOrders = orders ?? [];
  const safeShades = shades ?? [];

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-10">

        <button onClick={() => router.push("/customers")}
          className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-ink-soft)" }}>
          <ArrowLeft size={15} /> All customers
        </button>

        {/* Customer header */}
        <div className="bg-white rounded-xl grout-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl"
                style={{ color: "var(--color-ink)" }}>
                {customer.name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-1.5 text-sm"
                style={{ color: "var(--color-ink-soft)" }}>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`}
                    className="flex items-center gap-1 hover:text-[var(--color-glaze)] transition-colors">
                    <Phone size={13} /> {customer.phone}
                  </a>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {customer.address}
                  </span>
                )}
              </div>
              {customer.notes && (
                <p className="text-xs mt-1.5 italic" style={{ color: "var(--color-ink-soft)" }}>
                  {customer.notes}
                </p>
              )}
            </div>
            {customer.credit_limit > 0 && (
              <div className="text-right shrink-0">
                <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Credit limit</p>
                <p className="font-[family-name:var(--font-mono)] text-sm"
                  style={{ color: "var(--color-ink)" }}>
                  {fmt(customer.credit_limit)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={IndianRupee} label="Total business"
            value={fmt(total_value)} accent="var(--color-glaze)" />
          <StatCard icon={Boxes} label="Total boxes"
            value={total_boxes.toFixed(0)} accent="var(--color-moss)" />
          <StatCard icon={AlertTriangle} label="Outstanding"
            value={fmt(outstanding)}
            sub={outstanding > 0 ? "unpaid" : "all settled"}
            accent={outstanding > 0 ? "var(--color-oxide)" : "var(--color-moss)"} />
          <StatCard icon={TrendingUp} label="Your margin"
            value={gross_profit > 0 ? `${margin.toFixed(0)}%` : "—"}
            sub={gross_profit > 0 ? fmt(gross_profit) + " profit" : "add cost prices"}
            accent="var(--color-glaze-deep)" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit"
          style={{ background: "var(--color-kiln-dim)" }}>
          {(["orders", "shades"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="text-sm px-4 py-1.5 rounded-md font-medium transition-colors capitalize"
              style={tab === t
                ? { background: "white", color: "var(--color-ink)", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }
                : { color: "var(--color-ink-soft)" }}>
              {t === "orders" ? `Orders (${safeOrders.length})` : `Shade history (${safeShades.length})`}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {tab === "orders" && (
          <div>
            {safeOrders.length === 0 ? (
              <div className="bg-white rounded-xl grout-border p-10 text-center">
                <FileText size={24} className="mx-auto mb-2" style={{ color: "var(--color-ink-soft)" }} />
                <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>No orders yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl grout-border overflow-hidden">
                {/* Table header */}
                <div className="px-4 py-2 text-xs font-medium grid grid-cols-12 gap-2"
                  style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
                  <span className="col-span-3">Challan</span>
                  <span className="col-span-2">Date</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-2 text-right">Boxes</span>
                  <span className="col-span-3 text-right">Value</span>
                </div>
                <div className="grout-divide">
                  {safeOrders.map((o) => (
                    <Link key={o.id} href={`/orders/${o.id}`}>
                      <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center
                        hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
                        <span className="col-span-3 text-sm font-[family-name:var(--font-mono)] truncate"
                          style={{ color: "var(--color-ink)" }}>
                          {o.challan_number}
                        </span>
                        <span className="col-span-2 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                          {new Date(o.created_at).toLocaleDateString("en-IN",
                            { day: "numeric", month: "short" })}
                        </span>
                        <span className="col-span-2 text-xs capitalize"
                          style={{ color: STATUS_COLOR[o.status] || "var(--color-ink-soft)" }}>
                          {o.status}
                        </span>
                        <span className="col-span-2 text-right text-sm font-[family-name:var(--font-mono)]"
                          style={{ color: "var(--color-ink-soft)" }}>
                          {o.total_boxes}
                        </span>
                        <div className="col-span-3 text-right flex items-center justify-end gap-2">
                          <span className="text-sm font-[family-name:var(--font-mono)]"
                            style={{ color: "var(--color-ink)" }}>
                            {fmt(o.total_value)}
                          </span>
                          <ArrowRight size={13} style={{ color: "var(--color-grout-strong)" }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* Orders total */}
                <div className="px-4 py-3 grid grid-cols-12 gap-2 border-t"
                  style={{ borderColor: "var(--color-grout)", background: "var(--color-kiln-dim)" }}>
                  <span className="col-span-7 text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
                    Total
                  </span>
                  <span className="col-span-2 text-right text-xs font-[family-name:var(--font-mono)] font-medium"
                    style={{ color: "var(--color-ink)" }}>
                    {total_boxes}
                  </span>
                  <span className="col-span-3 text-right text-sm font-[family-name:var(--font-mono)] font-medium"
                    style={{ color: "var(--color-ink)" }}>
                    {fmt(total_value)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shade history tab */}
        {tab === "shades" && (
          <div>
            {safeShades.length === 0 ? (
              <div className="bg-white rounded-xl grout-border p-10 text-center">
                <Layers size={24} className="mx-auto mb-2" style={{ color: "var(--color-ink-soft)" }} />
                <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  No shade/lot data yet — make sure batches have lot numbers when stock comes in.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl grout-border overflow-hidden">
                <div className="px-4 py-2 text-xs font-medium grid grid-cols-12 gap-2"
                  style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
                  <span className="col-span-3">Lot</span>
                  <span className="col-span-5">Design</span>
                  <span className="col-span-2 text-right">Boxes</span>
                  <span className="col-span-2 text-right">Challan</span>
                </div>
                <div className="grout-divide">
                  {safeShades.map((s, i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 flex items-center gap-1.5">
                        {/* Shade swatch — deterministic colour from lot number */}
                        <span className="w-3 h-3 rounded-sm shrink-0 border"
                          style={{
                            background: `hsl(${s.lot_number.split("").reduce(
                              (acc, c) => acc + c.charCodeAt(0), 0) % 360}, 35%, 65%)`,
                            borderColor: "rgba(0,0,0,.1)",
                          }} />
                        <span className="text-sm font-[family-name:var(--font-mono)] truncate"
                          style={{ color: "var(--color-glaze-deep)" }}>
                          {s.lot_number}
                        </span>
                      </div>
                      <div className="col-span-5 min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
                          {s.brand} — {s.series_name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                          {s.size}{s.finish ? ` · ${s.finish}` : ""}
                        </p>
                      </div>
                      <span className="col-span-2 text-right text-sm font-[family-name:var(--font-mono)]"
                        style={{ color: "var(--color-ink-soft)" }}>
                        {s.boxes}
                      </span>
                      <span className="col-span-2 text-right text-xs font-[family-name:var(--font-mono)]"
                        style={{ color: "var(--color-ink-soft)" }}>
                        {s.challan_number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs mt-2 px-1" style={{ color: "var(--color-ink-soft)" }}>
              Use this when a customer returns for more of the same floor — match the lot number to avoid shade variation.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}