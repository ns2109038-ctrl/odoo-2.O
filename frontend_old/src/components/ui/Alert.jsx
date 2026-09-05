const VARIANTS = {
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "✕" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", icon: "✓" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "ℹ" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "⚠" },
};

export default function Alert({ type = "error", children, className = "" }) {
  const v = VARIANTS[type] || VARIANTS.error;
  return (
    <div
      className={`uf-alert uf-alert-${type} ${className}`}
      style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.text }}
      role="alert"
    >
      <span className="uf-alert-icon">{v.icon}</span>
      <span className="uf-alert-msg">{children}</span>
    </div>
  );
}
