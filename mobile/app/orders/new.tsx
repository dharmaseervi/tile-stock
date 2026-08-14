import { useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  ActivityIndicator, Alert, Vibration, FlatList,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { Eyebrow, Empty } from "@/components/ui";

type Product = {
  id: string; brand: string; series_name: string;
  size: string; finish: string | null;
  price_per_box: number; boxes_in_stock?: number;
};

export default function NewChallanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState("");
  const [scanning, setScanning] = useState(false);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef({ code: "", at: 0 });

  const { data } = useQuery({ queryKey: ["products"], queryFn: api.listProducts });
  const products: Product[] = data ?? [];

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const lines = Object.entries(cart)
    .map(([id, boxes]) => ({ product: byId.get(id), boxes }))
    .filter((l): l is { product: Product; boxes: number } => !!l.product);

  const totalBoxes = lines.reduce((a, l) => a + l.boxes, 0);
  const totalValue = lines.reduce((a, l) => a + l.boxes * l.product.price_per_box, 0);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.brand.toLowerCase().includes(q) ||
      p.series_name.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q)
    );
  });

  const add = (id: string) => setCart((c) => (c[id] ? c : { ...c, [id]: 1 }));
  const remove = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });
  const adjust = (id: string, d: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0.5, (c[id] ?? 0) + d) }));

  function onBarcode({ data: raw }: { data: string }) {
    const now = Date.now();
    // Rate-limit repeats so sweeping a wall doesn't add the same tile twice.
    if (raw === last.current.code && now - last.current.at < 2000) return;
    last.current = { code: raw, at: now };

    const id = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (!id || !byId.has(id) || cart[id]) return;
    Vibration.vibrate(40);
    add(id);
  }

  async function save() {
    if (lines.length === 0) {
      Alert.alert("Empty challan", "Add at least one design.");
      return;
    }
    setBusy(true);
    try {
      const order = await api.createOrder({
        customer_name: customer.trim() || undefined,
        items: lines.map((l) => ({
          product_id: l.product.id,
          boxes: l.boxes,
          price_per_box: l.product.price_per_box,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace(`/orders/${order.id}`);
    } catch (err: any) {
      Alert.alert("Couldn't create challan", err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: lines.length ? 150 : 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-[22px] pt-6">
          <Eyebrow className="mb-2">CUSTOMER</Eyebrow>
          <TextInput
            value={customer}
            onChangeText={setCustomer}
            placeholder="Name (optional)"
            placeholderTextColor={C.ink4}
            className="border border-rule bg-field px-3.5 py-3.5 font-sans text-[15px] text-ink"
          />

          <View className="mt-4 flex-row gap-2">
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
              <Text className="font-sans-m text-[13px] text-ink-soft">Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lines */}
        <View className="mt-7 border-t border-rule">
          <View className="flex-row items-baseline justify-between bg-band px-[22px] pb-[7px] pt-3.5">
            <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
              LINES {lines.length > 0 ? `· ${lines.length}` : ""}
            </Text>
            {totalBoxes > 0 && (
              <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3" style={TNUM}>
                {totalBoxes} BOX
              </Text>
            )}
          </View>

          {lines.length === 0 ? (
            <View className="border-t border-hairline px-[22px] py-10">
              <Text className="text-center font-sans text-[13px] leading-[20px] text-ink-3">
                Scan tiles off the wall or search your catalogue to build
                this challan.
              </Text>
            </View>
          ) : (
            lines.map(({ product: p, boxes }) => (
              <View key={p.id} className="border-t border-hairline px-[22px] py-3">
                <View className="flex-row items-baseline gap-3">
                  <Text numberOfLines={1} className="min-w-0 flex-1 font-sans-m text-[15px] text-ink">
                    {p.series_name}
                  </Text>
                  <Text className="font-mono text-[10px] tracking-[0.4px] text-ink-3">
                    {p.brand.toUpperCase()}
                  </Text>
                  <TouchableOpacity onPress={() => remove(p.id)} hitSlop={10}>
                    <Text className="font-mono text-[14px]" style={{ color: C.red }}>×</Text>
                  </TouchableOpacity>
                </View>

                <View className="mt-2.5 flex-row items-center gap-3">
                  <View className="flex-row items-center border border-rule">
                    <TouchableOpacity onPress={() => adjust(p.id, -1)} className="px-3.5 py-1.5">
                      <Text className="font-sans text-[17px] text-ink-3">−</Text>
                    </TouchableOpacity>
                    <Text className="w-10 text-center font-sans-sb text-[15px] text-ink" style={TNUM}>
                      {boxes}
                    </Text>
                    <TouchableOpacity onPress={() => adjust(p.id, 1)} className="px-3.5 py-1.5">
                      <Text className="font-sans text-[17px] text-ink-3">+</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1" />
                  {p.price_per_box > 0 && (
                    <Text className="font-sans-sb text-[15px] text-ink" style={TNUM}>
                      {money(boxes * p.price_per_box)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Total + create */}
      {lines.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-rule bg-bg px-[22px] pb-8 pt-3.5">
          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="font-mono text-[10px] tracking-[1.2px] text-ink-3" style={TNUM}>
              {lines.length} LINE{lines.length > 1 ? "S" : ""} · {totalBoxes} BOX
            </Text>
            <Text className="font-sans-sb text-[20px] text-ink" style={TNUM}>
              {totalValue > 0 ? money(totalValue) : "—"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={save}
            disabled={busy}
            activeOpacity={0.85}
            className="items-center bg-accent py-4"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator color={C.onAccent} /> : (
              <Text className="font-sans-m text-[14px] text-onAccent">Create challan</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Continuous scanner */}
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
                  {lines.length} added
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setScanning(false)}
                activeOpacity={0.85}
                className="items-center bg-accent py-4"
              >
                <Text className="font-sans-m text-[14px] text-onAccent">
                  Done — {lines.length} line{lines.length === 1 ? "" : "s"}
                </Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Catalogue picker */}
      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
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
              return (
                <TouchableOpacity
                  onPress={() => (on ? remove(p.id) : add(p.id))}
                  activeOpacity={0.85}
                  className="flex-row items-baseline gap-3 border-b border-hairline px-[22px] py-3.5"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-sans-m text-[15px]" style={{ color: on ? C.accent : C.ink }}>
                      {p.series_name}
                    </Text>
                    <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                      {[p.brand.toUpperCase(), p.size, p.finish?.toUpperCase()].filter(Boolean).join("  ·  ")}
                    </Text>
                  </View>
                  <Text className="font-mono text-[10px] tracking-[1px]" style={{ color: on ? C.accent : C.ink4 }}>
                    {on ? "ADDED" : "ADD +"}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Empty title="No match" body={`Nothing matches “${search}”.`} />
            }
          />
        </View>
      </Modal>
    </View>
  );
}