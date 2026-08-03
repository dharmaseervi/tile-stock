"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/stock/move", label: "Stock In / Out" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b" style={{ borderColor: "var(--color-grout)" }}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span
            className="font-[family-name:var(--font-display)] text-[15px] tracking-tight"
            style={{ color: "var(--color-glaze-deep)" }}
          >
            Tiles Stock
          </span>
          <div className="flex gap-1 text-sm">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-1.5 rounded-md transition-colors"
                  style={
                    active
                      ? { background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)", fontWeight: 500 }
                      : { color: "var(--color-ink-soft)" }
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm px-3 py-1.5 rounded-md transition-colors hover:bg-[var(--color-kiln-dim)]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
