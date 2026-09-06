import { useState, useEffect } from "react";
import {
  forgotPassword,
  getSmtpConfig,
  saveSmtpConfig,
  testSmtpConnection,
} from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import {
  Mail,
  Server,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Key,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
} from "lucide-react";

export default function ForgotPasswordPage({ onGoLogin, onGoReset }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // SMTP Settings Drawer / Modal State
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [smtpSuccessMsg, setSmtpSuccessMsg] = useState("");
  const [smtpErrorMsg, setSmtpErrorMsg] = useState("");
  const [testSending, setTestSending] = useState(false);

  // SMTP form fields
  const [smtpProvider, setSmtpProvider] = useState("gmail"); // 'gmail' | 'brevo' | 'custom'
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  // Load existing SMTP configuration on mount
  useEffect(() => {
    loadSmtpStatus();
  }, []);

  const loadSmtpStatus = async () => {
    try {
      const cfg = await getSmtpConfig();
      setSmtpStatus(cfg);
      if (cfg.smtp_host) setSmtpHost(cfg.smtp_host);
      if (cfg.smtp_port) setSmtpPort(cfg.smtp_port);
      if (cfg.smtp_user) setSmtpUser(cfg.smtp_user);
      if (cfg.smtp_from) setSmtpFrom(cfg.smtp_from);
      if (cfg.smtp_host?.includes("brevo")) setSmtpProvider("brevo");
      else if (cfg.smtp_host?.includes("gmail")) setSmtpProvider("gmail");
      else if (cfg.smtp_host) setSmtpProvider("custom");
    } catch (err) {
      console.warn("Could not load SMTP config:", err);
    }
  };

  const handleProviderChange = (provider) => {
    setSmtpProvider(provider);
    setSmtpErrorMsg("");
    setSmtpSuccessMsg("");
    if (provider === "gmail") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort(587);
      if (!smtpFrom && smtpUser) setSmtpFrom(smtpUser);
    } else if (provider === "brevo") {
      setSmtpHost("smtp-relay.brevo.com");
      setSmtpPort(587);
    }
  };

  const handleSaveSmtp = async (e) => {
    if (e) e.preventDefault();
    setSmtpErrorMsg("");
    setSmtpSuccessMsg("");
    if (!smtpHost.trim()) return setSmtpErrorMsg("SMTP Host is required.");
    if (!smtpUser.trim()) return setSmtpErrorMsg("SMTP Username / Email is required.");

    setSmtpLoading(true);
    try {
      const res = await saveSmtpConfig({
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPassword ? smtpPassword.trim() : undefined,
        smtp_from: smtpFrom.trim() || smtpUser.trim(),
      });
      setSmtpStatus(res.settings);
      setSmtpSuccessMsg("✓ SMTP settings saved successfully to environment!");
    } catch (err) {
      setSmtpErrorMsg(err.message || "Failed to save SMTP configuration.");
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    const targetEmail = email.trim() || smtpUser.trim();
    if (!targetEmail) {
      setSmtpErrorMsg("Please enter an email address to receive the test verification email.");
      return;
    }
    setSmtpErrorMsg("");
    setSmtpSuccessMsg("");
    setTestSending(true);

    try {
      const res = await testSmtpConnection({
        to_email: targetEmail,
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPassword ? smtpPassword.trim() : undefined,
        smtp_from: smtpFrom.trim() || smtpUser.trim(),
      });

      if (res.success) {
        setSmtpSuccessMsg(`✓ Verification email delivered to ${targetEmail}! Check your inbox.`);
        // Reload settings
        await loadSmtpStatus();
      } else {
        setSmtpErrorMsg(res.error || "SMTP test failed. Please check credentials.");
      }
    } catch (err) {
      setSmtpErrorMsg(err.message || "Connection test failed. Verify network & credentials.");
    } finally {
      setTestSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address.");

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setResult(res);
      // If user hasn't set username in SMTP form, auto-suggest their email
      if (!smtpUser) setSmtpUser(email.trim());
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (result?.reset_url) {
      navigator.clipboard.writeText(result.reset_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGoDirectReset = () => {
    if (!result?.reset_url) return;
    try {
      const url = new URL(result.reset_url);
      const token = url.searchParams.get("token");
      if (token && onGoReset) {
        onGoReset(token);
        return;
      }
    } catch {}
    window.location.href = result.reset_url;
  };

  const extractToken = (urlStr) => {
    if (!urlStr) return null;
    try {
      const url = new URL(urlStr);
      return url.searchParams.get("token");
    } catch {
      return null;
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT BRAND PANEL */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-logo-wrap">
            <img src="/urban_furniture_logo.png" alt="Urban Furniture" className="auth-logo" />
          </div>
          <h1 className="auth-brand-title">Urban Furniture</h1>
          <p className="auth-brand-sub">Accounting System</p>
          <p className="auth-brand-tagline">
            Secure password recovery with enterprise SMTP verification and instant encrypted tokens.
          </p>
          <div className="auth-brand-features">
            <div className="auth-feature-item">
              <span className="auth-feature-dot blue" />
              Secure 256-Bit Encrypted Token
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-dot teal" />
              30-Minute Safe Expiry
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-dot orange" />
              Direct Instant Reset Option
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-dot green" />
              Transactional SMTP Delivery
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-card" style={{ maxWidth: "520px" }}>
          <div className="auth-card-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="auth-card-title">Password Recovery</h2>
              <button
                type="button"
                onClick={() => setShowSmtpModal(!showSmtpModal)}
                className="uf-badge"
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: smtpStatus?.configured ? "#ecfdf5" : "#fff7ed",
                  color: smtpStatus?.configured ? "#047857" : "#c2410c",
                  border: `1px solid ${smtpStatus?.configured ? "#a7f3d0" : "#fed7aa"}`,
                }}
                title="Configure Outgoing Mail Server"
              >
                <Server size={12} />
                <span>{smtpStatus?.configured ? "SMTP Active" : "Setup SMTP"}</span>
              </button>
            </div>
            <p className="auth-card-sub">
              Enter your registered email address to receive your password reset instructions.
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {/* SUCCESS RESULT SCREEN */}
          {result ? (
            <div>
              {result.delivered_via_smtp ? (
                /* DELIVERED TO REAL INBOX VIA SMTP */
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <div style={{ fontWeight: "700", color: "#166534", fontSize: "14px" }}>
                        Password Reset Email Sent!
                      </div>
                      <div style={{ fontSize: "13px", color: "#374151", marginTop: "4px", lineHeight: "1.5" }}>
                        A password reset link has been dispatched via SMTP relay to <strong>{result.email}</strong>.
                        Please check your inbox (and spam folder). The link is valid for <strong>30 minutes</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* NOT DELIVERED VIA SMTP (SMTP NOT CONFIGURED OR FAILED) */
                <div
                  style={{
                    background: "#fefce8",
                    border: "1px solid #fef08a",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <AlertTriangle size={22} color="#ca8a04" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <div style={{ fontWeight: "700", color: "#854d0e", fontSize: "14px" }}>
                        Email Relay Not Configured Yet
                      </div>
                      <div style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px", lineHeight: "1.5" }}>
                        The server cannot transmit emails to your external inbox until SMTP credentials are saved.
                        <strong> Don&apos;t worry — your secure reset link is ready right now below!</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INSTANT DIRECT RESET LINK (NEVER BLOCKS THE USER) */}
              {result.reset_url && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Key size={16} color="#2563eb" />
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                      Instant Password Reset Available
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontWeight: "600",
                      }}
                    >
                      30-Min Expiry
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px 0" }}>
                    Click below to set your new password directly:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleGoDirectReset}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        padding: "10px",
                      }}
                    >
                      <span>Reset Password Directly Now</span>
                      <ArrowRight size={16} />
                    </Button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        padding: "7px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#475569",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      <span>{copied ? "Copied to Clipboard!" : "Copy Reset Link"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TOGGLE SMTP CONFIGURATION */}
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSmtpModal(!showSmtpModal)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    padding: "6px 0",
                    fontSize: "13px",
                    color: "#2563eb",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Server size={15} />
                    <span>Want real emails sent to your Gmail inbox? Configure SMTP</span>
                  </span>
                  {showSmtpModal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setResult(null);
                      setError("");
                    }}
                  >
                    Try Another Email
                  </Button>
                  <Button variant="secondary" fullWidth onClick={onGoLogin}>
                    Back to Sign In
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* INITIAL INPUT FORM */
            <form onSubmit={handleSubmit} noValidate>
              <FormField label="Registered Email Address" required>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. himanshumali8000@gmail.com"
                    className="uf-input"
                    autoComplete="email"
                    autoFocus
                    style={{ paddingRight: "36px" }}
                  />
                  <Mail
                    size={16}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </FormField>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                fullWidth
                style={{ marginTop: "12px", height: "42px", fontWeight: "600" }}
              >
                {loading ? "Generating Reset Link..." : "Send Password Reset Link"}
              </Button>

              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSmtpModal(!showSmtpModal)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: 0,
                  }}
                >
                  <Server size={13} />
                  <span>Mail Server (SMTP) Setup</span>
                </button>

                <button
                  className="auth-link-btn"
                  type="button"
                  onClick={onGoLogin}
                  style={{ fontSize: "13px", fontWeight: "600" }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* SMTP CONFIGURATION ACCORDION / DRAWER */}
          {showSmtpModal && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                animation: "fadeIn 0.2s ease-in-out",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Server size={16} color="#1e3a8a" />
                  <span style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>
                    Configure Outgoing Email (SMTP)
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: smtpStatus?.configured ? "#16a34a" : "#ea580c",
                  }}
                >
                  {smtpStatus?.configured ? "● Status: Configured" : "○ Status: Not Configured"}
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px 0", lineHeight: "1.5" }}>
                To receive password reset links in your real email inbox, enter your transactional SMTP credentials.
              </p>

              {/* PROVIDER PRESETS TABS */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                <button
                  type="button"
                  onClick={() => handleProviderChange("gmail")}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid",
                    cursor: "pointer",
                    borderColor: smtpProvider === "gmail" ? "#2563eb" : "#cbd5e1",
                    background: smtpProvider === "gmail" ? "#eff6ff" : "#ffffff",
                    color: smtpProvider === "gmail" ? "#1d4ed8" : "#475569",
                  }}
                >
                  Gmail (App Password)
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("brevo")}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid",
                    cursor: "pointer",
                    borderColor: smtpProvider === "brevo" ? "#2563eb" : "#cbd5e1",
                    background: smtpProvider === "brevo" ? "#eff6ff" : "#ffffff",
                    color: smtpProvider === "brevo" ? "#1d4ed8" : "#475569",
                  }}
                >
                  Brevo / Sendinblue
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("custom")}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid",
                    cursor: "pointer",
                    borderColor: smtpProvider === "custom" ? "#2563eb" : "#cbd5e1",
                    background: smtpProvider === "custom" ? "#eff6ff" : "#ffffff",
                    color: smtpProvider === "custom" ? "#1d4ed8" : "#475569",
                  }}
                >
                  Custom SMTP
                </button>
              </div>

              {/* HELPER BOX FOR GMAIL */}
              {smtpProvider === "gmail" && (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "12px",
                    fontSize: "11px",
                    color: "#1e40af",
                    lineHeight: "1.5",
                  }}
                >
                  <strong>How to use Gmail SMTP:</strong>
                  <ol style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                    <li>Enter your Gmail in Username.</li>
                    <li>
                      Generate a 16-character App Password at:{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2563eb", textDecoration: "underline" }}
                      >
                        myaccount.google.com/apppasswords
                      </a>
                    </li>
                    <li>Paste the 16 letters into SMTP Password.</li>
                  </ol>
                </div>
              )}

              {/* HELPER BOX FOR BREVO */}
              {smtpProvider === "brevo" && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "12px",
                    fontSize: "11px",
                    color: "#166534",
                    lineHeight: "1.5",
                  }}
                >
                  <strong>How to use Brevo (Sendinblue):</strong>
                  <div style={{ marginTop: "3px" }}>
                    Free 300 emails/day. In Brevo dashboard → SMTP &amp; API → copy your master SMTP key and paste into Password.
                  </div>
                </div>
              )}

              {smtpSuccessMsg && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#ecfdf5",
                    color: "#065f46",
                    borderRadius: "6px",
                    fontSize: "12px",
                    marginBottom: "10px",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  {smtpSuccessMsg}
                </div>
              )}

              {smtpErrorMsg && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#fef2f2",
                    color: "#991b1b",
                    borderRadius: "6px",
                    fontSize: "12px",
                    marginBottom: "10px",
                    border: "1px solid #fecaca",
                  }}
                >
                  {smtpErrorMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    className="uf-input"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="e.g. smtp.gmail.com"
                    style={{ fontSize: "12px", padding: "6px 8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Port
                  </label>
                  <input
                    type="number"
                    className="uf-input"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    style={{ fontSize: "12px", padding: "6px 8px" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                  SMTP Username / Email
                </label>
                <input
                  type="text"
                  className="uf-input"
                  value={smtpUser}
                  onChange={(e) => {
                    setSmtpUser(e.target.value);
                    if (!smtpFrom) setSmtpFrom(e.target.value);
                  }}
                  placeholder="e.g. yourname@gmail.com"
                  style={{ fontSize: "12px", padding: "6px 8px" }}
                />
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                  SMTP Password / App Password {smtpStatus?.has_password && !smtpPassword ? "(Password is currently saved)" : ""}
                </label>
                <input
                  type="password"
                  className="uf-input"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={smtpStatus?.has_password ? "•••••••••••••••• (Leave blank to keep current)" : "Enter password or App Password"}
                  style={{ fontSize: "12px", padding: "6px 8px" }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                  Sender Email (From)
                </label>
                <input
                  type="email"
                  className="uf-input"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="e.g. noreply@urbanfurniture.com"
                  style={{ fontSize: "12px", padding: "6px 8px" }}
                />
              </div>

              {/* ACTIONS */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleSaveSmtp}
                  disabled={smtpLoading}
                  className="uf-btn uf-btn-primary"
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    padding: "7px 12px",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {smtpLoading ? <RefreshCw size={12} className="spin" /> : <Check size={12} />}
                  <span>{smtpLoading ? "Saving..." : "Save Settings"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testSending}
                  className="uf-btn uf-btn-secondary"
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    padding: "7px 12px",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "#ffffff",
                  }}
                  title="Sends a test verification email"
                >
                  {testSending ? <RefreshCw size={12} className="spin" /> : <Send size={12} />}
                  <span>{testSending ? "Testing..." : "Send Test Email"}</span>
                </button>
              </div>

              {/* IF A RESET REQUEST WAS IN PROGRESS, ALLOW IMMEDIATE DISPATCH WITH NEW CREDENTIALS */}
              {result && (
                <div style={{ marginTop: "10px", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Resend Reset Link to {email} with New Credentials
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
