import { useState, useEffect } from "react";
import StatusBar from "./StatusBar";
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";
import { api } from "../lib/api";
import ProductMedia from "./ProductMedia";
import { selectProductImage } from "../lib/productMedia";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sweetspot", label: "🎯 Sweet Spot" },
  { key: "discount", label: "On discount" },
  { key: "bought", label: "Bought" },
];

const STATUS_PILL = {
  sweetspot: { label: "🎯 Sweet Spot", bg: "#ffd234", color: "#1a1200" },
  discount: { label: "Deal found", bg: "#50dc78", color: "#021208" },
  watching: { label: "Watching", bg: "#d97706", color: "#1a0d00" },
  bought: { label: "Bought", bg: "#3a3a3a", color: "rgba(255,255,255,0.6)" },
  planned: { label: "Planned", bg: "#1a3d82", color: "#8fb8ff" },
};

function ProductIconFallback({ emoji }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
      }}
    >
      {emoji}
    </div>
  );
}

function StatusPill({ status }) {
  const badge = STATUS_PILL[status] || STATUS_PILL.planned;

  return (
    <span
      style={{
        background: badge.bg,
        color: badge.color,
        fontSize: 10,
        fontWeight: 800,
        borderRadius: 100,
        padding: "2px 8px",
        letterSpacing: 0.2,
        flexShrink: 0,
      }}
    >
      {badge.label}
    </span>
  );
}

function ItemCard({ item, onOpen, visible, delay }) {
  const [pressed, setPressed] = useState(false);
  const discounted = item.original && item.original !== item.price;

  return (
    <div
      onClick={() => onOpen?.(item)}
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
      <ProductMedia
        src={item.imageUrl}
        alt={item.name}
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: item.iconBg,
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 4,
          boxSizing: "border-box",
        }}
        fallback={<ProductIconFallback emoji={item.icon} />}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: -0.2,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.name}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2, fontWeight: 500 }}>
          {item.store}
        </div>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 2 }}>
          {item.added}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 5,
          flexShrink: 0,
        }}
      >
        {discounted && (
          <div
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "line-through",
              lineHeight: 1,
            }}
          >
            {item.original}
          </div>
        )}
        <div
          style={{
            color: item.status === "bought" ? "rgba(255,255,255,0.4)" : "#50dc78",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: -0.7,
            lineHeight: 1,
          }}
        >
          {item.price}
        </div>
        <StatusPill status={item.status} />
      </div>
    </div>
  );
}

function mapBackendItem(row) {
  const candidate = row.candidate || {};
  const price =
    candidate.current_price_text ||
    (candidate.current_price_amount != null
      ? `${candidate.currency_code === "EUR" ? "\u20ac" : candidate.currency_code || ""}${candidate.current_price_amount}`
      : "\u2014");

  const isBought = row.purchased_at != null;
  let status = "watching";
  if (isBought) status = "bought";
  else if (row.sweet_spot) status = "sweetspot";
  else if (row.on_discount) status = "discount";

  return {
    id: row.wishlist_item_id,
    wishlistItemId: row.wishlist_item_id,
    name: candidate.title || "Untitled",
    store: candidate.merchant_name || "Online store",
    added: formatRelative(row.added_at),
    price,
    original: null,
    reasoning: row.reasoning || null,
    status,
    purchasedAt: row.purchased_at,
    inStock: candidate.in_stock,
    imageUrl: selectProductImage(candidate),
    productUrl: candidate.product_url,
    productCandidateId: candidate.id,
    initialSearchId: candidate.initial_search_id,
    icon: "\ud83d\uded2",
    iconBg: row.sweet_spot ? "#1a3d28" : "#2a1a3d",
  };
}

export function formatRelative(iso) {
  if (!iso) return "Added recently";
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 7) return `Added ${days} days ago`;
  if (days < 30) return `Added ${Math.round(days / 7)} weeks ago`;
  return `Added ${Math.round(days / 30)} months ago`;
}

export default function Wishlist({ onNavigate, onOpenItem, initialFilter = "all" }) {
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await api.sweetspotWishlistScan();
      setScanResult(result);
      // Refresh current list so updated sweet_spot values show immediately
      const rows = await api.getWishlist();
      setItems(
        rows.map(mapBackendItem).filter((i) =>
          activeFilter === "all" ? i.status !== "bought" : true
        )
      );
    } catch (err) {
      console.error("wishlist scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetcher =
      activeFilter === "sweetspot"
        ? api.getWishlistSweetspot
        : activeFilter === "discount"
        ? api.getWishlistDiscount
        : activeFilter === "bought"
        ? api.getWishlistBought
        : api.getWishlist;

    fetcher()
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows.map(mapBackendItem);
        // The "All" view hides items already purchased — they live under "Bought".
        const filtered =
          activeFilter === "all"
            ? mapped.filter((item) => item.status !== "bought")
            : mapped;
        setItems(filtered);
      })
      .catch((err) => {
        console.error("wishlist fetch failed:", err);
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  const filtered = items ?? [];
  const filterCount = filtered.length;

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={phoneFrame(isMobile)}>
      <StatusBar />

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 20px 0",
          position: "relative",
        }}
      >
        <div
          onClick={() => onNavigate?.("home")}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8,1 1,8 8,15" />
          </svg>
        </div>
        <span
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: -0.4,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Wishlist
        </span>
        <button
          onClick={runScan}
          disabled={scanning}
          title="Scan for sweet spots"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: scanning ? "rgba(255,210,52,0.15)" : "rgba(255,210,52,0.1)",
            color: "#ffd234",
            fontSize: 16,
            cursor: scanning ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          {scanning ? "⏳" : "🎯"}
        </button>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          gap: 8,
          padding: "18px 20px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
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
              {filter.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          flexShrink: 0,
          color: "rgba(255,255,255,0.28)",
          fontSize: 12,
          fontWeight: 600,
          padding: "12px 20px 6px",
          letterSpacing: 0.2,
          textTransform: "uppercase",
        }}
      >
        {filterCount} items
      </div>

      {scanResult && (
        <div
          style={{
            margin: "8px 20px 0",
            padding: "10px 14px",
            background: "rgba(255,210,52,0.08)",
            border: "1px solid rgba(255,210,52,0.2)",
            borderRadius: 12,
            color: "#ffd234",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          🎯 {scanResult.sweet_spot_count} of {scanResult.items_scanned} items are in the Sweet Spot
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "4px 20px 20px",
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((item, index) => (
            <ItemCard
              key={`${item.id}-${activeFilter}`}
              item={item}
              onOpen={onOpenItem}
              visible={visible}
              delay={index * 55}
            />
          ))
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.25)",
              fontSize: 14,
              paddingTop: 60,
              opacity: visible ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            No items here yet
          </div>
        )}
      </div>
    </div>
  );
}
