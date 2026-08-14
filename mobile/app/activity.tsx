import { useMemo } from "react";
import { View, Text, SectionList, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { C, TNUM } from "@/lib/theme";
import { Empty } from "@/components/ui";

const TONE: Record<string, string> = {
  in: C.accent,
  out: C.red,
  adjustment: C.ink2,
  damage: C.amber,
};

export default function ActivityScreen() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["activity"],
    queryFn: api.activityLog,
  });

  const rows = data ?? [];

  // Sectioned by day so the log reads as a diary rather than one long list.
  const sections = useMemo(() => {
    const byDay = new Map<string, any[]>();
    rows.forEach((m: any) => {
      const d = new Date(m.created_at)
        .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        .toUpperCase();
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(m);
    });
    return Array.from(byDay.entries()).map(([title, data]) => {
      const net = data.reduce(
        (a, m) => a + (m.movement_type === "in" ? m.boxes : -m.boxes),
        0
      );
      return { title, net, data };
    });
  }, [rows]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <ActivityIndicator color={C.ink3} className="mt-12" />
      </View>
    );
  }

  return (
    <SectionList
      className="flex-1 bg-bg"
      sections={sections}
      keyExtractor={(m: any) => m.id}
      stickySectionHeadersEnabled
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
      }
      renderSectionHeader={({ section }: any) => (
        <View className="flex-row items-baseline justify-between bg-band px-[22px] pb-[7px] pt-3.5">
          <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">{section.title}</Text>
          {/* Net movement for the day — did stock go up or down overall */}
          <Text
            className="font-mono text-[10px] tracking-[1.6px]"
            style={{ color: section.net >= 0 ? C.accent : C.red, ...TNUM }}
          >
            {section.net >= 0 ? "+" : "−"}{Math.abs(section.net)} BOX
          </Text>
        </View>
      )}
      renderItem={({ item: m }: any) => {
        const t = TONE[m.movement_type] ?? C.ink2;
        const plus = m.movement_type === "in";
        return (
          <View className="flex-row items-baseline gap-3 border-t border-hairline px-[22px] py-3">
            <Text className="font-mono text-[10px] tracking-[1px]" style={{ color: t, width: 58 }}>
              {m.movement_type.toUpperCase()}
            </Text>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-sans-m text-[14px] text-ink">
                {m.brand ? `${m.series_name}` : "—"}
              </Text>
              <Text numberOfLines={1} className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                {[m.brand?.toUpperCase(), m.reason, m.user_email?.split("@")[0]]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            </View>
            <Text className="w-[46px] text-right font-sans-sb text-[16px]" style={{ color: t, ...TNUM }}>
              {plus ? "+" : "−"}{m.boxes}
            </Text>
          </View>
        );
      }}
      ListEmptyComponent={
        <Empty
          title="No activity yet"
          body="Every stock movement you record shows up here, grouped by day."
        />
      }
    />
  );
}