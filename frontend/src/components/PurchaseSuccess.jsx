import { useEffect, useState, useRef } from "react";
import StatusBar from './StatusBar';
import { useIsMobile, phoneFrame } from "../lib/phoneFrame";

const CONFETTI_COUNT = 28;
const COLORS = [
  "#50dc78", "#50dc78", "#50dc78",
  "#ffffff", "#ffffff",
  "#a8f0c0", "#c8f7d8",
  "#3ecf6a", "#82eaaa",
];

function generateConfetti() {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 375,
    width: 6 + Math.random() * 8,
    height: 10 + Math.random() * 14,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    duration: 1.8 + Math.random() * 2.2,
    delay: Math.random() * 1.2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 720,
    drift: (Math.random() - 0.5) * 120,
    opacity: 0.7 + Math.random() * 0.3,
  }));
}

const CONFETTI = generateConfetti();

function ConfettiPiece({ piece }) {
  const keyframes = `
    @keyframes fall-${piece.id} {
      0%   { transform: translateX(0px) translateY(-20px) rotate(${piece.rotation}deg); opacity: ${piece.opacity}; }
      80%  { opacity: ${piece.opacity}; }
      100% { transform: translateX(${piece.drift}px) translateY(900px) rotate(${piece.rotation + piece.rotationSpeed}deg); opacity: 0; }
    }
  `;
  return (
    <>
      <style>{keyframes}</style>
      <div style={{
        position: "absolute",
        left: piece.x,
        top: 0,
        width: piece.width,
        height: piece.height,
        background: piece.color,
        borderRadius: 2,
        animation: `fall-${piece.id} ${piece.duration}s ${piece.delay}s ease-in forwards`,
        opacity: 0,
        pointerEvents: "none",
        zIndex: 20,
      }} />
    </>
  );
}

function AnimatedCheck() {
  const circleLen = 2 * Math.PI * 38; // r=38
  const checkLen = 60; // approximate path length

  return (
    <>
      <style>{`
        @keyframes draw-circle {
          from { stroke-dashoffset: ${circleLen}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          from { stroke-dashoffset: ${checkLen}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div style={{ position: "relative", width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Pulse ring */}
        <div style={{
          position: "absolute",
          width: 100, height: 100,
          borderRadius: "50%",
          border: "2px solid #50dc78",
          animation: "pulse-ring 1.2s ease-out 0.7s infinite",
          transformOrigin: "center",
        }} />
        {/* Outer glow */}
        <div style={{
          position: "absolute",
          width: 100, height: 100,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(80,220,120,0.12) 0%, transparent 70%)",
        }} />

        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Circle */}
          <circle
            cx="50" cy="50" r="38"
            fill="transparent"
            stroke="#50dc78"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circleLen}
            strokeDashoffset={circleLen}
            style={{
              animation: `draw-circle 0.55s cubic-bezier(0.65,0,0.35,1) 0.1s forwards`,
              transformOrigin: "50px 50px",
              transform: "rotate(-90deg)",
            }}
          />
          {/* Checkmark */}
          <path
            d="M32 50 L44 62 L68 38"
            fill="none"
            stroke="#50dc78"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={checkLen}
            strokeDashoffset={checkLen}
            style={{
              animation: `draw-check 0.35s cubic-bezier(0.65,0,0.35,1) 0.65s forwards`,
            }}
          />
        </svg>
      </div>
    </>
  );
}

export default function PurchaseSuccess({
  onNavigate,
  productName = "Sony WH-1000XM5",
  price = "€299",
}) {
  const isMobile = useIsMobile();
  const [show, setShow] = useState(false);

  // Stagger text in
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Auto-navigate after 3s
  useEffect(() => {
    const t = setTimeout(() => onNavigate?.("home"), 3000);
    return () => clearTimeout(t);
  }, [onNavigate]);

  const fadeAt = (delay) => ({
    opacity: show ? 1 : 0,
    transform: show ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
  });

  return (
    <div style={{ ...phoneFrame(isMobile), alignItems: "center", justifyContent: "center" }}>

      {/* Ambient radial glow */}
      <div style={{
        position: "absolute",
        width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(80,220,120,0.1) 0%, transparent 65%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -60%)",
        pointerEvents: "none",
      }} />

      {/* Bottom soft glow */}
      <div style={{
        position: "absolute",
        width: 300, height: 200,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(80,220,120,0.06) 0%, transparent 70%)",
        bottom: 80, left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }} />

      {/* Confetti */}
      {CONFETTI.map((p) => <ConfettiPiece key={p.id} piece={p} />)}

      <StatusBar style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }} />

      {/* Center content */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        position: "relative",
        zIndex: 5,
        padding: "0 32px",
        textAlign: "center",
      }}>

        <AnimatedCheck />

        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.5,
            ...fadeAt(520),
          }}>
            Purchase complete!
          </div>

          <div style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: -0.1,
            ...fadeAt(620),
          }}>
            {productName}
          </div>

          <div style={{
            color: "#50dc78",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: -1,
            ...fadeAt(720),
          }}>
            {price}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 40, height: 1,
          background: "rgba(255,255,255,0.1)",
          margin: "4px 0",
          ...fadeAt(800),
        }} />

        {/* Saved info */}
        <div style={{
          background: "rgba(80,220,120,0.08)",
          border: "1px solid rgba(80,220,120,0.18)",
          borderRadius: 14,
          padding: "12px 24px",
          ...fadeAt(880),
        }}>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 4 }}>You saved</div>
          <div style={{ color: "#50dc78", fontSize: 20, fontWeight: 800, letterSpacing: -0.7 }}>€50 on this deal</div>
        </div>

      </div>

      {/* Back to home link */}
      <div
        onClick={() => onNavigate?.("home")}
        style={{
          position: "absolute",
          bottom: 52,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.28)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          letterSpacing: -0.1,
          whiteSpace: "nowrap",
          zIndex: 10,
          ...fadeAt(1000),
        }}
      >
        Back to home
      </div>

      {/* Home bar */}
      <div style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        transform: "translateX(-50%)",
        width: 130, height: 5,
        background: "rgba(255,255,255,0.28)",
        borderRadius: 3,
      }} />

    </div>
  );
}
