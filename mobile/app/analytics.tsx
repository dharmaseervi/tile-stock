import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { C, TNUM, money, shortMoney } from "@/lib/theme";
import { GroupBand, Loading, Empty } from "@/components/ui";

const PERIODS = [
  { key: "this_month", label: "THIS MONTH" },
  { key: "last_month", label: "LAST MONTH" },
  { key: "last_30", label: "30 DAYS" },
  { key: "last_90", label: "90 DAYS" },
  { key: "all", label: "ALL TIME" },
];

function rangeFor(p: string): { from?: string; to?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "this_month") return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)) };
  if (p === "last_month") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    };
  }
  if (p === "last_30" || p === "last_90") {
    const d = new Date(now);
    d.setDate(d.getDate() - (p === "last_30" ? 30 : 90));
    return { from: fmt(d) };
  }
  return {};
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState("this_month");
  const { from, to } = rangeFor(period);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => api.analytics(from, to),
  });

  const products = data?.products ?? [];
  const revenue = data?.total_revenue ?? 0;

  const sold = products
    .filter((p: any) => p.total_out > 0)
    .sort((a: any, b: any) => b.total_out - a.total_out);
  const dead = products
    .filter((p: any) => p.total_out === 0 && p.in_stock > 0)
    .sort((a: any, b: any) => b.in_stock - a.in_stock);

  const peak = sold[0]?.total_out ?? 1;
  const boxesOut = products.reduce((a: number, p: any) => a + p.total_out, 0);

  return (
    <View className="flex-1   bg-bg">
      {/* Period as a mono strip — reads as a report header, not a toolbar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, maxHeight: 44 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 4 }}
      >
        {PERIODS.map((p) => {
          const on = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.8}
              className="mr-5 pb-2"
              style={{ borderBottomWidth: 2, borderBottomColor: on ? C.accent : "transparent" }}
            >
              <Text
                className="font-mono text-[10px] tracking-[1.2px]"
                style={{ color: on ? C.ink : C.ink4 }}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        <View className="border-t border-rule px-[22px] pt-6">
          <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">REVENUE</Text>
          <View className="mt-2.5 flex-row items-baseline gap-3">
            <Text className="font-sans-sb text-[52px] leading-[56px] tracking-[-2px] text-ink-hi" style={TNUM}>
              {shortMoney(revenue)}
            </Text>
            <Text className="font-mono text-[11px] text-ink-3" style={TNUM}>{money(revenue)}</Text>
          </View>
          <Text className="mt-2 font-mono text-[10px] tracking-[1px] text-ink-3" style={TNUM}>
            {boxesOut} BOXES MOVED OUT
          </Text>
        </View>

        {isLoading ? (
          <Loading />
        ) : (
          <View className="mt-8">
            <GroupBand left="BEST SELLERS" right={sold.length ? `${sold.length} MOVED` : undefined} />
            {sold.length === 0 ? (
              <View className="border-t border-hairline px-[22px] py-8">
                <Text className="text-center font-sans text-[13px] text-ink-3">
                  Nothing sold in this period.
                </Text>
              </View>
            ) : (
              sold.slice(0, 10).map((p: any) => (
                <TouchableOpacity
                  key={p.product_id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/products/${p.product_id}`)}
                  className="border-t border-hairline px-[22px] py-3"
                >
                  <View className="flex-row items-baseline gap-3">
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-sans-m text-[15px] text-ink">
                      {p.series_name}
                    </Text>
                    <Text className="font-mono text-[10px] tracking-[0.4px] text-ink-3">
                      {p.brand?.toUpperCase()}
                    </Text>
                    <Text className="w-[46px] text-right font-sans-sb text-[17px] text-ink" style={TNUM}>
                      {p.total_out}
                    </Text>
                  </View>
                  {/* Bar relative to the top seller — a chart without a library */}
                  <View className="mt-2.5 h-[3px] flex-row">
                    <View style={{ flex: p.total_out, backgroundColor: C.accent }} />
                    <View style={{ flex: Math.max(0, peak - p.total_out) }} />
                  </View>
                  {p.revenue > 0 && (
                    <Text className="mt-2 font-mono text-[10px] tracking-[0.4px] text-ink-3" style={TNUM}>
                      {money(p.revenue)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}

            <View className="mt-8">
              <GroupBand left="NOT MOVING" right={dead.length ? `${dead.length} SITTING` : undefined} />
              {dead.length === 0 ? (
                <View className="border-t border-hairline px-[22px] py-8">
                  <Text className="text-center font-sans text-[13px] text-ink-3">
                    Everything moved at least once.
                  </Text>
                </View>
              ) : (
                dead.slice(0, 10).map((p: any) => (
                  <TouchableOpacity
                    key={p.product_id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/products/${p.product_id}`)}
                    className="flex-row items-baseline gap-3 border-t border-hairline px-[22px] py-3"
                  >
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-sans-m text-[15px] text-ink">
                        {p.series_name}
                      </Text>
                      <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                        {[p.brand?.toUpperCase(), p.size].filter(Boolean).join("  ·  ")}
                      </Text>
                    </View>
                    <Text className="w-[46px] text-right font-sans-sb text-[17px]" style={{ color: C.amber, ...TNUM }}>
                      {p.in_stock}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}