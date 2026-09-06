// ── Centralized API Client ───────────────────────────────────────────────────
import { getStoredAuth, clearAuth } from "./auth.js";

export const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Format server error messages nicely
 */
export async function parseError(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    return `Server error (HTTP ${res.status})`;
  }
  if (!data) return `Request failed (HTTP ${res.status})`;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((e) => (typeof e === "string" ? e : (e.msg || "").replace("Value error, ", "")))
      .filter(Boolean)
      .join("; ");
  }
  if (data.message) return data.message;
  return `Request failed (HTTP ${res.status})`;
}

function networkErr() {
  return Object.assign(
    new Error("Unable to connect to the Urban Furniture server. Please check your connection."),
    { status: 0 }
  );
}

// ── Fast In-Memory Cache & In-Flight Request Deduplication ───────────────────
const apiCache = new Map();
const inFlightRequests = new Map();
const DEFAULT_CACHE_TTL = 90 * 1000; // 90 seconds in-memory freshness

/**
 * Clear the client cache entirely or by matching endpoint substring/resource
 */
export function clearApiCache(resourcePrefix = null) {
  if (!resourcePrefix) {
    apiCache.clear();
  } else {
    const term = resourcePrefix.toLowerCase();
    for (const key of apiCache.keys()) {
      if (key.toLowerCase().includes(term)) {
        apiCache.delete(key);
      }
    }
  }
}

/**
 * Central request wrapper with Authorization header, In-Memory Caching, Deduplication,
 * 401 handling, 403 handling, and timeout safeguards.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const auth = getStoredAuth();
  const token = auth?.token;
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";

  // Build cache key for GET requests
  const cacheKey = isGet ? `${endpoint}__${token || "anon"}` : null;

  // 1. Check in-memory cache for instant 0ms return
  if (isGet && !options.noCache && cacheKey) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const ttl = options.ttl || DEFAULT_CACHE_TTL;
      if (age < ttl) {
        return cached.data;
      }
    }
  }

  // 2. Deduplicate simultaneous in-flight GET requests
  if (isGet && cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const executeRequest = async () => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // AbortController timeout safeguard (30 seconds for remote cloud database queries)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (isGet) {
        // 1. Return in-memory cached data if available
        if (cacheKey && apiCache.has(cacheKey)) {
          return apiCache.get(cacheKey).data;
        }
        // 2. Return local storage snapshot if available
        try {
          const localKey = `uf_cache_${endpoint.split("?")[0].replace(/[^a-zA-Z0-9]/g, "_")}`;
          const localItem = localStorage.getItem(localKey);
          if (localItem) {
            return JSON.parse(localItem);
          }
        } catch {}

        // 3. Graceful fallback based on endpoint type so UI never breaks
        console.warn(`[API Notice] GET ${endpoint} unavailable, using safe fallback:`, err.message);
        if (endpoint.includes("/auth/me") || endpoint.includes("/users/me")) {
          return auth?.user || null;
        }
        if (endpoint.includes("/reports/") || endpoint.includes("/summary")) {
          return { items: [], accounts: [], assets: [], liabilities: [], equity: [], income: [], expenses: [] };
        }
        return [];
      }
      throw networkErr();
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401) {
      clearAuth();
      clearApiCache();
      if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
        window.dispatchEvent(new CustomEvent("uf:auth-expired"));
      }
      const errText = await parseError(res);
      throw Object.assign(new Error(errText || "Session expired. Please log in again."), { status: 401 });
    }

    if (res.status === 403) {
      const errText = await parseError(res);
      throw Object.assign(new Error(errText || "Permission denied. You do not have access to perform this action."), { status: 403 });
    }

    if (!res.ok) {
      if (isGet) {
        if (cacheKey && apiCache.has(cacheKey)) {
          return apiCache.get(cacheKey).data;
        }
        try {
          const localKey = `uf_cache_${endpoint.split("?")[0].replace(/[^a-zA-Z0-9]/g, "_")}`;
          const localItem = localStorage.getItem(localKey);
          if (localItem) {
            return JSON.parse(localItem);
          }
        } catch {}
        console.warn(`[API Notice] GET ${endpoint} returned status ${res.status}. Falling back gracefully.`);
        if (endpoint.includes("/reports/") || endpoint.includes("/summary")) {
          return { items: [], accounts: [], assets: [], liabilities: [], equity: [], income: [], expenses: [] };
        }
        return [];
      }
      const errText = await parseError(res);
      throw Object.assign(new Error(errText), { status: res.status });
    }

    if (res.status === 204) {
      // Invalidate relevant cache on mutations
      if (!isGet) invalidateCacheForEndpoint(endpoint);
      return null;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    // Cache successful GET responses
    if (isGet && cacheKey && data !== null) {
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      try {
        const localKey = `uf_cache_${endpoint.split("?")[0].replace(/[^a-zA-Z0-9]/g, "_")}`;
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch {}
    }

    // Invalidate affected cache keys on data modifications
    if (!isGet) {
      invalidateCacheForEndpoint(endpoint);
    }

    return data;
  };

  if (isGet && cacheKey) {
    const promise = executeRequest().finally(() => {
      inFlightRequests.delete(cacheKey);
    });
    inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  return executeRequest();
}

/**
 * Intelligent cache invalidation when data is created, updated, or deleted
 */
function invalidateCacheForEndpoint(endpoint) {
  const clean = endpoint.replace(/^\/api\//, "").split("/")[0].split("?")[0];
  if (clean) {
    clearApiCache(clean);
  } else {
    clearApiCache();
  }
}

/**
 * Prefetch core datasets in the background during idle time
 */
export function prefetchCommonData() {
  if (typeof window === "undefined") return;
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
  idle(() => {
    try {
      getContacts().catch(() => {});
      getProducts().catch(() => {});
      getJournals().catch(() => {});
      getAccounts().catch(() => {});
      getPayments().catch(() => {});
      getInvoices({ invoice_type: "customer_invoice" }).catch(() => {});
    } catch {
      // Silent background prefetch
    }
  });
}

// ── 1. Auth ─────────────────────────────────────────────────────────────────
export async function loginUser(login_id, password) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: login_id, password }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function registerUser({ name, login_id, email, password, confirm_password, role }) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, login_id, email, password, confirm_password, role }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function request2FA(login_id, method = "email", digits = 6) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/users/request-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id, method, digits }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function verify2FA(login_id, otp) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/users/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id, otp }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function requestPasswordReset(identifier) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/users/request-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export const resetPasswordWithToken = (token, new_password) => apiRequest("/api/users/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) });
export const getLoginHistory = (userId) => apiRequest(`/api/users/${userId || 'me'}/login-history`);
export const getActiveSessions = (userId) => apiRequest(`/api/users/${userId || 'me'}/active-sessions`);


// ── 2. Users ────────────────────────────────────────────────────────────────
export const getUsers = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.is_active !== undefined) query.append("is_active", params.is_active);
  if (params.role) query.append("role", params.role);
  const qStr = query.toString();
  return apiRequest(`/api/users${qStr ? `?${qStr}` : ""}`);
};
export const getUserById = (id) => apiRequest(`/api/users/${id}`);
export const createUser = (data) => apiRequest("/api/users", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (id, data) => apiRequest(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const updateUserStatus = (id, is_active) => apiRequest(`/api/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) });
export const deleteUser = (id) => apiRequest(`/api/users/${id}`, { method: "DELETE" });

// ── 3. Contacts ─────────────────────────────────────────────────────────────
export const getContacts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.is_active !== undefined) query.append("is_active", params.is_active);
  if (params.contact_type) query.append("contact_type", params.contact_type);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/contacts${qStr ? `?${qStr}` : ""}`);
};
export const getContactById = (id) => apiRequest(`/api/contacts/${id}`);
export const createContact = (data) => apiRequest("/api/contacts", { method: "POST", body: JSON.stringify(data) });
export const updateContact = (id, data) => apiRequest(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteContact = (id) => apiRequest(`/api/contacts/${id}`, { method: "DELETE" });

// ── 4. Products ─────────────────────────────────────────────────────────────
export const getProducts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.is_active !== undefined) query.append("is_active", params.is_active);
  if (params.category) query.append("category", params.category);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/products${qStr ? `?${qStr}` : ""}`);
};
export const getProductById = (id) => apiRequest(`/api/products/${id}`);
export const createProduct = (data) => apiRequest("/api/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id, data) => apiRequest(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id) => apiRequest(`/api/products/${id}`, { method: "DELETE" });

// ── 5. Accounts (Chart of Accounts) ─────────────────────────────────────────
export const getAccounts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.is_active !== undefined) query.append("is_active", params.is_active);
  if (params.account_type) query.append("account_type", params.account_type);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/accounts${qStr ? `?${qStr}` : ""}`);
};
export const getAccountById = (id) => apiRequest(`/api/accounts/${id}`);
export const createAccount = (data) => apiRequest("/api/accounts", { method: "POST", body: JSON.stringify(data) });
export const updateAccount = (id, data) => apiRequest(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAccount = (id) => apiRequest(`/api/accounts/${id}`, { method: "DELETE" });

// ── 6. Journals ─────────────────────────────────────────────────────────────
export const getJournals = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.is_active !== undefined) query.append("is_active", params.is_active);
  if (params.journal_type) query.append("journal_type", params.journal_type);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/journals${qStr ? `?${qStr}` : ""}`);
};
export const getJournalById = (id) => apiRequest(`/api/journals/${id}`);
export const createJournal = (data) => apiRequest("/api/journals", { method: "POST", body: JSON.stringify(data) });
export const updateJournal = (id, data) => apiRequest(`/api/journals/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteJournal = (id) => apiRequest(`/api/journals/${id}`, { method: "DELETE" });

// ── 7. Journal Entries ──────────────────────────────────────────────────────
export const getJournalEntries = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.journal_id !== undefined) query.append("journal_id", params.journal_id);
  if (params.status) query.append("status", params.status);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/journal-entries${qStr ? `?${qStr}` : ""}`);
};
export const getJournalEntryById = (id) => apiRequest(`/api/journal-entries/${id}`);
export const createJournalEntry = (data) => apiRequest("/api/journal-entries", { method: "POST", body: JSON.stringify(data) });
export const updateJournalEntry = (id, data) => apiRequest(`/api/journal-entries/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const postJournalEntry = (id) => apiRequest(`/api/journal-entries/${id}/post`, { method: "POST" });
export const cancelJournalEntry = (id) => apiRequest(`/api/journal-entries/${id}/cancel`, { method: "POST" });
export const deleteJournalEntry = (id) => apiRequest(`/api/journal-entries/${id}`, { method: "DELETE" });

// ── 8. Sales Orders ─────────────────────────────────────────────────────────
export const getSalesOrders = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.customer_id !== undefined) query.append("customer_id", params.customer_id);
  if (params.status) query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/sales${qStr ? `?${qStr}` : ""}`);
};
export const getSalesOrderById = (id) => apiRequest(`/api/sales/${id}`);
export const createSalesOrder = (data) => apiRequest("/api/sales", { method: "POST", body: JSON.stringify(data) });
export const updateSalesOrder = (id, data) => apiRequest(`/api/sales/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const confirmSalesOrder = (id) => apiRequest(`/api/sales/${id}/confirm`, { method: "POST" });
export const cancelSalesOrder = (id) => apiRequest(`/api/sales/${id}/cancel`, { method: "POST" });

// ── 9. Purchase Orders ──────────────────────────────────────────────────────
export const getPurchaseOrders = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.vendor_id !== undefined) query.append("vendor_id", params.vendor_id);
  if (params.status) query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/purchases${qStr ? `?${qStr}` : ""}`);
};
export const getPurchaseOrderById = (id) => apiRequest(`/api/purchases/${id}`);
export const createPurchaseOrder = (data) => apiRequest("/api/purchases", { method: "POST", body: JSON.stringify(data) });
export const updatePurchaseOrder = (id, data) => apiRequest(`/api/purchases/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const confirmPurchaseOrder = (id) => apiRequest(`/api/purchases/${id}/confirm`, { method: "POST" });
export const cancelPurchaseOrder = (id) => apiRequest(`/api/purchases/${id}/cancel`, { method: "POST" });

// ── 10. Invoices & Bills ────────────────────────────────────────────────────
export const getInvoices = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.invoice_type) query.append("invoice_type", params.invoice_type);
  if (params.status) query.append("status", params.status);
  if (params.contact_id !== undefined) query.append("contact_id", params.contact_id);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/invoices${qStr ? `?${qStr}` : ""}`);
};
export const getInvoiceById = (id) => apiRequest(`/api/invoices/${id}`);
export const createInvoice = (data) => apiRequest("/api/invoices", { method: "POST", body: JSON.stringify(data) });
export const updateInvoice = (id, data) => apiRequest(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const postInvoice = (id) => apiRequest(`/api/invoices/${id}/post`, { method: "POST" });
export const cancelInvoice = (id) => apiRequest(`/api/invoices/${id}/cancel`, { method: "POST" });

// ── 11. Payments ────────────────────────────────────────────────────────────
export const getPayments = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.payment_type) query.append("payment_type", params.payment_type);
  if (params.status) query.append("status", params.status);
  if (params.contact_id !== undefined) query.append("contact_id", params.contact_id);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/payments${qStr ? `?${qStr}` : ""}`);
};
export const getPaymentById = (id) => apiRequest(`/api/payments/${id}`);
export const createPayment = (data) => apiRequest("/api/payments", { method: "POST", body: JSON.stringify(data) });
export const updatePayment = (id, data) => apiRequest(`/api/payments/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const postPayment = (id) => apiRequest(`/api/payments/${id}/post`, { method: "POST" });
export const cancelPayment = (id) => apiRequest(`/api/payments/${id}/cancel`, { method: "POST" });

// ── 12. Analytic Accounts ───────────────────────────────────────────────────
export const getAnalyticAccounts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.is_active !== undefined) query.append("is_active", params.is_active);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/analytic-accounts${qStr ? `?${qStr}` : ""}`);
};
export const getAnalyticAccountById = (id) => apiRequest(`/api/analytic-accounts/${id}`);
export const createAnalyticAccount = (data) => apiRequest("/api/analytic-accounts", { method: "POST", body: JSON.stringify(data) });
export const updateAnalyticAccount = (id, data) => apiRequest(`/api/analytic-accounts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const setAnalyticAccountStatus = (id, is_active) => apiRequest(`/api/analytic-accounts/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) });
export const deleteAnalyticAccount = (id) => apiRequest(`/api/analytic-accounts/${id}`, { method: "DELETE" });

// ── 13. Budgets ─────────────────────────────────────────────────────────────
export const getBudgets = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  if (params.status) query.append("status", params.status);
  if (params.analytic_account_id !== undefined) query.append("analytic_account_id", params.analytic_account_id);
  if (params.search) query.append("search", params.search);
  const qStr = query.toString();
  return apiRequest(`/api/budgets${qStr ? `?${qStr}` : ""}`);
};
export const getBudgetById = (id) => apiRequest(`/api/budgets/${id}`);
export const createBudget = (data) => apiRequest("/api/budgets", { method: "POST", body: JSON.stringify(data) });
export const updateBudget = (id, data) => apiRequest(`/api/budgets/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const activateBudget = (id) => apiRequest(`/api/budgets/${id}/activate`, { method: "POST" });
export const closeBudget = (id) => apiRequest(`/api/budgets/${id}/close`, { method: "POST" });
export const deleteBudget = (id) => apiRequest(`/api/budgets/${id}`, { method: "DELETE" });

// ── 14. Reports ─────────────────────────────────────────────────────────────
export const getTrialBalanceReport = (params = {}) => {
  const query = new URLSearchParams();
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  const qStr = query.toString();
  return apiRequest(`/api/reports/trial-balance${qStr ? `?${qStr}` : ""}`);
};
export const getBalanceSheetReport = (params = {}) => {
  const query = new URLSearchParams();
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  const qStr = query.toString();
  return apiRequest(`/api/reports/balance-sheet${qStr ? `?${qStr}` : ""}`);
};
export const getProfitLossReport = (params = {}) => {
  const query = new URLSearchParams();
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  const qStr = query.toString();
  return apiRequest(`/api/reports/profit-loss${qStr ? `?${qStr}` : ""}`);
};
export const getBudgetReport = (params = {}) => {
  const query = new URLSearchParams();
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  if (params.budget_id) query.append("budget_id", params.budget_id);
  if (params.analytic_account_id) query.append("analytic_account_id", params.analytic_account_id);
  const qStr = query.toString();
  return apiRequest(`/api/reports/budget${qStr ? `?${qStr}` : ""}`);
};

// ── 15. Dashboard ───────────────────────────────────────────────────────────
export const getDashboardSummary = () => apiRequest("/api/dashboard/summary");
export const getDashboardRecentTransactions = (limit = 10) => apiRequest(`/api/dashboard/recent-transactions?limit=${limit}`);

// -- Password Reset ----------------------------------------------------------

/**
 * Request a password reset email
 * @param {string} email
 */
export async function forgotPassword(email) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

/**
 * Reset password using a token from email
 * @param {string} token
 * @param {string} new_password
 * @param {string} confirm_password
 */
export async function resetPassword(token, new_password, confirm_password) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password, confirm_password }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function getSmtpConfig() {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/smtp-config`);
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function saveSmtpConfig(config) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/smtp-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

export async function testSmtpConnection(testPayload) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/test-smtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}

/**
 * AI Copilot chat request
 */
export async function postAiChat(message, history = [], active_page = "Dashboard") {
  let res;
  try {
    const auth = getStoredAuth();
    const headers = { "Content-Type": "application/json" };
    if (auth?.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
    }
    res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, history, active_page }),
    });
  } catch {
    throw networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await parseError(res)), { status: res.status });
  return res.json();
}
