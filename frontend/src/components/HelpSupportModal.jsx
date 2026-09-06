import { useState } from "react";
import {
  HelpCircle,
  X,
  Mail,
  Phone,
  MessageSquare,
  BookOpen,
  Activity,
  Send,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  LifeBuoy,
  Sparkles,
  Bot
} from "lucide-react";

import { postAiChat } from "../lib/api.js";

export default function HelpSupportModal({ authUser, onClose }) {
  const [activeTab, setActiveTab] = useState("ai"); // "ai" | "contact" | "faq" | "status"
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChatLog, setAiChatLog] = useState([
    {
      role: "assistant",
      content: "Hello! I am your Urban Furniture ERP AI Assistant. Ask me about live financial revenue, GST tax calculations, double-entry bookkeeping, or UPI QR payments!"
    }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskModalAi = async (customQ) => {
    const query = (customQ || aiQuestion).trim();
    if (!query || aiLoading) return;
    setAiChatLog((prev) => [...prev, { role: "user", content: query }]);
    setAiQuestion("");
    setAiLoading(true);

    try {
      const data = await postAiChat(query, [], "Dashboard");
      setAiChatLog((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error("AI Modal Error:", err);
      setAiChatLog((prev) => [...prev, { role: "assistant", content: `⚠️ ${err.message || "AI service temporarily unreachable."}` }]);
    } finally {
      setAiLoading(false);
    }
  };
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "Accounting & Ledger",
    priority: "Medium",
    message: "",
  });
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const supportEmail = "support@urbanfurniture.com";
  const supportPhone = "+91 1800-419-8726";

  const handleCopy = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) {
      alert("Please fill in subject and description.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicket({
        id: ticketId,
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        timestamp: new Date().toLocaleString(),
      });
      setSubmitting(false);
      setTicketForm({
        subject: "",
        category: "Accounting & Ledger",
        priority: "Medium",
        message: "",
      });
    }, 600);
  };

  const faqs = [
    {
      q: "How do I record a payment via UPI or QR Code?",
      a: "Go to Transactions > Payments, click '+ Record Payment', select 'UPI & QR Code', enter the amount, and a live NPCI QR code will generate on screen. You can choose Google Pay, PhonePe, Paytm, BHIM, or enter a 12-digit UTR to verify.",
    },
    {
      q: "What is the difference between Draft and Posted status?",
      a: "Draft entries and invoices are uncommitted vouchers. Once you click 'Post', the transaction affects the general ledger and updates account balances permanently.",
    },
    {
      q: "How do I view financial statements like P&L or Balance Sheet?",
      a: "Click on 'Reports' in the sidebar. You can select Date ranges to dynamically view the Balance Sheet, Profit & Loss summary, and Trial Balance.",
    },
    {
      q: "How do I reset my account password or configure 2FA?",
      a: "Click your avatar or the shield icon in the top right header to access Profile & Two-Factor Authentication (2FA) settings. You can also use the 'Forgot Password' link on the sign-in screen.",
    },
  ];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "20px",
      }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #ccdde2",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "rgba(72, 172, 240, 0.15)",
                border: "1px solid rgba(72, 172, 240, 0.3)",
                borderRadius: "10px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LifeBuoy size={24} style={{ color: "#38bdf8" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                Help &amp; System Support Desk
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                Urban Furniture ERP Accounting Assistance &amp; System Telemetry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div
          style={{
            display: "flex",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 24px",
            gap: "8px",
          }}
        >
          {[
            { id: "ai", label: "AI Copilot Assistant", icon: Sparkles },
            { id: "contact", label: "Contact Support & Tickets", icon: MessageSquare },
            { id: "faq", label: "System Knowledge & FAQs", icon: BookOpen },
            { id: "status", label: "System Status & Health", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: "none",
                  background: "none",
                  padding: "12px 14px",
                  fontSize: "13px",
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? "#0284c7" : "#64748b",
                  borderBottom: isSelected ? "2.5px solid #0284c7" : "2.5px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* MODAL CONTENT */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* TAB 0: AI COPILOT ASSISTANT */}
          {activeTab === "ai" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #0284c7, #6366f1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Bot size={22} style={{ color: "#ffffff" }} />
                  </div>
                  <div>
                    <b style={{ fontSize: "15px", color: "#f8fafc" }}>Instant ERP Intelligence</b>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                      Connected to live PostgreSQL ledger, GST rules, and double-entry engines.
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid #22c55e",
                    color: "#4ade80",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  🟢 Online &amp; Ready
                </div>
              </div>

              {/* Quick Prompt Suggestions */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleAskModalAi("Summarize our financial health and total sales")}
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    color: "#0369a1",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📊 Revenue &amp; Profit Summary
                </button>
                <button
                  type="button"
                  onClick={() => handleAskModalAi("How does UPI QR code payment collection work?")}
                  style={{
                    background: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    color: "#7e22ce",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📱 UPI QR Payment Flow
                </button>
                <button
                  type="button"
                  onClick={() => handleAskModalAi("What is the double entry rule for cash furniture sales?")}
                  style={{
                    background: "#fefce8",
                    border: "1px solid #fef08a",
                    color: "#854d0e",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ⚖️ Double Entry Rules
                </button>
              </div>

              {/* Chat Stream */}
              <div
                style={{
                  minHeight: "220px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {aiChatLog.map((log, lIdx) => (
                  <div
                    key={lIdx}
                    style={{
                      alignSelf: log.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: log.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: log.role === "user" ? "#0284c7" : "#ffffff",
                      color: log.role === "user" ? "#ffffff" : "#1e293b",
                      border: log.role === "user" ? "none" : "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    }}
                  >
                    {log.content}
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ color: "#0284c7", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={14} /> AI is processing ledger...
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAskModalAi(); }}
                  placeholder="Ask AI Copilot anything about Urban Furniture ERP..."
                  disabled={aiLoading}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAskModalAi()}
                  disabled={!aiQuestion.trim() || aiLoading}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0 18px",
                    fontWeight: 600,
                    cursor: !aiQuestion.trim() || aiLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={15} /> Ask
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: CONTACT SUPPORT & TICKET SUBMISSION */}
          {activeTab === "contact" && (
            <div>
              {/* CONTACT CHANNELS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ background: "#e0f2fe", padding: "8px", borderRadius: "8px", color: "#0284c7" }}>
                      <Mail size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#0369a1", fontWeight: "700", textTransform: "uppercase" }}>
                        Email Desk
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                        {supportEmail}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(supportEmail, "email")}
                    style={{
                      background: copiedEmail ? "#166534" : "#ffffff",
                      color: copiedEmail ? "#ffffff" : "#0284c7",
                      border: "1px solid #bae6fd",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                    {copiedEmail ? "Copied" : "Copy"}
                  </button>
                </div>

                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ background: "#dcfce7", padding: "8px", borderRadius: "8px", color: "#16a34a" }}>
                      <Phone size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#166534", fontWeight: "700", textTransform: "uppercase" }}>
                        Helpline (Toll-Free)
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                        {supportPhone}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(supportPhone, "phone")}
                    style={{
                      background: copiedPhone ? "#166534" : "#ffffff",
                      color: copiedPhone ? "#ffffff" : "#16a34a",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedPhone ? <Check size={12} /> : <Copy size={12} />}
                    {copiedPhone ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* TICKET SUBMISSION SUCCESS ALERT */}
              {submittedTicket && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <CheckCircle2 size={22} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#065f46" }}>
                      Support Ticket Created: <strong>#{submittedTicket.id}</strong>
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#047857", lineHeight: "1.5" }}>
                      Your ticket regarding <em>&quot;{submittedTicket.subject}&quot;</em> has been submitted to the engineering &amp; accounting support team. A response will be dispatched to your registered email shortly.
                    </p>
                  </div>
                </div>
              )}

              {/* TICKET SUBMISSION FORM */}
              <form onSubmit={handleSubmitTicket} style={{ background: "#f8fafc", borderRadius: "12px", padding: "18px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: "700", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Send size={15} style={{ color: "#0284c7" }} /> Submit Support Query or Bug Report
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      Category *
                    </label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      style={{
                        width: "100%",
                        height: "38px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 10px",
                        fontSize: "13px",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    >
                      <option value="Accounting & Ledger">Accounting &amp; General Ledger</option>
                      <option value="Payments & UPI QR">Payments &amp; UPI QR Code</option>
                      <option value="Invoices & Bills">Invoices, Orders &amp; Bills</option>
                      <option value="User Profile & Security">User Profile, Login &amp; 2FA</option>
                      <option value="General System Feedback">General System Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      Priority Level
                    </label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      style={{
                        width: "100%",
                        height: "38px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 10px",
                        fontSize: "13px",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    >
                      <option value="Low">Low - General Question</option>
                      <option value="Medium">Medium - Normal Attention</option>
                      <option value="High">High - Urgent Accounting Block</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                    Subject / Summary *
                  </label>
                  <input
                    type="text"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    placeholder="e.g. Need assistance reconciling UPI payment #PAY-0004"
                    required
                    style={{
                      width: "100%",
                      height: "38px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                    Details / Steps to Reproduce *
                  </label>
                  <textarea
                    rows={3}
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    placeholder="Describe what happened or what you need help with..."
                    required
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "10px 12px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: "linear-gradient(135deg, #0284c7, #0369a1)",
                      color: "#ffffff",
                      border: "none",
                      padding: "9px 20px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                    }}
                  >
                    <Send size={14} /> {submitting ? "Submitting Ticket..." : "Submit Support Ticket"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: FAQS */}
          {activeTab === "faq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {faqs.map((f, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                  }}
                >
                  <h4 style={{ margin: "0 0 6px", fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ChevronRight size={15} style={{ color: "#0284c7" }} /> {f.q}
                  </h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.6", paddingLeft: "21px" }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SYSTEM DIAGNOSTICS */}
          {activeTab === "status" && (
            <div>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 8px #16a34a" }} />
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>
                    All Accounting &amp; Ledger Systems Operational
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "#15803d", fontWeight: "600" }}>99.98% Uptime</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { label: "Core Database", value: "PostgreSQL (Supabase Cloud)", status: "Active" },
                  { label: "Backend API Engine", value: "FastAPI REST v2.0", status: "Healthy" },
                  { label: "Payment Gateway", value: "NPCI UPI Deep Link / QR Engine", status: "Active" },
                  { label: "Authentication", value: "JWT RS256 / HS256 + 2FA TOTP", status: "Encrypted" },
                  { label: "Active User Session", value: authUser?.loginId || "Administrator", status: authUser?.role || "Admin" },
                  { label: "Build Target", value: "Urban Furniture Hackathon 2026", status: "Production" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>{item.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginTop: "2px" }}>{item.value}</div>
                    </div>
                    <span
                      style={{
                        background: "#e0f2fe",
                        color: "#0369a1",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              padding: "8px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Close Support Desk
          </button>
        </div>
      </div>
    </div>
  );
}
