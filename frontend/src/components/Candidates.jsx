import { useState, useEffect } from "react";

const PRODUCTS = [
  {
    id: 1,
    name: "Sony WH-1000XM5",
    store: "Amazon.de",
    price: "€299",
    match: 98,
    inStock: true,
    color: "#1a3d28",
    accent: "#50dc78",
  },
  {
    id: 2,
    name: "Sony WH-1000XM5",
    store: "MediaMarkt",
    price: "€319",
    match: 92,
    inStock: true,
    color: "#1a2d20",
    accent: "#3ec46a",
  },
  {
    id: 3,
    name: "Sony WH-1000XM5",
    store: "Coolblue",
    price: "€349",
    match: 78,
    inStock: false,
    color: "#162414",
    accent: "#2a9e50",
  },
];

function MatchBadge({ pct }) {
  const color =
    pct >= 95 ? "#50dc78" : pct >= 85 ? "#3ec46a" : "#2a9e50";
  return (
    <div
      style={{
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 100,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 800,
        color,
        letterSpacing: 0.2,
        flexShrink: 0,
        textAlign: "center",
      }}
    >
      {pct}%
    </div>
  );
}

function ProductPlaceholder({ color }) {
  return (
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 12,
        background: color,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Headphones silhouette */}
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <path
          d="M17 3C9.82 3 4 8.82 4 16v2a4 4 0 0 0 4 4h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H8v-1C8 10.93 12.03 7 17 7s9 3.93 9 9v1h-1a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1a4 4 0 0 0 4-4v-2c0-7.18-5.82-13-13-13z"
          fill="rgba(255,255,255,0.25)"
        />
      </svg>
    </div>
  );
}

function ProductCard({ product, index, onSelect, selected, visible }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        background: selected
          ? "rgba(80,220,120,0.08)"
          : pressed
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: "14px 14px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        border: selected
          ? "1px solid rgba(80,220,120,0.35)"
          : "1px solid rgba(255,255,255,0.06)",
        transition: "opacity 0.45s ease, transform 0.45s ease, background 0.15s, border-color 0.2s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transitionDelay: `${index * 90}ms`,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => { setPressed(false); onSelect(product.id); }}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => { setPressed(false); onSelect(product.id); }}
    >
      {/* Best deal ribbon */}
      {index === 0 && (
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          background: "#50dc78",
          color: "#000",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          padding: "3px 10px 3px 14px",
          borderBottomLeftRadius: 10,
        }}>
          Best deal
        </div>
      )}

      <ProductPlaceholder color={product.color} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: -0.3,
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {product.name}
        </div>
        <div style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 12,
          marginTop: 3,
          fontWeight: 500,
        }}>
          {product.store}
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
          {product.inStock ? (
            <span style={{
              color: "#50dc78",
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(80,220,120,0.12)",
              borderRadius: 100,
              padding: "2px 8px",
            }}>
              In stock
            </span>
          ) : (
            <span style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 100,
              padding: "2px 8px",
            }}>
              Out of stock
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          color: product.accent,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: -0.8,
          lineHeight: 1,
        }}>
          {product.price}
        </div>
        <MatchBadge pct={product.match} />
      </div>
    </div>
  );
}

export default function Candidates({ onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(1); // default best deal

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const phoneStyle = {
    width: 375,
    height: 812,
    background: "#000",
    borderRadius: 52,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 0 0 1px #1a1a1a, 0 48px 96px rgba(0,0,0,0.95)",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={phoneStyle}>
      {/* Subtle ambient glow */}
      <div style={{
        position: "absolute",
        width: 320, height: 320,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(80,220,120,0.07) 0%, transparent 70%)",
        top: -80, left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }} />

      {/* Status bar */}
      <div style={{
        flexShrink: 0, height: 50,
        display: "flex", alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "0 26px 8px",
        position: "relative", zIndex: 5,
      }}>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="17" height="11" viewBox="0 0 17 11" fill="white">
            <rect x="0" y="7" width="3" height="4" rx="0.8" opacity="0.35"/>
            <rect x="4.5" y="5" width="3" height="6" rx="0.8" opacity="0.55"/>
            <rect x="9" y="2" width="3" height="9" rx="0.8" opacity="0.75"/>
            <rect x="13.5" y="0" width="3" height="11" rx="0.8"/>
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.35" fill="none"/>
            <rect x="24" y="4" width="2.5" height="5" rx="1.5" fill="white" fillOpacity="0.4"/>
            <rect x="2" y="2" width="18" height="9" rx="2" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        padding: "0 20px 24px",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Back + header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, marginTop: 4 }}>
          <div
            onClick={() => onNavigate?.("find")}
            style={{
              width: 40, height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,1 1,8.5 9,16"/>
            </svg>
          </div>
          <div>
            <div style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.7,
              lineHeight: 1.1,
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(10px)",
              transition: "opacity 0.4s, transform 0.4s",
            }}>
              We found 3 matches
            </div>
            <div style={{
              color: "#50dc78",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 3,
              letterSpacing: -0.2,
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(8px)",
              transition: "opacity 0.4s 0.08s, transform 0.4s 0.08s",
            }}>
              Sony WH-1000XM5
            </div>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PRODUCTS.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onSelect={setSelected}
              selected={selected === p.id}
              visible={visible}
            />
          ))}
        </div>

        {/* Not what you're looking for */}
        <div style={{
          textAlign: "center",
          marginTop: 24,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s 0.4s",
        }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Not what you're looking for?{" "}
          </span>
          <span
            onClick={() => onNavigate?.("find")}
            style={{
              color: "#50dc78",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: -0.1,
            }}
          >
            Try again
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Save button */}
        <div style={{
          marginTop: 28,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.45s 0.35s, transform 0.45s 0.35s",
        }}>
          <button
            onClick={() => onNavigate?.("wishlist")}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 100,
              border: "none",
              background: "#50dc78",
              color: "#021208",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              letterSpacing: -0.3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 8px 32px rgba(80,220,120,0.25)",
              transition: "filter 0.15s, transform 0.15s",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            onTouchStart={(e) => e.currentTarget.style.transform = "scale(0.97)"}
            onTouchEnd={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#021208" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Save best deal to wishlist
          </button>
        </div>

      </div>
    </div>
  );
}
