"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ArrowLeftRight, LogOut, Menu, X,
  BarChart2, FileText, Users, RefreshCw, Settings,
  Activity,
  ScanLine,
} from "lucide-react";
import { clearToken } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/stock/move", label: "Stock In / Out", icon: ArrowLeftRight },
  { href: "/orders", label: "Challans", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/reorder", label: "Reorder", icon: RefreshCw },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
        <div className="flex items-center gap-6">
          <span
            className="font-[family-name:var(--font-display)] text-[15px] tracking-tight italic shrink-0"
            style={{ color: "var(--color-glaze-deep)" }}
          >
            Tiles Stock
          </span>
          <div className="hidden lg:flex gap-1 text-sm">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  style={
                    active
                      ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)", fontWeight: 500 }
                      : { color: "var(--color-ink-soft)" }
                  }
                >
                  <Icon size={14} strokeWidth={2} />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        <button
          onClick={logout}
          className="hidden lg:flex text-sm px-3 py-1.5 rounded-md transition-colors hover:bg-[var(--color-kiln-dim)] items-center gap-1.5 shrink-0"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <LogOut size={14} />
          Log out
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden p-2 rounded-md"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t px-4 py-2 space-y-1" style={{ borderColor: "var(--color-grout)" }}>
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                style={
                  active
                    ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)", fontWeight: 500 }
                    : { color: "var(--color-ink-soft)" }
                }
              >
                <Icon size={16} />
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md flex items-center gap-2 text-sm w-full text-left"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
