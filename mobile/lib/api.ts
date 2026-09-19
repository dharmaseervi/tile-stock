import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Flip to false to hit the deployed Render backend.
const USE_LOCAL = false;
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

function devHost() {
  // Expo's packager URL contains your Mac's LAN IP ("192.168.1.14:8081"),
  // so a physical device resolves correctly without hardcoding anything.
  const raw = Constants.expoConfig?.hostUri ?? "";
  const host = raw.split(":")[0];
  if (host) return host;
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

export const API_URL = USE_LOCAL
  ? `http://${devHost()}:8080/api`
  : "https://tile-stock.onrender.com/api";

export async function getToken() {
  return await SecureStore.getItemAsync("token");
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync("token", token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync("token");
}

// Long enough for Render's free tier to wake (~50s), short enough that a
// stalled connection surfaces as an error instead of an endless spinner.
const REQUEST_TIMEOUT_MS = 75_000;

async function request(path: string, options?: RequestInit) {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("The server took too long to respond. Check your connection and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }

  // 401 must be checked BEFORE the generic !res.ok block
  if (res.status === 401) {
    await clearToken();
    _onUnauthorized?.();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  // 204 No Content — body is empty, nothing to parse
  if (res.status === 204) return null;

  return res.json();
}

export type OrgDetails = {
  name: string;
  legal_name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};
export type OrgProfile = { id: string; setup_complete: boolean } & {
  [K in keyof OrgDetails]: K extends "name" ? string : string | null;
};

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  // Shop details are collected after signup, on the setup screen.
  signup: (email: string, password: string) =>
    request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request("/auth/logout", { method: "POST" }),
  // Products
  listProducts: () => request("/products"),
  getProduct: (id: string) => request(`/products/${id}`),
  getOrg: (): Promise<OrgProfile> => request("/org"),
  updateOrg: (data: OrgDetails): Promise<OrgProfile> =>
    request("/org", { method: "PUT", body: JSON.stringify(data) }),
  createProduct: (data: any) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request(`/products/${id}`, { method: "DELETE" }),
  activityLog: () => request("/activity"),
  // Stock
  currentStock: () => request("/stock/current"),
  lowStock: () => request("/stock/low"),
  recordMovement: (data: any) =>
    request("/stock/movements", { method: "POST", body: JSON.stringify(data) }),
  stockHistory: (productId: string) =>
    request(`/stock/history?product_id=${productId}`),
  analytics: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString();
    return request(`/stock/analytics${q ? `?${q}` : ""}`);
  },

  // Orders / Challans
  listOrders: () => request("/orders"),
  getOrder: (id: string) => request(`/orders/${id}`),
  createOrder: (data: any) =>
    request("/orders", { method: "POST", body: JSON.stringify(data) }),
  updateOrderStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  toggleLoaded: (orderId: string, itemId: string) =>
    request(`/orders/${orderId}/items/${itemId}/loaded`, { method: "PATCH" }),

  // Customers
  listCustomers: () => request("/customers"),
  getCustomerLedger: (id: string) => request(`/customers/${id}/ledger`),
  createCustomer: (data: any) =>
    request("/customers", { method: "POST", body: JSON.stringify(data) }),

  // Suppliers
  listSuppliers: () => request("/suppliers"),

  // Reorder
  reorderSuggestions: () => request("/reorder/suggestions"),
};
