import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments, useNavigation } from "expo-router";
import { AppState, TouchableOpacity, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import {
  useFonts,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import { useAuth } from "@/store/auth";
import { C } from "@/lib/theme";
// @ts-ignore: global CSS import for nativewind
import "../global.css";
import { clearToken, getToken, setUnauthorizedHandler } from "@/lib/api";
import { jwtDecode } from "jwt-decode";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

/** Square back control in the ledger's accent, replacing the iOS chevron. */
function BackButton() {
  const router = useRouter();
  const navigation = useNavigation();
  if (!navigation.canGoBack?.()) return null;
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.6}
      className="h-8 w-8 items-center justify-center border border-rule"
    >
      <Svg width={13} height={13} viewBox="0 0 12 12" fill="none">
        <Path d="M7.5 1L2.5 6l5 5" stroke={C.accent} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    </TouchableOpacity>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, ready, init, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => { init(); }, []);

  // Existing redirect logic
  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    const inAuth = group === "(auth)";
    const inApp = group === "(tabs)";

    if (!token && !inAuth) {
      router.replace("/(auth)/login");
    } else if (token && !inApp && (inAuth || group === undefined)) {
      router.replace("/(tabs)/dashboard");
    }
  }, [token, ready, segments]);

  // Check expiry when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (next === "active" && appState.current !== "active") {
        const t = await getToken();
        if (t) {
          try {
            const { exp } = jwtDecode<{ exp: number }>(t);
            if (Date.now() / 1000 > exp) {
              await clearToken();
              logout();
            }
          } catch {
            logout();
          }
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  // Hold on the dark background rather than flashing white while fonts load.
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  setUnauthorizedHandler(() => useAuth.getState().logout());
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: C.bg },
              headerShadowVisible: false,
              headerTitleAlign: "center",
              headerTitleStyle: {
                color: C.ink,
                fontFamily: "IBMPlexMono_400Regular",
                fontSize: 11,
              },
              headerLeft: () => <BackButton />,
              headerBackVisible: false,
              contentStyle: { backgroundColor: C.bg },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />

            <Stack.Screen name="products/new" options={{ headerShown: true, title: "NEW PRODUCT" }} />
            <Stack.Screen name="products/[id]/index" options={{ headerShown: true, title: "PRODUCT" }} />
            <Stack.Screen name="products/[id]/edit" options={{ headerShown: true, title: "EDIT PRODUCT" }} />
            <Stack.Screen name="products/[id]/qr" options={{ headerShown: true, title: "QR LABEL" }} />

            <Stack.Screen name="orders/new" options={{ headerShown: true, title: "NEW CHALLAN" }} />
            <Stack.Screen name="orders/[id]" options={{ headerShown: true, title: "CHALLAN" }} />

            <Stack.Screen name="customers/index" options={{ headerShown: true, title: "CUSTOMERS" }} />
            <Stack.Screen name="customers/[id]" options={{ headerShown: true, title: "CUSTOMER" }} />

            <Stack.Screen name="analytics" options={{ headerShown: true, title: "ANALYTICS" }} />
            <Stack.Screen name="reorder" options={{ headerShown: true, title: "REORDER" }} />
            <Stack.Screen name="activity" options={{ headerShown: true, title: "ACTIVITY" }} />
            <Stack.Screen name="settings" options={{ headerShown: true, title: "SETTINGS" }} />
          </Stack>
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}