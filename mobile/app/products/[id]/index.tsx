import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Svg, { Path, Rect } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { GroupBand, Loading } from "@/components/ui";

const MOVE_TYPES = [
  { key: "in",         label: "IN",     full: "Stock in",    color: C.accent },
  { key: "out",        label: "OUT",    full: "Stock out",   color: C.red },
  { key: "adjustment", label: "ADJUST", full: "Adjustment",  color: C.ink2 },
  { key: "damage",     label: "DAMAGE", full: "Damage",      color: C.amber },
];

const MOVE_TONE: Record<string, string> = {
  in: C.accent,
  out: C.red,
  adjustment: C.ink2,
  damage: C.amber,
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Movement sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moveType, setMoveType] = useState("in");
  const [boxes, setBoxes] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  });

  function openSheet(type = "in") {
    setMoveType(type);
    setBoxes("1");
    setReason("");
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
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
        product_id: id,
        movement_type: moveType,
        boxes: qty,
        reason: reason.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      closeSheet();
      refetch();
    } catch (err: any) {
      Alert.alert("Couldn't save", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !data?.product) {
    return <View className="flex-1 bg-bg"><Loading /></View>;
  }

  const p = data.product;
  const stock = data.stock;
  const movements = data.movements ?? [];

  const inStock = stock?.boxes_in_stock ?? 0;
  const level = inStock === 0 ? "out" : inStock <= p.reorder_level ? "low" : "ok";
  const tone = level === "out" ? C.red : level === "low" ? C.amber : C.inkHi;
  const statusWord =
    level === "out" ? "OUT OF STOCK" : level === "low" ? "BELOW REORDER" : "IN STOCK";

  const margin =
    p.cost_price > 0 && p.price_per_box > 0
      ? Math.round(((p.price_per_box - p.cost_price) / p.price_per_box) * 100)
      : null;

  // After recording, show the consequence before the user commits.
  const qty = parseFloat(boxes) || 0;
  const inStock_ = inStock; // alias for readability inside the sheet
  const after = moveType === "in" ? inStock_ + qty : inStock_ - qty;

  const active = MOVE_TYPES.find((t) => t.key === moveType)!;

  return (
    <>
      <View className="flex-1 bg-bg">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={C.ink3}
            />
          }
        >
          {/* Photo — full-bleed when present */}
          {p.image_url ? (
            <Image
              source={{ uri: p.image_url }}
              style={{ width: "100%", height: 220 }}
              resizeMode="cover"
            />
          ) : null}

          <View className="px-[22px] pt-6">
            <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
              {p.brand?.toUpperCase()}
            </Text>
            <Text className="mt-2 font-sans-sb text-[28px] leading-[32px] tracking-[-0.8px] text-ink">
              {p.series_name}
            </Text>
            <Text className="mt-2 font-mono text-[10px] tracking-[0.4px] text-ink-3">
              {[p.size, p.finish?.toUpperCase(), p.location?.toUpperCase()]
                .filter(Boolean)
                .join("  ·  ") || "—"}
            </Text>

            {/* ── Holding ───────────────────────────────────
                The figure carries the state. One tap on IN or OUT
                opens the sheet pre-filled to that direction. */}
            <View className="mt-8 border-y border-rule py-5">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">ON HAND</Text>
                  <Text
                    className="mt-2.5 font-sans-sb text-[62px] leading-[66px] tracking-[-2.4px]"
                    style={{ color: tone, ...TNUM }}
                  >
                    {inStock}
                  </Text>
                  <Text
                    className="mt-1 font-mono text-[10px] tracking-[1px]"
                    style={{ color: level === "ok" ? C.ink3 : tone }}
                  >
                    {statusWord}
                  </Text>
                </View>

                {/* Quick-action buttons beside the figure — one tap, right direction */}
                <View className="gap-2 pb-2">
                  <TouchableOpacity
                    onPress={() => openSheet("in")}
                    activeOpacity={0.85}
                    className="flex-row items-center gap-2 border border-rule bg-field px-4 py-2.5"
                  >
                    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <Path d="M6 1v10M1 6h10" stroke={C.accent} strokeWidth={1.6} strokeLinecap="round" />
                    </Svg>
                    <Text className="font-mono text-[10px] tracking-[1px]" style={{ color: C.accent }}>
                      STOCK IN
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openSheet("out")}
                    activeOpacity={0.85}
                    className="flex-row items-center gap-2 border border-rule bg-field px-4 py-2.5"
                  >
                    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <Path d="M1 6h10" stroke={C.red} strokeWidth={1.6} strokeLinecap="round" />
                    </Svg>
                    <Text className="font-mono text-[10px] tracking-[1px]" style={{ color: C.red }}>
                      STOCK OUT
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openSheet("adjustment")}
                    activeOpacity={0.85}
                    className="flex-row items-center gap-2 border border-rule bg-field px-4 py-2.5"
                  >
                    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <Path d="M1 3h10M1 6h7M1 9h4" stroke={C.ink2} strokeWidth={1.4} strokeLinecap="round" />
                    </Svg>
                    <Text className="font-mono text-[10px] tracking-[1px] text-ink-2">ADJUST</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mt-4 flex-row items-baseline">
                <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">
                  REORDER AT {p.reorder_level}
                </Text>
                {stock?.stock_value > 0 && (
                  <>
                    <Text className="mx-3 font-mono text-[10px] text-ink-4">·</Text>
                    <Text className="font-mono text-[10px] tracking-[1px] text-ink-3" style={TNUM}>
                      VALUE {money(stock.stock_value)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* ── Pricing ───────────────────────────────────── */}
            {p.price_per_box > 0 && (
              <View className="flex-row border-b border-rule py-5">
                <PriceCell label="SELLS AT" value={money(p.price_per_box)} strong />
                {p.cost_price > 0 && (
                  <>
                    <View className="w-px bg-hairline" />
                    <PriceCell label="COSTS" value={money(p.cost_price)} />
                  </>
                )}
                {margin !== null && (
                  <>
                    <View className="w-px bg-hairline" />
                    <PriceCell
                      label="MARGIN"
                      value={`${margin}%`}
                      strong
                      color={margin < 10 ? C.red : margin < 20 ? C.amber : C.accent}
                    />
                  </>
                )}
              </View>
            )}
          </View>

          {/* ── Movement ledger ─────────────────────────────── */}
          <View className="mt-2">
            <GroupBand
              left="MOVEMENTS"
              right={movements.length ? `${movements.length} ENTRIES` : undefined}
            />
            {movements.length === 0 ? (
              <View className="border-t border-hairline px-[22px] py-8">
                <Text className="text-center font-sans text-[13px] text-ink-3">
                  Nothing recorded against this design yet.{"\n"}Use the buttons above to
                  record stock coming in or going out.
                </Text>
              </View>
            ) : (
              movements.slice(0, 20).map((m: any) => {
                const t = MOVE_TONE[m.movement_type] ?? C.ink2;
                const plus = m.movement_type === "in";
                return (
                  <View
                    key={m.id}
                    className="flex-row items-baseline gap-3 border-t border-hairline px-[22px] py-3"
                  >
                    <Text
                      className="font-mono text-[10px] tracking-[1px]"
                      style={{ color: t, width: 58 }}
                    >
                      {m.movement_type.toUpperCase()}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="min-w-0 flex-1 font-sans text-[13px] text-ink-3"
                    >
                      {m.reason
                        ? m.reason
                        : new Date(m.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </Text>
                    <Text
                      className="w-[46px] text-right font-sans-sb text-[15px]"
                      style={{ color: t, ...TNUM }}
                    >
                      {plus ? "+" : "−"}{m.boxes}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* ── Sticky footer ─────────────────────────────────── */}
        <View className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t border-rule bg-bg px-[22px] pb-8 pt-3">
          <TouchableOpacity
            onPress={() => router.push(`/products/${id}/qr`)}
            activeOpacity={0.85}
            className="w-12 items-center justify-center border border-ghost"
          >
            <Svg width={17} height={17} viewBox="0 0 19 19" fill="none">
              <Rect x={1.5} y={1.5} width={6} height={6} stroke={C.inkSoft} strokeWidth={1.5} />
              <Rect x={11.5} y={1.5} width={6} height={6} stroke={C.inkSoft} strokeWidth={1.5} />
              <Rect x={1.5} y={11.5} width={6} height={6} stroke={C.inkSoft} strokeWidth={1.5} />
              <Path
                d="M11.5 11.5h3v3h-3zM17.5 11.5v3M14.5 17.5h3M11.5 17.5h1"
                stroke={C.inkSoft}
                strokeWidth={1.5}
              />
            </Svg>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/products/${id}/edit`)}
            activeOpacity={0.85}
            className="items-center justify-center border border-ghost px-4"
          >
            <Text className="font-sans-m text-[13px] text-ink-soft">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openSheet("in")}
            activeOpacity={0.85}
            className="flex-1 items-center justify-center bg-accent py-4"
          >
            <Text className="font-sans-m text-[13px] text-onAccent">Record movement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Movement sheet ──────────────────────────────────── */}
      <Modal
        visible={sheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-bg"
        >
          {/* Sheet header */}
          <View className="flex-row items-center justify-between border-b border-rule px-[22px] py-4">
            <View>
              <Text className="font-mono text-[11px] tracking-[1.4px] text-ink">
                RECORD MOVEMENT
              </Text>
              <Text
                className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3"
                numberOfLines={1}
              >
                {p.brand?.toUpperCase()} · {p.series_name.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={closeSheet} hitSlop={12} activeOpacity={0.7}>
              <Text className="font-mono text-[16px] text-ink-3">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 22 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current holding, stated before anything changes */}
            <View className="mb-6 flex-row items-end justify-between border-b border-hairline pb-5">
              <View>
                <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
                  CURRENTLY ON HAND
                </Text>
                <Text
                  className="mt-2 font-sans-sb text-[46px] leading-[50px] tracking-[-1.6px]"
                  style={{ color: tone, ...TNUM }}
                >
                  {inStock}
                </Text>
              </View>
              <Text
                className="pb-2 font-mono text-[10px] tracking-[1px] text-ink-3"
                style={TNUM}
              >
                REORDER AT {p.reorder_level}
              </Text>
            </View>

            {/* Movement type */}
            <Text className="mb-2.5 font-mono text-[10px] tracking-[1.6px] text-ink-3">
              TYPE
            </Text>
            <View className="flex-row">
              {MOVE_TYPES.map((t, i) => {
                const on = moveType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setMoveType(t.key)}
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

            {/* Quantity */}
            <Text className="mb-2.5 mt-6 font-mono text-[10px] tracking-[1.6px] text-ink-3">
              BOXES
            </Text>
            <View className="flex-row items-center border border-rule bg-field">
              <TouchableOpacity
                onPress={() =>
                  setBoxes((v) => String(Math.max(0.5, (parseFloat(v) || 1) - 1)))
                }
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

            {/* Consequence — shown before you commit */}
            {qty > 0 && (
              <Text
                className="mt-2.5 font-mono text-[10px] tracking-[0.6px]"
                style={{ color: after < 0 ? C.red : C.ink3 }}
              >
                {after < 0
                  ? `WOULD TAKE STOCK TO ${after} — MORE THAN YOU HAVE`
                  : `STOCK AFTER · ${after}`}
              </Text>
            )}

            {/* Reason */}
            <Text className="mb-2.5 mt-6 font-mono text-[10px] tracking-[1.6px] text-ink-3">
              REASON (OPTIONAL)
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Supplier delivery, sale, breakage, count correction…"
              placeholderTextColor={C.ink4}
              className="border border-rule bg-field px-3.5 py-3 font-sans text-[15px] text-ink"
            />

            <Text className="mt-4 font-mono text-[10px] leading-[16px] tracking-[0.6px] text-ink-4">
              THIS IS PERMANENT. MOVEMENTS ARE APPENDED TO THE LEDGER AND
              CANNOT BE DELETED — ONLY CORRECTED WITH A FURTHER ENTRY.
            </Text>
          </ScrollView>

          {/* Sheet footer */}
          <View className="flex-row gap-2 border-t border-rule px-[22px] pb-8 pt-3">
            <TouchableOpacity
              onPress={closeSheet}
              activeOpacity={0.85}
              className="items-center justify-center border border-ghost px-5 py-4"
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
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function PriceCell({ label, value, color, strong }: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-1 px-1">
      <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">{label}</Text>
      <Text
        className={`mt-1.5 ${strong ? "font-sans-sb text-[19px]" : "font-sans-m text-[17px]"}`}
        style={{ color: color ?? C.ink, ...TNUM }}
      >
        {value}
      </Text>
    </View>
  );
}