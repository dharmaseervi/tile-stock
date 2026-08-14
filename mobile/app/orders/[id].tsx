import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { GroupBand, Loading } from "@/components/ui";

const NEXT: Record<string, string> = {
  draft: "confirmed",
  confirmed: "dispatched",
  dispatched: "delivered",
};

const TONE: Record<string, string> = {
  draft: C.ink4,
  confirmed: C.accent,
  dispatched: C.amber,
  delivered: C.accent,
  cancelled: C.red,
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrder(id!),
    enabled: !!id,
  });

  async function setStatus(status: string) {
    try {
      await api.updateOrderStatus(id!, status);
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      refetch();
    } catch (err: any) {
      Alert.alert("Couldn't update", err.message);
    }
  }

  async function toggleLoaded(itemId: string) {
    try {
      await api.toggleLoaded(id!, itemId);
      refetch();
    } catch (err: any) {
      Alert.alert("Couldn't update", err.message);
    }
  }

  if (isLoading || !data?.order) return <View className="flex-1 bg-bg"><Loading /></View>;

  const order = data.order;
  const items = data.items ?? [];
  const totalBoxes = items.reduce((a: number, i: any) => a + i.boxes, 0);
  const totalValue = items.reduce((a: number, i: any) => a + i.boxes * i.price_per_box, 0);
  const loaded = items.filter((i: any) => i.loaded).length;
  const next = NEXT[order.status];

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: next ? 120 : 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        <View className="px-[22px] pt-6">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-mono text-[10px] tracking-[1.6px]" style={{ color: TONE[order.status] ?? C.ink4 }}>
              {order.status.toUpperCase()}
            </Text>
            <Text className="font-mono text-[10px] tracking-[1.4px] text-ink-3">
              {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              }).toUpperCase()}
            </Text>
          </View>

          <Text className="mt-3 font-sans-sb text-[32px] leading-[36px] tracking-[-1px] text-ink" style={TNUM}>
            {order.challan_number}
          </Text>
          <Text className="mt-1.5 font-sans text-[14px] text-ink-3">
            {order.customer_name || "No customer recorded"}
          </Text>

          <View className="mt-7 flex-row border-y border-rule py-4">
            <View className="flex-1">
              <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">BOXES</Text>
              <Text className="mt-1.5 font-sans-sb text-[22px] text-ink" style={TNUM}>{totalBoxes}</Text>
            </View>
            <View className="w-px bg-hairline" />
            <View className="flex-1 pl-4">
              <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">VALUE</Text>
              <Text className="mt-1.5 font-sans-sb text-[22px] text-ink" style={TNUM}>
                {totalValue > 0 ? money(totalValue) : "—"}
              </Text>
            </View>
            <View className="w-px bg-hairline" />
            <View className="flex-1 pl-4">
              <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">LOADED</Text>
              <Text
                className="mt-1.5 font-sans-sb text-[22px]"
                style={{ color: loaded === items.length ? C.accent : C.ink, ...TNUM }}
              >
                {loaded}/{items.length}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-2">
          <GroupBand left="ITEMS" right={`${items.length} LINE${items.length === 1 ? "" : "S"}`} />
          {items.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => toggleLoaded(item.id)}
              className="flex-row items-center gap-3 border-t border-hairline px-[22px] py-3"
              style={item.loaded ? { backgroundColor: "rgba(47,184,174,0.06)" } : undefined}
            >
              {/* Square tick — loaders tap as each pallet goes on the truck */}
              <View
                className="h-5 w-5 items-center justify-center border"
                style={{
                  borderColor: item.loaded ? C.accent : C.rule,
                  backgroundColor: item.loaded ? C.accent : "transparent",
                }}
              >
                {item.loaded && (
                  <Text className="font-sans-sb text-[11px]" style={{ color: C.onAccent }}>✓</Text>
                )}
              </View>

              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-sans-m text-[15px] text-ink">
                  {item.series_name}
                </Text>
                <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                  {[item.brand?.toUpperCase(), item.size, item.finish?.toUpperCase()].filter(Boolean).join("  ·  ")}
                </Text>
              </View>

              <View className="items-end">
                <Text className="font-sans-sb text-[16px] text-ink" style={TNUM}>{item.boxes}</Text>
                {item.price_per_box > 0 && (
                  <Text className="mt-0.5 font-mono text-[10px] text-ink-3" style={TNUM}>
                    {money(item.boxes * item.price_per_box)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {order.status !== "cancelled" && order.status !== "delivered" && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Cancel challan", "Stock already dispatched isn't returned automatically.", [
                { text: "Keep it", style: "cancel" },
                { text: "Cancel challan", style: "destructive", onPress: () => setStatus("cancelled") },
              ])
            }
            activeOpacity={0.85}
            className="mx-[22px] mt-8 items-center border py-3.5"
            style={{ borderColor: C.red }}
          >
            <Text className="font-sans-m text-[13px]" style={{ color: C.red }}>Cancel challan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {next && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-rule bg-bg px-[22px] pb-8 pt-3">
          {next === "dispatched" && loaded < items.length && (
            <Text className="mb-2.5 font-mono text-[10px] tracking-[0.6px]" style={{ color: C.amber }}>
              {items.length - loaded} LINE{items.length - loaded === 1 ? "" : "S"} NOT TICKED AS LOADED
            </Text>
          )}
          <TouchableOpacity
            onPress={() => setStatus(next)}
            activeOpacity={0.85}
            className="items-center bg-accent py-4"
          >
            <Text className="font-sans-m text-[14px] text-onAccent">
              Mark {next}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}