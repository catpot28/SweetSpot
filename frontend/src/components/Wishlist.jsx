import { useState, useEffect } from "react";

const ALL_ITEMS = [
  {
    id: 1,
    name: "Sony WH-1000XM5",
    store: "Amazon.de",
    added: "Added 3 days ago",
    price: "€269",
    original: "€349",
    status: "discount",
    icon: "🎧",
    iconBg: "#1a3d28",
  },
  {
    id: 2,
    name: "iPad Air M2",
    store: "Apple Store",
    added: "Added 1 week ago",
    price: "€749",
    original: "€799",
    status: "discount",
    icon: "📱",
    iconBg: "#1a2d50",
  },
  {
    id: 3,
    name: "Dyson V15 Detect",
    store: "Dyson.com",
    added: "Added 2 weeks ago",
    price: "€649",
    original: null,
    status: "watching",
    icon: "🌀",
    iconBg: "#3d2a10",
  },
  {
    id: 4,
    name: "Nike Air Max 90",
    store: "Nike.com",
    added: "Added 5 days ago",
    price: "€129",
    original: null,
    status: "watching",
    icon: "👟",
    iconBg: "#2a1a3d",
  },
  {
    id: 5,
    name: "Levi's 501 Jeans",
    store: "Zalando",
    added: "Added 3 weeks ago",
    price: "€89",
    original: null,
    status: "watching",
    icon: "👖",
    iconBg: "#1a2040",
  },
  {
    id: 6,
    name: "AirPods Pro 2",
    store: "MediaMarkt",
    added: "Bought 2 weeks ago",
    price: "€229",
    original: null,
    status: "bought",
    icon: "🎵",
    iconBg: "#1a1a2a",
  },
  {
    id: 7,
    name: "Kindle Paperwhite",
    store: "Amazon.de",
    added: "Bought 1 month ago",
    price: "€139",
    original: null,
    status: "bought",
    icon: "📖",
    iconBg: "#1a2a1a",
  },
  {
    id: 8,
    name: "DJI Mini 4 Pro",
    store: "DJI Store",
    added: "Added today",
    price: "€759",
    original: null,
    status: "planned",
    icon: "🚁",
    iconBg: "#301a1a",
  },
];

const FILTERS = [
  { key: "all",      label: "All",         count: 24 },
  { key: "discount", label: "On discount", count: 5  },
  { key: "watching", label: "Watching",    count: 12 },
  { key: "bought",   label: "Bought",      count: 17 },
];

const STATUS_PILL = {
  discount: { label: "Deal found", bg: "#50dc78", color: "#021208" },
  watching: { label: "Watching",   bg: "#d97706", color: "#1a0d00" },
  bought:   { label: "✓ Bought",   bg: "#3a3a3a", color: "rgba(255,255,255,0.6)" },
  planned:  { label: "Planned",    bg: "#1a3d82", color: "#8fb8ff" },
};

function ProductIcon({ emoji, bg }) {
  return (
    <div style={{
      width: 52, height: 52,
      borderRadius: 12,
      background: bg,
      flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 24,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {emoji}
    </div>
  );
}

function StatusPill({ status }) {
  const s = STATUS_PILL[status] || STATUS_PILL.planned;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      fontSize: 10,
      fontWeight: 800,
      borderRadius: 100,
      padding: "2px 8px",
      letterSpacing: 0.2,
      flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

function ItemCard({ item, onNavigate, visible, delay }) {
  const [pressed, setPressed] = useState(false);
  const discounted = item.original && item.original !== item.price;

  return (
    <div
      onClick={() => onNavigate?.("detail")}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: pressed ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
        borderRadius: 14,
        padding: "14px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.38s ease ${delay}ms, transform 0.38s ease ${delay}ms, background 0.12s`,
      }}
    >
      <ProductIcon emoji={item.icon} bg={item.iconBg} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: -0.2,
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {item.name}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2, fontWeight: 500 }}>
          {item.store}
        </div>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 2 }}>
          {item.added}
        </div>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 5,
        flexShrink: 0,
      }}>
        {discounted && (
          <div style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "line-through",
            lineHeight: 1,
          }}>
            {item.original}
          </div>
        )}
        <div style={{
          color: item.status === "bought" ? "rgba(255,255,255,0.4)" : "#50dc78",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -0.7,
          lineHeight: 1,
        }}>
          {item.price}
        </div>
        <StatusPill status={item.status} />
      </div>
    </div>
  );
}

export default function Wishlist({ onNavigate, initialFilter = "all" }) {
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [visible, setVisible] = useState(false);

  const filtered = activeFilter === "all"
    ? ALL_ITEMS
    : ALL_ITEMS.filter((i) => i.status === activeFilter);

  const filterCount = FILTERS.find((f) => f.key === activeFilter)?.count ?? filtered.length;

  // Trigger entrance animation on mount + filter change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, [activeFilter]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

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

      {/* Top bar: back + title */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 20px 0",
        position: "relative",
      }}>
        <div
          onClick={() => onNavigate?.("home")}
          style={{
            width: 36, height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8,1 1,8 8,15"/>
          </svg>
        </div>
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: -0.4, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          Wishlist
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Filter pills */}
      <div style={{
        flexShrink: 0,
        display: "flex",
        gap: 8,
        padding: "18px 20px 0",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                flexShrink: 0,
                height: 34,
                borderRadius: 100,
                border: "none",
                background: active ? "#50dc78" : "rgba(255,255,255,0.07)",
                color: active ? "#021208" : "rgba(255,255,255,0.45)",
                fontSize: 13,
                fontWeight: active ? 800 : 600,
                cursor: "pointer",
                padding: "0 14px",
                letterSpacing: -0.2,
                transition: "background 0.2s, color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {f.label} ({f.count})
            </button>
          );
        })}
      </div>

      {/* Count label */}
      <div style={{
        flexShrink: 0,
        color: "rgba(255,255,255,0.28)",
        fontSize: 12,
        fontWeight: 600,
        padding: "12px 20px 6px",
        letterSpacing: 0.2,
        textTransform: "uppercase",
      }}>
        {filterCount} items
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        padding: "4px 20px 20px",
      }}>
        {filtered.length > 0 ? filtered.map((item, i) => (
          <ItemCard
            key={`${item.id}-${activeFilter}`}
            item={item}
            onNavigate={onNavigate}
            visible={visible}
            delay={i * 55}
          />
        )) : (
          <div style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.25)",
            fontSize: 14,
            paddingTop: 60,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.4s",
          }}>
            No items here yet
          </div>
        )}
      </div>
    </div>
  );
}
