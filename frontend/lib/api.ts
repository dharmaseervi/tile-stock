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
  // PDF downloads (direct browser download — not JSON)
  downloadOrderPDF: (id: string) => {
    const token = getToken();
    const url = `${API_URL}/orders/${id}/pdf`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "");
    // Use fetch to include auth header then trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  },
  downloadStockPDF: () => {
    const token = getToken();
    const url = `${API_URL}/stock/report.pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  },

  // Auth
  signup: (data: { org_name: string; email: string; password: string }) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  // Products
  listProducts: () => request("/products"),
  getProduct: (id: string) => request(`/products/${id}`),
  createProduct: (data: any) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: "DELETE" }),

  // Batches
  listBatches: (productId: string) => request(`/products/${productId}/batches`),
  createBatch: (data: any) =>
    request("/batches", { method: "POST", body: JSON.stringify(data) }),

  // Stock
  currentStock: () => request("/stock/current"),
  lowStock: () => request("/stock/low"),
  history: (productId?: string) =>
    request(`/stock/history${productId ? `?product_id=${productId}` : ""}`),
  analytics: () => request("/stock/analytics"),
  recordMovement: (data: any) =>
    request("/stock/movements", { method: "POST", body: JSON.stringify(data) }),

  // Branches
  listBranches: () => request("/branches"),
  createBranch: (data: any) =>
    request("/branches", { method: "POST", body: JSON.stringify(data) }),

  // Customers
  listCustomers: () => request("/customers"),
  createCustomer: (data: any) =>
    request("/customers", { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) =>
    request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getCustomerLedger: (id: string) => request(`/customers/${id}/ledger`),

  // Orders / Challans
  listOrders: () => request("/orders"),
  createOrder: (data: any) =>
    request("/orders", { method: "POST", body: JSON.stringify(data) }),
  getOrder: (id: string) => request(`/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  toggleItemLoaded: (orderId: string, itemId: string) =>
    request(`/orders/${orderId}/items/${itemId}/loaded`, { method: "PATCH" }),

  // Suppliers
  listSuppliers: () => request("/suppliers"),
  createSupplier: (data: any) =>
    request("/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) =>
    request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request(`/suppliers/${id}`, { method: "DELETE" }),

  // Staff
  listStaff: () => request("/staff"),
  createInvite: (data: any) =>
    request("/invites", { method: "POST", body: JSON.stringify(data) }),
  acceptInvite: (data: any) =>
    request("/invites/accept", { method: "POST", body: JSON.stringify(data) }),

  // Subscription & reorder
  getSubscription: () => request("/subscription"),
  reorderSuggestions: () => request("/reorder/suggestions"),

  // Public
  getPublicPriceList: (orgId: string) =>
    request(`/public/${orgId}/products`),
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
export function getOrgId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.org_id || null;
  } catch {
    return null;
  }
}
