import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { Screen, Masthead, GroupBand, Empty, Loading, Segments } from "@/components/ui";

type Order = {
  id: string;
  challan_number: string;
  customer_name: string | null;
  status: string;
  total_boxes: number;
  total_value: number;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  draft: C.ink4,
  confirmed: C.accent,
  dispatched: C.amber,
  delivered: C.accent,
  cancelled: C.red,
};

type Filter = "all" | "open" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "done", label: "Delivered" },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.listOrders,
  });

  const orders: Order[] = data ?? [];

  const { groups, openValue } = useMemo(() => {
    const visible = orders.filter((o) => {
      if (filter === "open") return ["draft", "confirmed", "dispatched"].includes(o.status);
      if (filter === "done") return o.status === "delivered";
      return true;
    });

    // Grouped by day — a challan book reads chronologically.
    const byDay = new Map<string, Order[]>();
    visible.forEach((o) => {
      const d = new Date(o.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      }).toUpperCase();
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(o);
    });

    return {
      groups: Array.from(byDay.entries()).map(([day, items]) => ({
        day,
        total: items.reduce((a, o) => a + o.total_value, 0),
        items,
      })),
      openValue: orders
        .filter((o) => ["confirmed", "dispatched"].includes(o.status))
        .reduce((a, o) => a + o.total_value, 0),
    };
  }, [orders, filter]);

  return (
    <Screen inset>
      <Masthead left="Challans" right={`${orders.length} total`} />

      <View className="px-[22px] pt-6">
        {/* Money still out on the road — the number a dealer chases */}
        <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">IN TRANSIT</Text>
        <View className="mt-2.5 flex-row items-end justify-between">
          <Text className="font-sans-sb text-[42px] leading-[46px] tracking-[-1.6px] text-ink-hi" style={TNUM}>
            {money(openValue)}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/orders/new")}
            className="mb-2 flex-row items-center gap-2 bg-accent px-3.5 py-2.5"
          >
            <Svg width={13} height={13} viewBox="0 0 16 16" fill="none">
              <Path d="M8 2v12M2 8h12" stroke={C.onAccent} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            <Text className="font-sans-m text-[12px] text-onAccent">New challan</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6 pb-4">
          <Segments options={FILTERS} value={filter} onChange={setFilter} />
        </View>
      </View>

      <ScrollView
        className="flex-1 border-t border-rule"
        contentContainerStyle={{ paddingBottom: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        {isLoading ? (
          <Loading />
        ) : groups.length === 0 ? (
          <Empty
            title={orders.length === 0 ? "No challans yet" : "Nothing here"}
            body={
              orders.length === 0
                ? "Build one by scanning tiles off the wall or picking them from your catalogue."
                : "No challans match this filter."
            }
            action={orders.length === 0 ? { label: "New challan", onPress: () => router.push("/orders/new") } : undefined}
          />
        ) : (
          groups.map((g) => (
            <View key={g.day}>
              <GroupBand left={g.day} right={g.total > 0 ? money(g.total) : undefined} />
              {g.items.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/orders/${o.id}`)}
                  className="border-t border-hairline px-[22px] py-3"
                >
                  <View className="flex-row items-baseline gap-3">
                    <Text className="font-mono text-[13px] tracking-[0.4px] text-ink">
                      {o.challan_number}
                    </Text>
                    <Text
                      className="font-mono text-[9px] tracking-[1px]"
                      style={{ color: STATUS_TONE[o.status] ?? C.ink4 }}
                    >
                      {o.status.toUpperCase()}
                    </Text>
                    <View className="flex-1" />
                    <Text className="font-sans-sb text-[15px] text-ink" style={TNUM}>
                      {o.total_value > 0 ? money(o.total_value) : "—"}
                    </Text>
                  </View>
                  <View className="mt-1.5 flex-row items-baseline gap-3">
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[13px] text-ink-3">
                      {o.customer_name || "No customer"}
                    </Text>
                    <Text className="font-mono text-[10px] tracking-[0.4px] text-ink-3" style={TNUM}>
                      {o.total_boxes} BOX
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}