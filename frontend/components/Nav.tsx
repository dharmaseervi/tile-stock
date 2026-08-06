"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ArrowLeftRight, LogOut, Menu, X,
  BarChart2, FileText, Users, RefreshCw, Settings,
  Activity, ScanLine,
} from "lucide-react";
import { clearToken } from "@/lib/api";

const primary = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/orders", label: "Challans", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/stock/move", label: "Stock In/Out", icon: ArrowLeftRight },
];

const secondary = [
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/reorder", label: "Reorder", icon: RefreshCw },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const all = [...primary, ...secondary];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-20" style={{ borderColor: "var(--color-grout)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <span
          className="font-[family-name:var(--font-display)] text-[15px] tracking-tight italic shrink-0"
          style={{ color: "var(--color-glaze-deep)" }}
        >
          Tiles Stock
        </span>

        {/* Desktop nav — only at lg (1024px+) */}
       <div className="hidden lg:flex items-center gap-0.5 text-sm px-3">
          {primary.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="h-8 px-2 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                style={active
                  ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)", fontWeight: 500 }
                  : { color: "var(--color-ink-soft)" }}
              >
                <Icon size={13} strokeWidth={2} />
                <span className="text-[13px]">{l.label}</span>
              </Link>
            );
          })}

          <div className="w-px h-5 mx-1 shrink-0" style={{ background: "var(--color-grout)" }} />

          {secondary.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                title={l.label}
                className="h-8 px-2 rounded-md transition-colors inline-flex items-center gap-1 shrink-0"
                style={active
                  ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)" }
                  : { color: "var(--color-ink-soft)" }}
              >
                <Icon size={13} strokeWidth={2} />
                <span className="hidden xl:inline text-[13px]">{l.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Log out — desktop only */}
        <button
          onClick={logout}
          title="Log out"
          className="hidden lg:inline-flex h-8 w-8 rounded-md transition-colors hover:bg-[var(--color-kiln-dim)] items-center justify-center shrink-0"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <LogOut size={15} />
        </button>

        {/* Hamburger — below lg only */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden p-2 rounded-md"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu — below lg */}
      {open && (
        <div className="lg:hidden border-t px-4 py-2 space-y-0.5" style={{ borderColor: "var(--color-grout)" }}>
          {all.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                style={active
                  ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)", fontWeight: 500 }
                  : { color: "var(--color-ink-soft)" }}
              >
                <Icon size={15} />
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md flex items-center gap-2 text-sm w-full text-left"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}