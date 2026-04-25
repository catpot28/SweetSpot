import { useState, useEffect, useRef } from "react";
import StatusBar from './StatusBar';
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";
import { api } from "../lib/api";

const STATUS_MESSAGES = [
  { text: "Recognizing product...", green: false },
  { text: "Searching stores...",    green: false },
  { text: "Comparing prices...",    green: false },
  { text: "Found matches!",         green: true  },
];

const DURATION = 2500; // ms total

function useInterval(cb, delay) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function Scanning({ onNavigate, file, onSearchComplete }) {
  const isMobile = useIsMobile();
  const [statusIdx, setStatusIdx]   = useState(0);
  const [statusVis, setStatusVis]   = useState(true);
  const [dotFrame,  setDotFrame]    = useState(0);

  // Run the real scan: upload file → POST /lens/scan → navigate to candidates
  // with the resulting search_id. If no file (e.g. someone hit /scanning
  // directly), fall back to the old fixed-timer demo behaviour.
  useEffect(() => {
    let cancelled = false;
    if (!file) {
      const t = setTimeout(() => onNavigate?.("candidates"), DURATION);
      return () => clearTimeout(t);
    }
    api.lensScan(file)
      .then((res) => {
        if (cancelled) return;
        onSearchComplete?.(res.search_id);
        onNavigate?.("candidates");
      })
      .catch((err) => {
        console.error("/lens/scan failed:", err);
        if (cancelled) return;
        alert(`Scan failed: ${err.message || err}`);
        onNavigate?.("find");
      });
    return () => { cancelled = true; };
  }, [file, onNavigate, onSearchComplete]);

  // Cycle status messages every 700ms with fade
  useInterval(() => {
    setStatusVis(false);
    setTimeout(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
      setStatusVis(true);
    }, 200);
  }, 700);

  // Animate typing dots every 400ms
  useInterval(() => {
    setDotFrame((f) => (f + 1) % 4);
  }, 400);

  const dots = ["", ".", "..", "..."][dotFrame];
  const currentStatus = STATUS_MESSAGES[statusIdx];

  return (
    <div style={{ ...phoneFrame(isMobile), alignItems: "center", justifyContent: "center" }}>

      {/* Keyframes */}
      <style>{`
        @keyframes scan-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes pulse-glow {
          0%   { box-shadow: 0 0 0 0 rgba(80,220,120,0.0),  0 0 24px 4px rgba(80,220,120,0.12); }
          50%  { box-shadow: 0 0 0 14px rgba(80,220,120,0.0), 0 0 40px 12px rgba(80,220,120,0.22); }
          100% { box-shadow: 0 0 0 0 rgba(80,220,120,0.0),  0 0 24px 4px rgba(80,220,120,0.12); }
        }
        @keyframes ring-expand {
          0%   { transform: scale(1);   opacity: 0.35; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes scan-line-move {
          0%   { top: 10px;  opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 150px; opacity: 0; }
        }
        @keyframes shimmer-bar {
          0%   { left: -30%; }
          100% { left: 110%; }
        }
      `}</style>

      {/* Ambient bg glow */}
      <div style={{
        position: "absolute",
        width: 340, height: 340,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(80,220,120,0.07) 0%, transparent 65%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -62%)",
        pointerEvents: "none",
      }} />

      <StatusBar style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5 }} />

      {/* Center content */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
        padding: "0 24px",
        width: "100%",
        zIndex: 2,
      }}>

        {/* Product image + glow rings */}
        <div style={{ position: "relative", width: 160, height: 160 }}>
          {/* Expanding rings */}
          {[0, 0.5, 1].map((delay, i) => (
            <div key={i} style={{
              position: "absolute",
              inset: -20 - i * 10,
              borderRadius: "50%",
              border: "1px solid rgba(80,220,120,0.2)",
              animation: `ring-expand 2s ease-out ${delay}s infinite`,
              pointerEvents: "none",
            }} />
          ))}

          {/* Image card */}
          <div style={{
            width: 160, height: 160,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            animation: "pulse-glow 2.4s ease-in-out infinite",
          }}>
            {/* Scan line sweeping */}
            <div style={{
              position: "absolute",
              left: 0, right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, rgba(80,220,120,0.8), transparent)",
              animation: "scan-line-move 1.8s ease-in-out infinite",
              zIndex: 3,
              pointerEvents: "none",
            }} />

            {/* Headphones icon */}
            <svg width="72" height="64" viewBox="0 0 90 80" fill="none" opacity="0.3">
              <path d="M45 6C24.5 6 8 22.5 8 43v6a10 10 0 0 0 10 10h2a5 5 0 0 0 5-5V41a5 5 0 0 0-5-5H18v-3C18 18.8 30 8 45 8s27 10.8 27 25v3h-2a5 5 0 0 0-5 5v13a5 5 0 0 0 5 5h2a10 10 0 0 0 10-10v-6C82 22.5 65.5 6 45 6z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* "Scanning product..." */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: -0.4,
            lineHeight: 1.3,
          }}>
            Scanning product<span style={{ display: "inline-block", width: 24, textAlign: "left" }}>{dots}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            width: "100%",
            height: 4,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 100,
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Green fill */}
            <div style={{
              height: "100%",
              borderRadius: 100,
              background: "#50dc78",
              animation: `scan-progress ${DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 0 8px rgba(80,220,120,0.7)",
            }}>
              {/* Shimmer on leading edge */}
              <div style={{
                position: "absolute",
                top: 0, bottom: 0,
                width: "30%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                animation: `shimmer-bar 1.2s ease-in-out infinite`,
              }} />
            </div>
          </div>

          {/* Status message */}
          <div style={{
            textAlign: "center",
            opacity: statusVis ? 1 : 0,
            transition: "opacity 0.2s ease",
            height: 18,
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: currentStatus.green ? "#50dc78" : "rgba(255,255,255,0.4)",
              letterSpacing: -0.1,
              transition: "color 0.2s",
            }}>
              {currentStatus.text}
            </span>
          </div>
        </div>

      </div>

      {/* Cancel link */}
      <div
        onClick={() => onNavigate?.("find")}
        style={{
          position: "absolute",
          bottom: 52,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.25)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          letterSpacing: -0.1,
          whiteSpace: "nowrap",
          transition: "color 0.15s",
          zIndex: 5,
        }}
      >
        Cancel
      </div>

      {/* Home bar */}
      <div style={{
        position: "absolute",
        bottom: 8, left: "50%",
        transform: "translateX(-50%)",
        width: 130, height: 5,
        background: "rgba(255,255,255,0.28)",
        borderRadius: 3,
      }} />

    </div>
  );
}
