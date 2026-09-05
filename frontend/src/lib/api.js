export const API_BASE_URL = "http://127.0.0.1:8000";

async function _parseError(res) {
  let data;
  try { data = await res.json(); } catch { return `Server error (HTTP ${res.status})`; }
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

function _networkErr() {
  return Object.assign(
    new Error("Unable to connect to the Urban Furniture server. Please check your connection."),
    { status: 0 }
  );
}

export async function loginUser(login_id, password) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id, password }),
    });
  } catch {
    throw _networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await _parseError(res)), { status: res.status });
  return res.json();
}

export async function registerUser({ name, login_id, email, password, confirm_password, role }) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, login_id, email, password, confirm_password, role }),
    });
  } catch {
    throw _networkErr();
  }
  if (!res.ok) throw Object.assign(new Error(await _parseError(res)), { status: res.status });
  return res.json();
}
