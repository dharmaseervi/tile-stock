import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { api, type OrgDetails } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Field, Loading } from "@/components/ui";
import { C } from "@/lib/theme";

const EMPTY: OrgDetails = {
  name: "", legal_name: "", gstin: "", phone: "", email: "",
  address: "", city: "", state: "", pincode: "",
};

/** Shop details. Right after signup it's the onboarding step (no way back
 *  until it's saved); from Settings it's a plain edit screen. */
export default function ShopSetupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { token, logout } = useAuth();
  const { data: org, isLoading } = useQuery({ queryKey: ["org"], queryFn: api.getOrg, staleTime: Infinity });
  const [form, setForm] = useState<OrgDetails>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onboarding = !!org && !org.setup_complete;
  const isOwner = (() => {
    try { return token ? jwtDecode<{ role?: string }>(token).role === "owner" : false; } catch { return false; }
  })();

  useEffect(() => {
    if (!org) return;
    setForm(Object.fromEntries(
      Object.keys(EMPTY).map((k) => [k, (org as any)[k] ?? ""]),
    ) as OrgDetails);
  }, [org]);

  useEffect(() => {
    navigation.setOptions({
      title: onboarding ? "SET UP YOUR SHOP" : "SHOP DETAILS",
      ...(onboarding ? { headerLeft: () => null, gestureEnabled: false } : {}),
    });
  }, [onboarding]);

  const set = (k: keyof OrgDetails) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const saved = await api.updateOrg(form);
      queryClient.setQueryData(["org"], saved);
      if (onboarding) router.replace("/(tabs)/dashboard");
      else { Alert.alert("Saved", "Shop details updated."); router.back(); }
    } catch (e: any) {
      setError(String(e?.message ?? "Couldn't save").toUpperCase());
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !org) return <View className="flex-1 bg-bg"><Loading /></View>;

  if (!isOwner) {
    return (
      <View className="flex-1 bg-bg px-[22px] pt-10">
        <Text className="font-sans-sb text-[22px] text-ink">Shop details</Text>
        <Text className="mt-3 font-sans text-[15px] leading-[22px] text-ink-3">
          {onboarding
            ? "Your shop owner hasn't finished setting up the shop yet. Ask them to open Tiles Stock and complete it, then sign in again."
            : "Only the shop owner can change these details."}
        </Text>
        {onboarding && (
          <TouchableOpacity onPress={logout} className="mt-8 self-start border border-rule px-4 py-3">
            <Text className="font-sans-m text-[14px] text-ink">Log out</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {onboarding && (
          <Text className="mb-7 font-sans text-[15px] leading-[22px] text-ink-3">
            These appear in the app and on your challans and reports. You can change them later in Settings.
          </Text>
        )}

        <Field label="Shop name" value={form.name} onChange={set("name")} placeholder="Balaji Tiles & Sanitary" />
        <Field label="Registered company name" hint="optional" value={form.legal_name} onChange={set("legal_name")}
          placeholder="Balaji Ceramics Pvt Ltd" />
        <Field label="GSTIN" hint="optional" value={form.gstin} onChange={(v) => set("gstin")(v.toUpperCase())}
          placeholder="29ABCDE1234F1Z5" />
        <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="98765 43210" keyboard="number-pad" />
        <Field label="Business email" hint="optional" value={form.email} onChange={set("email")}
          placeholder="accounts@yourshop.com" keyboard="email-address" />
        <Field label="Address" value={form.address} onChange={set("address")}
          placeholder="Shop no., street, area" multiline />
        <Field label="City" value={form.city} onChange={set("city")} placeholder="Bengaluru" />
        <Field label="State" value={form.state} onChange={set("state")} placeholder="Karnataka" />
        <Field label="PIN code" value={form.pincode} onChange={set("pincode")} placeholder="560001" keyboard="number-pad" />

        {!!error && (
          <Text className="mb-4 font-mono text-[10px] leading-[15px] tracking-[1px] text-red">{error}</Text>
        )}

        <TouchableOpacity onPress={save} disabled={busy} activeOpacity={0.85}
          className="items-center bg-accent py-4" style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? <ActivityIndicator color={C.onAccent} /> : (
            <Text className="font-sans-m text-[14px] text-onAccent">{onboarding ? "Save and continue" : "Save"}</Text>
          )}
        </TouchableOpacity>

        {onboarding && (
          <TouchableOpacity onPress={logout} activeOpacity={0.7} className="mt-8 items-center">
            <Text className="font-mono text-[10px] tracking-[1.2px] text-ink-3">NOT YOUR SHOP · LOG OUT</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
