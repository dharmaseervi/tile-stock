import { Tabs } from "expo-router";
import { View, Text, Platform } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

const ACCENT = "#2FB8AE";
const IDLE = "#8F877A";
const ON_ACCENT = "#161410";

// Drawn on a 20x20 grid, matching the design file's icon set.
const PATHS: Record<string, string> = {
  Home: "M2 8l8-6 8 6v9a1 1 0 01-1 1h-4v-6H7v6H3a1 1 0 01-1-1V8z",
  Products: "M2.5 5.5L10 2l7.5 3.5v9L10 18l-7.5-3.5v-9zM2.5 5.5L10 9m0 0l7.5-3.5M10 9v9",
  Challans: "M4 2h9l3 3v13H4V2zM7 8h6M7 11.5h6M7 15h4",
  More: "M4 10h.01M10 10h.01M16 10h.01",
};

function TabItem({ name, focused }: { name: keyof typeof PATHS; focused: boolean }) {
  const color = focused ? ACCENT : IDLE;
  return (
    <View className="w-16 items-center gap-[5px]">
      <View className="h-5 w-5 items-center justify-center">
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
          <Path
            d={PATHS[name]}
            stroke={color}
            strokeWidth={name === "More" ? 2.4 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text className="font-sans-m text-[10px]" style={{ color }}>{name}</Text>
    </View>
  );
}

/** Centre action - a square accent slab, no radius, per the ledger look. */
function ScanItem() {
  return (
    <View className="w-16 items-center gap-[5px]">
      <View className="-mt-1 h-9 w-[50px] items-center justify-center bg-accent">
        <Svg width={18} height={18} viewBox="0 0 19 19" fill="none">
          <Rect x={1.5} y={1.5} width={6} height={6} stroke={ON_ACCENT} strokeWidth={1.5} />
          <Rect x={11.5} y={1.5} width={6} height={6} stroke={ON_ACCENT} strokeWidth={1.5} />
          <Rect x={1.5} y={11.5} width={6} height={6} stroke={ON_ACCENT} strokeWidth={1.5} />
          <Path
            d="M11.5 11.5h3v3h-3zM17.5 11.5v3M14.5 17.5h3M11.5 17.5h1"
            stroke={ON_ACCENT}
            strokeWidth={1.5}
          />
        </Svg>
      </View>
      <Text className="font-sans-m text-[10px]" style={{ color: IDLE }}>Scan</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarLabelStyle: { fontFamily: "IBMPlexSans_500Medium", fontSize: 10, marginTop: 2 },
        tabBarActiveTintColor: "#2FB8AE",
        tabBarInactiveTintColor: "#8F877A",
        tabBarStyle: {
          backgroundColor: "#141210",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.09)",
          height: Platform.OS === "ios" ? 84 : 68,
          paddingTop: 10,
          paddingHorizontal: 6,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ tabBarIcon: ({ focused }) => <TabItem name="Home" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) => <TabItem name="Products" focused={focused} /> }} />
      <Tabs.Screen name="scan" options={{ tabBarIcon: () => <ScanItem /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabItem name="Challans" focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ tabBarIcon: ({ focused }) => <TabItem name="More" focused={focused} /> }} />
    </Tabs>
  );
}