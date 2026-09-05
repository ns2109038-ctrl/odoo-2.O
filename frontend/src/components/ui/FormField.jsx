export default function FormField({ label, error, required, children, hint }) {
  return (
    <div className={`uf-field ${error ? "uf-field-error" : ""}`}>
      {label && (
        <label className="uf-label">
          {label}
          {required && <span className="uf-required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="uf-hint">{hint}</span>}
      {error && <span className="uf-error-msg" role="alert">{error}</span>}
    </div>
  );
}
