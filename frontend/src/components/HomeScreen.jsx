import { useState } from "react";
import SavingsChart from './SavingsChart';
import StatusBar from './StatusBar';
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";

/**
 * SmartWishlist
 *
 * Props:
 *   itemCount       {number}  — total items on wishlist                       (default 24)
 *   currentBalance  {number?} — live BUNQ balance for the "Current balance" pill; null = loading
 *   stats           {{ bought: number, onDiscount: number, allTime: number }}
 */
export default function SmartWishlist({
  onNavigate,
  itemCount = 24,
  currentBalance = null,
  disposable = null,
  stats = { bought: 17, onDiscount: 5, allTime: 42 },
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("wishlist");
  const [findPressed, setFindPressed] = useState(false);
  const [wishlistPressed, setWishlistPressed] = useState(false);

  // ─── Styles ───────────────────────────────────────────────────────────────

  const s = {
    root: phoneFrame(isMobile),
    statusBar: {
      flexShrink: 0,
      height: 50,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: "0 26px 8px",
    },
    statusTime: { color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: -0.3, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" },
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

    statPills: { display: "flex", gap: 10, padding: "0 20px 14px" },
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
    statPillSavings: {
      flex: 1,
      background: "#0d1a10",
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      position: "relative",
      overflow: "hidden",
    },
    pillIconGreen: {
      width: 34, height: 34, borderRadius: "50%",
      background: "#1a3d28",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    pillIconPink: {
      width: 34, height: 34, borderRadius: "50%",
      background: "#3d1a2d",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    pillLabel: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 500 },
    pillVal: { color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginTop: 1 },
    pillValGreen: { color: "#50dc78", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginTop: 1 },
    pillChevron: { color: "rgba(255,255,255,0.2)", fontSize: 17, fontWeight: 300, marginLeft: "auto" },
    pillChevronPink: { color: "rgba(255,255,255,0.2)", fontSize: 17, fontWeight: 300, marginLeft: "auto" },
    pillChevronGreen: { color: "rgba(80,220,120,0.35)", fontSize: 17, fontWeight: 300, marginLeft: "auto" },

    chartZone: { padding: "0 20px 14px" },
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

    actionRow: { display: "flex", gap: 10, padding: "0 20px 16px" },
    btnFind: {
      flex: 1, height: 54, borderRadius: "21px / 21px",
      WebkitAppearance: "none",
      border: "2px solid #50dc78",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 10, fontSize: 15, fontWeight: 800, cursor: "pointer",
      letterSpacing: -0.2,
      background: findPressed ? "#0f2018" : "#0a1810",
      color: "#fff",
      transform: findPressed ? "scale(0.96)" : "scale(1)",
      transition: "all 0.12s",
    },
    btnWishlist: {
      flex: 1, height: 54, borderRadius: "21px / 21px",
      WebkitAppearance: "none",
      border: "2px solid #ec4899",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 10, fontSize: 15, fontWeight: 800, cursor: "pointer",
      letterSpacing: -0.2,
      background: wishlistPressed ? "#220d1c" : "#180910",
      color: "#fff",
      transform: wishlistPressed ? "scale(0.96)" : "scale(1)",
      transition: "all 0.12s",
    },
    btnIcon: {
      width: 28, height: 28, borderRadius: "50%",
      background: "#50dc78",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    btnIconPink: {
      width: 28, height: 28, borderRadius: "50%",
      background: "#ec4899",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },

    sectionTitle: {
      fontSize: 22, fontWeight: 800, color: "#fff",
      letterSpacing: -0.6, padding: "0 20px 14px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    },

    benefitList: {
      margin: "0 20px 4px",
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
      fontSize: 12, padding: "16px 20px 16px",
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
  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>
      <StatusBar />

      {/* Scroll area */}
      <div style={s.scroll}>

        {/* Title */}
        <div style={s.pageTitle}>Smart{"\n"}Wishlist</div>

        {/* Stat Pills */}
        <div style={s.statPills}>
          {/* Wishlist pill — pink, clickable */}
          <div style={s.statPill} onClick={() => onNavigate('wishlist')}>
            <div style={s.pillIconPink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div>
              <div style={s.pillLabel}>Wishlist</div>
              <div style={{ ...s.pillVal, fontSize: 26, letterSpacing: -0.8, marginTop: 3 }}>{itemCount} items</div>
            </div>
            <span style={s.pillChevronPink}>›</span>
          </div>
          {/* Balance + disposable pill — split horizontally */}
          <div style={{ ...s.statPillSavings, flexDirection: "column", gap: 0, padding: 0 }}>
            {/* Top half — current balance */}
            <div style={{ padding: "12px 14px 10px" }}>
              <div style={s.pillLabel}>Current balance</div>
              <div style={s.pillValGreen}>
                {currentBalance == null ? "…" : `€${currentBalance.toFixed(2)}`}
              </div>
            </div>
            {/* Divider */}
            <div style={{ height: 1, background: "rgba(80,220,120,0.15)", margin: "0 14px" }} />
            {/* Bottom half — disposable */}
            <div style={{ padding: "10px 14px 12px" }}>
              <div style={s.pillLabel}>Disposable</div>
              <div style={{ color: disposable == null ? "rgba(255,255,255,0.25)" : disposable >= 0 ? "#ffd234" : "#f87171", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginTop: 1 }}>
                {disposable == null ? "…" : `€${disposable.toFixed(2)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Savings Chart */}
        <div style={s.chartZone}>
          <SavingsChart />
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
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
            <div style={s.btnIconPink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
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
        </div>

        {/* All time tracked — separate non-clickable stat */}
        <div style={{
          margin: "4px 20px 0",
          background: "#2d1505",
          borderRadius: 18,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          <div style={{ ...s.biOrange, background: "#6b3010" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...s.benefitName, color: "#f97316" }}>{stats.allTime} items tracked</div>
            <div style={{ ...s.benefitSub, color: "rgba(249,115,22,0.8)" }}>All time added to wishlist</div>
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
