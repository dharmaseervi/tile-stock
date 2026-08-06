"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, ChevronDown, X } from "lucide-react";

export type PickerProduct = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  price_per_box?: number;
};

/**
 * Type-to-search product picker.
 *
 * A native <select> is unusable once a dealer has a few hundred designs —
 * you cannot type "kajaria 600" and narrow it. This filters across brand,
 * series, size and finish as you type, and keeps the whole list reachable
 * by keyboard.
 */
export default function ProductPicker({
  products,
  value,
  onChange,
  placeholder = "Search brand, series, or size…",
  autoFocus = false,
  disabledIds = [],
}: {
  products: PickerProduct[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Ids already used elsewhere — shown greyed with a note. */
  disabledIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find((p) => p.id === value) || null;

  const label = (p: PickerProduct) =>
    `${p.brand} — ${p.series_name} (${p.size}${p.finish ? `, ${p.finish}` : ""})`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    // Match every whitespace-separated term, so "kajaria 600 matte" narrows
    // progressively rather than needing an exact phrase.
    const terms = q.split(/\s+/);
    return products.filter((p) => {
      const hay = `${p.brand} ${p.series_name} ${p.size} ${p.finish ?? ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [products, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function pick(p: PickerProduct) {
    if (disabledIds.includes(p.id)) return;
    onChange(p.id);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[cursor]) pick(filtered[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border rounded-md px-3 py-2 text-sm text-left flex items-center justify-between gap-2 bg-white"
        style={{ borderColor: "var(--color-grout)" }}
      >
        <span className="truncate" style={{ color: selected ? "var(--color-ink)" : "var(--color-ink-soft)" }}>
          {selected ? label(selected) : "Select tile"}
        </span>
        <ChevronDown
          size={15}
          className="shrink-0 transition-transform"
          style={{ color: "var(--color-ink-soft)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-md shadow-lg overflow-hidden"
          style={{ border: "1px solid var(--color-grout)" }}
        >
          <div className="relative" style={{ borderBottom: "1px solid var(--color-grout)" }}>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-ink-soft)" }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className="w-full pl-8 pr-8 py-2.5 text-sm outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "var(--color-ink-soft)" }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-sm text-center" style={{ color: "var(--color-ink-soft)" }}>
                No tile matches “{query}”.
              </p>
            )}
            {filtered.map((p, i) => {
              const isSel = p.id === value;
              const isDisabled = disabledIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => pick(p)}
                  onMouseEnter={() => setCursor(i)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2 disabled:cursor-not-allowed"
                  style={{
                    background: i === cursor && !isDisabled ? "var(--color-kiln-dim)" : "transparent",
                    opacity: isDisabled ? 0.45 : 1,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
                      {p.brand} — {p.series_name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {p.size}
                      {p.finish ? ` · ${p.finish}` : ""}
                      {isDisabled ? " · already added" : ""}
                    </p>
                  </div>
                  {p.price_per_box ? (
                    <span
                      className="text-xs font-[family-name:var(--font-mono)] shrink-0"
                      style={{ color: "var(--color-ink-soft)" }}
                    >
                      ₹{p.price_per_box.toFixed(0)}
                    </span>
                  ) : null}
                  {isSel && <Check size={14} className="shrink-0" style={{ color: "var(--color-glaze)" }} />}
                </button>
              );
            })}
          </div>

          <div
            className="px-3 py-1.5 text-[11px]"
            style={{ borderTop: "1px solid var(--color-grout)", color: "var(--color-ink-soft)" }}
          >
            {filtered.length} of {products.length} tiles
          </div>
        </div>
      )}
    </div>
  );
}