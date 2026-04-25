import { useState, useEffect } from "react";
import StatusBar from './StatusBar';
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";
import { api } from "../lib/api";


// "On discount" and "Bought" each get their own backend endpoint later;
// for now only "All" returns real data (from GET /wishlist).
const FILTERS = [
  { key: "all",      label: "All" },
  { key: "discount", label: "On discount" },
  { key: "bought",   label: "Bought" },
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

// Map a backend /wishlist row → the shape ItemCard expects.
function mapBackendItem(row) {
  const c = row.candidate || {};
  const price =
    c.current_price_text ||
    (c.current_price_amount != null
      ? `${c.currency_code === "EUR" ? "€" : c.currency_code || ""}${c.current_price_amount}`
      : "—");
  return {
    id: row.wishlist_item_id,
    name: c.title || "Untitled",
    store: c.merchant_name || "Online store",
    added: formatRelative(row.added_at),
    price,
    original: null,
    status: row.sweet_spot ? "discount" : "watching",
    icon: "🛒",
    iconBg: row.sweet_spot ? "#1a3d28" : "#2a1a3d",
  };
}

function formatRelative(iso) {
  if (!iso) return "Added recently";
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 7) return `Added ${days} days ago`;
  if (days < 30) return `Added ${Math.round(days / 7)} weeks ago`;
  return `Added ${Math.round(days / 30)} months ago`;
}

export default function Wishlist({ onNavigate, initialFilter = "all" }) {
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState(null); // null = loading

  // Only the "all" filter has a real endpoint right now.
  useEffect(() => {
    if (activeFilter !== "all") {
      setItems([]);
      return;
    }
    let cancelled = false;
    api.getWishlist()
      .then((rows) => { if (!cancelled) setItems(rows.map(mapBackendItem)); })
      .catch((err) => {
        console.error("wishlist fetch failed:", err);
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  }, [activeFilter]);

  const filtered = items ?? [];
  const filterCount = filtered.length;

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
    <div style={phoneFrame(isMobile)}>

      <StatusBar />

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
              {f.label}
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
