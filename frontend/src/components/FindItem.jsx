import { useState, useEffect, useRef } from "react";
import StatusBar from './StatusBar';
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";

export default function FindItem({ onNavigate }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState("camera"); // "camera" | "screenshot"
  const [scanY, setScanY] = useState(0);
  const [glowIntensity, setGlowIntensity] = useState(0.4);
  const [gridOffset, setGridOffset] = useState(0);
  const [captured, setCaptured] = useState(false);
  const startTimeRef = useRef(null);
  const fileInputRef = useRef(null);

  const SCAN_DURATION = 2200; // ms for one sweep
  const RETICLE = 220;

  // Animate scan line + grid
  useEffect(() => {
    let raf;
    const animate = (ts) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;

      // Scan line: 0 → RETICLE, repeat
      const scanProgress = (elapsed % SCAN_DURATION) / SCAN_DURATION;
      setScanY(scanProgress * RETICLE);

      // Glow pulses in sync with scan reaching bottom
      const glow = 0.35 + 0.45 * Math.sin(scanProgress * Math.PI);
      setGlowIntensity(glow);

      // Grid drift
      setGridOffset((elapsed / 40) % 40);

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Tapping the capture button opens the OS camera (or the photo picker
  // in screenshot mode) via a hidden <input type=file>. Once the user picks
  // a photo, the file lands in handleFileSelected → flash effect → navigate.
  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setCaptured(true);
    setTimeout(() => {
      setCaptured(false);
      onNavigate?.("scanning");
    }, 600);
  };

  // ─── Styles ──────────────────────────────────────────────────────────────

  const phoneStyle = phoneFrame(isMobile);

  // Simulated camera background
  const cameraStyle = {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(160deg, #0a0f0a 0%, #081208 40%, #060a10 70%, #050810 100%)",
    overflow: "hidden",
  };

  // Grid lines
  const gridStyle = {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    backgroundPosition: `${gridOffset}px ${gridOffset}px`,
    transition: "background-position 0s",
  };

  // Ambient blobs for camera feel
  const blob1 = {
    position: "absolute",
    width: 300, height: 300,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(20,60,30,0.35) 0%, transparent 70%)",
    top: 80, left: -60,
    filter: "blur(40px)",
    pointerEvents: "none",
  };
  const blob2 = {
    position: "absolute",
    width: 250, height: 250,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(10,30,60,0.3) 0%, transparent 70%)",
    bottom: 200, right: -40,
    filter: "blur(35px)",
    pointerEvents: "none",
  };

  // Back button
  const backBtn = {
    width: 40, height: 40,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(12px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    zIndex: 10,
    marginLeft: 16,
    marginTop: 4,
    flexShrink: 0,
  };

  // Center area
  const centerArea = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 5,
    gap: 20,
  };

  // Reticle wrapper
  const reticleWrap = {
    width: RETICLE,
    height: RETICLE,
    position: "relative",
  };

  // Corner bracket helper
  const cornerSize = 28;
  const cornerThickness = 3;
  const bracketColor = `rgba(80,220,120,${0.6 + glowIntensity * 0.4})`;
  const bracketGlow = `0 0 ${6 + glowIntensity * 14}px rgba(80,220,120,${glowIntensity * 0.8})`;

  const corners = [
    { top: 0, left: 0, borderTop: `${cornerThickness}px solid ${bracketColor}`, borderLeft: `${cornerThickness}px solid ${bracketColor}`, borderTopLeftRadius: 8 },
    { top: 0, right: 0, borderTop: `${cornerThickness}px solid ${bracketColor}`, borderRight: `${cornerThickness}px solid ${bracketColor}`, borderTopRightRadius: 8 },
    { bottom: 0, left: 0, borderBottom: `${cornerThickness}px solid ${bracketColor}`, borderLeft: `${cornerThickness}px solid ${bracketColor}`, borderBottomLeftRadius: 8 },
    { bottom: 0, right: 0, borderBottom: `${cornerThickness}px solid ${bracketColor}`, borderRight: `${cornerThickness}px solid ${bracketColor}`, borderBottomRightRadius: 8 },
  ];

  const cornerBase = {
    position: "absolute",
    width: cornerSize,
    height: cornerSize,
    boxShadow: bracketGlow,
  };

  // Laser beam — bright tip + comet tail fading upward
  const tailHeight = Math.min(scanY, 80);
  const scanLine = {
    position: "absolute",
    left: 0,
    right: 0,
    top: Math.max(0, scanY - tailHeight),
    height: tailHeight + 2,
    background: `linear-gradient(to bottom,
      transparent 0%,
      rgba(80,220,120,0.06) 40%,
      rgba(80,220,120,0.25) 75%,
      rgba(140,255,180,${0.85 + glowIntensity * 0.15}) 100%
    )`,
    pointerEvents: "none",
    display: mode === "camera" ? "block" : "none",
  };

  // Laser tip — the bright sharp line at the bottom of the tail
  const laserTip = {
    position: "absolute",
    left: 0,
    right: 0,
    top: scanY,
    height: 2,
    background: `linear-gradient(90deg, transparent, rgba(180,255,210,0.9), rgba(255,255,255,1), rgba(180,255,210,0.9), transparent)`,
    boxShadow: `0 0 6px 2px rgba(80,220,120,0.9), 0 0 18px 4px rgba(80,220,120,0.5)`,
    borderRadius: 2,
    pointerEvents: "none",
    display: mode === "camera" ? "block" : "none",
  };

  // Scan inner overlay (very subtle)
  const scanOverlay = {
    position: "absolute",
    inset: 0,
    background: `linear-gradient(to bottom, transparent ${scanY / RETICLE * 100 - 10}%, rgba(80,220,120,0.04) ${scanY / RETICLE * 100}%, transparent ${scanY / RETICLE * 100 + 10}%)`,
    pointerEvents: "none",
    display: mode === "camera" ? "block" : "none",
  };

  // Screenshot upload zone (replaces reticle content)
  const uploadZone = {
    width: RETICLE,
    height: RETICLE,
    border: "2px dashed rgba(80,220,120,0.45)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    cursor: "pointer",
    background: "rgba(80,220,120,0.05)",
    transition: "background 0.2s",
  };

  const hintText = {
    color: "rgba(255,255,255,0.55)",
    fontSize: 20,
    fontWeight: 500,
    textAlign: "center",
    letterSpacing: -0.2,
    fontFamily: '"SF Pro Rounded", sans-serif',
  };

  // Bottom overlay
  const bottomOverlay = {
    position: "relative",
    zIndex: 10,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "20px 20px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 22,
    flexShrink: 0,
  };

  // Toggle pill
  const toggleWrap = {
    background: "rgba(255,255,255,0.1)",
    borderRadius: 100,
    padding: 3,
    display: "flex",
    gap: 2,
  };

  const toggleBtn = (active) => ({
    flex: 1,
    height: 36,
    padding: "0 28px",
    borderRadius: 100,
    border: "none",
    background: active ? "rgba(255,255,255,0.18)" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.45)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: -0.2,
    fontFamily: '"SF Pro Rounded", sans-serif',
    whiteSpace: "nowrap",
  });

  // Capture button
  const captureRing = {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: `3px solid ${captured ? "rgba(80,220,120,1)" : "rgba(80,220,120,0.7)"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.15s, transform 0.15s",
    transform: captured ? "scale(0.92)" : "scale(1)",
    boxShadow: `0 0 ${captured ? 24 : 12}px rgba(80,220,120,${captured ? 0.6 : 0.25})`,
  };

  const captureInner = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: captured ? "rgba(80,220,120,0.3)" : "rgba(255,255,255,0.08)",
    transition: "background 0.15s",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  return (
    <div style={phoneStyle}>
      {/* Camera BG */}
      <div style={cameraStyle}>
        <div style={gridStyle} />
        <div style={blob1} />
        <div style={blob2} />
        {/* Flash on capture */}
        {captured && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(255,255,255,0.12)",
            pointerEvents: "none",
            zIndex: 20,
            animation: "none",
          }} />
        )}
      </div>

      <StatusBar style={{ position: "relative", zIndex: 10 }} />

      {/* Back button */}
      <div style={backBtn} onClick={() => onNavigate('home')}>
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,1 1,8.5 9,16"/>
        </svg>
      </div>

      {/* Center viewfinder */}
      <div style={centerArea}>
        {mode === "camera" ? (
          <>
            {/* Reticle */}
            <div style={reticleWrap}>
              {/* Corners */}
              {corners.map((c, i) => (
                <div key={i} style={{ ...cornerBase, ...c }} />
              ))}
              {/* Laser beam: tail + tip */}
              <div style={scanLine} />
              <div style={laserTip} />
              <div style={scanOverlay} />
              {/* Dim inner */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.08)",
                pointerEvents: "none",
              }} />
            </div>
            <div style={hintText}>Point at a product</div>
          </>
        ) : (
          <>
            <div style={uploadZone} onClick={handleCapture}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(80,220,120,0.7)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 18, fontWeight: 600, textAlign: "center", letterSpacing: -0.2 }}>
                Tap to upload<br/>screenshot
              </div>
            </div>
            <div style={hintText}>Upload a product screenshot</div>
          </>
        )}
      </div>

      {/* Hidden input — capture="environment" opens the rear camera on
          iOS/Android; without it, opens the photo picker for screenshots. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={mode === "camera" ? "environment" : undefined}
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />

      {/* Bottom panel */}
      <div style={bottomOverlay}>
        {/* Toggle */}
        <div style={toggleWrap}>
          <button style={toggleBtn(mode === "camera")} onClick={() => setMode("camera")}>
            Camera
          </button>
          <button style={toggleBtn(mode === "screenshot")} onClick={() => setMode("screenshot")}>
            Screenshot
          </button>
        </div>

        {/* Capture button — opens native camera (or photo picker) */}
        <div style={captureRing} onClick={handleCapture}>
          <div style={captureInner}>
            {mode === "screenshot" && (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
