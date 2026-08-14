import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { C } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("ENTER YOUR EMAIL AND PASSWORD");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.login(email.trim().toLowerCase(), password);
      await login(data.token);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError((err.message || "SIGN IN FAILED").toUpperCase());
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-bg"
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingTop: insets.top }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wordmark set as a ledger heading rather than a logo lockup */}
        <View className="mb-12">
          <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">STOCK REGISTER</Text>
          <Text className="mt-3 font-sans-sb text-[38px] leading-[40px] tracking-[-1.2px] text-ink-hi">
            Tiles Stock
          </Text>
          <View className="mt-5 h-[3px] w-16 bg-accent" />
        </View>

        <View className="mb-5">
          <Text className="mb-2 font-mono text-[10px] tracking-[1.6px] text-ink-3">EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@shop.com"
            placeholderTextColor={C.ink4}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            className="border border-rule bg-field px-3.5 py-3.5 font-sans text-[15px] text-ink"
          />
        </View>

        <View className="mb-6">
          <Text className="mb-2 font-mono text-[10px] tracking-[1.6px] text-ink-3">PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.ink4}
            secureTextEntry
            className="border border-rule bg-field px-3.5 py-3.5 font-sans text-[15px] text-ink"
          />
        </View>

        {!!error && (
          <Text className="mb-4 font-mono text-[10px] leading-[15px] tracking-[1px] text-red">
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={busy}
          activeOpacity={0.85}
          className="items-center bg-accent py-4"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color={C.onAccent} />
          ) : (
            <Text className="font-sans-m text-[14px] text-onAccent">Sign in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          activeOpacity={0.7}
          className="mt-8 items-center"
        >
          <Text className="font-mono text-[10px] tracking-[1.2px] text-ink-3">
            NO ACCOUNT · <Text className="text-accent">START 30-DAY TRIAL</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}