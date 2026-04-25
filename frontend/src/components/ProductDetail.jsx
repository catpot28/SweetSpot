import { useState, useEffect } from "react";
import { api } from "../lib/api";

// What we charge against BUNQ when "Buy now" is pressed. The shown product
// price (e.g. €299) would exceed our sandbox balance, so we send a token
// payment to sugardaddy@bunq.com instead — proves the BUNQ flow without
// requiring large sandbox top-ups before every demo.
const PURCHASE_AMOUNT_EUR = "1.00";
const PURCHASE_COUNTERPARTY = "sugardaddy@bunq.com";
const PURCHASE_DESCRIPTION = "Sony WH-1000XM5";

const PRICE_HISTORY = [
  { month: "Feb", value: 349 },
  { month: "Mar", value: 329 },
  { month: "Apr", value: 299 },
];

const OTHER_STORES = [
  { store: "bol.com",   price: "€319", inStock: true  },
  { store: "Coolblue",  price: "€339", inStock: true  },
  { store: "MediaMarkt",price: "€349", inStock: false },
];

function PriceChart({ data }) {
  const W = 335, H = 90;
  const values = data.map((d) => d.value);
  const min = Math.min(...values) - 20;
  const max = Math.max(...values) + 10;

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 6 - ((d.value - min) / (max - min)) * (H - 16),
  }));

  const buildPath = (points) => {
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      d += ` C${cpx},${points[i - 1].y} ${cpx},${points[i].y} ${points[i].x},${points[i].y}`;
    }
    return d;
  };

  const line = buildPath(pts);
  const area = line + ` L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" height={H} style={{ display: "block" }}>
        <defs>
          <linearGradient id="pdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#50dc78" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#50dc78" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pdGrad)"/>
        <path d={line} fill="none" stroke="#50dc78" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx={last.x} cy={last.y} r="8" fill="#50dc78" opacity="0.2"/>
        <circle cx={last.x} cy={last.y} r="4.5" fill="#50dc78"/>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 2px 0" }}>
        {data.map((d) => (
          <span key={d.month} style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>{d.month}</span>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetail({ onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [buyPressed, setBuyPressed] = useState(false);
  const [removePressed, setRemovePressed] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleBuy = async () => {
    if (buying) return;
    setBuying(true);
    try {
      const draft = await api.createDraftPayment({
        amountEur: PURCHASE_AMOUNT_EUR,
        counterpartyEmail: PURCHASE_COUNTERPARTY,
        description: PURCHASE_DESCRIPTION,
      });
      await api.confirmDraftPayment(draft.draft_id);
      onNavigate("success");
    } catch (err) {
      console.error("buy failed:", err);
      alert(`Buy failed: ${err.message}`);
      setBuying(false);
    }
  };

  const fadeIn = (delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
  });

  const divider = (
    <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 20px" }} />
  );

  return (
    <div style={{
      width: 375,
      height: 812,
      background: "#000",
      borderRadius: 52,
      overflow: "hidden",
      position: "relative",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      boxShadow: "0 0 0 1px #1a1a1a, 0 48px 96px rgba(0,0,0,0.95)",
      margin: "auto",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Status bar */}
      <div style={{
        flexShrink: 0, height: 50,
        display: "flex", alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "0 26px 8px",
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

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        paddingBottom: 100,
      }}>

        {/* Back button */}
        <div style={{ padding: "4px 20px 16px", display: "flex", alignItems: "center" }}>
          <div
            onClick={() => onNavigate?.("wishlist")}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8,1 1,8 8,15"/>
            </svg>
          </div>
        </div>

        {/* Product image placeholder */}
        <div style={{ padding: "0 20px 20px", ...fadeIn(0) }}>
          <div style={{
            width: "100%", height: 200,
            background: "#1a1a1a",
            borderRadius: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.06)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Ambient glow */}
            <div style={{
              position: "absolute",
              width: 200, height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(80,220,120,0.08) 0%, transparent 70%)",
              top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
            }} />
            <svg width="90" height="80" viewBox="0 0 90 80" fill="none" opacity="0.35">
              <path d="M45 6C24.5 6 8 22.5 8 43v6a10 10 0 0 0 10 10h2a5 5 0 0 0 5-5V41a5 5 0 0 0-5-5H18v-3C18 18.8 30 8 45 8s27 10.8 27 25v3h-2a5 5 0 0 0-5 5v13a5 5 0 0 0 5 5h2a10 10 0 0 0 10-10v-6C82 22.5 65.5 6 45 6z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Product info */}
        <div style={{ padding: "0 20px 20px" }}>

          {/* Name */}
          <div style={{ ...fadeIn(60), marginBottom: 12 }}>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.2 }}>
              Sony WH-1000XM5
            </div>
          </div>

          {/* Price row */}
          <div style={{ ...fadeIn(100), display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ color: "#50dc78", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>€299</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16, fontWeight: 500, textDecoration: "line-through" }}>€349</span>
            <span style={{
              background: "rgba(80,220,120,0.15)",
              border: "1px solid rgba(80,220,120,0.3)",
              color: "#50dc78",
              fontSize: 12, fontWeight: 800,
              borderRadius: 100,
              padding: "3px 10px",
              letterSpacing: 0.2,
            }}>
              -14%
            </span>
          </div>

          {/* Store + stock */}
          <div style={{ ...fadeIn(130), display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 500 }}>Amazon.nl</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#50dc78" }} />
              <span style={{ color: "#50dc78", fontSize: 13, fontWeight: 600 }}>In stock</span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{ ...fadeIn(160), marginBottom: 22 }}>
            <span style={{
              background: "#50dc78",
              color: "#021208",
              fontSize: 12, fontWeight: 800,
              borderRadius: 100,
              padding: "5px 14px",
              letterSpacing: 0.2,
            }}>
              Deal found
            </span>
          </div>

          {divider}

          {/* Price history */}
          <div style={{ ...fadeIn(190), marginBottom: 22 }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Price history
            </div>
            <div style={{
              background: "#0e1a12",
              border: "1px solid rgba(80,220,120,0.12)",
              borderRadius: 16,
              padding: "14px 14px 10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>3 month low</span>
                <span style={{ color: "#50dc78", fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>€299</span>
              </div>
              <PriceChart data={PRICE_HISTORY} />
            </div>
          </div>

          {divider}

          {/* Also available at */}
          <div style={{ ...fadeIn(240) }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Also available at
            </div>
            <div style={{
              background: "#1c1c1e",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {OTHER_STORES.map((s, i) => (
                <div key={s.store}>
                  {i > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px" }} />}
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{s.store}</div>
                        {s.inStock
                          ? <div style={{ color: "#50dc78", fontSize: 11, fontWeight: 600, marginTop: 2 }}>In stock</div>
                          : <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, fontWeight: 500, marginTop: 2 }}>Out of stock</div>
                        }
                      </div>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, fontWeight: 700, letterSpacing: -0.4 }}>{s.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 20px 28px",
        display: "flex",
        gap: 10,
        ...fadeIn(280),
      }}>
        <button
          onClick={handleBuy}
          disabled={buying}
          onMouseDown={() => setBuyPressed(true)}
          onMouseUp={() => setBuyPressed(false)}
          onTouchStart={() => setBuyPressed(true)}
          onTouchEnd={() => setBuyPressed(false)}
          style={{
            flex: 1, height: 52,
            borderRadius: 100,
            border: "none",
            background: "#50dc78",
            color: "#021208",
            fontSize: 15, fontWeight: 800,
            cursor: buying ? "wait" : "pointer",
            letterSpacing: -0.2,
            transform: buyPressed && !buying ? "scale(0.96)" : "scale(1)",
            transition: "transform 0.15s, filter 0.15s",
            filter: buying ? "brightness(0.7)" : (buyPressed ? "brightness(0.85)" : "none"),
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 6px 24px rgba(80,220,120,0.3)",
            opacity: buying ? 0.7 : 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#021208" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          {buying ? "Processing…" : "Buy now"}
        </button>
        <button
          onMouseDown={() => setRemovePressed(true)}
          onMouseUp={() => setRemovePressed(false)}
          onTouchStart={() => setRemovePressed(true)}
          onTouchEnd={() => setRemovePressed(false)}
          style={{
            flex: 1, height: 52,
            borderRadius: 100,
            border: "1px solid rgba(255,80,80,0.2)",
            background: removePressed ? "rgba(255,80,80,0.08)" : "#1c1c1e",
            color: "rgba(255,100,100,0.8)",
            fontSize: 15, fontWeight: 700,
            cursor: "pointer",
            letterSpacing: -0.2,
            transform: removePressed ? "scale(0.96)" : "scale(1)",
            transition: "transform 0.15s, background 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.8)" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
          Remove
        </button>
      </div>

    </div>
  );
}
