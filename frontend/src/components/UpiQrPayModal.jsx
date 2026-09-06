import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  X,
  AlertCircle
} from "lucide-react";

const UPI_APPS = [
  {
    id: "gpay",
    name: "Google Pay",
    shortName: "GPay",
    color: "#1a73e8",
    bg: "#e8f0fe",
    badge: "Google Pay",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "phonepe",
    name: "PhonePe",
    shortName: "PhonePe",
    color: "#5f259f",
    bg: "#f3e8ff",
    badge: "PhonePe",
    icon: (
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="16" fill="#5f259f"/>
        <path d="M21 9h-4.5c-1 0-1.8.8-1.8 1.8v1.6H13c-.3 0-.6.3-.6.6v1.6c0 .3.3.6.6.6h1.7v2c0 2 1.6 3.6 3.6 3.6h.7c.3 0 .6-.3.6-.6v-1.6c0-.3-.3-.6-.6-.6h-.7c-.9 0-1.6-.7-1.6-1.6V16h4c.3 0 .6-.3.6-.6v-1.6c0-.3-.3-.6-.6-.6h-4v-1c0-.3.3-.6.6-.6H21c.3 0 .6-.3.6-.6V9.6c0-.3-.3-.6-.6-.6z" fill="#ffffff"/>
      </svg>
    ),
  },
  {
    id: "paytm",
    name: "Paytm UPI",
    shortName: "Paytm",
    color: "#00b9f1",
    bg: "#e0f7fe",
    badge: "Paytm",
    icon: (
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#002e6e"/>
        <path d="M7 11h4c1.7 0 3 1.2 3 2.7s-1.3 2.7-3 2.7H9.2v4.6H7V11zm2.2 3.6h1.7c.6 0 1-.4 1-1s-.4-1-1-1H9.2v2z" fill="#00baf2"/>
        <path d="M15 15h2v6h-2v-6zm1-4c-.7 0-1.2.5-1.2 1.2s.5 1.2 1.2 1.2 1.2-.5 1.2-1.2-.5-1.2-1.2-1.2z" fill="#00baf2"/>
        <path d="M19 17h2v4h-2v-4zm1-3c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z" fill="#00baf2"/>
      </svg>
    ),
  },
  {
    id: "bhim",
    name: "BHIM UPI",
    shortName: "BHIM",
    color: "#00796b",
    bg: "#e0f2f1",
    badge: "BHIM",
    icon: (
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#00796b"/>
        <path d="M8 8h5c2.2 0 4 1.3 4 3 0 1.1-.7 2.1-1.8 2.5 1.4.4 2.3 1.5 2.3 2.8 0 2-1.8 3.5-4.2 3.5H8V8zm2.4 4.4h2.4c1 0 1.8-.5 1.8-1.3 0-.9-.8-1.3-1.8-1.3h-2.4v2.6zm0 5.6h2.7c1.1 0 2-.6 2-1.4 0-1-.9-1.5-2-1.5h-2.7V18z" fill="#ffffff"/>
        <path d="M19 8l3.5 8-3.5 8h2.5l3.5-8-3.5-8H19z" fill="#ff9933"/>
      </svg>
    ),
  },
  {
    id: "cred",
    name: "CRED UPI",
    shortName: "CRED",
    color: "#1e293b",
    bg: "#f1f5f9",
    badge: "CRED",
    icon: (
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#0f172a"/>
        <path d="M16 6a10 10 0 0 0-10 10v6a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-6a10 10 0 0 0-10-10zm6 16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-6a8 8 0 1 1 16 0v6zm-6-8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="#ffffff"/>
      </svg>
    ),
  },
];

export default function UpiQrPayModal({
  amount = 0,
  payeeName = "Urban Furniture Ltd",
  payeeVpa = "urbanfurniture@okhdfcbank",
  transactionNote = "Urban Furniture Payment",
  reference = "",
  onConfirmPayment,
  onClose,
  isStandalone = false,
  onChangeUtr,
  initialUtr = "",
}) {
  const [selectedApp, setSelectedApp] = useState("gpay");
  const [qrUrl, setQrUrl] = useState("");
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [utrNumber, setUtrNumber] = useState(initialUtr);
  const [verified, setVerified] = useState(false);

  const numAmount = Math.max(0, Number(amount || 0));
  const note = reference ? `${transactionNote} - ${reference}` : transactionNote;

  // Standard UPI URI format according to NPCI specifications
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${numAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  // Generate real QR code data URL whenever UPI parameters change
  useEffect(() => {
    QRCode.toDataURL(upiIntentUri, {
      width: 220,
      margin: 1,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [upiIntentUri]);

  // Sync internal UTR with parent if supplied
  useEffect(() => {
    if (initialUtr) setUtrNumber(initialUtr);
  }, [initialUtr]);

  const handleUtrChange = (val) => {
    setUtrNumber(val);
    if (onChangeUtr) onChangeUtr(val);
    if (val.trim().length >= 8) {
      setVerified(true);
    } else {
      setVerified(false);
    }
  };

  const generateMockUtr = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random6 = Math.floor(100000 + Math.random() * 900000);
    const mockUtr = `UPI${timestamp}${random6}`;
    handleUtrChange(mockUtr);
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === "vpa") {
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleConfirm = () => {
    if (onConfirmPayment) {
      onConfirmPayment({
        utr: utrNumber || `UPI-MANUAL-${Date.now().toString().slice(-6)}`,
        app: UPI_APPS.find((a) => a.id === selectedApp)?.name || "UPI",
        amount: numAmount,
      });
    }
  };

  const content = (
    <div className="upi-qr-panel" style={{ background: "#ffffff", borderRadius: "12px" }}>
      {/* HEADER BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)",
          color: "#ffffff",
          padding: "16px 20px",
          borderRadius: isStandalone ? "14px 14px 0 0" : "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 12px rgba(2, 132, 199, 0.15)",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background: "#ffffff",
              padding: "6px 8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <QrCode size={22} style={{ color: "#0284c7" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
              Pay via UPI &amp; QR Code <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.25)", padding: "2px 6px", borderRadius: "4px" }}>Instant NPCI</span>
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "11px", opacity: 0.9 }}>
              Supports Google Pay, PhonePe, Paytm, BHIM &amp; all UPI Apps
            </p>
          </div>
        </div>

        {isStandalone && onClose && (
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* TWO COLUMN CONTENT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: "20px",
          padding: isStandalone ? "0 24px 24px" : "0 4px",
        }}
      >
        {/* LEFT: QR CODE DISPLAY */}
        <div
          style={{
            background: "#f8fafc",
            border: "2px dashed #bae6fd",
            borderRadius: "12px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            position: "relative",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#0369a1", letterSpacing: "0.5px", marginBottom: "6px" }}>
            SCAN TO PAY WITH ANY UPI APP
          </div>

          <div
            style={{
              position: "relative",
              background: "#ffffff",
              padding: "8px",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
              width: "186px",
              height: "186px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="UPI QR Code"
                style={{ width: "170px", height: "170px", display: "block", borderRadius: "4px" }}
              />
            ) : (
              <div style={{ color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
                <RefreshCw size={16} className="animate-spin" /> Generating QR...
              </div>
            )}

            {/* Central UPI Logo Badge */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#ffffff",
                borderRadius: "6px",
                padding: "2px 5px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                border: "1.5px solid #0284c7",
                fontSize: "10px",
                fontWeight: "900",
                color: "#0284c7",
                letterSpacing: "0.5px",
              }}
            >
              UPI
            </div>
          </div>

          <div
            style={{
              marginTop: "10px",
              fontSize: "18px",
              fontWeight: "800",
              color: "#166534",
              fontFamily: "monospace",
            }}
          >
            ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Merchant: <strong>{payeeName}</strong>
          </div>
        </div>

        {/* RIGHT: UPI APPS & UTR VERIFICATION */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* MERCHANT VPA ROW */}
          <div
            style={{
              background: "#f0f9ff",
              border: "1px solid #b9e6fe",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", color: "#0369a1", fontWeight: "700", textTransform: "uppercase" }}>
                Merchant UPI ID (VPA)
              </span>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
                {payeeVpa}
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(payeeVpa, "vpa")}
              style={{
                background: copiedVpa ? "#166534" : "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s",
              }}
            >
              {copiedVpa ? <Check size={12} /> : <Copy size={12} />}
              {copiedVpa ? "Copied" : "Copy VPA"}
            </button>
          </div>

          {/* SELECT UPI APP SECTION */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
              Select Payer UPI App
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {UPI_APPS.map((app) => {
                const isSelected = selectedApp === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedApp(app.id)}
                    style={{
                      border: isSelected ? `2px solid ${app.color}` : "1px solid #cbd5e1",
                      background: isSelected ? app.bg : "#ffffff",
                      borderRadius: "8px",
                      padding: "8px 4px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? `0 2px 8px ${app.color}25` : "none",
                    }}
                  >
                    {app.icon}
                    <span style={{ fontSize: "10px", fontWeight: "700", color: isSelected ? app.color : "#475569" }}>
                      {app.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DEEP LINK OR MOBILE ACTION */}
          <div style={{ display: "flex", gap: "8px" }}>
            <a
              href={upiIntentUri}
              style={{
                flex: 1,
                textDecoration: "none",
                textAlign: "center",
                background: "#0284c7",
                color: "#ffffff",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Smartphone size={14} /> Open in {UPI_APPS.find((a) => a.id === selectedApp)?.name || "UPI App"}
            </a>

            <button
              type="button"
              onClick={() => copyToClipboard(upiIntentUri, "link")}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#334155",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {copiedLink ? <Check size={13} color="#166534" /> : <Copy size={13} />}
              {copiedLink ? "Link Copied" : "Copy UPI Link"}
            </button>
          </div>

          {/* UTR / TRANSACTION ID INPUT & VERIFICATION */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "flex", alignItems: "center", gap: "4px" }}>
                UPI Ref / 12-digit UTR Number *
                {verified && <CheckCircle2 size={13} style={{ color: "#16a34a" }} />}
              </label>

              <button
                type="button"
                onClick={generateMockUtr}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0284c7",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: 0,
                }}
              >
                <Sparkles size={12} /> Auto-fill Demo UTR
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => handleUtrChange(e.target.value)}
                placeholder="e.g. 425891782341 or UPI/GPAY/..."
                style={{
                  flex: 1,
                  height: "36px",
                  borderRadius: "6px",
                  border: verified ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                  padding: "0 10px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  outline: "none",
                  background: verified ? "#f0fdf4" : "#ffffff",
                }}
              />

              {isStandalone && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    background: "#166534",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <CheckCircle2 size={14} /> Confirm Paid
                </button>
              )}
            </div>

            {verified && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
                <ShieldCheck size={13} /> Payment verified via {UPI_APPS.find((a) => a.id === selectedApp)?.name || "UPI"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!isStandalone) {
    return content;
  }

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
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px",
      }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "680px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {content}
      </div>
    </div>
  );
}
