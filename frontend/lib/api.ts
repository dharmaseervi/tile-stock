const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (data: { org_name: string; email: string; password: string }) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  listProducts: () => request("/products"),
  createProduct: (data: any) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: "DELETE" }),

  listBatches: (productId: string) => request(`/products/${productId}/batches`),
  createBatch: (data: any) =>
    request("/batches", { method: "POST", body: JSON.stringify(data) }),

  currentStock: () => request("/stock/current"),
  lowStock: () => request("/stock/low"),
  history: (productId?: string) =>
    request(`/stock/history${productId ? `?product_id=${productId}` : ""}`),
  recordMovement: (data: any) =>
    request("/stock/movements", { method: "POST", body: JSON.stringify(data) }),
};

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
