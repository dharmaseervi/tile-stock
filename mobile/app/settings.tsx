import { View, Text, ScrollView, TouchableOpacity, Alert, Share, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Svg, { Path } from "react-native-svg";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { C, TNUM } from "@/lib/theme";
import { GroupBand, Loading } from "@/components/ui";

const WEB_URL = "https://tile-stock-orcin.vercel.app";

export default function SettingsScreen() {
  const { logout } = useAuth();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: api.listSuppliers,
  });

  function confirmLogout() {
    Alert.alert("Log out", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  }

  /* Staff, branches and billing are form-heavy and touched about once a
     month — building them twice is poor value, so they hand off to web. */
  const webItems = [
    { label: "Staff & invites", sub: "Add team members, set roles" },
    { label: "Branches", sub: "Godowns and showrooms" },
    { label: "Subscription", sub: "Plan and billing" },
  ];

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-[22px] pb-6 pt-6">
        <Text className="font-mono text-[10px] leading-[16px] tracking-[0.6px] text-ink-4">
          SOME SETTINGS ARE EASIER ON A BIGGER SCREEN. THOSE OPEN THE WEB
          APP RATHER THAN A CRAMPED FORM HERE.
        </Text>
      </View>

      <GroupBand left="MANAGE ON WEB" />
      {webItems.map((it) => (
        <TouchableOpacity
          key={it.label}
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`${WEB_URL}/settings`)}
          className="flex-row items-center gap-3 border-t border-hairline px-[22px] py-3.5"
        >
          <View className="min-w-0 flex-1">
            <Text className="font-sans-m text-[15px] text-ink">{it.label}</Text>
            <Text className="mt-1 font-sans text-[12px] text-ink-3">{it.sub}</Text>
          </View>
          <Text className="font-mono text-[9px] tracking-[1px] text-ink-4">WEB ↗</Text>
        </TouchableOpacity>
      ))}

      <View className="mt-8">
        <GroupBand
          left="SUPPLIERS"
          right={suppliers?.length ? `${suppliers.length} ON FILE` : undefined}
        />
        {isLoading ? (
          <Loading />
        ) : (suppliers ?? []).length === 0 ? (
          <View className="border-t border-hairline px-[22px] py-8">
            <Text className="text-center font-sans text-[13px] text-ink-3">
              No suppliers added yet.
            </Text>
          </View>
        ) : (
          (suppliers ?? []).map((s: any) => (
            <View
              key={s.id}
              className="flex-row items-baseline gap-3 border-t border-hairline px-[22px] py-3.5"
            >
              <Text className="min-w-0 flex-1 font-sans-m text-[15px] text-ink">{s.name}</Text>
              {s.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${s.phone}`)} activeOpacity={0.7}>
                  <Text className="font-mono text-[11px] tracking-[0.6px] text-accent" style={TNUM}>
                    {s.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <View className="mt-8">
        <GroupBand left="SHARE" />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            try {
              await Share.share({ message: `${WEB_URL}/price-list` });
            } catch {
              /* dismissed */
            }
          }}
          className="flex-row items-center gap-3 border-t border-hairline px-[22px] py-3.5"
        >
          <View className="min-w-0 flex-1">
            <Text className="font-sans-m text-[15px] text-ink">Public price list</Text>
            <Text className="mt-1 font-sans text-[12px] text-ink-3">
              Send your catalogue to a customer
            </Text>
          </View>
          <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
            <Path d="M1 1l5 5-5 5" stroke={C.ink4} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={confirmLogout}
        activeOpacity={0.85}
        className="mx-[22px] mt-10 items-center border py-3.5"
        style={{ borderColor: C.red }}
      >
        <Text className="font-sans-m text-[13px]" style={{ color: C.red }}>Log out</Text>
      </TouchableOpacity>

      <Text className="px-[22px] pt-8 font-mono text-[10px] tracking-[1.2px] text-ink-4">
        TILES STOCK · v1.0
      </Text>
    </ScrollView>
  );
}