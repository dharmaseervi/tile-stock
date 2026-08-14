import { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { Empty, Loading, GroupBand } from "@/components/ui";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  total_orders: number;
  total_value: number;
};

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: api.listCustomers,
  });

  const all: Customer[] = data ?? [];

  const { visible, totalBusiness } = useMemo(() => {
    const q = search.trim().toLowerCase();
    return {
      visible: all
        .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))
        // Biggest accounts first — that's the order a dealer thinks in.
        .sort((a, b) => b.total_value - a.total_value),
      totalBusiness: all.reduce((a, c) => a + c.total_value, 0),
    };
  }, [all, search]);

  return (
    <View className="flex-1 bg-bg">
      <View className="px-[22px] pt-6">
        <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">TOTAL BUSINESS</Text>
        <Text className="mt-2.5 font-sans-sb text-[42px] leading-[46px] tracking-[-1.6px] text-ink-hi" style={TNUM}>
          {money(totalBusiness)}
        </Text>
        <Text className="mt-1.5 font-mono text-[10px] tracking-[1px] text-ink-3" style={TNUM}>
          ACROSS {all.length} CUSTOMER{all.length === 1 ? "" : "S"}
        </Text>

        <View className="mb-4 mt-6 flex-row items-center gap-2.5 border border-rule bg-field px-3 py-3">
          <Svg width={14} height={14} viewBox="0 0 15 15" fill="none">
            <Circle cx={6.5} cy={6.5} r={5} stroke={C.ink3} strokeWidth={1.4} />
            <Path d="M10.5 10.5L14 14" stroke={C.ink3} strokeWidth={1.4} strokeLinecap="round" />
          </Svg>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="SEARCH NAME OR PHONE"
            placeholderTextColor={C.ink3}
            autoCapitalize="characters"
            className="h-4 flex-1 p-0 font-mono text-[11px] tracking-[0.66px] text-ink"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Text className="font-mono text-[12px] text-ink-3">×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 border-t border-rule"
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        {isLoading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <Empty
            title={all.length === 0 ? "No customers yet" : "No match"}
            body={
              all.length === 0
                ? "Customers are created when you name one on a challan."
                : `Nothing matches “${search}”.`
            }
          />
        ) : (
          <>
            <GroupBand left="BY BUSINESS" right={`${visible.length} SHOWN`} />
            {visible.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.85}
                onPress={() => router.push(`/customers/${c.id}`)}
                className="flex-row items-baseline gap-3 border-t border-hairline px-[22px] py-3.5"
              >
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-sans-m text-[15px] leading-[18px] text-ink">
                    {c.name}
                  </Text>
                  <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3" style={TNUM}>
                    {c.phone ? `${c.phone}  ·  ` : ""}
                    {c.total_orders} ORDER{c.total_orders === 1 ? "" : "S"}
                  </Text>
                </View>
                <Text className="font-sans-sb text-[16px] text-ink" style={TNUM}>
                  {c.total_value > 0 ? money(c.total_value) : "—"}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}