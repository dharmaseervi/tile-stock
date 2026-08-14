import { useMemo, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  RefreshControl, Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM, money } from "@/lib/theme";
import { Screen, Masthead, GroupBand, Empty, Loading, Segments } from "@/components/ui";

type Product = {
  id: string;
  brand: string;
  series_name: string;
  size: string;
  finish: string | null;
  price_per_box: number;
  cost_price: number;
  reorder_level: number;
  image_url: string | null;
  category: string;
};

type Cat = "all" | "tile" | "material" | "sanitary";

const CATS: { key: Cat; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tile", label: "Tile" },
  { key: "material", label: "Material" },
  { key: "sanitary", label: "Sanitary" },
];

export default function ProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<Cat>("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: api.listProducts,
  });

  const all: Product[] = data ?? [];

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = all.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return (
        p.brand.toLowerCase().includes(q) ||
        p.series_name.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q) ||
        (p.finish ?? "").toLowerCase().includes(q)
      );
    });

    const byBrand = new Map<string, Product[]>();
    visible.forEach((p) => {
      const k = p.brand || "—";
      if (!byBrand.has(k)) byBrand.set(k, []);
      byBrand.get(k)!.push(p);
    });

    return Array.from(byBrand.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, items]) => ({
        brand: brand.toUpperCase(),
        count: items.length,
        items: items.sort((a, b) => a.series_name.localeCompare(b.series_name)),
      }));
  }, [all, search, cat]);

  const shown = groups.reduce((a, g) => a + g.count, 0);

  return (
    <Screen inset>
      <Masthead left="Catalogue" right={`${all.length} designs`} />

      <View className="px-[22px] pt-6">
        {/* Search + add, sharing one row so the add action is always reachable */}
        <View className="flex-row items-stretch gap-2">
          <View className="flex-1 flex-row items-center gap-2.5 border border-rule bg-field px-3 py-3">
            <Svg width={14} height={14} viewBox="0 0 15 15" fill="none">
              <Circle cx={6.5} cy={6.5} r={5} stroke={C.ink3} strokeWidth={1.4} />
              <Path d="M10.5 10.5L14 14" stroke={C.ink3} strokeWidth={1.4} strokeLinecap="round" />
            </Svg>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="SEARCH DESIGN / BRAND / SIZE"
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

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/products/new")}
            className="w-11 items-center justify-center bg-accent"
          >
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M8 2v12M2 8h12" stroke={C.onAccent} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View className="mt-4 pb-4">
          <Segments options={CATS} value={cat} onChange={setCat} />
        </View>
      </View>

      <ScrollView
        className="flex-1 border-t border-rule"
        contentContainerStyle={{ paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.ink3} />
        }
      >
        {isLoading ? (
          <Loading />
        ) : groups.length === 0 ? (
          <Empty
            title={all.length === 0 ? "No products yet" : "No match"}
            body={
              all.length === 0
                ? "Add your first design and it starts tracking stock."
                : `Nothing matches “${search || CATS.find((c) => c.key === cat)?.label}”.`
            }
            action={all.length === 0 ? { label: "Add a product", onPress: () => router.push("/products/new") } : undefined}
          />
        ) : (
          groups.map((g) => (
            <View key={g.brand}>
              <GroupBand left={g.brand} right={`${g.count} DESIGN${g.count > 1 ? "S" : ""}`} />
              {g.items.map((p) => {
                const margin =
                  p.cost_price > 0 && p.price_per_box > 0
                    ? Math.round(((p.price_per_box - p.cost_price) / p.price_per_box) * 100)
                    : null;
                const meta = [p.size, p.finish?.toUpperCase()].filter(Boolean).join(" ");
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/products/${p.id}`)}
                    className="flex-row items-center gap-3 border-t border-hairline px-[22px] py-3"
                  >
                    {/* Square swatch — photo where one exists, initial where not */}
                    <View className="h-10 w-10 items-center justify-center overflow-hidden bg-field">
                      {p.image_url ? (
                        <Image source={{ uri: p.image_url }} className="h-10 w-10" resizeMode="cover" />
                      ) : (
                        <Text className="font-mono text-[13px] text-ink-4">
                          {(p.series_name || "?")[0].toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-sans-m text-[15px] leading-[18px] text-ink">
                        {p.series_name}
                      </Text>
                      <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
                        {meta || "—"}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="font-sans-sb text-[14px] text-ink" style={TNUM}>
                        {p.price_per_box > 0 ? money(p.price_per_box) : "—"}
                      </Text>
                      <Text
                        className="mt-1 font-mono text-[10px] tracking-[0.4px]"
                        style={{
                          color:
                            margin === null ? C.ink4
                            : margin < 10 ? C.red
                            : margin < 20 ? C.amber
                            : C.accent,
                        }}
                      >
                        {margin === null ? "NO COST" : `${margin}% MARGIN`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}