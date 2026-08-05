"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  AlertTriangle, Download, Search,
} from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type LogEntry = {
  id: string;
  movement_type: string;
  boxes: number;
  reference: string | null;
  brand: string;
  series_name: string;
  size: string;
  user_email: string | null;
  created_at: string;
};

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  in:         { icon: ArrowDownToLine, color: "var(--color-moss)",       label: "Stock In" },
  out:        { icon: ArrowUpFromLine, color: "var(--color-oxide)",      label: "Stock Out" },
  adjustment: { icon: RefreshCw,       color: "var(--color-glaze)",      label: "Adjustment" },
  damage:     { icon: AlertTriangle,   color: "var(--color-ochre)",      label: "Damage" },
};

export default function ActivityPage() {
  const router = useRouter();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.activityLog().then((l) => setLog(l ?? [])).finally(() => setLoading(false));
  }, [router]);

  const filtered = log.filter((e) => {
    const q = search.toLowerCase();
    return !q ||
      e.brand.toLowerCase().includes(q) ||
      e.series_name.toLowerCase().includes(q) ||
      (e.reference || "").toLowerCase().includes(q) ||
      (e.user_email || "").toLowerCase().includes(q);
  });

  const inputStyle = {
    borderColor: "var(--color-grout)",
    ["--tw-ring-color" as any]: "var(--color-glaze)",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-10">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
            Activity Log
          </h1>
          <button
            onClick={() => api.exportCSV(from || undefined, to || undefined)}
            className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md grout-border"
            style={{ color: "var(--color-glaze-deep)" }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }} />
            <input
              type="text"
              placeholder="Search product, ref, user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <input
            type="date" value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
            style={inputStyle}
            title="From date"
          />
          <input
            type="date" value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
            style={inputStyle}
            title="To date"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--color-grout)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg grout-border p-10 text-center">
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>No activity recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl grout-border overflow-hidden">
            <div className="grout-divide">
              {filtered.map((entry) => {
                const cfg = TYPE_CONFIG[entry.movement_type] || TYPE_CONFIG.out;
                const Icon = cfg.icon;
                return (
                  <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${cfg.color}18` }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
                        <span className="font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                        {" · "}{entry.brand} — {entry.series_name} ({entry.size})
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-ink-soft)" }}>
                        {entry.user_email || "Unknown user"}
                        {entry.reference ? ` · ${entry.reference}` : ""}
                        {" · "}{new Date(entry.created_at).toLocaleString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm shrink-0 font-medium"
                      style={{ color: cfg.color }}
                    >
                      {entry.movement_type === "in" ? "+" : "−"}{entry.boxes}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
