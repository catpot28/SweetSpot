/**
 * iOS-style fake status bar (9:41 + signal/wifi/battery glyphs).
 *
 * On desktop (the iPhone-mockup viewport) this renders the chrome so the
 * demo looks like a phone screenshot. On a real phone the device's own
 * status bar shows through (PWA black-translucent), so we render nothing
 * — the safe-area padding is already added by phoneFrame() at the root.
 *
 * Pass `style` to override positioning (e.g. some screens absolute-position
 * the status bar over their content).
 */
import { useIsMobile } from "../lib/phoneFrame";

const DEFAULT_WRAPPER = {
  flexShrink: 0,
  height: 50,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  padding: "0 26px 8px",
};

export default function StatusBar({ style = {} }) {
  const isMobile = useIsMobile();
  if (isMobile) return null;

  return (
    <div style={{ ...DEFAULT_WRAPPER, ...style }}>
      <span style={{ color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>
        9:41
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="white">
          <rect x="0" y="7" width="3" height="4" rx="0.8" opacity="0.35" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.8" opacity="0.55" />
          <rect x="9" y="2" width="3" height="9" rx="0.8" opacity="0.75" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.35" fill="none" />
          <rect x="24" y="4" width="2.5" height="5" rx="1.5" fill="white" fillOpacity="0.4" />
          <rect x="2" y="2" width="18" height="9" rx="2" fill="white" />
        </svg>
      </div>
    </div>
  );
}
