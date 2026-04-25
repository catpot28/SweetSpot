import { useState, useEffect } from "react";
import StatusBar from "./StatusBar";
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";
import { api } from "../lib/api";
import ProductMedia from "./ProductMedia";
import { selectProductImage } from "../lib/productMedia";

function matchForPosition(position) {
  if (position === 1) return 98;
  if (position === 2) return 92;
  if (position === 3) return 78;
  return Math.max(60, 98 - (position - 1) * 10);
}

const ACCENTS = [
  { color: "#1a3d28", accent: "#50dc78" },
  { color: "#1a2d20", accent: "#3ec46a" },
  { color: "#162414", accent: "#2a9e50" },
];

function mapCandidate(candidate, displayIndex = 0) {
  // Palette is driven by display order (cheapest = best-deal accent), not by
  // SerpApi's visual-similarity result_position.
  const idx = Math.max(0, Math.min(2, displayIndex));
  const palette = ACCENTS[idx];
  const price =
    candidate.current_price_text ||
    (candidate.current_price_amount != null
      ? `${candidate.currency_code === "EUR" ? "\u20ac" : candidate.currency_code || ""}${candidate.current_price_amount}`
      : "\u2014");

  return {
    id: candidate.id,
    name: candidate.title || "Untitled",
    store: candidate.merchant_name || "Online store",
    price,
    match: matchForPosition(candidate.result_position),
    inStock: candidate.in_stock !== false,
    imageUrl: selectProductImage(candidate),
    color: palette.color,
    accent: palette.accent,
  };
}

const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: "Sony WH-1000XM5",
    store: "Amazon.de",
    price: "\u20ac299",
    match: 98,
    inStock: true,
    imageUrl: null,
    color: "#1a3d28",
    accent: "#50dc78",
  },
  {
    id: 2,
    name: "Sony WH-1000XM5",
    store: "MediaMarkt",
    price: "\u20ac319",
    match: 92,
    inStock: true,
    imageUrl: null,
    color: "#1a2d20",
    accent: "#3ec46a",
  },
  {
    id: 3,
    name: "Sony WH-1000XM5",
    store: "Coolblue",
    price: "\u20ac349",
    match: 78,
    inStock: false,
    imageUrl: null,
    color: "#162414",
    accent: "#2a9e50",
  },
];

function MatchBadge({ pct }) {
  const color = pct >= 95 ? "#50dc78" : pct >= 85 ? "#3ec46a" : "#2a9e50";

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

function ProductPlaceholderArt() {
  return (
    <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
      <path
        d="M17 3C9.82 3 4 8.82 4 16v2a4 4 0 0 0 4 4h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H8v-1C8 10.93 12.03 7 17 7s9 3.93 9 9v1h-1a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1a4 4 0 0 0 4-4v-2c0-7.18-5.82-13-13-13z"
        fill="rgba(255,255,255,0.25)"
      />
    </svg>
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
      onMouseUp={() => {
        setPressed(false);
        onSelect(product.id);
      }}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => {
        setPressed(false);
        onSelect(product.id);
      }}
    >
      {index === 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "#50dc78",
            color: "#000",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            padding: "3px 10px 3px 14px",
            borderBottomLeftRadius: 10,
          }}
        >
          Best deal
        </div>
      )}

      <ProductMedia
        src={product.imageUrl}
        alt={product.name}
        style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          background: product.color,
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 6,
          boxSizing: "border-box",
        }}
        fallback={<ProductPlaceholderArt />}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.3,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            marginTop: 3,
            fontWeight: 500,
          }}
        >
          {product.store}
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
          {product.inStock ? (
            <span
              style={{
                color: "#50dc78",
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(80,220,120,0.12)",
                borderRadius: 100,
                padding: "2px 8px",
              }}
            >
              In stock
            </span>
          ) : (
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 11,
                fontWeight: 600,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 100,
                padding: "2px 8px",
              }}
            >
              Out of stock
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: product.accent,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: -0.8,
            lineHeight: 1,
          }}
        >
          {product.price}
        </div>
        <MatchBadge pct={product.match} />
      </div>
    </div>
  );
}

export default function Candidates({ onNavigate, searchId }) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [products, setProducts] = useState(null);
  const [selected, setSelected] = useState(null);
  const [savePressed, setSavePressed] = useState(false);
  const [buyPressed, setBuyPressed] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!searchId) {
      setProducts(FALLBACK_PRODUCTS);
      setSelected(FALLBACK_PRODUCTS[0]?.id ?? null);
      return;
    }

    let cancelled = false;
    api.getLensCandidates(searchId, 3)
      .then((rows) => {
        if (cancelled) return;
        // Sort by price ascending — cheapest becomes the "best deal" card.
        // Items without a numeric price drift to the end.
        const sorted = [...rows].sort((a, b) => {
          const ap = a.current_price_amount;
          const bp = b.current_price_amount;
          if (ap == null && bp == null) return 0;
          if (ap == null) return 1;
          if (bp == null) return -1;
          return Number(ap) - Number(bp);
        });
        const mapped = sorted.map((row, i) => mapCandidate(row, i));
        setProducts(mapped);
        setSelected(mapped[0]?.id ?? null);
      })
      .catch((err) => {
        console.error("getLensCandidates failed:", err);
        if (!cancelled) setProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [searchId]);

  const handleSave = async () => {
    if (!selected || saving) return;
    if (typeof selected !== "string") {
      onNavigate?.("wishlist");
      return;
    }

    setSaving(true);
    try {
      await api.addToWishlist({ productCandidateId: selected });
      onNavigate?.("wishlist");
    } catch (err) {
      console.error("addToWishlist failed:", err);
      alert(`Save failed: ${err.message || err}`);
      setSaving(false);
    }
  };

  const handleSelect = (id) => {
    setSelected(id);
    setShimmer(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShimmer(true));
    });
    setTimeout(() => setShimmer(false), 950);
  };

  const phoneStyle = phoneFrame(isMobile);

  return (
    <div style={phoneStyle}>
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(80,220,120,0.07) 0%, transparent 70%)",
          top: -80,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />

      <StatusBar style={{ position: "relative", zIndex: 5 }} />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "0 20px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, marginTop: 4 }}>
          <div
            onClick={() => onNavigate?.("find")}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,1 1,8.5 9,16" />
            </svg>
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.7,
                lineHeight: 1.1,
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(10px)",
                transition: "opacity 0.4s, transform 0.4s",
              }}
            >
              We found 3 matches
            </div>
            <div
              style={{
                color: "#50dc78",
                fontSize: 14,
                fontWeight: 600,
                marginTop: 3,
                letterSpacing: -0.2,
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(8px)",
                transition: "opacity 0.4s 0.08s, transform 0.4s 0.08s",
                maxWidth: 230,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {products?.[0]?.name ?? ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(products ?? []).map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onSelect={handleSelect}
              selected={selected === product.id}
              visible={visible}
            />
          ))}
          {products?.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "30px 0" }}>
              No matches found. Try a different photo.
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.5s 0.4s",
          }}
        >
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

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 28,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.45s 0.35s, transform 0.45s 0.35s",
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            onMouseDown={() => setSavePressed(true)}
            onMouseUp={() => setSavePressed(false)}
            onMouseLeave={() => setSavePressed(false)}
            onTouchStart={() => setSavePressed(true)}
            onTouchEnd={() => setSavePressed(false)}
            style={{
              flex: 1,
              height: 54,
              borderRadius: "21px / 21px",
              WebkitAppearance: "none",
              border: "2px solid #50dc78",
              background: savePressed ? "#3ab860" : "#50dc78",
              color: "#021208",
              fontSize: 15,
              fontWeight: 800,
              cursor: saving ? "wait" : "pointer",
              letterSpacing: -0.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transform: savePressed && !saving ? "scale(0.96)" : "scale(1)",
              transition: "all 0.12s",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#50dc78" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            {saving ? "Saving..." : "Save"}
          </button>

          <style>{`
            @keyframes buy-shimmer {
              from { transform: translateX(-100%) skewX(-12deg); }
              to   { transform: translateX(350%) skewX(-12deg); }
            }
          `}</style>
          <button
            onClick={() => onNavigate?.("success")}
            onMouseDown={() => setBuyPressed(true)}
            onMouseUp={() => setBuyPressed(false)}
            onMouseLeave={() => setBuyPressed(false)}
            onTouchStart={() => setBuyPressed(true)}
            onTouchEnd={() => setBuyPressed(false)}
            style={{
              flex: 1,
              height: 54,
              borderRadius: "21px / 21px",
              WebkitAppearance: "none",
              border: "2px solid #50dc78",
              background: buyPressed ? "#0f2018" : "#0a1810",
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              letterSpacing: -0.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transform: buyPressed ? "scale(0.96)" : "scale(1)",
              transition: "all 0.12s",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {shimmer && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                  animation: "buy-shimmer 1.5s ease forwards",
                  pointerEvents: "none",
                }}
              />
            )}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#50dc78",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            Buy selected
          </button>
        </div>
      </div>
    </div>
  );
}
