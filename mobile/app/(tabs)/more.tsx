import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/store/auth";
import { C } from "@/lib/theme";
import { Screen, Masthead, GroupBand } from "@/components/ui";

const WEB_URL = "https://tile-stock-orcin.vercel.app";

type Item = {
  label: string;
  sub: string;
  href?: string;
  onPress?: () => void;
  tone?: "danger";
};

export default function MoreScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  function confirmLogout() {
    Alert.alert("Log out", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  }

  const sections: { title: string; items: Item[] }[] = [
    {
      title: "LEDGERS",
      items: [
        { label: "Customers", sub: "Balances, shade history, order record", href: "/customers" },
        { label: "Activity", sub: "Every stock movement, by day", href: "/activity" },
      ],
    },
    {
      title: "PLANNING",
      items: [
        { label: "Analytics", sub: "What sells, what sits", href: "/analytics" },
        { label: "Reorder", sub: "Designs below level, build a PO", href: "/reorder" },
      ],
    },
    {
      title: "SHOP",
      items: [
        { label: "Settings", sub: "Staff, branches, suppliers, plan", href: "/settings" },
        {
          label: "Share price list",
          sub: "Send your catalogue to a customer",
          onPress: async () => {
            try {
              await Share.share({ message: `${WEB_URL}/price-list` });
            } catch {
              /* user dismissed the sheet */
            }
          },
        },
      ],
    },
    {
      title: "SESSION",
      items: [{ label: "Log out", sub: "Sign out on this device", onPress: confirmLogout, tone: "danger" }],
    },
  ];

  return (
    <Screen inset>
      <Masthead left="More" />

      <ScrollView
        className="mt-6 flex-1 border-t border-rule"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((sec) => (
          <View key={sec.title}>
            <GroupBand left={sec.title} />
            {sec.items.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.85}
                onPress={item.onPress ?? (() => router.push(item.href as any))}
                className="flex-row items-center gap-3 border-t border-hairline px-[22px] py-3.5"
              >
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-sans-m text-[15px] leading-[18px]"
                    style={{ color: item.tone === "danger" ? C.red : C.ink }}
                  >
                    {item.label}
                  </Text>
                  <Text className="mt-1 font-sans text-[12px] text-ink-3">{item.sub}</Text>
                </View>
                {item.tone !== "danger" && (
                  <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
                    <Path d="M1 1l5 5-5 5" stroke={C.ink4} strokeWidth={1.5} strokeLinecap="round" />
                  </Svg>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text className="px-[22px] pt-8 font-mono text-[10px] tracking-[1.2px] text-ink-4">
          TILES STOCK · v1.0
        </Text>
      </ScrollView>
    </Screen>
  );
}