import { useMemo, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { api } from "@/lib/api";

/* Tailwind has no fontVariant utility, so tabular figures stay inline.
   Everything else is a class. */
const TNUM = { fontVariant: ["tabular-nums" as const] };

const ACCENT = "#2FB8AE";
const AMBER = "#E8A33D";
const RED = "#E0533F";
const INK = "#F3EFE7";
const INK_OUT = "#B8AFA3";
const MUTED = "#9E968A";

/* TODO: no endpoint returns the org name — signup accepts it but nothing
   reads it back. Add GET /org and swap this out. */
const SHOP_NAME = "Shree Balaji Tiles";

type StockRow = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  boxes_in_stock: number;
  stock_value: number;
  reorder_level: number;
  price_per_box: number;
};

type Status = "ok" | "low" | "out";

const statusOf = (r: StockRow): Status =>
  r.boxes_in_stock === 0 ? "out" : r.boxes_in_stock <= r.reorder_level ? "low" : "ok";

function syncedLabel(ts?: number) {
  if (!ts) return "SYNCING";
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} HR${hrs > 1 ? "S" : ""} AGO`;
}

const today = () =>
  new Date()
    .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    .toUpperCase();

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["stock"],
    queryFn: api.currentStock,
  });

  const rows: StockRow[] = data ?? [];

  const { counts, groups, totalBoxes, totalValue } = useMemo(() => {
    const c = { ok: 0, low: 0, out: 0 };
    rows.forEach((r) => { c[statusOf(r)] += 1; });

    const q = search.trim().toLowerCase();
    const visible = rows.filter((r) => {
      if (lowOnly && statusOf(r) === "ok") return false;
      if (!q) return true;
      return (
        r.brand.toLowerCase().includes(q) ||
        r.series_name.toLowerCase().includes(q) ||
        r.size.toLowerCase().includes(q) ||
        (r.finish ?? "").toLowerCase().includes(q)
      );
    });

    // Group by brand, brands in alphabetical order, biggest holdings first
    // within each brand — the ledger reads like a stock register.
    const byBrand = new Map<string, StockRow[]>();
    visible.forEach((r) => {
      const k = r.brand || "—";
      if (!byBrand.has(k)) byBrand.set(k, []);
      byBrand.get(k)!.push(r);
    });

    const g = Array.from(byBrand.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, items]) => ({
        brand: brand.toUpperCase(),
        total: items.reduce((a, r) => a + r.boxes_in_stock, 0),
        items: items.sort((a, b) => b.boxes_in_stock - a.boxes_in_stock),
      }));

    return {
      counts: c,
      groups: g,
      totalBoxes: rows.reduce((a, r) => a + r.boxes_in_stock, 0),
      totalValue: rows.reduce((a, r) => a + (r.stock_value || 0), 0),
    };
  }, [rows, lowOnly, search]);

  const lowCount = counts.low + counts.out;

  const stockValue =
    totalValue >= 10000000 ? `₹${(totalValue / 10000000).toFixed(1)}Cr`
    : totalValue >= 100000 ? `₹${(totalValue / 100000).toFixed(1)}L`
    : `₹${Math.round(totalValue).toLocaleString("en-IN")}`;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />

      {/* ── Masthead ────────────────────────────────────
          Inset-driven rather than the design's fixed 58px, so it
          holds across notch sizes. */}
      <View className="px-[22px]" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-baseline justify-between">
          <Text className="font-mono text-[10px] tracking-[1.4px] text-ink-3">
            {SHOP_NAME.toUpperCase()}
          </Text>
          <Text className="font-mono text-[10px] tracking-[1.4px] text-ink-3">
            {today()} · {syncedLabel(dataUpdatedAt)}
          </Text>
        </View>

        {/* ── Hero ─────────────────────────────────────── */}
        <View className="flex-row items-end justify-between pt-11">
          <View>
            <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
              STOCK VALUE
            </Text>
            <Text
              className="mt-2 font-sans-sb text-[82px] leading-[88px] tracking-[-3.28px] text-ink-hi"
              style={TNUM}
            >
              {stockValue}
            </Text>
          </View>
          <View className="pb-2">
            <Text className="text-right font-mono text-[11px] leading-[21px] text-ink-2" style={TNUM}>
              {totalBoxes.toLocaleString("en-IN")} BOX
            </Text>
            <Text className="text-right font-mono text-[11px] leading-[21px] text-ink-2" style={TNUM}>
              {rows.length} DESIGNS
            </Text>
          </View>
        </View>

        {/* ── Distribution bar ─────────────────────────
            Healthy / low / out as one 3px rule, widths proportional
            to counts. The shape of the catalogue in a single glance. */}
        <View className="mt-[30px] h-[3px] flex-row gap-0.5">
          <View style={{ flex: counts.ok, backgroundColor: ACCENT }} />
          <View style={{ flex: counts.low, backgroundColor: AMBER }} />
          <View style={{ flex: counts.out, backgroundColor: RED }} />
        </View>

        {/* ── Low-stock line ───────────────────────────── */}
        {lowCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { setLowOnly(true); setOpenId(null); }}
            className="mt-3.5 flex-row items-center gap-2.5"
          >
            <Text className="font-mono text-[11px] leading-[17px] text-amber">▲</Text>
            <Text className="font-mono text-[11px] leading-[17px] tracking-[0.44px] text-amber-txt">
              {lowCount} DESIGNS AT OR BELOW REORDER
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Search + scan ────────────────────────────── */}
        <View className="mt-6 flex-row items-stretch gap-2">
          <View className="flex-1 flex-row items-center gap-2.5 border border-rule bg-field px-3 py-3">
            <Svg width={14} height={14} viewBox="0 0 15 15" fill="none">
              <Circle cx={6.5} cy={6.5} r={5} stroke={MUTED} strokeWidth={1.4} />
              <Path d="M10.5 10.5L14 14" stroke={MUTED} strokeWidth={1.4} strokeLinecap="round" />
            </Svg>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="SEARCH DESIGN / BRAND / SIZE"
              placeholderTextColor={MUTED}
              autoCapitalize="characters"
              className="h-4 flex-1 p-0 font-mono text-[11px] tracking-[0.66px] text-ink"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <Text className="font-mono text-[12px] text-ink-3">×</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setScanOpen(true)}
            className="w-11 items-center justify-center bg-accent"
          >
            <QrGlyph size={19} color="#161410" />
          </TouchableOpacity>
        </View>

        {/* ── Text actions ─────────────────────────────
            Underlined links rather than buttons — they're secondary
            to scanning, and boxes here would crowd the masthead. */}
        <View className="mt-4 flex-row gap-[22px] pb-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/orders/new")}
            className="border-b border-link pb-1"
          >
            <Text className="font-sans-m text-[12px] text-ink-soft">New challan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/products/new")}
            className="border-b border-link pb-1"
          >
            <Text className="font-sans-m text-[12px] text-ink-soft">Add product</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Ledger ──────────────────────────────────────
          Masthead above is fixed; only this scrolls, so the headline
          figure stays put while browsing. */}
      <ScrollView
        className="flex-1 border-t border-rule"
        contentContainerStyle={{ paddingBottom: 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={MUTED}
          />
        }
      >
        {lowOnly && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setLowOnly(false)}
            className="flex-row items-center justify-between px-[22px] py-2.5"
            style={{ backgroundColor: "rgba(232,163,61,0.10)" }}
          >
            <Text className="font-mono text-[10px] tracking-[1.2px] text-amber">
              SHOWING BELOW REORDER
            </Text>
            <Text className="font-mono text-[10px] tracking-[1.2px] text-amber">CLEAR ×</Text>
          </TouchableOpacity>
        )}

        {isLoading ? (
          <ActivityIndicator color={MUTED} className="mt-10" />
        ) : groups.length === 0 ? (
          <View className="items-center px-6 py-14">
            <Text className="font-sans-sb text-[16px] text-ink">
              {rows.length === 0
                ? "No stock yet"
                : search
                ? "No match"
                : "Nothing below reorder"}
            </Text>
            <Text className="mt-1.5 text-center font-sans text-[13px] leading-[19px] text-ink-3">
              {rows.length === 0
                ? "Add your first design and stock starts tracking itself."
                : search
                ? `Nothing matches “${search}”.`
                : "Every design is above its reorder level."}
            </Text>
            {rows.length === 0 && (
              <TouchableOpacity
                onPress={() => router.push("/products/new")}
                activeOpacity={0.85}
                className="mt-5 bg-accent px-5 py-2.5"
              >
                <Text className="font-sans-m text-[13px] text-onAccent">Add a design</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.brand}>
              <View className="flex-row items-baseline justify-between bg-band px-[22px] pb-[7px] pt-3.5">
                <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
                  {g.brand}
                </Text>
                <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3" style={TNUM}>
                  {g.total.toLocaleString("en-IN")} BOX
                </Text>
              </View>

              {g.items.map((r) => (
                <LedgerRow
                  key={r.product_id}
                  row={r}
                  open={openId === r.product_id}
                  onToggle={() => setOpenId(openId === r.product_id ? null : r.product_id)}
                  onAddStock={() => router.push(`/products/${r.product_id}`)}
                  onChallan={() => router.push("/orders/new")}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Scan overlay ────────────────────────────────── */}
      <Modal visible={scanOpen} transparent animationType="fade" onRequestClose={() => setScanOpen(false)}>
        <View
          className="flex-1 items-center justify-center gap-6"
          style={{ backgroundColor: "rgba(10,9,8,0.95)" }}
        >
          <View className="h-[210px] w-[210px]">
            {[
              "top-0 left-0 border-t-2 border-l-2",
              "top-0 right-0 border-t-2 border-r-2",
              "bottom-0 left-0 border-b-2 border-l-2",
              "bottom-0 right-0 border-b-2 border-r-2",
            ].map((pos) => (
              <View key={pos} className={`absolute h-11 w-11 ${pos}`} style={{ borderColor: ACCENT }} />
            ))}
          </View>

          <Text className="font-mono text-[11px] tracking-[1.32px] text-ink-3">
            POINT AT THE BOX LABEL
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { setScanOpen(false); router.push("/(tabs)/scan"); }}
            className="bg-accent px-[22px] py-3"
          >
            <Text className="font-sans-m text-[12px] text-onAccent">Open camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setScanOpen(false)}
            className="border border-link px-[22px] py-3"
          >
            <Text className="font-sans-m text-[12px] text-ink-soft">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

/* ── Ledger row ───────────────────────────────────────────
   Tapping expands in place to show the reorder point, the rate,
   and the two actions you'd take next — so acting on a low count
   doesn't cost a screen transition. */
function LedgerRow({ row, open, onToggle, onAddStock, onChallan }: {
  row: StockRow;
  open: boolean;
  onToggle: () => void;
  onAddStock: () => void;
  onChallan: () => void;
}) {
  const st = statusOf(row);
  const countColor = st === "out" ? RED : st === "low" ? AMBER : INK;
  const nameColor = st === "out" ? INK_OUT : INK;
  const meta = [row.size, row.finish?.toUpperCase()].filter(Boolean).join(" ");

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onToggle}
      className="border-t border-hairline"
      style={open ? { backgroundColor: "rgba(255,255,255,0.035)" } : undefined}
    >
      <View className="flex-row items-baseline gap-3 px-[22px] py-[11px]">
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1 font-sans-m text-[15px] leading-[18px]"
          style={{ color: nameColor }}
        >
          {row.series_name}
        </Text>
        <Text className="font-mono text-[10px] tracking-[0.4px] text-ink-3">{meta}</Text>
        {/* Fixed width right-aligns every figure into one column */}
        <Text
          className="w-[46px] text-right font-sans-sb text-[17px]"
          style={{ color: countColor, ...TNUM }}
        >
          {row.boxes_in_stock}
        </Text>
      </View>

      {open && (
        <View className="flex-row items-center gap-2.5 px-[22px] pb-3.5">
          <Text className="flex-1 font-mono text-[10px] leading-[14px] tracking-[0.4px] text-ink-3">
            REORDER AT {row.reorder_level}
            {row.price_per_box > 0
              ? ` · ₹${Math.round(row.price_per_box).toLocaleString("en-IN")}/BOX`
              : ""}
          </Text>
          <TouchableOpacity onPress={onAddStock} activeOpacity={0.85} className="bg-accent px-3 py-[7px]">
            <Text className="font-sans-m text-[11px] text-onAccent">Add stock</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onChallan} activeOpacity={0.85} className="border border-ghost px-3 py-[7px]">
            <Text className="font-sans-m text-[11px] text-ink-soft">Challan</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** The design's QR mark — three finder squares plus a broken data block. */
function QrGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19" fill="none">
      <Rect x={1.5} y={1.5} width={6} height={6} stroke={color} strokeWidth={1.5} />
      <Rect x={11.5} y={1.5} width={6} height={6} stroke={color} strokeWidth={1.5} />
      <Rect x={1.5} y={11.5} width={6} height={6} stroke={color} strokeWidth={1.5} />
      <Path
        d="M11.5 11.5h3v3h-3zM17.5 11.5v3M14.5 17.5h3M11.5 17.5h1"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}