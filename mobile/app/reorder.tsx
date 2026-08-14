import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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

export default function ReorderScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reorder"],
    queryFn: api.reorderSuggestions,
  });

  const suggestions: Suggestion[] = data ?? [];
  const picked = suggestions.filter((s) => cart[s.product_id]);
  const totalBoxes = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalValue = picked.reduce((a, s) => a + cart[s.product_id] * s.price_per_box, 0);

  function toggle(s: Suggestion) {
    setCart((c) => {
      const n = { ...c };
      if (n[s.product_id]) delete n[s.product_id];
      else n[s.product_id] = s.suggested_reorder_qty || s.reorder_level || 1;
      return n;
    });
  }

  const adjust = (id: string, d: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(1, (c[id] ?? 0) + d) }));

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: picked.length ? 150 : 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        {isLoading ? (
          <Loading />
        ) : suggestions.length === 0 ? (
          <Empty
            title="Nothing to reorder"
            body="Every design is above its reorder level right now."
          />
        ) : (
          <>
            <View className="px-[22px] pt-6">
              <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">BELOW LEVEL</Text>
              <Text className="mt-2.5 font-sans-sb text-[46px] leading-[50px] tracking-[-1.8px]" style={{ color: C.amber, ...TNUM }}>
                {suggestions.length}
              </Text>
              <Text className="mt-1.5 font-mono text-[10px] leading-[16px] tracking-[0.6px] text-ink-3">
                TAP A DESIGN TO ADD IT TO A PURCHASE ORDER
              </Text>
            </View>

            <View className="mt-7">
              <GroupBand left="SUGGESTIONS" right={`${suggestions.length} DESIGNS`} />
              {suggestions.map((s) => {
                const on = !!cart[s.product_id];
                const urgent = s.weeks_of_stock !== null && s.weeks_of_stock <= 1;
                return (
                  <View
                    key={s.product_id}
                    className="border-t border-hairline"
                    style={on ? { backgroundColor: "rgba(47,184,174,0.06)" } : undefined}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => toggle(s)}
                      className="flex-row items-center gap-3 px-[22px] py-3"
                    >
                      <View
                        className="h-5 w-5 items-center justify-center border"
                        style={{
                          borderColor: on ? C.accent : C.rule,
                          backgroundColor: on ? C.accent : "transparent",
                        }}
                      >
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
            </View>
          </>
        )}
      </ScrollView>

      {picked.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-rule bg-bg px-[22px] pb-8 pt-3.5">
          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="font-mono text-[10px] tracking-[1.2px] text-ink-3" style={TNUM}>
              {picked.length} DESIGN{picked.length > 1 ? "S" : ""} · {totalBoxes} BOX
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
    </View>
  );
}