import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { C } from "@/lib/theme";

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    if (!orgName.trim() || !email.trim() || !password) {
      setError("FILL IN ALL THREE FIELDS");
      return;
    }
    if (password.length < 8) {
      setError("PASSWORD NEEDS AT LEAST 8 CHARACTERS");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.signup(orgName.trim(), email.trim().toLowerCase(), password);
      await login(data.token);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError((err.message || "COULDN'T CREATE ACCOUNT").toUpperCase());
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { label: "SHOP NAME", value: orgName, set: setOrgName, ph: "Shree Balaji Tiles", secure: false, kb: "default" as const, caps: "words" as const },
    { label: "EMAIL", value: email, set: setEmail, ph: "you@shop.com", secure: false, kb: "email-address" as const, caps: "none" as const },
    { label: "PASSWORD", value: password, set: setPassword, ph: "At least 8 characters", secure: true, kb: "default" as const, caps: "none" as const },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-bg"
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: insets.top + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">30-DAY TRIAL · NO CARD</Text>
          <Text className="mt-3 font-sans-sb text-[34px] leading-[38px] tracking-[-1px] text-ink-hi">
            Open your register
          </Text>
          <View className="mt-5 h-[3px] w-16 bg-accent" />
        </View>

        {fields.map((f) => (
          <View key={f.label} className="mb-5">
            <Text className="mb-2 font-mono text-[10px] tracking-[1.6px] text-ink-3">{f.label}</Text>
            <TextInput
              value={f.value}
              onChangeText={f.set}
              placeholder={f.ph}
              placeholderTextColor={C.ink4}
              secureTextEntry={f.secure}
              keyboardType={f.kb}
              autoCapitalize={f.caps}
              className="border border-rule bg-field px-3.5 py-3.5 font-sans text-[15px] text-ink"
            />
          </View>
        ))}

        {!!error && (
          <Text className="mb-4 font-mono text-[10px] leading-[15px] tracking-[1px] text-red">
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleSignup}
          disabled={busy}
          activeOpacity={0.85}
          className="items-center bg-accent py-4"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color={C.onAccent} />
          ) : (
            <Text className="font-sans-m text-[14px] text-onAccent">Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mt-8 items-center">
          <Text className="font-mono text-[10px] tracking-[1.2px] text-ink-3">
            ALREADY REGISTERED · <Text className="text-accent">SIGN IN</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}