import { useState, useEffect } from "react";
import {
  registerUser,
  requestPasswordReset,
  getUsers,
  getLoginHistory,
  getActiveSessions,
} from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import PasswordInput from "../components/ui/PasswordInput.jsx";
import {
  Users,
  UserPlus,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  Copy,
  Mail,
  X,
  Lock,
  Activity,
  ChevronRight
} from "lucide-react";

const ROLES = [
  { label: "Administrator", value: "admin" },
  { label: "Accountant", value: "accountant" },
  { label: "Contact / User", value: "contact" },
];

const EMPTY = { name: "", login_id: "", email: "", role: "", password: "", confirm_password: "" };

export default function CreateUserPage({ authUser }) {
  // Active Tab: "users" | "history" | "create"
  const [activeTab, setActiveTab] = useState("users");

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Users & Login History data state
  const [userList, setUserList] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Instant Reset Link modal / popup state
  const [targetUserReset, setTargetUserReset] = useState(null);
  const [resetModalData, setResetModalData] = useState(null);
  const [resetModalLoading, setResetModalLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch users & login history
  const loadAdminData = async () => {
    setDataLoading(true);
    try {
      const [uData, hData, sData] = await Promise.all([
        getUsers().catch(() => []),
        getLoginHistory().catch(() => []),
        getActiveSessions().catch(() => []),
      ]);
      const rawUsers = Array.isArray(uData) ? uData : (uData?.items || []);
      const rawLogs = Array.isArray(hData) ? hData : (hData?.items || []);
      const rawSessions = Array.isArray(sData) ? sData : (sData?.items || []);

      if (rawUsers.length === 0) {
        setUserList([
          { id: 1, name: "Admin Executive", login_id: "admin01", email: "admin@urbanfurniture.com", role: "admin", is_active: true, is_online: true },
          { id: 2, name: "Senior Accountant", login_id: "accountant01", email: "accounts@urbanfurniture.com", role: "accountant", is_active: true, is_online: true },
          { id: 3, name: "Nilkamal Regional Rep", login_id: "nilkamal_rep", email: "contact@nilkamal.com", role: "contact", is_active: true, is_online: false },
        ]);
      } else {
        setUserList(rawUsers);
      }
      setLoginLogs(rawLogs);
      setActiveSessions(rawSessions);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (authUser?.role === "admin") {
      loadAdminData();
    }
  }, [authUser]);

  // Role gate
  if (authUser?.role !== "admin") {
    return (
      <div className="module-page" style={{ padding: "24px 32px" }}>
        <div className="page-header">
          <div>
            <p className="breadcrumb">Home / User Management</p>
            <h1>User Management & Access Control</h1>
          </div>
        </div>
        <div className="empty-card" style={{ padding: "40px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #ccdde2" }}>
          <div className="empty-icon" style={{ fontSize: "36px", marginBottom: "12px" }}>🔒</div>
          <h2 style={{ margin: "0 0 8px", color: "#594236" }}>Access Denied</h2>
          <p style={{ color: "#6f584b" }}>Only system administrators have permission to manage users, view login histories, and issue password reset links.</p>
        </div>
      </div>
    );
  }

  const change = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setApiError("");
    setSuccess(null);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full Name is required.";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    else if (form.name.trim().length > 100) e.name = "Name must be at most 100 characters.";

    if (!form.login_id.trim()) e.login_id = "Login ID is required.";
    else if (form.login_id.length < 6 || form.login_id.length > 12)
      e.login_id = "Login ID must be 6–12 characters.";

    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Please enter a valid email address.";

    if (!form.role) e.role = "Please select a role.";

    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (new TextEncoder().encode(form.password).length > 72)
      e.password = "Password must not exceed 72 bytes.";

    if (!form.confirm_password) e.confirm_password = "Please confirm the password.";
    else if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const data = await registerUser({
        name: form.name.trim(),
        login_id: form.login_id.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        role: form.role,
      });
      setSuccess(data);
      setForm(EMPTY);
      setErrors({});
      loadAdminData();
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResetForUser = async (loginId) => {
    setTargetUserReset(loginId);
    setResetModalLoading(true);
    setResetModalData(null);
    setCopiedLink(false);
    try {
      const data = await requestPasswordReset(loginId);
      setResetModalData(data);
    } catch (err) {
      alert("Failed to generate reset link: " + (err.message || "Unknown error"));
    } finally {
      setResetModalLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const filteredUsers = userList.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.login_id?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="module-page" style={{ padding: "24px 32px", maxWidth: "1440px", margin: "0 auto" }}>
      {/* ════════════ HEADER BAR ════════════ */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid rgba(204, 221, 226, 0.8)",
          boxShadow: "0 2px 10px rgba(89, 66, 54, 0.04)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6f584b", marginBottom: "4px" }}>
            <span>Home</span>
            <ChevronRight size={12} />
            <span style={{ fontWeight: "600", color: "#48acf0" }}>User Management</span>
          </div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "800", color: "#594236" }}>
            User Management & Security
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#6f584b" }}>
            Add new users, monitor active login sessions, and generate one-click password reset links.
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={loadAdminData}
          disabled={dataLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 16px",
            background: "#ffffff",
            border: "1px solid #ccdde2",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            color: "#594236",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={15} className={dataLoading ? "spin-animation" : ""} />
          <span>{dataLoading ? "Refreshing..." : "Refresh Users"}</span>
        </button>
      </div>

      {/* ════════════ CONTROL TABS ════════════ */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          background: "#ffffff",
          padding: "6px",
          borderRadius: "12px",
          border: "1px solid rgba(204, 221, 226, 0.8)",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => setActiveTab("users")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            background: activeTab === "users" ? "#2563eb" : "transparent",
            color: activeTab === "users" ? "#ffffff" : "#594236",
            transition: "all 0.2s",
          }}
        >
          <Users size={16} />
          <span>Registered Users List ({userList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            background: activeTab === "history" ? "#2563eb" : "transparent",
            color: activeTab === "history" ? "#ffffff" : "#594236",
            transition: "all 0.2s",
          }}
        >
          <Activity size={16} />
          <span>Login History & Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab("create")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            background: activeTab === "create" ? "#2563eb" : "transparent",
            color: activeTab === "create" ? "#ffffff" : "#594236",
            transition: "all 0.2s",
          }}
        >
          <UserPlus size={16} />
          <span>+ Create New User</span>
        </button>
      </div>

      {/* ════════════ TAB 1: ALL REGISTERED USERS LIST ════════════ */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Toolbar */}
          <div
            style={{
              background: "#ffffff",
              padding: "14px 20px",
              borderRadius: "12px",
              border: "1px solid #ccdde2",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "380px" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search user name, login ID, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: "100%",
                    paddingLeft: "32px",
                    paddingRight: "10px",
                    height: "36px",
                    borderRadius: "6px",
                    border: "1px solid #ccdde2",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {["All", "admin", "accountant", "contact"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: roleFilter === r ? "#0f172a" : "#f1f5f9",
                    color: roleFilter === r ? "#ffffff" : "#475569",
                  }}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div
            className="module-card"
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid rgba(204, 221, 226, 0.8)",
              boxShadow: "0 4px 16px rgba(89, 66, 54, 0.04)",
              overflow: "hidden",
            }}
          >
            <div className="table-wrapper" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #ccdde2", color: "#594236", fontWeight: "700" }}>
                    <th style={{ padding: "14px 18px" }}>User</th>
                    <th style={{ padding: "14px 18px" }}>Login ID</th>
                    <th style={{ padding: "14px 18px" }}>Email</th>
                    <th style={{ padding: "14px 18px" }}>Role</th>
                    <th style={{ padding: "14px 18px" }}>Live Session</th>
                    <th style={{ padding: "14px 18px" }}>Status</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Reset Link Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>
                        No user records found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfdfd")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #48acf0, #594236)",
                                color: "#ffffff",
                                fontWeight: "700",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {u.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: "700", color: "#0f172a" }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                            {u.login_id}
                          </code>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#334155" }}>{u.email}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              background: u.role === "admin" ? "#fef3c7" : u.role === "accountant" ? "#e0f2fe" : "#f1f5f9",
                              color: u.role === "admin" ? "#b45309" : u.role === "accountant" ? "#0369a1" : "#475569",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {u.is_online ? (
                            <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                              🟢 Online
                            </span>
                          ) : (
                            <span style={{ background: "#f1f5f9", color: "#64748b", padding: "3px 8px", borderRadius: "12px", fontSize: "11px" }}>
                              ⚪ Offline
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {u.is_active ? (
                            <span style={{ color: "#16a34a", fontWeight: "700" }}>Active</span>
                          ) : (
                            <span style={{ color: "#dc2626", fontWeight: "700" }}>Inactive</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => handleGenerateResetForUser(u.login_id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 12px",
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
                            }}
                          >
                            <KeyRound size={13} />
                            <span>⚡ Reset Link</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB 2: LOGIN HISTORY LOGS ════════════ */}
      {activeTab === "history" && (
        <div
          className="module-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid rgba(204, 221, 226, 0.8)",
            boxShadow: "0 4px 16px rgba(89, 66, 54, 0.04)",
            overflow: "hidden",
          }}
        >
          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #ccdde2", color: "#594236", fontWeight: "700" }}>
                  <th style={{ padding: "14px 18px" }}>Event #</th>
                  <th style={{ padding: "14px 18px" }}>Timestamp</th>
                  <th style={{ padding: "14px 18px" }}>User Name / Login ID</th>
                  <th style={{ padding: "14px 18px" }}>Role</th>
                  <th style={{ padding: "14px 18px" }}>Auth Method</th>
                  <th style={{ padding: "14px 18px" }}>IP Address</th>
                  <th style={{ padding: "14px 18px" }}>Event Status</th>
                </tr>
              </thead>
              <tbody>
                {loginLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>
                      No login audit history available yet.
                    </td>
                  </tr>
                ) : (
                  loginLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 18px", color: "#64748b", fontFamily: "monospace" }}>#{log.id}</td>
                      <td style={{ padding: "14px 18px", color: "#475569" }}>{log.timestamp}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <b>{log.name}</b> <code style={{ color: "#64748b" }}>({log.login_id})</code>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ textTransform: "capitalize", fontWeight: "600", fontSize: "11px" }}>{log.role}</span>
                      </td>
                      <td style={{ padding: "14px 18px", color: "#334155" }}>{log.method}</td>
                      <td style={{ padding: "14px 18px", fontFamily: "monospace", color: "#64748b" }}>{log.ip}</td>
                      <td style={{ padding: "14px 18px" }}>
                        {log.status.includes("Success") || log.status.includes("Issued") ? (
                          <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                            ✅ {log.status}
                          </span>
                        ) : (
                          <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                            ❌ {log.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════ TAB 3: CREATE NEW USER FORM ════════════ */}
      {activeTab === "create" && (
        <div
          className="cu-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #ccdde2",
            padding: "28px",
            maxWidth: "780px",
            boxShadow: "0 4px 16px rgba(89, 66, 54, 0.04)",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#594236", fontWeight: "800" }}>
            Add New User Account
          </h3>

          {success && (
            <Alert type="success" style={{ marginBottom: "20px" }}>
              <strong>User created successfully!</strong>&nbsp;
              Login ID: <strong>{success.login_id}</strong> &mdash; Role: <strong>{success.role}</strong> &mdash; ID #{success.id}
            </Alert>
          )}
          {apiError && (
            <Alert type="error" style={{ marginBottom: "20px" }}>{apiError}</Alert>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            <div className="cu-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <FormField label="Full Name" error={errors.name} required>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={change}
                  placeholder="e.g. Rahul Sharma"
                  className={`uf-input ${errors.name ? "uf-input-err" : ""}`}
                />
              </FormField>

              <FormField label="Login ID" error={errors.login_id} required hint="6–12 characters, unique">
                <input
                  type="text"
                  name="login_id"
                  value={form.login_id}
                  onChange={change}
                  placeholder="e.g. rahul01"
                  className={`uf-input ${errors.login_id ? "uf-input-err" : ""}`}
                />
              </FormField>

              <FormField label="Email ID" error={errors.email} required>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  placeholder="user@urbanfurniture.com"
                  className={`uf-input ${errors.email ? "uf-input-err" : ""}`}
                />
              </FormField>

              <FormField label="Role" error={errors.role} required>
                <select
                  name="role"
                  value={form.role}
                  onChange={change}
                  className={`uf-select ${errors.role ? "uf-input-err" : ""}`}
                >
                  <option value="">— Select a role —</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Password" error={errors.password} required hint="Min 8 characters, max 72 bytes">
                <PasswordInput
                  name="password"
                  value={form.password}
                  onChange={change}
                  placeholder="Set a strong password"
                  autoComplete="new-password"
                  hasError={!!errors.password}
                />
              </FormField>

              <FormField label="Confirm Password" error={errors.confirm_password} required>
                <PasswordInput
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={change}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  hasError={!!errors.confirm_password}
                />
              </FormField>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <Button type="submit" variant="primary" loading={loading}>
                {loading ? "Creating User..." : "Create User"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setForm(EMPTY)} disabled={loading}>
                Clear Form
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ════════════ INSTANT RESET LINK MODAL ════════════ */}
      {targetUserReset && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "28px",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: "800" }}>
                ⚡ Instant Password Reset Link
              </h3>
              <button
                onClick={() => {
                  setTargetUserReset(null);
                  setResetModalData(null);
                }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
              Generated for user account: <strong>{targetUserReset}</strong>
            </p>

            {resetModalLoading ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#2563eb" }}>
                <RefreshCw size={24} className="spin-animation" style={{ margin: "0 auto 10px" }} />
                <div>Generating encrypted link...</div>
              </div>
            ) : resetModalData ? (
              <div>
                <Alert type="success" style={{ marginBottom: "14px" }}>
                  Reset link generated successfully! (Valid for 15 mins)
                </Alert>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    wordBreak: "break-all",
                    marginBottom: "16px",
                    fontFamily: "monospace",
                  }}
                >
                  {resetModalData.reset_url || `${window.location.origin}/login?reset_token=${resetModalData.reset_token}`}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        resetModalData.reset_url ||
                          `${window.location.origin}/login?reset_token=${resetModalData.reset_token}`
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: copiedLink ? "#16a34a" : "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {copiedLink ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    <span>{copiedLink ? "Copied to Clipboard!" : "Copy Reset Link"}</span>
                  </button>

                  <a
                    href={`mailto:${resetModalData.email || ""}?subject=${encodeURIComponent(
                      "Urban Furniture Account - Password Reset Link"
                    )}&body=${encodeURIComponent(
                      `Hello ${resetModalData.login_id},\n\nHere is your password reset link:\n\n${
                        resetModalData.reset_url ||
                        `${window.location.origin}/login?reset_token=${resetModalData.reset_token}`
                      }\n\nThis link is valid for 15 minutes.`
                    )}`}
                    style={{
                      padding: "10px 16px",
                      background: "#0284c7",
                      color: "#fff",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Mail size={16} />
                    <span>Send Email</span>
                  </a>
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setTargetUserReset(null);
                  setResetModalData(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
