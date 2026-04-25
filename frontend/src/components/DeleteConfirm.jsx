import { useState, useEffect } from "react";

export default function DeleteConfirm({ onNavigate, productName = "Sony WH-1000XM5" }) {
  const [show, setShow] = useState(false);
  const [sheetUp, setSheetUp] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 30);
    const t2 = setTimeout(() => setSheetUp(true), 60);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const dismiss = () => {
    setSheetUp(false);
    setShow(false);
    setTimeout(() => onNavigate?.("detail"), 280);
  };

  const confirm = () => {
    setSheetUp(false);
    setShow(false);
    setTimeout(() => onNavigate?.("wishlist"), 280);
  };

  return (
    <div style={{
      width: 375,
      height: 812,
      background: "#000",
      borderRadius: 52,
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 0 0 1px #1a1a1a, 0 48px 96px rgba(0,0,0,0.95)",
      margin: "auto",
    }}>

      {/* Status bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 50,
        display: "flex", alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "0 26px 8px",
        zIndex: 5,
      }}>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="17" height="11" viewBox="0 0 17 11" fill="white">
            <rect x="0"    y="7"  width="3" height="4"  rx="0.8" opacity="0.35"/>
            <rect x="4.5"  y="5"  width="3" height="6"  rx="0.8" opacity="0.55"/>
            <rect x="9"    y="2"  width="3" height="9"  rx="0.8" opacity="0.75"/>
            <rect x="13.5" y="0"  width="3" height="11" rx="0.8"/>
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.35" fill="none"/>
            <rect x="24" y="4" width="2.5" height="5" rx="1.5" fill="white" fillOpacity="0.4"/>
            <rect x="2" y="2" width="18" height="9" rx="2" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Dimmed backdrop — tap to dismiss */}
      <div
        onClick={dismiss}
        style={{
          position: "absolute", inset: 0,
          background: `rgba(0,0,0,${show ? 0.6 : 0})`,
          transition: "background 0.28s ease",
          zIndex: 10,
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          background: "#111",
          borderRadius: "28px 28px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "20px 20px 48px",
          zIndex: 20,
          transform: sheetUp ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 5,
          background: "rgba(255,255,255,0.18)",
          borderRadius: 3,
          margin: "0 auto 28px",
        }} />

        {/* Icon */}
        <div style={{
          width: 64, height: 64,
          borderRadius: "50%",
          background: "rgba(236,72,153,0.12)",
          border: "1px solid rgba(236,72,153,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: -0.4,
          textAlign: "center",
          marginBottom: 8,
        }}>
          Remove from wishlist?
        </div>

        {/* Subtitle */}
        <div style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          fontWeight: 500,
          textAlign: "center",
          letterSpacing: -0.1,
          marginBottom: 32,
          lineHeight: 1.5,
        }}>
          {productName} will be removed{"\n"}from your wishlist.
        </div>

        {/* Confirm remove button */}
        <button
          onClick={confirm}
          style={{
            width: "100%",
            height: 54,
            borderRadius: "21px / 21px",
            WebkitAppearance: "none",
            border: "2px solid #ec4899",
            background: "#180910",
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: -0.2,
            marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#ec4899",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </div>
          Remove
        </button>

        {/* Keep watching button */}
        <button
          onClick={dismiss}
          style={{
            width: "100%",
            height: 54,
            borderRadius: "21px / 21px",
            WebkitAppearance: "none",
            border: "2px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: -0.2,
          }}
        >
          Keep watching
        </button>
      </div>

    </div>
  );
}
