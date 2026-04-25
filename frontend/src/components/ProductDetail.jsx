import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import StatusBar from './StatusBar';
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";

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

const ANIM_DURATION = 1500;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const CW = 335, CH = 100, PAD_T = 14, PAD_B = 8;

function measurePath(d) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  document.body.appendChild(svg);
  const len = path.getTotalLength();
  document.body.removeChild(svg);
  return len;
}

function interpValueAtX(pts, x) {
  if (x <= pts[0].x) return pts[0].value;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].value;
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i].x && x <= pts[i + 1].x) {
      const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      return Math.round(pts[i].value + t * (pts[i + 1].value - pts[i].value));
    }
  }
  return 0;
}

function interpYAtX(pts, x) {
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i].x && x <= pts[i + 1].x) {
      const t2 = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      return (1-t2)*(1-t2)*(1-t2)*pts[i].y
           + 3*(1-t2)*(1-t2)*t2*pts[i].y
           + 3*(1-t2)*t2*t2*pts[i+1].y
           + t2*t2*t2*pts[i+1].y;
    }
  }
  return 0;
}

function PriceChart({ data }) {
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * CW,
    y: PAD_T + (1 - (d.value - minV) / range) * (CH - PAD_T - PAD_B),
    value: d.value,
    month: d.month,
  }));

  const buildCurve = (ps) => {
    let d = `M${ps[0].x},${ps[0].y}`;
    for (let i = 1; i < ps.length; i++) {
      const cpx = (ps[i - 1].x + ps[i].x) / 2;
      d += ` C${cpx},${ps[i - 1].y} ${cpx},${ps[i].y} ${ps[i].x},${ps[i].y}`;
    }
    return d;
  };

  const linePath = buildCurve(pts);
  const areaPath = linePath + ` L${pts[pts.length-1].x},${CH} L${pts[0].x},${CH} Z`;
  const lastPt = pts[pts.length - 1];

  const [progress, setProgress] = useState(0);
  const [monthVis, setMonthVis] = useState([false, false, false]);
  const [pathLen, setPathLen] = useState(400);
  const [hoverX, setHoverX] = useState(null);
  const [tooltipVal, setTooltipVal] = useState(null);
  const svgRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    try {
      const len = measurePath(linePath);
      if (len > 0) setPathLen(len);
    } catch(e) {}
  }, [linePath]);

  useEffect(() => {
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / ANIM_DURATION, 1);
      const eased = easeOutCubic(t);
      setProgress(eased);
      setMonthVis([eased >= 0.0, eased >= 0.4, eased >= 0.8]);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(pts[0].x, Math.min(pts[pts.length-1].x, (e.clientX - rect.left) * (CW / rect.width)));
    setHoverX(x);
    setTooltipVal(interpValueAtX(pts, x));
  }, [pts]);

  const handleTouchMove = useCallback((e) => {
    if (!svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(pts[0].x, Math.min(pts[pts.length-1].x, (e.touches[0].clientX - rect.left) * (CW / rect.width)));
    setHoverX(x);
    setTooltipVal(interpValueAtX(pts, x));
  }, [pts]);

  const handleLeave = useCallback(() => { setHoverX(null); setTooltipVal(null); }, []);

  const dashOffset = pathLen * (1 - progress);
  const hoverY = hoverX !== null ? interpYAtX(pts, hoverX) : null;

  return (
    <>
      <style>{`
        @keyframes pc-dot-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(80,220,120,0.6), 0 0 8px 2px rgba(80,220,120,0.3); }
          50%     { box-shadow: 0 0 0 6px rgba(80,220,120,0), 0 0 16px 6px rgba(80,220,120,0.5); }
        }
        @keyframes pc-aurora-1 {
          0%,100% { transform: translateX(-60%) translateY(10%) scale(1);    opacity: 0.5; }
          30%     { transform: translateX(20%)  translateY(-15%) scale(1.2); opacity: 0.8; }
          60%     { transform: translateX(80%)  translateY(20%) scale(0.9);  opacity: 0.4; }
        }
        @keyframes pc-aurora-2 {
          0%,100% { transform: translateX(80%)  translateY(-20%) scale(1.1); opacity: 0.3; }
          40%     { transform: translateX(10%)  translateY(30%)  scale(0.85);opacity: 0.6; }
          70%     { transform: translateX(-40%) translateY(-10%) scale(1.2); opacity: 0.25; }
        }
      `}</style>
      <div style={{
        width: "100%", borderRadius: 16, padding: "20px 16px 16px",
        position: "relative", overflow: "hidden", boxSizing: "border-box",
        background: "#0d1a10", border: "1px solid rgba(80,220,120,0.12)",
        cursor: "crosshair", userSelect: "none",
      }}>
        <div style={{ position: "absolute", width: "70%", height: "140%", top: "-20%", left: 0, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(80,220,120,0.18) 0%, rgba(40,180,80,0.08) 40%, transparent 70%)", animation: "pc-aurora-1 8s ease-in-out infinite", pointerEvents: "none", filter: "blur(18px)" }} />
        <div style={{ position: "absolute", width: "55%", height: "120%", top: "-10%", left: "30%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(60,200,100,0.12) 0%, rgba(80,220,120,0.05) 50%, transparent 70%)", animation: "pc-aurora-2 11s ease-in-out infinite", pointerEvents: "none", filter: "blur(24px)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 40% at 80% 20%, rgba(80,220,120,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 18, fontWeight: 500, letterSpacing: -0.1 }}>Price history</div>
            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 13, marginTop: 3 }}>3-month low</div>
          </div>
          <div style={{ color: "#50dc78", fontSize: 28, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1, textShadow: "0 0 20px rgba(80,220,120,0.4)", fontVariantNumeric: "tabular-nums" }}>
            €{minV}
          </div>
        </div>

        <svg ref={svgRef} viewBox={`0 0 ${CW} ${CH}`} width="100%" height={CH}
          style={{ display: "block", overflow: "hidden", position: "relative", zIndex: 2 }}
          onMouseMove={handleMouseMove} onMouseLeave={handleLeave}
          onTouchMove={handleTouchMove} onTouchEnd={handleLeave}
        >
          <defs>
            <linearGradient id="pc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#50dc78" stopOpacity="0.35"/>
              <stop offset="85%" stopColor="#50dc78" stopOpacity="0"/>
            </linearGradient>
            <clipPath id="pc-clip">
              <rect x="0" y="0" width={CW * progress} height={CH + 10} />
            </clipPath>
          </defs>
          <path d={areaPath} fill="url(#pc-area)" clipPath="url(#pc-clip)" />
          <path d={linePath} fill="none" stroke="#50dc78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={pathLen} strokeDashoffset={dashOffset}
            style={{ filter: "drop-shadow(0 0 4px rgba(80,220,120,0.5))" }}
          />
          {hoverX !== null && (
            <>
              <line x1={hoverX} y1={PAD_T - 6} x2={hoverX} y2={CH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hoverX} cy={hoverY} r="4" fill="#50dc78" style={{ filter: "drop-shadow(0 0 5px rgba(80,220,120,0.8))" }} />
              <g transform={`translate(${Math.min(hoverX, CW - 48)}, ${Math.max((hoverY || 0) - 32, 2)})`}>
                <rect x="-2" y="0" width="50" height="22" rx="6" fill="rgba(0,0,0,0.75)" stroke="rgba(80,220,120,0.3)" strokeWidth="1" />
                <text x="23" y="15" textAnchor="middle" fill="#50dc78" fontSize="11" fontWeight="700" fontFamily='"SF Pro Rounded", sans-serif'>€{tooltipVal}</text>
              </g>
            </>
          )}
          {progress > 0.92 && (
            <foreignObject x={lastPt.x - 6} y={lastPt.y - 6} width="12" height="12" style={{ overflow: "visible" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#50dc78", margin: 2, animation: "pc-dot-pulse 2s ease-in-out infinite", opacity: Math.min(1, (progress - 0.92) / 0.08) }} />
            </foreignObject>
          )}
        </svg>

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, position: "relative", zIndex: 2 }}>
          {data.map((d, i) => (
            <span key={d.month} style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 500, opacity: monthVis[i] ? 1 : 0, transform: monthVis[i] ? "translateY(0)" : "translateY(4px)", transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms` }}>
              {d.month}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export default function ProductDetail({ onNavigate, wishlistItemId }) {
  const isMobile = useIsMobile();
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
      // Mark the wishlist item as bought, if we came from the wishlist.
      // Best-effort: a failure here shouldn't block the success screen since
      // the BUNQ payment already executed.
      if (wishlistItemId) {
        try {
          await api.markWishlistItemBought(wishlistItemId);
        } catch (e) {
          console.error("markWishlistItemBought failed:", e);
        }
      }
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
    <div style={phoneFrame(isMobile)}>

      <StatusBar />

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
            <PriceChart data={PRICE_HISTORY} />
          </div>

          {divider}

          {/* Claude Best Option Overview */}
          <div style={{ ...fadeIn(220), marginBottom: 22 }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Claude's take
            </div>
            <div style={{
              background: "linear-gradient(135deg, #0e1520 0%, #0a1018 100%)",
              borderRadius: 16,
              border: "1px solid rgba(139,92,246,0.25)",
              padding: "16px 16px",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Subtle purple glow */}
              <div style={{
                position: "absolute",
                width: 180, height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
                top: -60, right: -40,
                pointerEvents: "none",
              }} />

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Best option right now</div>
                  <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 1 }}>Based on price trends & availability</div>
                </div>
              </div>

              {/* Verdict */}
              <div style={{
                background: "rgba(80,220,120,0.07)",
                border: "1px solid rgba(80,220,120,0.15)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 12,
              }}>
                <div style={{ color: "#50dc78", fontSize: 14, fontWeight: 700, letterSpacing: -0.2, marginBottom: 4 }}>
                  Buy now on Amazon.de — €299
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.5 }}>
                  This is a 3-month low. Price has been dropping steadily and stock is available. Waiting longer is unlikely to yield a better deal.
                </div>
              </div>

              {/* Trend chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "↓ Downtrend", color: "#50dc78", bg: "rgba(80,220,120,0.08)", border: "rgba(80,220,120,0.2)" },
                  { label: "✓ In stock", color: "#50dc78", bg: "rgba(80,220,120,0.08)", border: "rgba(80,220,120,0.2)" },
                  { label: "⚡ Limited time", color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
                ].map((chip) => (
                  <span key={chip.label} style={{
                    fontSize: 11, fontWeight: 700,
                    color: chip.color,
                    background: chip.bg,
                    border: `1px solid ${chip.border}`,
                    borderRadius: 100,
                    padding: "3px 10px",
                    letterSpacing: 0.1,
                  }}>
                    {chip.label}
                  </span>
                ))}
              </div>
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
            flex: 1, height: 54,
            borderRadius: "21px / 21px",
            WebkitAppearance: "none",
            border: "2px solid #50dc78",
            background: buyPressed && !buying ? "#0f2018" : "#0a1810",
            color: "#fff",
            fontSize: 15, fontWeight: 800,
            cursor: buying ? "wait" : "pointer",
            letterSpacing: -0.2,
            transform: buyPressed && !buying ? "scale(0.96)" : "scale(1)",
            transition: "all 0.12s",
            filter: buying ? "brightness(0.6)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: buying ? 0.7 : 1,
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#50dc78", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </div>
          {buying ? "Processing…" : "Buy now"}
        </button>
        <button
          onClick={() => onNavigate?.("delete")}
          onMouseDown={() => setRemovePressed(true)}
          onMouseUp={() => setRemovePressed(false)}
          onTouchStart={() => setRemovePressed(true)}
          onTouchEnd={() => setRemovePressed(false)}
          style={{
            flex: 1, height: 54,
            borderRadius: "21px / 21px",
            WebkitAppearance: "none",
            border: "2px solid #ec4899",
            background: removePressed ? "#220d1c" : "#180910",
            color: "#fff",
            fontSize: 15, fontWeight: 800,
            cursor: "pointer",
            letterSpacing: -0.2,
            transform: removePressed ? "scale(0.96)" : "scale(1)",
            transition: "all 0.12s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </div>
          Remove
        </button>
      </div>

    </div>
  );
}
