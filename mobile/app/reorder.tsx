import { useState, useRef, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  Alert, TextInput, FlatList, Modal, Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { GroupBand, Loading, Empty } from "@/components/ui";

type Suggestion = {
  product_id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  boxes_in_stock: number;
  reorder_level: number;
  price_per_box: number;
  weeks_of_stock: number | null;
  suggested_reorder_qty: number;
};

type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  price_per_box: number;
  boxes_in_stock?: number;
};

export default function ReorderScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [scanning, setScanning] = useState(false);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const last = useRef({ code: "", at: 0 });

  // Reorder suggestions — below-level items
  const { data: suggData, isLoading: suggLoading, isFetching, refetch } = useQuery({
    queryKey: ["reorder"],
    queryFn: api.reorderSuggestions,
  });

  // Full product catalogue for search + scan
  const { data: prodData } = useQuery({
    queryKey: ["products"],
    queryFn: api.listProducts,
  });

  const suggestions: Suggestion[] = suggData ?? [];
  const products: Product[] = prodData ?? [];

  // Map product_id → product for scanner lookups
  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Suggestion IDs so we can mark them in the catalogue
  const suggestionIds = useMemo(
    () => new Set(suggestions.map((s) => s.product_id)),
    [suggestions]
  );

  // Cart totals computed from full product list
  const cartEntries = Object.entries(cart);
  const totalBoxes = cartEntries.reduce((a, [, b]) => a + b, 0);
  const totalValue = cartEntries.reduce((a, [id, qty]) => {
    const p = byId.get(id);
    const s = suggestions.find((s) => s.product_id === id);
    const price = p?.price_per_box ?? s?.price_per_box ?? 0;
    return a + qty * price;
  }, 0);

  // Filtered catalogue for the picker modal
  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.brand.toLowerCase().includes(q) ||
      p.series_name.toLowerCase().includes(q) ||
      (p.size ?? "").toLowerCase().includes(q)
    );
  });

  const add = (id: string, qty = 1) =>
    setCart((c) => (c[id] ? c : { ...c, [id]: qty }));
  const remove = (id: string) =>
    setCart((c) => { const n = { ...c }; delete n[id]; return n; });
  const adjust = (id: string, d: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(1, (c[id] ?? 0) + d) }));

  function toggle(s: Suggestion) {
    setCart((c) => {
      const n = { ...c };
      if (n[s.product_id]) delete n[s.product_id];
      else n[s.product_id] = s.suggested_reorder_qty || s.reorder_level || 1;
      return n;
    });
  }

  function onBarcode({ data: raw }: { data: string }) {
    const now = Date.now();
    if (raw === last.current.code && now - last.current.at < 2000) return;
    last.current = { code: raw, at: now };
    const id = raw.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    )?.[0];
    if (!id || !byId.has(id) || cart[id]) return;
    Vibration.vibrate(40);
    add(id);
  }

  // Items in the cart — some from suggestions, some from catalogue
  const cartItems = cartEntries.map(([id, qty]) => {
    const sugg = suggestions.find((s) => s.product_id === id);
    const prod = byId.get(id);
    return {
      id,
      qty,
      series_name: sugg?.series_name ?? prod?.series_name ?? id,
      brand: sugg?.brand ?? prod?.brand ?? "",
      size: sugg?.size ?? prod?.size ?? "",
      price_per_box: sugg?.price_per_box ?? prod?.price_per_box ?? 0,
      boxes_in_stock: sugg?.boxes_in_stock ?? prod?.boxes_in_stock ?? null,
    };
  });

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: cartItems.length ? 150 : 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isFetching && !suggLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        {/* ── Action buttons ── */}
        <View className="px-[22px] pt-6">
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (!permission?.granted) { requestPermission(); return; }
                setScanning(true);
              }}
              className="flex-1 flex-row items-center justify-center gap-2.5 bg-accent py-3.5"
            >
              <Svg width={15} height={15} viewBox="0 0 19 19" fill="none">
                <Rect x={1.5} y={1.5} width={6} height={6} stroke={C.onAccent} strokeWidth={1.5} />
                <Rect x={11.5} y={1.5} width={6} height={6} stroke={C.onAccent} strokeWidth={1.5} />
                <Rect x={1.5} y={11.5} width={6} height={6} stroke={C.onAccent} strokeWidth={1.5} />
                <Path d="M11.5 11.5h3v3h-3zM17.5 11.5v3M14.5 17.5h3M11.5 17.5h1" stroke={C.onAccent} strokeWidth={1.5} />
              </Svg>
              <Text className="font-sans-m text-[13px] text-onAccent">Scan tiles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPicking(true)}
              className="flex-1 flex-row items-center justify-center gap-2.5 border border-ghost py-3.5"
            >
              <Svg width={14} height={14} viewBox="0 0 15 15" fill="none">
                <Circle cx={6.5} cy={6.5} r={5} stroke={C.inkSoft} strokeWidth={1.4} />
                <Path d="M10.5 10.5L14 14" stroke={C.inkSoft} strokeWidth={1.4} strokeLinecap="round" />
              </Svg>
              <Text className="font-sans-m text-[13px] text-ink-soft">Search all</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Cart ── */}
        {cartItems.length > 0 && (
          <View className="mt-7">
            <GroupBand left="ADDED" right={`${cartItems.length} DESIGNS`} />
            {cartItems.map((item) => {
              const overstock =
                item.boxes_in_stock !== null && item.qty > item.boxes_in_stock;
              return (
                <View key={item.id} className="border-t border-hairline px-[22px] py-3"
                  style={{ backgroundColor: "rgba(47,184,174,0.06)" }}>
                  <View className="flex-row items-baseline gap-3">
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-sans-m text-[15px] text-ink">
                      {item.series_name}
                    </Text>
                    <Text className="font-mono text-[10px] tracking-[0.4px] text-ink-3">
                      {item.brand.toUpperCase()}
                    </Text>
                    <TouchableOpacity onPress={() => remove(item.id)} hitSlop={10}>
                      <Text className="font-mono text-[14px]" style={{ color: C.red }}>×</Text>
                    </TouchableOpacity>
                  </View>

                  {item.boxes_in_stock !== null && (
                    <Text className="mt-1 font-mono text-[9px] tracking-[0.6px]"
                      style={{ color: item.boxes_in_stock <= 0 ? C.red : C.ink4 }}>
                      {item.boxes_in_stock <= 0 ? "OUT OF STOCK" : `${item.boxes_in_stock} IN STOCK`}
                    </Text>
                  )}

                  <View className="mt-2.5 flex-row items-center gap-3">
                    <View className="flex-row items-center border border-rule">
                      <TouchableOpacity onPress={() => adjust(item.id, -1)} className="px-3.5 py-1.5">
                        <Text className="font-sans text-[17px] text-ink-3">−</Text>
                      </TouchableOpacity>
                      <Text className="w-10 text-center font-sans-sb text-[15px] text-ink" style={TNUM}>
                        {item.qty}
                      </Text>
                      <TouchableOpacity onPress={() => adjust(item.id, 1)} className="px-3.5 py-1.5">
                        <Text className="font-sans text-[17px] text-ink-3">+</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1" />
                    {item.price_per_box > 0 && (
                      <Text className="font-mono text-[11px] text-ink-3" style={TNUM}>
                        ≈ {money(item.qty * item.price_per_box)}
                      </Text>
                    )}
                  </View>

                  {overstock && (
                    <Text className="mt-1.5 font-mono text-[9px] tracking-[0.6px]" style={{ color: C.amber }}>
                      ORDERING MORE THAN CURRENT STOCK
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Suggestions ── */}
        <View className="mt-7">
          {suggLoading ? (
            <Loading />
          ) : suggestions.length === 0 ? (
            <View className="px-[22px] pt-4">
              <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">BELOW LEVEL</Text>
              <Text className="mt-2 font-sans text-[13px] text-ink-3">
                Everything is above its reorder level.
              </Text>
            </View>
          ) : (
            <>
              <View className="px-[22px] pb-4">
                <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">BELOW LEVEL</Text>
                <Text className="mt-2.5 font-sans-sb text-[46px] leading-[50px] tracking-[-1.8px]"
                  style={{ color: C.amber, ...TNUM }}>
                  {suggestions.length}
                </Text>
                <Text className="mt-1.5 font-mono text-[10px] leading-[16px] tracking-[0.6px] text-ink-3">
                  TAP TO ADD TO ORDER · USE SEARCH FOR ANYTHING ELSE
                </Text>
              </View>

              <GroupBand left="SUGGESTIONS" right={`${suggestions.length} DESIGNS`} />
              {suggestions.map((s) => {
                const on = !!cart[s.product_id];
                const urgent = s.weeks_of_stock !== null && s.weeks_of_stock <= 1;
                return (
                  <View key={s.product_id} className="border-t border-hairline"
                    style={on ? { backgroundColor: "rgba(47,184,174,0.06)" } : undefined}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => toggle(s)}
                      className="flex-row items-center gap-3 px-[22px] py-3"
                    >
                      <View className="h-5 w-5 items-center justify-center border"
                        style={{
                          borderColor: on ? C.accent : C.rule,
                          backgroundColor: on ? C.accent : "transparent",
                        }}>
                        {on && <Text className="font-sans-sb text-[11px]" style={{ color: C.onAccent }}>✓</Text>}
                      </View>

                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="font-sans-m text-[15px] text-ink">
                          {s.series_name}
                        </Text>
                        <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                          {s.brand.toUpperCase()} · {s.boxes_in_stock} LEFT · LEVEL {s.reorder_level}
                          {s.weeks_of_stock !== null && (
                            <Text style={{ color: urgent ? C.red : C.amber }}>
                              {" "}· ~{s.weeks_of_stock}W
                            </Text>
                          )}
                        </Text>
                      </View>

                      {!on && s.suggested_reorder_qty > 0 && (
                        <Text className="font-mono text-[10px] tracking-[0.6px] text-ink-4" style={TNUM}>
                          +{s.suggested_reorder_qty}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {on && (
                      <View className="flex-row items-center gap-3 px-[22px] pb-3 pl-[54px]">
                        <View className="flex-row items-center border border-rule">
                          <TouchableOpacity onPress={() => adjust(s.product_id, -1)} className="px-3.5 py-1.5">
                            <Text className="font-sans text-[17px] text-ink-3">−</Text>
                          </TouchableOpacity>
                          <Text className="w-10 text-center font-sans-sb text-[15px] text-ink" style={TNUM}>
                            {cart[s.product_id]}
                          </Text>
                          <TouchableOpacity onPress={() => adjust(s.product_id, 1)} className="px-3.5 py-1.5">
                            <Text className="font-sans text-[17px] text-ink-3">+</Text>
                          </TouchableOpacity>
                        </View>
                        <View className="flex-1" />
                        {s.price_per_box > 0 && (
                          <Text className="font-mono text-[11px] text-ink-3" style={TNUM}>
                            ≈ {money(cart[s.product_id] * s.price_per_box)}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── PO footer ── */}
      {cartItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-rule bg-bg px-[22px] pb-8 pt-3.5">
          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="font-mono text-[10px] tracking-[1.2px] text-ink-3" style={TNUM}>
              {cartItems.length} DESIGN{cartItems.length > 1 ? "S" : ""} · {totalBoxes} BOX
            </Text>
            <Text className="font-sans-sb text-[20px] text-ink" style={TNUM}>
              {totalValue > 0 ? `≈ ${money(totalValue)}` : "—"}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert(
                "Purchase order",
                "PDF generation isn't wired up on mobile yet — open the web app to download it."
              )
            }
            className="items-center bg-accent py-4"
          >
            <Text className="font-sans-m text-[14px] text-onAccent">Create purchase order</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Scanner ── */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View className="flex-1 bg-bg">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={onBarcode}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          >
            <View className="flex-1 justify-between px-[22px] pb-10 pt-16">
              <View>
                <Text className="font-mono text-[10px] tracking-[1.4px] text-white/60">
                  SCAN TO ADD
                </Text>
                <Text className="mt-2 font-sans-sb text-[26px] text-white" style={TNUM}>
                  {cartItems.length} added
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setScanning(false)}
                activeOpacity={0.85}
                className="items-center bg-accent py-4"
              >
                <Text className="font-sans-m text-[14px] text-onAccent">
                  Done — {cartItems.length} design{cartItems.length === 1 ? "" : "s"}
                </Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* ── Full catalogue picker ── */}
      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => { setPicking(false); setSearch(""); }}>
        <View className="flex-1 bg-bg">
          <View className="border-b border-rule px-[22px] py-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-mono text-[11px] tracking-[1.4px] text-ink">ADD FROM CATALOGUE</Text>
              <TouchableOpacity onPress={() => { setPicking(false); setSearch(""); }} hitSlop={10}>
                <Text className="font-sans-m text-[13px] text-accent">Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="SEARCH DESIGN / BRAND / SIZE"
              placeholderTextColor={C.ink4}
              autoCapitalize="characters"
              autoFocus
              className="border border-rule bg-field px-3.5 py-3 font-mono text-[11px] tracking-[0.66px] text-ink"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: p }) => {
              const on = !!cart[p.id];
              const isSuggestion = suggestionIds.has(p.id);
              const stock = p.boxes_in_stock ?? 0;
              const stockTone = stock <= 0 ? C.red : stock <= 10 ? C.amber : C.ink4;
              return (
                <TouchableOpacity
                  onPress={() => (on ? remove(p.id) : add(p.id))}
                  activeOpacity={0.85}
                  className="flex-row items-baseline gap-3 border-b border-hairline px-[22px] py-3.5"
                >
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text numberOfLines={1} className="font-sans-m text-[15px]"
                        style={{ color: on ? C.accent : C.ink }}>
                        {p.series_name}
                      </Text>
                      {isSuggestion && (
                        <View className="rounded-sm px-1.5 py-0.5"
                          style={{ backgroundColor: C.amber + "33" }}>
                          <Text className="font-mono text-[8px] tracking-[0.6px]"
                            style={{ color: C.amber }}>LOW</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                      {[p.brand.toUpperCase(), p.size, p.finish?.toUpperCase()].filter(Boolean).join("  ·  ")}
                    </Text>
                    <Text className="mt-0.5 font-mono text-[9px] tracking-[0.6px]" style={{ color: stockTone }}>
                      {stock <= 0 ? "OUT OF STOCK" : `${stock} IN STOCK`}
                    </Text>
                  </View>
                  <Text className="font-mono text-[10px] tracking-[1px]"
                    style={{ color: on ? C.accent : C.ink4 }}>
                    {on ? "ADDED" : "ADD +"}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Empty title="No match" body={`Nothing matches "${search}".`} />
            }
          />
        </View>
      </Modal>
    </View>
  );
}