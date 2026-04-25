/**
 * Shared phone-frame chrome.
 *
 * Each screen renders inside a container that looks like an iPhone (rounded,
 * fixed 375x812, drop shadow) on desktop browsers — useful as a demo
 * mockup. On an actual phone that styling is silly (a tiny phone-shaped
 * UI inside a real phone), so we fill the viewport instead.
 */
import { useEffect, useState } from "react";

const PHONE_FRAME_BREAKPOINT = 600;

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

export function useIsMobile(breakpoint = PHONE_FRAME_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

/**
 * Returns the root container style for a phone-framed screen.
 * Spread additional props into the result if a screen needs extras
 * (e.g. centered children: `{ ...phoneFrame(isMobile), alignItems: "center" }`).
 */
export function phoneFrame(isMobile) {
  const base = {
    background: "#000",
    overflow: "hidden",
    position: "relative",
    fontFamily: FONT_FAMILY,
    display: "flex",
    flexDirection: "column",
  };
  if (isMobile) {
    return {
      ...base,
      width: "100vw",
      height: "100vh",
      // Reserve space for the real iOS status bar (transparent in PWA mode).
      // env() returns 0 on browsers without safe-area insets, so harmless elsewhere.
      paddingTop: "env(safe-area-inset-top)",
    };
  }
  return {
    ...base,
    width: 375,
    height: 812,
    borderRadius: 52,
    boxShadow: "0 0 0 1px #1a1a1a, 0 48px 96px rgba(0,0,0,0.95)",
    margin: "auto",
  };
}
