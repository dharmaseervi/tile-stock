import { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, TextInput, Alert, Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { C, TNUM } from "@/lib/theme";

const TYPES = [
  { key: "in", label: "IN", full: "Stock in", color: C.accent },
  { key: "out", label: "OUT", full: "Stock out", color: C.red },
  { key: "adjustment", label: "ADJUST", full: "Adjustment", color: C.ink2 },
  { key: "damage", label: "DAMAGE", full: "Damage", color: C.amber },
];

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("in");
  const [boxes, setBoxes] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const last = useRef({ code: "", at: 0 });

  const extractId = (d: string) =>
    d.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? null;

  async function onBarcode({ data }: { data: string }) {
    const now = Date.now();
    // Ignore the same sticker sitting in frame, so a sweep along a wall
    // doesn't fire the same product repeatedly.
    if (data === last.current.code && now - last.current.at < 2500) return;
    last.current = { code: data, at: now };

    const id = extractId(data);
    if (!id) return;

    setScanned(true);
    setLoading(true);
    Vibration.vibrate(40);
    try {
      const detail = await api.getProduct(id);
      setProduct(detail.product);
      setStock(detail.stock);
    } catch {
      Alert.alert("Not recognised", "That code doesn't match a product in your catalogue.", [
        { text: "Scan again", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setScanned(false);
    setProduct(null);
    setStock(null);
    setBoxes("1");
    setReason("");
    setType("in");
  }

  async function record() {
    const qty = parseFloat(boxes);
    if (!qty || qty <= 0) {
      Alert.alert("Invalid quantity", "Enter a number greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await api.recordMovement({
        product_id: product.id,
        movement_type: type,
        boxes: qty,
        reason: reason.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      Alert.alert(
        "Recorded",
        `${type === "in" ? "+" : "−"}${qty} · ${product.series_name}`,
        [
          { text: "Scan next", onPress: reset },
          { text: "Done", onPress: () => router.push("/(tabs)/dashboard") },
        ]
      );
    } catch (err: any) {
      Alert.alert("Couldn't save", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <StatusBar style="light" />
        <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">CAMERA</Text>
        <Text className="mt-3 text-center font-sans-sb text-[22px] leading-[28px] text-ink">
          Allow camera access
        </Text>
        <Text className="mt-3 text-center font-sans text-[13px] leading-[20px] text-ink-3">
          Scanning a QR label opens stock entry for that design without
          searching for it.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          activeOpacity={0.85}
          className="mt-7 bg-accent px-6 py-3.5"
        >
          <Text className="font-sans-m text-[13px] text-onAccent">Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inStock = stock?.boxes_in_stock ?? 0;
  const qty = parseFloat(boxes) || 0;
  const after = type === "in" ? inStock + qty : inStock - qty;
  const active = TYPES.find((t) => t.key === type)!;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />

      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : onBarcode}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        <View className="flex-1" style={{ paddingTop: insets.top + 10 }}>
          <View className="px-[22px]">
            <Text className="font-mono text-[10px] tracking-[1.4px] text-white/60">
              SCAN · STOCK ENTRY
            </Text>
          </View>

          <View className="flex-1 items-center justify-center">
            <View className="h-[210px] w-[210px]">
              {[
                "top-0 left-0 border-t-2 border-l-2",
                "top-0 right-0 border-t-2 border-r-2",
                "bottom-0 left-0 border-b-2 border-l-2",
                "bottom-0 right-0 border-b-2 border-r-2",
              ].map((pos) => (
                <View key={pos} className={`absolute h-11 w-11 ${pos}`} style={{ borderColor: C.accent }} />
              ))}
            </View>
            <Text className="mt-7 font-mono text-[11px] tracking-[1.32px] text-white/60">
              POINT AT THE BOX LABEL
            </Text>
          </View>
        </View>

        {loading && (
          <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(10,9,8,0.8)" }}>
            <ActivityIndicator color={C.accent} size="large" />
          </View>
        )}
      </CameraView>

      {/* ── Entry sheet ─────────────────────────────────── */}
      <Modal visible={!!product} animationType="slide" presentationStyle="pageSheet" onRequestClose={reset}>
        <View className="flex-1 bg-bg">
          {product && (
            <>
              <View className="border-b border-rule px-[22px] pb-4 pt-5">
                <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
                  {product.brand?.toUpperCase()}
                </Text>
                <Text className="mt-1.5 font-sans-sb text-[22px] leading-[26px] text-ink">
                  {product.series_name}
                </Text>
                <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                  {[product.size, product.finish?.toUpperCase()].filter(Boolean).join(" ") || "—"}
                </Text>
              </View>

              <ScrollView contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
                {/* Current holding, stated plainly before anything is changed */}
                <View className="flex-row items-end justify-between border-b border-hairline pb-5">
                  <View>
                    <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">IN STOCK</Text>
                    <Text
                      className="mt-2 font-sans-sb text-[46px] leading-[50px] tracking-[-1.6px]"
                      style={{
                        color: inStock === 0 ? C.red : inStock <= product.reorder_level ? C.amber : C.inkHi,
                        ...TNUM,
                      }}
                    >
                      {inStock}
                    </Text>
                  </View>
                  <Text className="pb-2 font-mono text-[10px] tracking-[1px] text-ink-3" style={TNUM}>
                    REORDER AT {product.reorder_level}
                  </Text>
                </View>

                <Text className="mb-2.5 mt-6 font-mono text-[10px] tracking-[1.6px] text-ink-3">
                  MOVEMENT
                </Text>
                <View className="flex-row">
                  {TYPES.map((t, i) => {
                    const on = type === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => setType(t.key)}
                        activeOpacity={0.8}
                        className="flex-1 items-center border py-3"
                        style={{
                          backgroundColor: on ? t.color : "transparent",
                          borderColor: on ? t.color : C.rule,
                          marginLeft: i === 0 ? 0 : -1,
                        }}
                      >
                        <Text
                          className="font-mono text-[10px] tracking-[1px]"
                          style={{ color: on ? C.onAccent : C.ink3 }}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="mb-2.5 mt-6 font-mono text-[10px] tracking-[1.6px] text-ink-3">
                  BOXES
                </Text>
                <View className="flex-row items-center border border-rule bg-field">
                  <TouchableOpacity
                    onPress={() => setBoxes((v) => String(Math.max(0.5, (parseFloat(v) || 1) - 1)))}
                    className="px-6 py-4"
                  >
                    <Text className="font-sans text-[22px] text-ink-3">−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={boxes}
                    onChangeText={setBoxes}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    className="flex-1 p-0 text-center font-sans-sb text-[26px] text-ink"
                    style={TNUM}
                  />
                  <TouchableOpacity
                    onPress={() => setBoxes((v) => String((parseFloat(v) || 0) + 1))}
                    className="px-6 py-4"
                  >
                    <Text className="font-sans text-[22px] text-ink-3">+</Text>
                  </TouchableOpacity>
                </View>

                {/* Consequence shown before committing — the cheapest guard
                    against overselling until committed stock exists. */}
                {qty > 0 && (
                  <Text
                    className="mt-2.5 font-mono text-[10px] tracking-[0.6px]"
                    style={{ color: after < 0 ? C.red : C.ink3 }}
                  >
                    {after < 0
                      ? `WOULD GO TO ${after} — MORE THAN YOU HAVE`
                      : `STOCK AFTER · ${after}`}
                  </Text>
                )}

                <Text className="mb-2.5 mt-6 font-mono text-[10px] tracking-[1.6px] text-ink-3">
                  REASON (OPTIONAL)
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Supplier delivery, breakage, count correction…"
                  placeholderTextColor={C.ink4}
                  className="border border-rule bg-field px-3.5 py-3 font-sans text-[15px] text-ink"
                />
              </ScrollView>

              <View className="flex-row gap-2 border-t border-rule px-[22px] pb-8 pt-3">
                <TouchableOpacity
                  onPress={reset}
                  activeOpacity={0.85}
                  className="border border-ghost px-5 py-4"
                >
                  <Text className="font-sans-m text-[13px] text-ink-soft">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={record}
                  disabled={saving}
                  activeOpacity={0.85}
                  className="flex-1 items-center py-4"
                  style={{ backgroundColor: active.color, opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? (
                    <ActivityIndicator color={C.onAccent} />
                  ) : (
                    <Text className="font-sans-m text-[13px] text-onAccent">
                      Record {active.full.toLowerCase()}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}