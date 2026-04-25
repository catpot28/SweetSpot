import { useState } from "react";

/**
 * SmartWishlist
 *
 * Props:
 *   itemCount    {number}  — total items on wishlist         (default 24)
 *   totalSaved   {number}  — total euros saved               (default 847)
 *   savingsData  {Array<{month: string, value: number}>}     (default Jan–Apr)
 *   stats        {{ bought: number, onDiscount: number, allTime: number }}
 */
export default function SmartWishlist({
  onNavigate,
  itemCount = 24,
  totalSaved = 847,
  savingsData = [
    { month: "Jan", value: 60 },
    { month: "Feb", value: 200 },
    { month: "Mar", value: 480 },
    { month: "Apr", value: 847 },
  ],
  stats = { bought: 17, onDiscount: 5, allTime: 42 },
}) {
  const [activeTab, setActiveTab] = useState("wishlist");
  const [findPressed, setFindPressed] = useState(false);
  const [wishlistPressed, setWishlistPressed] = useState(false);

  // Build SVG chart path from savingsData
  const chartW = 327;
  const chartH = 100;
  const maxVal = Math.max(...savingsData.map((d) => d.value));
  const points = savingsData.map((d, i) => ({
    x: (i / (savingsData.length - 1)) * chartW,
    y: chartH - 3 - ((d.value / maxVal) * (chartH - 10)),
  }));

  const buildPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2;
      const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) / 2;
      d += ` C${cp1x},${pts[i - 1].y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    return d;
  };

  const linePath = buildPath(points);
  const areaPath =
    linePath +
    ` L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`;

  const last = points[points.length - 1];

  // ─── Styles ───────────────────────────────────────────────────────────────

  const s = {
    root: {
      width: 375,
      height: 812,
      background: "#000",
      borderRadius: 52,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      boxShadow: "0 0 0 1px #1a1a1a, 0 48px 96px rgba(0,0,0,0.95)",
      position: "relative",
      margin: "auto",
    },
    statusBar: {
      flexShrink: 0,
      height: 50,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: "0 26px 8px",
    },
    statusTime: { color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: -0.3 },
    statusRight: { display: "flex", alignItems: "center", gap: 6 },

    scroll: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      paddingBottom: 12,
    },

    pageTitle: {
      fontSize: 36,
      fontWeight: 800,
      color: "#fff",
      letterSpacing: -1.2,
      padding: "8px 20px 20px",
      lineHeight: 1.05,
    },

    statPills: { display: "flex", gap: 10, padding: "0 20px 28px" },
    statPill: {
      flex: 1,
      background: "#1c1c1e",
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    },
    pillIconGreen: {
      width: 34, height: 34, borderRadius: "50%",
      background: "#1a3d28",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    pillIconBlue: {
      width: 34, height: 34, borderRadius: "50%",
      background: "#1a2d50",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    pillLabel: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 500 },
    pillVal: { color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginTop: 1 },
    pillValGreen: { color: "#50dc78", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginTop: 1 },
    pillChevron: { color: "rgba(255,255,255,0.2)", fontSize: 17, fontWeight: 300, marginLeft: "auto" },

    chartZone: { padding: "0 20px 28px" },
    chartCard: {
      background: "#0e1a12",
      border: "1px solid rgba(80,220,120,0.15)",
      borderRadius: 20,
      padding: "18px 16px 14px",
    },
    chartHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 14,
    },
    chartHeadLabel: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 500 },
    chartHeadVal: { color: "#50dc78", fontSize: 24, fontWeight: 800, letterSpacing: -0.8 },
    chartSvg: { width: "100%", display: "block" },
    chartMonths: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 2px 0",
    },
    chartMonth: { color: "rgba(255,255,255,0.25)", fontSize: 12 },

    actionRow: { display: "flex", gap: 10, padding: "0 20px 32px" },
    btnFind: {
      flex: 1, height: 50, borderRadius: 100, border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
      letterSpacing: -0.2,
      background: findPressed ? "#3ecf66" : "#50dc78",
      color: "#021208",
      transform: findPressed ? "scale(0.96)" : "scale(1)",
      transition: "all 0.15s",
    },
    btnWishlist: {
      flex: 1, height: 50, borderRadius: 100,
      border: "1px solid rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
      letterSpacing: -0.2,
      background: wishlistPressed ? "#2a2a2e" : "#1c1c1e",
      color: "#fff",
      transform: wishlistPressed ? "scale(0.96)" : "scale(1)",
      transition: "all 0.15s",
    },
    btnIcon: {
      width: 24, height: 24, borderRadius: "50%",
      background: "rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    btnIconDark: {
      width: 24, height: 24, borderRadius: "50%",
      background: "rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },

    sectionTitle: {
      fontSize: 22, fontWeight: 800, color: "#fff",
      letterSpacing: -0.6, padding: "0 20px 14px",
    },

    benefitList: {
      margin: "0 20px 28px",
      background: "#1c1c1e",
      borderRadius: 18,
      overflow: "hidden",
    },
    benefitItem: {
      display: "flex", alignItems: "center",
      gap: 16, padding: "16px 16px",
      cursor: "pointer",
    },
    benefitItemBorder: {
      display: "flex", alignItems: "center",
      gap: 16, padding: "16px 16px",
      cursor: "pointer",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    },
    biGreen: {
      width: 46, height: 46, borderRadius: "50%",
      background: "#1a6b35",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    biBlue: {
      width: 46, height: 46, borderRadius: "50%",
      background: "#1a3d82",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    biOrange: {
      width: 46, height: 46, borderRadius: "50%",
      background: "#6b3010",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    benefitName: { color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2 },
    benefitSub: { color: "rgba(255,255,255,0.38)", fontSize: 13, marginTop: 3, lineHeight: 1.4 },
    benefitBadge: {
      background: "#50dc78", color: "#000",
      fontSize: 11, fontWeight: 800,
      borderRadius: 100, padding: "3px 9px",
      letterSpacing: 0.3, flexShrink: 0,
    },
    benefitVal: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: 600, flexShrink: 0 },

    footerNote: {
      textAlign: "center", color: "rgba(255,255,255,0.18)",
      fontSize: 12, padding: "0 20px 16px",
    },

    tabBar: {
      flexShrink: 0, height: 82,
      background: "#000",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "flex-start", paddingTop: 10,
    },
    homeBar: {
      position: "absolute", bottom: 8,
      left: "50%", transform: "translateX(-50%)",
      width: 130, height: 5,
      background: "rgba(255,255,255,0.28)",
      borderRadius: 3,
    },
  };

  const tabStyle = (id) => ({
    flex: 1,
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
    cursor: "pointer",
    opacity: activeTab === id ? 1 : 0.35,
    transition: "opacity 0.15s",
  });
  const tabLabel = (id) => ({
    fontSize: 10, fontWeight: 600,
    color: activeTab === id ? "#50dc78" : "#fff",
  });
  const tabIcon = (id) => ({ color: activeTab === id ? "#50dc78" : "#fff" });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>
      {/* Status Bar */}
      <div style={s.statusBar}>
        <span style={s.statusTime}>9:41</span>
        <div style={s.statusRight}>
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

      {/* Scroll area */}
      <div style={s.scroll}>

        {/* Title */}
        <div style={s.pageTitle}>Smart{"\n"}Wishlist</div>

        {/* Stat Pills */}
        <div style={s.statPills}>
          <div style={s.statPill}>
            <div style={s.pillIconGreen}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#50dc78" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div>
              <div style={s.pillLabel}>Wishlist</div>
              <div style={s.pillVal}>{itemCount} items</div>
            </div>
            <span style={s.pillChevron}>›</span>
          </div>
          <div style={s.statPill}>
            <div style={s.pillIconBlue}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3a8fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div style={s.pillLabel}>Total saved</div>
              <div style={s.pillValGreen}>€{totalSaved}</div>
            </div>
            <span style={s.pillChevron}>›</span>
          </div>
        </div>

        {/* Savings Chart */}
        <div style={s.chartZone}>
          <div style={s.chartCard}>
            <div style={s.chartHead}>
              <span style={s.chartHeadLabel}>Savings over time</span>
              <span style={s.chartHeadVal}>€{totalSaved}</span>
            </div>
            <svg style={s.chartSvg} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" height={chartH}>
              <defs>
                <linearGradient id="swGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#50dc78" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#50dc78" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#swGrad)"/>
              <path d={linePath} fill="none" stroke="#50dc78" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx={last.x} cy={last.y} r="9" fill="#50dc78" opacity="0.2"/>
              <circle cx={last.x} cy={last.y} r="5" fill="#50dc78"/>
            </svg>
            <div style={s.chartMonths}>
              {savingsData.map((d) => (
                <span key={d.month} style={s.chartMonth}>{d.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={s.actionRow}>
          <button
            style={s.btnFind}
            onMouseDown={() => setFindPressed(true)}
            onMouseUp={() => setFindPressed(false)}
            onTouchStart={() => setFindPressed(true)}
            onTouchEnd={() => setFindPressed(false)}
            onClick={() => onNavigate('find')}
          >
            <div style={s.btnIcon}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#021208" strokeWidth="3" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            Find Deals
          </button>
          <button
            style={s.btnWishlist}
            onMouseDown={() => setWishlistPressed(true)}
            onMouseUp={() => setWishlistPressed(false)}
            onTouchStart={() => setWishlistPressed(true)}
            onTouchEnd={() => setWishlistPressed(false)}
            onClick={() => onNavigate('wishlist')}
          >
            <div style={s.btnIconDark}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            Wishlist
          </button>
        </div>

        {/* Wishlist Highlights */}
        <div style={s.sectionTitle}>Wishlist Highlights</div>
        <div style={s.benefitList}>
          <div style={s.benefitItem} onClick={() => onNavigate('wishlist-discount')}>
            <div style={s.biBlue}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3a8fff" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.benefitName}>{stats.onDiscount} items on discount</div>
              <div style={s.benefitSub}>Price drops detected right now</div>
            </div>
            <div style={s.benefitBadge}>Live</div>
          </div>
          <div style={s.benefitItemBorder} onClick={() => onNavigate('wishlist-bought')}>
            <div style={s.biGreen}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#50dc78" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.benefitName}>{stats.bought} items bought</div>
              <div style={s.benefitSub}>Successfully purchased from list</div>
            </div>
            <div style={s.benefitVal}>{stats.bought}</div>
          </div>
          <div style={s.benefitItemBorder}>
            <div style={s.biOrange}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.benefitName}>{stats.allTime} items tracked</div>
              <div style={s.benefitSub}>All time added to wishlist</div>
            </div>
            <div style={s.benefitVal}>{stats.allTime}</div>
          </div>
        </div>

        <div style={s.footerNote}>Tracking since January 2026</div>
      </div>

      {/* Tab Bar */}
      <div style={s.tabBar}>
        {[
          {
            id: "home", label: "Home",
            icon: (c) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            ),
          },
          {
            id: "cards", label: "Cards",
            icon: (c) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            ),
          },
          {
            id: "wishlist", label: "Wishlist",
            icon: (c) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            ),
          },
          {
            id: "stocks", label: "Stocks",
            icon: (c) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            ),
          },
          {
            id: "crypto", label: "Crypto",
            icon: (c) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ),
          },
        ].map(({ id, label, icon }) => (
          <div key={id} style={tabStyle(id)} onClick={() => setActiveTab(id)}>
            {icon(activeTab === id ? "#50dc78" : "#fff")}
            <span style={tabLabel(id)}>{label}</span>
          </div>
        ))}
      </div>

      <div style={s.homeBar}></div>
    </div>
  );
}
