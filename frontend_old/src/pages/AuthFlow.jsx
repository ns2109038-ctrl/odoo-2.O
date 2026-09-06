import { useState } from "react";

const API = "http://127.0.0.1:8000";

const shared = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "20px",
    padding: "40px 36px 36px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
  },
  logoWrap: { display: "flex", justifyContent: "center", marginBottom: "28px" },
  logoImg: { height: "70px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" },
  label: {
    display: "block", fontSize: "12px", fontWeight: "600",
    color: "rgba(255,255,255,0.55)", textTransform: "uppercase",
    letterSpacing: "0.08em", marginBottom: "6px", marginTop: "18px",
  },
  input: {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px", color: "#fff", fontSize: "15px",
    outline: "none", boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%", marginTop: "26px", padding: "14px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "none", borderRadius: "10px", color: "#fff",
    fontSize: "15px", fontWeight: "700", letterSpacing: "0.06em",
    cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.5)",
  },
  linkRow: { display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" },
  link: {
    fontSize: "13px", color: "rgba(255,255,255,0.5)", cursor: "pointer",
    background: "none", border: "none", textDecoration: "underline", padding: 0,
  },
  errorBox: {
    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
    borderRadius: "10px", color: "#fca5a5", padding: "12px 14px",
    fontSize: "13px", marginTop: "16px", lineHeight: "1.5",
  },
  successBox: {
    background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
    borderRadius: "10px", color: "#86efac", padding: "12px 14px",
    fontSize: "13px", marginTop: "16px", lineHeight: "1.8",
  },
  divider: { border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "20px 0 0" },
  hint: { fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: "12px" },
};

function LoginPage({ onGoSignUp, onLoginSuccess }) {
  const [form, setForm] = useState({ login_id: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.login_id.trim()) return setError("Login ID is required.");
    if (!form.password) return setError("Password is required.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: form.login_id.trim(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Invalid Login ID or Password.");
      } else {
        sessionStorage.setItem("uf_token", data.access_token);
        sessionStorage.setItem("uf_login_id", form.login_id.trim());
        onLoginSuccess({ token: data.access_token, loginId: form.login_id.trim() });
      }
    } catch { setError("Network Error: Could not connect to " + API); }
    finally { setLoading(false); }
  };

  return (
    <div style={shared.page}>
      <div style={shared.card}>
        <div style={shared.logoWrap}>
          <img src="/urban_furniture_logo.png" alt="Urban Furniture" style={shared.logoImg} />
        </div>
        <h2 style={{ color: "#fff", textAlign: "center", margin: "0 0 4px", fontSize: "22px", fontWeight: 700 }}>Sign In</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", margin: "0 0 4px", fontSize: "13px" }}>Urban Furniture Accounting System</p>
        <hr style={shared.divider} />
        {error && <div style={shared.errorBox}><strong>? Error:</strong> {error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={shared.label}>Login ID</label>
          <input style={shared.input} type="text" name="login_id" value={form.login_id} onChange={handleChange} placeholder="Enter your Login ID" autoComplete="username" />
          <label style={shared.label}>Password</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...shared.input, paddingRight: "48px" }} type={showPw ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "16px" }}>{showPw ? "??" : "??"}</button>
          </div>
          <button type="submit" disabled={loading} style={{ ...shared.primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Signing in" : "SIGN IN"}
          </button>
        </form>
        <div style={shared.linkRow}>
          <button style={shared.link}>Forgot Password</button>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>|</span>
          <button style={shared.link} onClick={onGoSignUp}>Sign Up</button>
        </div>
        <p style={shared.hint}>POST {API}/users/login</p>
      </div>
    </div>
  );
}

function SignUpPage({ onGoLogin }) {
  const [form, setForm] = useState({ login_id: "", email: "", password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(""); setSuccess(null); };

  const validate = () => {
    if (!form.login_id.trim()) return "Login ID is required.";
    if (form.login_id.trim().length < 6 || form.login_id.trim().length > 12) return "Login ID must be 6-12 characters.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Please enter a valid email.";
    if (!form.password) return "Password is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-z]/.test(form.password)) return "Password must contain a lowercase letter.";
    if (!/[A-Z]/.test(form.password)) return "Password must contain an uppercase letter.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) return "Password must contain a special character.";
    if (form.password !== form.confirm_password) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.login_id.trim(), login_id: form.login_id.trim(), email: form.email.trim(), password: form.password, confirm_password: form.confirm_password, role: "contact" }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = "Registration failed.";
        if (typeof data.detail === "string") msg = data.detail;
        else if (Array.isArray(data.detail)) msg = data.detail.map(d => `${d.loc?.join(".")}: ${d.msg}`).join(" | ");
        setError(msg);
      } else {
        setSuccess(data);
        setForm({ login_id: "", email: "", password: "", confirm_password: "" });
      }
    } catch { setError("Network Error: Could not connect to " + API); }
    finally { setLoading(false); }
  };

  return (
    <div style={shared.page}>
      <div style={shared.card}>
        <div style={shared.logoWrap}>
          <img src="/urban_furniture_logo.png" alt="Urban Furniture" style={shared.logoImg} />
        </div>
        <h2 style={{ color: "#fff", textAlign: "center", margin: "0 0 4px", fontSize: "22px", fontWeight: 700 }}>Create Account</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", margin: "0 0 4px", fontSize: "13px" }}>Urban Furniture Accounting System</p>
        <hr style={shared.divider} />
        {error && <div style={shared.errorBox}><strong>? Error:</strong> {error}</div>}
        {success && (
          <div style={shared.successBox}>
            <strong>? Account created!</strong><br />
            Login ID: <strong>{success.login_id}</strong> · ID #{success.id}<br />
            <span style={{ fontSize: "11px", opacity: 0.7 }}>You can now sign in with your credentials.</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label style={shared.label}>Enter Login ID (612 chars)</label>
          <input style={shared.input} type="text" name="login_id" value={form.login_id} onChange={handleChange} placeholder="e.g. john99" autoComplete="username" />
          <label style={shared.label}>Enter Email ID</label>
          <input style={shared.input} type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
          <label style={shared.label}>Enter Password</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...shared.input, paddingRight: "48px" }} type={showPw ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Min 8 · Aa · special char" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "16px" }}>{showPw ? "??" : "??"}</button>
          </div>
          <label style={shared.label}>Re-Enter Password</label>
          <input style={shared.input} type={showPw ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} placeholder="Confirm your password" autoComplete="new-password" />
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", marginTop: "8px", lineHeight: "1.7" }}>
            Must have &gt;8 chars · lowercase · UPPERCASE · special character
          </p>
          <button type="submit" disabled={loading} style={{ ...shared.primaryBtn, background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 4px 20px rgba(5,150,105,0.4)", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Creating account" : "SIGN UP"}
          </button>
        </form>
        <div style={shared.linkRow}>
          <button style={shared.link} onClick={onGoLogin}>Forgot Password</button>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>|</span>
          <button style={shared.link} onClick={onGoLogin}>Sign In</button>
        </div>
        <p style={shared.hint}>POST {API}/users/register</p>
      </div>
    </div>
  );
}

export default function AuthFlow({ onLoginSuccess }) {
  const [view, setView] = useState("login");
  if (view === "signup") return <SignUpPage onGoLogin={() => setView("login")} />;
  return <LoginPage onGoSignUp={() => setView("signup")} onLoginSuccess={onLoginSuccess} />;
}
