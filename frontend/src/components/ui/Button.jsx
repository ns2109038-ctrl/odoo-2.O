export default function Button({
  children,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = "",
  ...rest
}) {
  return (
    <button
      type={type}
      className={`uf-btn uf-btn-${variant} ${fullWidth ? "uf-btn-full" : ""} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="uf-btn-spinner" /> : null}
      {children}
    </button>
  );
}
