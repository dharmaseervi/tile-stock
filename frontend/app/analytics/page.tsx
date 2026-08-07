"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Package,
  IndianRupee, Boxes, Clock, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type ProductStat = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  total_in: number;
  total_out: number;
  in_stock: number;
  turnover: number;
  revenue: number;
  last_moved_at: string | null;
};

const GLAZE = "#1F6F6B";
const MOSS = "#3F7248";
const OXIDE = "#A6432E";
const OCHRE = "#B4821E";
const GROUT = "#DCDFD9";

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ border: `1px solid ${GROUT}` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="font-[family-name:var(--font-mono)] text-lg leading-none truncate" style={{ color: "var(--color-ink)" }}>
          {value}
        </div>
        <div className="text-xs mt-1 truncate" style={{ color: "var(--color-ink-soft)" }}>{label}</div>
        {sub && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-ink-soft)", opacity: 0.7 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-medium" style={{ color: "var(--color-ink)" }}>{title}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>{sub}</p>}
    </div>
  );
}

function ProductRow({ stat, rank }: { stat: ProductStat; rank: number }) {
  const label = `${stat.brand} — ${stat.series_name} (${stat.size})`;
  return (
    <Link href={`/products/${stat.product_id}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
        <span className="text-xs w-5 text-center shrink-0 font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink-soft)" }}>
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>{label}</p>
          {stat.finish && <p className="text-xs truncate" style={{ color: "var(--color-ink-soft)" }}>{stat.finish}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-[family-name:var(--font-mono)]" style={{ color: MOSS }}>
            {stat.total_out} out
          </p>
          {stat.revenue > 0 && (
            <p className="text-xs font-[family-name:var(--font-mono)]" style={{ color: "var(--color-ink-soft)" }}>
              ₹{stat.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
        <ArrowRight size={14} style={{ color: "var(--color-grout-strong)" }} className="shrink-0" />
      </div>
    </Link>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 text-xs" style={{ border: `1px solid ${GROUT}` }}>
      <p className="font-medium mb-1" style={{ color: "var(--color-ink)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ProductStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  function getDateRange(p: string): { from?: string; to?: string } {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (p === "this_month") {
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)) };
    }
    if (p === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: fmt(end) };
    }
    if (p === "last_30") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: fmt(d) };
    }
    if (p === "last_90") {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return { from: fmt(d) };
    }
    if (p === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return {};
  }

  function load() {
    setLoading(true);
    const { from, to } = getDateRange(period);
    api.analytics(from, to)
      .then((data) => setStats(data.products ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    load();
  }, [router, period]);

  // Custom range: only fetch when both dates are set
  useEffect(() => {
    if (period === "custom" && customFrom) load();
  }, [customFrom, customTo]);

  const SIXTY_DAYS_AGO = Date.now() - 60 * 24 * 60 * 60 * 1000;

  const bestSellers = [...stats].sort((a, b) => b.total_out - a.total_out).slice(0, 5);
  const deadStock = stats.filter((s) => {
    if (s.in_stock <= 0) return false;
    if (!s.last_moved_at) return true;
    return new Date(s.last_moved_at).getTime() < SIXTY_DAYS_AGO;
  });
  const noMovement = stats.filter((s) => s.total_in === 0 && s.total_out === 0);

  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
  const totalOut = stats.reduce((sum, s) => sum + s.total_out, 0);
  const totalIn = stats.reduce((sum, s) => sum + s.total_in, 0);
  const totalStock = stats.reduce((sum, s) => sum + s.in_stock, 0);

  // Brand-wise turnover for bar chart (top 6 brands)
  const brandMap: Record<string, number> = {};
  stats.forEach((s) => {
    brandMap[s.brand] = (brandMap[s.brand] || 0) + s.total_out;
  });
  const brandData = Object.entries(brandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([brand, out]) => ({ brand: brand.length > 10 ? brand.slice(0, 9) + "…" : brand, out }));

  // Size-wise distribution for pie chart
  const sizeMap: Record<string, number> = {};
  stats.forEach((s) => {
    if (s.total_out > 0) sizeMap[s.size] = (sizeMap[s.size] || 0) + s.total_out;
  });
  const sizeData = Object.entries(sizeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([size, value]) => ({ name: size, value }));

  const PIE_COLORS = [GLAZE, MOSS, OCHRE, "#5B7FA3", "#8B6FAF"];

  // Finish-wise stock split
  const finishMap: Record<string, number> = {};
  stats.forEach((s) => {
    const f = s.finish || "Unspecified";
    finishMap[f] = (finishMap[f] || 0) + s.in_stock;
  });
  const finishData = Object.entries(finishMap)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
        <Nav />
        <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-grout)" }} />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-10">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
            Analytics
          </h1>

          {/* Period filter */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "this_month", label: "This month" },
              { key: "last_month", label: "Last month" },
              { key: "last_30",   label: "30 days" },
              { key: "last_90",   label: "90 days" },
              { key: "all",       label: "All time" },
              { key: "custom",    label: "Custom" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                style={period === p.key
                  ? { background: "var(--color-glaze)", color: "#fff" }
                  : { background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {period === "custom" && (
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <input
                type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm outline-none"
                style={{ borderColor: "var(--color-grout)" }}
              />
              <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>to</span>
              <input
                type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm outline-none"
                style={{ borderColor: "var(--color-grout)" }}
              />
            </div>
          )}
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Package} label="Products" value={stats.length} accent={GLAZE} />
          <StatCard icon={Boxes} label="Total in stock" value={totalStock} sub="boxes" accent={MOSS} />
          <StatCard icon={TrendingUp} label="Total sold" value={totalOut} sub="boxes out" accent={GLAZE} />
          <StatCard
            icon={IndianRupee}
            label="Revenue"
            value={totalRevenue >= 100000 ? `₹${(totalRevenue / 100000).toFixed(1)}L` : `₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            sub="from stock out"
            accent={MOSS}
          />
        </div>

        {/* Brand turnover chart */}
        {brandData.length > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-5" style={{ border: `1px solid ${GROUT}` }}>
            <SectionHeader title="Brand Performance" sub="Boxes sold per brand" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={brandData} barSize={28}>
                <XAxis dataKey="brand" tick={{ fontSize: 11, fill: "#52605B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#52605B" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="out" name="Boxes sold" radius={[4, 4, 0, 0]}>
                  {brandData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? GLAZE : i === 1 ? MOSS : "#8BB5B2"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Size and Finish distribution side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sizeData.length > 0 && (
            <div className="bg-white rounded-xl p-4 sm:p-5" style={{ border: `1px solid ${GROUT}` }}>
              <SectionHeader title="Size Distribution" sub="By boxes sold" />
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sizeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sizeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {finishData.length > 0 && (
            <div className="bg-white rounded-xl p-4 sm:p-5" style={{ border: `1px solid ${GROUT}` }}>
              <SectionHeader title="Finish Mix" sub="Current stock by finish type" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={finishData} layout="vertical" barSize={18}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#52605B" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#52605B" }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Boxes" radius={[0, 4, 4, 0]}>
                    {finishData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Best sellers */}
        {bestSellers.some((s) => s.total_out > 0) && (
          <div>
            <SectionHeader
              title="Best Sellers"
              sub="Products with the highest boxes sold"
            />
            <div className="bg-white rounded-xl overflow-hidden grout-divide" style={{ border: `1px solid ${GROUT}` }}>
              {bestSellers
                .filter((s) => s.total_out > 0)
                .map((stat, i) => (
                  <ProductRow key={stat.product_id} stat={stat} rank={i + 1} />
                ))}
            </div>
          </div>
        )}

        {/* Dead stock alert */}
        {deadStock.length > 0 && (
          <div>
            <SectionHeader
              title="Dead Stock"
              sub="In stock but no movement in 60+ days — consider discounting"
            />
            <div className="bg-white rounded-xl overflow-hidden grout-divide" style={{ border: `1px solid ${GROUT}` }}>
              {deadStock.map((stat) => (
                <Link key={stat.product_id} href={`/products/${stat.product_id}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
                    <Clock size={14} style={{ color: OCHRE }} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
                        {stat.brand} — {stat.series_name} ({stat.size})
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {stat.in_stock} boxes in stock
                        {stat.last_moved_at
                          ? ` · last moved ${new Date(stat.last_moved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                          : " · never moved"}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full shrink-0" style={{ background: "#FAF0DA", color: OCHRE }}>
                      Slow
                    </span>
                    <ArrowRight size={14} style={{ color: "var(--color-grout-strong)" }} className="shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No movement products */}
        {noMovement.length > 0 && (
          <div>
            <SectionHeader
              title="No Activity Yet"
              sub="Products added but never stocked in or out"
            />
            <div className="bg-white rounded-xl overflow-hidden grout-divide" style={{ border: `1px solid ${GROUT}` }}>
              {noMovement.slice(0, 5).map((stat) => (
                <Link key={stat.product_id} href={`/products/${stat.product_id}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-kiln-dim)] transition-colors cursor-pointer">
                    <TrendingDown size={14} style={{ color: OXIDE }} className="shrink-0" />
                    <p className="text-sm flex-1 truncate" style={{ color: "var(--color-ink)" }}>
                      {stat.brand} — {stat.series_name} ({stat.size})
                    </p>
                    <ArrowRight size={14} style={{ color: "var(--color-grout-strong)" }} className="shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {stats.length === 0 && (
          <div className="bg-white rounded-xl p-10 flex flex-col items-center text-center gap-3" style={{ border: `1px solid ${GROUT}` }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--color-kiln-dim)" }}>
              <TrendingUp size={22} style={{ color: "var(--color-ink-soft)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>No data yet</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                Add products and record stock movements to see analytics.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}