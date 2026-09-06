import { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  CreditCard,
  FileText,
  Package,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function NotificationPopover({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
  onNavigate
}) {
  const [filter, setFilter] = useState("all"); // "all" | "unread" | "finance" | "system"
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Check if the click was on the trigger bell button itself
        const bellBtn = e.target.closest(".topbar-icon-btn");
        if (!bellBtn) {
          onClose();
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredList = notifications.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "finance") return ["payment", "invoice", "budget"].includes(item.type);
    if (filter === "system") return ["security", "inventory"].includes(item.type);
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case "payment":
        return <CreditCard size={16} style={{ color: "#22c55e" }} />;
      case "invoice":
        return <FileText size={16} style={{ color: "#38bdf8" }} />;
      case "inventory":
        return <Package size={16} style={{ color: "#f59e0b" }} />;
      case "security":
        return <ShieldCheck size={16} style={{ color: "#a855f7" }} />;
      case "budget":
        return <TrendingUp size={16} style={{ color: "#ec4899" }} />;
      default:
        return <Bell size={16} style={{ color: "#64748b" }} />;
    }
  };

  const getBadgeBg = (type) => {
    switch (type) {
      case "payment":
        return "rgba(34, 197, 94, 0.12)";
      case "invoice":
        return "rgba(56, 189, 248, 0.12)";
      case "inventory":
        return "rgba(245, 158, 11, 0.12)";
      case "security":
        return "rgba(168, 85, 247, 0.12)";
      case "budget":
        return "rgba(236, 72, 153, 0.12)";
      default:
        return "rgba(100, 116, 139, 0.12)";
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: "48px",
        right: "0",
        width: "380px",
        maxWidth: "calc(100vw - 32px)",
        background: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 15px 35px -5px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        zIndex: 1100,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        fontFamily: "Inter, system-ui, sans-serif"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <b style={{ fontSize: "15px", color: "#0f172a" }}>Notifications</b>
          {unreadCount > 0 ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                background: "#0284c7",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: "12px"
              }}
            >
              {unreadCount} New
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                background: "#e2e8f0",
                color: "#64748b",
                padding: "2px 8px",
                borderRadius: "12px"
              }}
            >
              All Read
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              title="Mark all as read"
              style={{
                background: "transparent",
                border: "none",
                color: "#0284c7",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(2, 132, 199, 0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              title="Clear all notifications"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                padding: "4px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            onClick={onClose}
            title="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              padding: "4px",
              cursor: "pointer",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "4px 8px 0"
        }}
      >
        {[
          { id: "all", label: `All (${notifications.length})` },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "finance", label: "Finance" },
          { id: "system", label: "System" }
        ].map((t) => {
          const isSelected = filter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                flex: 1,
                border: "none",
                background: "none",
                padding: "8px 6px",
                fontSize: "12px",
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? "#0284c7" : "#64748b",
                borderBottom: isSelected ? "2px solid #0284c7" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div
        style={{
          maxHeight: "360px",
          overflowY: "auto",
          padding: "8px 0"
        }}
      >
        {filteredList.length === 0 ? (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              color: "#94a3b8"
            }}
          >
            <CheckCircle2 size={32} style={{ color: "#22c55e", margin: "0 auto 8px" }} />
            <b style={{ color: "#334155", fontSize: "14px", display: "block" }}>You're all caught up!</b>
            <p style={{ fontSize: "12px", margin: "4px 0 0" }}>No {filter !== "all" ? filter : ""} notifications at this time.</p>
          </div>
        ) : (
          filteredList.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                onMarkAsRead(notif.id);
                if (notif.targetPage && onNavigate) {
                  onNavigate(notif.targetPage);
                  onClose();
                }
              }}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px 18px",
                background: notif.read ? "#ffffff" : "#f0f9ff",
                borderBottom: "1px solid #f1f5f9",
                cursor: "pointer",
                transition: "background 0.15s ease",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = notif.read ? "#f8fafc" : "#e0f2fe";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = notif.read ? "#ffffff" : "#f0f9ff";
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: getBadgeBg(notif.type),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {getIcon(notif.type)}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                  <b style={{ fontSize: "13px", color: notif.read ? "#334155" : "#0f172a" }}>
                    {notif.title}
                  </b>
                  <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Clock size={10} /> {notif.time}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                  {notif.message}
                </p>

                {notif.targetPage && (
                  <div
                    style={{
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "#0284c7",
                      fontWeight: 600
                    }}
                  >
                    <span>View {notif.targetPage}</span>
                    <ExternalLink size={10} />
                  </div>
                )}
              </div>

              {/* Unread indicator / Delete button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" }}>
                {!notif.read ? (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#0284c7",
                      boxShadow: "0 0 6px #0284c7"
                    }}
                  />
                ) : (
                  <div style={{ width: "8px", height: "8px" }} />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNotification(notif.id);
                  }}
                  title="Remove"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#cbd5e1",
                    padding: "2px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 16px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center"
        }}
      >
        <button
          onClick={() => {
            if (onNavigate) onNavigate("Dashboard");
            onClose();
          }}
          style={{
            background: "none",
            border: "none",
            color: "#0284c7",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          View System Event Logs &rarr;
        </button>
      </div>
    </div>
  );
}
