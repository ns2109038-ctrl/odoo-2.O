const TOKEN_KEY = "uf_token";
const LOGIN_KEY = "uf_login_id";
const ROLE_KEY  = "uf_role";

export function decodeToken(token) {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = raw.length % 4 ? "=".repeat(4 - (raw.length % 4)) : "";
    const p   = JSON.parse(atob(raw + pad));
    return { userId: p.sub, role: p.role, exp: p.exp };
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const d = decodeToken(token);
  return !d || Date.now() / 1000 > d.exp;
}

export function storeAuth(token, loginId, role) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(LOGIN_KEY, loginId);
  sessionStorage.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(LOGIN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

export function getStoredAuth() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) { clearAuth(); return null; }
  const loginId = sessionStorage.getItem(LOGIN_KEY);
  const role    = sessionStorage.getItem(ROLE_KEY) || decodeToken(token)?.role || "contact";
  return { token, loginId, role };
}
