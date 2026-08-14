import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/store/auth";
import { C } from "@/lib/theme";


export default function Index() {
  const { token, ready } = useAuth();

  // Hold on the dark background until SecureStore reports back, so there's
  // no white flash and no premature redirect.
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return <Redirect href={token ? "/(tabs)/dashboard" : "/(auth)/login"} />;
}