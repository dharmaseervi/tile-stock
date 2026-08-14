import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { GroupBand, Loading, Segments } from "@/components/ui";

type Tab = "orders" | "shades";

const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Orders" },
  { key: "shades", label: "Shade history" },
];

const STATUS_TONE: Record<string, string> = {
  draft: C.ink4,
  confirmed: C.accent,
  dispatched: C.amber,
  delivered: C.accent,
  cancelled: C.red,
};

/** Deterministic swatch from a lot number, so ZX-04 is always the same hue. */
function lotHue(lot: string) {
  const n = lot.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return `hsl(${n % 360}, 30%, 55%)`;
}

export default function CustomerLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.getCustomerLedger(id!),
    enabled: !!id,
  });

  if (isLoading || !data?.customer) return <View className="flex-1 bg-bg"><Loading /></View>;

  const c = data.customer;
  const orders = data.orders ?? [];
  const shades = data.shades ?? [];
  const outstanding = data.outstanding ?? 0;
  const margin = data.margin ?? 0;
  const grossProfit = data.gross_profit ?? 0;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        <View className="px-[22px] pt-6">
          <Text className="font-sans-sb text-[28px] leading-[32px] tracking-[-0.8px] text-ink">
            {c.name}
          </Text>
          <View className="mt-2 flex-row items-center gap-4">
            {c.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)} activeOpacity={0.7}>
                <Text className="font-mono text-[11px] tracking-[0.6px] text-accent">{c.phone}</Text>
              </TouchableOpacity>
            )}
            {c.address && (
              <Text numberOfLines={1} className="flex-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                {c.address.toUpperCase()}
              </Text>
            )}
          </View>

          {/* Outstanding leads — it's the number that decides whether you
              extend more credit today. */}
          <View className="mt-7 border-y border-rule py-5">
            <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">OUTSTANDING</Text>
            <Text
              className="mt-2 font-sans-sb text-[46px] leading-[50px] tracking-[-1.8px]"
              style={{ color: outstanding > 0 ? C.amber : C.inkHi, ...TNUM }}
            >
              {money(outstanding)}
            </Text>
            <View className="mt-4 flex-row">
              <View className="flex-1">
                <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">TOTAL BUSINESS</Text>
                <Text className="mt-1 font-sans-m text-[16px] text-ink" style={TNUM}>
                  {money(data.total_value ?? 0)}
                </Text>
              </View>
              <View className="w-px bg-hairline" />
              <View className="flex-1 pl-4">
                <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">BOXES</Text>
                <Text className="mt-1 font-sans-m text-[16px] text-ink" style={TNUM}>
                  {data.total_boxes ?? 0}
                </Text>
              </View>
              <View className="w-px bg-hairline" />
              <View className="flex-1 pl-4">
                <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">MARGIN</Text>
                <Text
                  className="mt-1 font-sans-m text-[16px]"
                  style={{ color: grossProfit > 0 ? C.accent : C.ink4, ...TNUM }}
                >
                  {grossProfit > 0 ? `${margin.toFixed(0)}%` : "—"}
                </Text>
              </View>
            </View>
          </View>

          <View className="py-5">
            <Segments options={TABS} value={tab} onChange={setTab} />
          </View>
        </View>

        {tab === "orders" ? (
          orders.length === 0 ? (
            <View className="border-t border-rule px-[22px] py-10">
              <Text className="text-center font-sans text-[13px] text-ink-3">No orders recorded yet.</Text>
            </View>
          ) : (
            <View className="border-t border-rule">
              <GroupBand left="ORDERS" right={`${orders.length} TOTAL`} />
              {orders.map((o: any) => (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/orders/${o.id}`)}
                  className="flex-row items-baseline gap-3 border-t border-hairline px-[22px] py-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="font-mono text-[13px] tracking-[0.4px] text-ink">
                      {o.challan_number}
                    </Text>
                    <Text
                      className="mt-1 font-mono text-[9px] tracking-[1px]"
                      style={{ color: STATUS_TONE[o.status] ?? C.ink4 }}
                    >
                      {o.status.toUpperCase()} · {o.total_boxes} BOX
                    </Text>
                  </View>
                  <Text className="font-sans-sb text-[16px] text-ink" style={TNUM}>
                    {money(o.total_value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : shades.length === 0 ? (
          <View className="border-t border-rule px-[22px] py-10">
            <Text className="text-center font-sans text-[13px] leading-[20px] text-ink-3">
              No lot data yet. Record lot numbers when stock comes in and
              this fills itself.
            </Text>
          </View>
        ) : (
          <View className="border-t border-rule">
            <GroupBand left="LOTS SUPPLIED" right={`${shades.length} ENTRIES`} />
            {shades.map((s: any, i: number) => (
              <View key={i} className="flex-row items-center gap-3 border-t border-hairline px-[22px] py-3">
                <View className="h-8 w-1" style={{ backgroundColor: lotHue(s.lot_number) }} />
                <View className="min-w-0 flex-1">
                  <Text className="font-mono text-[13px] tracking-[0.4px] text-accent">
                    {s.lot_number}
                  </Text>
                  <Text numberOfLines={1} className="mt-1 font-sans text-[12px] text-ink-3">
                    {s.brand} · {s.series_name}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-sans-sb text-[15px] text-ink" style={TNUM}>{s.boxes}</Text>
                  <Text className="mt-0.5 font-mono text-[9px] tracking-[0.6px] text-ink-4">
                    {s.challan_number}
                  </Text>
                </View>
              </View>
            ))}
            <Text className="px-[22px] pt-4 font-mono text-[10px] leading-[16px] tracking-[0.6px] text-ink-4">
              MATCH THE LOT WHEN THIS CUSTOMER RETURNS FOR MORE — DIFFERENT
              LOTS OF THE SAME DESIGN WON'T SHADE-MATCH.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}