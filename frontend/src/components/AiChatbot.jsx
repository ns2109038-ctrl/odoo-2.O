import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  QrCode,
  BookOpen,
  Package,
  Layers
} from "lucide-react";
import { postAiChat } from "../lib/api.js";

export default function AiChatbot({ activePage, setActivePage, authUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const initialGreeting = {
    role: "assistant",
    content: `### 👋 Hello ${authUser?.loginId || "there"}! I'm your Urban Furniture AI Copilot.\n\nI can help you explore real-time financial stats, explain double-entry accounting rules, guide you through Indian GST brackets, and assist with UPI QR payments.\n\nHow can I help you today?`,
    actions: [
      { label: "📊 Financial Summary", type: "fill_prompt", target: "Summarize our financial health and revenue" },
      { label: "📱 How does UPI QR work?", type: "fill_prompt", target: "How do I collect payment via UPI QR code?" },
      { label: "⚖️ Double Entry Rules", type: "fill_prompt", target: "Explain the double entry debit and credit rules" }
    ],
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };

  const [messages, setMessages] = useState([initialGreeting]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (customPrompt) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const data = await postAiChat(textToSend, historyPayload, activePage);
      const botReply = {
        role: "assistant",
        content: data.reply,
        actions: data.actions || [],
        source: data.source,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      const errorReply = {
        role: "assistant",
        content: `⚠️ ${err.message || "I encountered an issue reaching the AI backend. Please verify your connection."}`,
        actions: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (act) => {
    if (act.type === "navigate" && act.target) {
      if (setActivePage) {
        setActivePage(act.target);
      }
    } else if (act.type === "fill_prompt" && act.target) {
      handleSend(act.target);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Basic markdown-like rendering for headers, bold text, lists, and quotes
  const renderFormattedContent = (content) => {
    const lines = content.split("\n");
    return lines.map((line, lIdx) => {
      // Header 3
      if (line.startsWith("### ")) {
        return (
          <h4 key={lIdx} style={{ margin: "8px 0 4px", color: "#60a5fa", fontSize: "14px", fontWeight: 700 }}>
            {line.replace("### ", "")}
          </h4>
        );
      }
      // Header 4
      if (line.startsWith("#### ")) {
        return (
          <h5 key={lIdx} style={{ margin: "6px 0 3px", color: "#93c5fd", fontSize: "13px", fontWeight: 600 }}>
            {line.replace("#### ", "")}
          </h5>
        );
      }
      // Blockquote
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={lIdx}
            style={{
              margin: "6px 0",
              padding: "4px 10px",
              borderLeft: "3px solid #3b82f6",
              background: "rgba(59, 130, 246, 0.08)",
              fontSize: "12px",
              color: "#cbd5e1"
            }}
          >
            {line.replace("> ", "")}
          </blockquote>
        );
      }
      // Bullet items
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const bulletText = line.substring(2);
        return (
          <div key={lIdx} style={{ display: "flex", gap: "6px", margin: "2px 0 2px 6px", fontSize: "12.5px" }}>
            <span style={{ color: "#38bdf8" }}>•</span>
            <div>{parseInlineBold(bulletText)}</div>
          </div>
        );
      }
      // Numbered lists (e.g. 1. , 2. )
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={lIdx} style={{ margin: "3px 0 3px 6px", fontSize: "12.5px" }}>
            {parseInlineBold(line)}
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={lIdx} style={{ height: "6px" }} />;
      }
      // Normal paragraph
      return (
        <p key={lIdx} style={{ margin: "3px 0", fontSize: "12.5px", lineHeight: "1.45" }}>
          {parseInlineBold(line)}
        </p>
      );
    });
  };

  const parseInlineBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} style={{ color: "#f8fafc" }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={pIdx}
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: "1px 4px",
              borderRadius: "4px",
              fontSize: "11.5px",
              color: "#38bdf8",
              fontFamily: "monospace"
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* ── Floating Launcher Button ── */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          title="Open Urban AI Copilot"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 18px",
            borderRadius: "30px",
            background: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 8px 24px rgba(2, 132, 199, 0.4), 0 2px 6px rgba(0,0,0,0.2)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: "scale(1)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05) translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 28px rgba(2, 132, 199, 0.55), 0 4px 10px rgba(0,0,0,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(2, 132, 199, 0.4), 0 2px 6px rgba(0,0,0,0.2)";
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Sparkles size={18} style={{ color: "#fde047" }} />
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px #22c55e"
              }}
            />
          </div>
          <span>AI Copilot</span>
        </button>
      )}

      {/* ── Chat Window / Widget ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "24px",
            width: isMinimized ? "320px" : "420px",
            maxWidth: "calc(100vw - 32px)",
            height: isMinimized ? "54px" : "600px",
            maxHeight: "calc(100vh - 40px)",
            background: "#0f172a",
            borderRadius: "16px",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(56, 189, 248, 0.15)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10000,
            overflow: "hidden",
            transition: "height 0.25s ease, width 0.25s ease",
            fontFamily: "Inter, system-ui, sans-serif"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              background: "linear-gradient(90deg, #1e293b 0%, #0f172a 100%)",
              borderBottom: isMinimized ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: isMinimized ? "pointer" : "default"
            }}
            onClick={() => {
              if (isMinimized) setIsMinimized(false);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0284c7, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(2, 132, 199, 0.3)"
                }}
              >
                <Bot size={19} style={{ color: "#ffffff" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <b style={{ color: "#f8fafc", fontSize: "14px" }}>Urban AI Copilot</b>
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 6px #22c55e"
                    }}
                  />
                </div>
                <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                  ERP & Accounting Assistant
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {!isMinimized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Clear conversation history?")) {
                      setMessages([initialGreeting]);
                    }
                  }}
                  title="Clear Chat"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    padding: "6px",
                    cursor: "pointer",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  <Trash2 size={15} />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                title={isMinimized ? "Expand" : "Minimize"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  padding: "6px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                title="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  padding: "6px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Prompt Pill Strip */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(15, 23, 42, 0.95)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                  scrollbarWidth: "none"
                }}
              >
                <button
                  onClick={() => handleSend("Summarize our financial health, sales, and profit")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(2, 132, 199, 0.15)",
                    border: "1px solid rgba(2, 132, 199, 0.35)",
                    color: "#38bdf8",
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <TrendingUp size={12} /> Revenue & Profit
                </button>
                <button
                  onClick={() => handleSend("How does UPI QR code payment work in this system?")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(168, 85, 247, 0.15)",
                    border: "1px solid rgba(168, 85, 247, 0.35)",
                    color: "#c084fc",
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <QrCode size={12} /> UPI QR Guide
                </button>
                <button
                  onClick={() => handleSend("Explain double entry debit and credit rules for inventory")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#fbbf24",
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <BookOpen size={12} /> Double Entry
                </button>
                <button
                  onClick={() => handleSend("Show product stock and inventory catalog")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#4ade80",
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <Package size={12} /> Stock & Catalog
                </button>
              </div>

              {/* Chat Message Stream */}
              <div
                style={{
                  flex: 1,
                  padding: "16px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  background: "radial-gradient(ellipse at top right, rgba(30, 58, 138, 0.15), transparent 70%), #0b1120"
                }}
              >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                      width: "100%"
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "88%",
                        padding: msg.role === "user" ? "10px 14px" : "12px 16px",
                        borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background:
                          msg.role === "user"
                            ? "linear-gradient(135deg, #0284c7, #2563eb)"
                            : "rgba(30, 41, 59, 0.85)",
                        border:
                          msg.role === "user"
                            ? "1px solid rgba(255, 255, 255, 0.2)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#f1f5f9",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                        position: "relative"
                      }}
                    >
                      {/* Message Content */}
                      <div>{renderFormattedContent(msg.content)}</div>

                      {/* Action buttons (Navigate / Fill prompt) */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "8px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px"
                          }}
                        >
                          {msg.actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => handleActionClick(act)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: act.type === "navigate" ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.1)",
                                border: act.type === "navigate" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.2)",
                                color: act.type === "navigate" ? "#7dd3fc" : "#e2e8f0",
                                padding: "4px 8px",
                                borderRadius: "8px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56, 189, 248, 0.35)")}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  act.type === "navigate" ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.1)")
                              }
                            >
                              {act.type === "navigate" ? <ArrowRight size={11} /> : null}
                              {act.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Footer & Copy */}
                      {msg.role === "assistant" && (
                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "10px",
                            color: "#64748b"
                          }}
                        >
                          <span>{msg.timestamp}</span>
                          <button
                            onClick={() => copyToClipboard(msg.content, idx)}
                            title="Copy reply"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: copiedIndex === idx ? "#4ade80" : "#64748b",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "2px 4px",
                              fontSize: "10px"
                            }}
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check size={11} /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "12px" }}>
                    <div
                      style={{
                        padding: "8px 14px",
                        borderRadius: "14px",
                        background: "rgba(30, 41, 59, 0.85)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Sparkles size={14} style={{ color: "#38bdf8", animation: "pulse 1.5s infinite" }} />
                      <span>Copilot is analyzing ledger & metrics...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div
                style={{
                  padding: "12px",
                  background: "#0f172a",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center"
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask anything about ${activePage || "accounting"}...`}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#38bdf8")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.15)")}
                />

                <button
                  onClick={() => handleSend()}
                  disabled={!inputMessage.trim() || loading}
                  title="Send message"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background:
                      !inputMessage.trim() || loading
                        ? "rgba(255, 255, 255, 0.08)"
                        : "linear-gradient(135deg, #0284c7, #2563eb)",
                    border: "none",
                    color: !inputMessage.trim() || loading ? "#64748b" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: !inputMessage.trim() || loading ? "not-allowed" : "pointer",
                    boxShadow:
                      !inputMessage.trim() || loading ? "none" : "0 4px 12px rgba(2, 132, 199, 0.4)",
                    transition: "all 0.15s ease"
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
