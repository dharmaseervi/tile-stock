import { create } from "zustand";
import { getToken, setToken, clearToken, api } from "@/lib/api";

type AuthState = {
  token: string | null;
  ready: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  token: null,
  ready: false,

  init: async () => {
    const token = await getToken();
    set({ token, ready: true });
  },

  login: async (token: string) => {
    await setToken(token);
    set({ token });
  },

  logout: async () => {
    try {
      await api.logout(); // revokes server-side session
    } catch {
      // still clear locally even if server call fails
    }
    await clearToken();
    set({ token: null });
  },
}));
