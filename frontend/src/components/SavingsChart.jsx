import { useState, useEffect, useRef, useCallback } from "react";

const DATA = [
  { month: "Jan", value: 60  },
  { month: "Feb", value: 210 },
  { month: "Mar", value: 480 },
  { month: "Apr", value: 847 },
];

const TARGET = 847;
const ANIM_DURATION = 1500; // ms — counter + line draw

// ─── Easing ───────────────────────────────────────────────────────────────────
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// ─── Chart geometry ───────────────────────────────────────────────────────────
const W = 335;
const H = 110;
const PAD_L = 0;
const PAD_R = 0;
const PAD_T = 14;
const PAD_B = 8;

function buildPoints(data) {
  const maxV = Math.max(...data.map((d) => d.value));
  return data.map((d, i) => ({
    x: PAD_L + (i / (data.length - 1)) * (W - PAD_L - PAD_R),
    y: PAD_T + (1 - d.value / maxV) * (H - PAD_T - PAD_B),
    value: d.value,
    month: d.month,
  }));
}

function buildCurvePath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

// Measure SVG path length via a temporary element
function measurePath(d) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  document.body.appendChild(svg);
  const len = path.getTotalLength();
  document.body.removeChild(svg);
  return len;
}

// Interpolate value along path by x position
function interpValueAtX(pts, x) {
  if (x <= pts[0].x) return pts[0].value;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].value;
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i].x && x <= pts[i + 1].x) {
      const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      return Math.round(pts[i].value + t * (pts[i + 1].value - pts[i].value));
    }
  }
  return 0;
}

// Interpolate y along path by x
function interpYAtX(pts, x) {
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i].x && x <= pts[i + 1].x) {
      const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      // Cubic bezier midpoint approximation
      const cpx = (pts[i].x + pts[i + 1].x) / 2;
      const t2 = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      const y = (1-t2)*(1-t2)*(1-t2)*pts[i].y
              + 3*(1-t2)*(1-t2)*t2*pts[i].y
              + 3*(1-t2)*t2*t2*pts[i+1].y
              + t2*t2*t2*pts[i+1].y;
      return y;
    }
  }
  return 0;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SavingsChart() {
  const pts = buildPoints(DATA);
  const linePath = buildCurvePath(pts);
  const areaPath = linePath + ` L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  // Animation progress 0→1
  const [progress, setProgress]   = useState(0);
  const [counter,  setCounter]    = useState(0);
  const [monthVis, setMonthVis]   = useState([false, false, false, false]);
  const [pathLen,  setPathLen]    = useState(600); // fallback

  // Hover scrubber
  const [hoverX,     setHoverX]   = useState(null);
  const [tooltipVal, setTooltipVal] = useState(null);
  const svgRef = useRef(null);
  const startRef = useRef(null);

  // Measure actual path length on mount
  useEffect(() => {
    try {
      const len = measurePath(linePath);
      if (len > 0) setPathLen(len);
    } catch(e) {}
  }, [linePath]);

  // Drive animation with rAF
  useEffect(() => {
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      const eased = easeOutCubic(t);

      setProgress(eased);
      setCounter(Math.round(eased * TARGET));

      // Stagger month label fade-ins
      setMonthVis([
        eased >= 0.0,
        eased >= 0.3,
        eased >= 0.6,
        eased >= 0.9,
      ]);

      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Scrubber handlers
  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) * (W / rect.width);
    const x = Math.max(pts[0].x, Math.min(pts[pts.length-1].x, rawX));
    setHoverX(x);
    setTooltipVal(interpValueAtX(pts, x));
  }, [pts]);

  const handleTouchMove = useCallback((e) => {
    if (!svgRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = (touch.clientX - rect.left) * (W / rect.width);
    const x = Math.max(pts[0].x, Math.min(pts[pts.length-1].x, rawX));
    setHoverX(x);
    setTooltipVal(interpValueAtX(pts, x));
  }, [pts]);

  const handleLeave = useCallback(() => {
    setHoverX(null);
    setTooltipVal(null);
  }, []);

  const dashOffset = pathLen * (1 - progress);
  const lastPt = pts[pts.length - 1];
  const hoverY = hoverX !== null ? interpYAtX(pts, hoverX) : null;

  return (
    <>
      <style>{`
        @keyframes dot-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(80,220,120,0.6), 0 0 8px 2px rgba(80,220,120,0.3); }
          50%     { box-shadow: 0 0 0 6px rgba(80,220,120,0), 0 0 16px 6px rgba(80,220,120,0.5); }
        }
        @keyframes reveal-clip {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
        @keyframes aurora-sweep {
          0%   { transform: translateX(-60%) translateY(10%) scale(1);   opacity: 0.5; }
          30%  { transform: translateX(20%)  translateY(-15%) scale(1.2); opacity: 0.8; }
          60%  { transform: translateX(80%)  translateY(20%) scale(0.9); opacity: 0.4; }
          100% { transform: translateX(-60%) translateY(10%) scale(1);   opacity: 0.5; }
        }
        @keyframes aurora-sweep-2 {
          0%   { transform: translateX(80%)  translateY(-20%) scale(1.1); opacity: 0.3; }
          40%  { transform: translateX(10%)  translateY(30%)  scale(0.85); opacity: 0.6; }
          70%  { transform: translateX(-40%) translateY(-10%) scale(1.2); opacity: 0.25; }
          100% { transform: translateX(80%)  translateY(-20%) scale(1.1); opacity: 0.3; }
        }
      `}</style>

      <div style={{
        width: "100%",
        borderRadius: 16,
        padding: "20px 16px 16px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#0d1a10",
        border: "1px solid rgba(80,220,120,0.12)",
        cursor: "crosshair",
        userSelect: "none",
      }}>

        {/* Aurora blob 1 */}
        <div style={{
          position: "absolute",
          width: "70%", height: "140%",
          top: "-20%", left: 0,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(80,220,120,0.18) 0%, rgba(40,180,80,0.08) 40%, transparent 70%)",
          animation: "aurora-sweep 8s ease-in-out infinite",
          pointerEvents: "none",
          filter: "blur(18px)",
        }} />

        {/* Aurora blob 2 */}
        <div style={{
          position: "absolute",
          width: "55%", height: "120%",
          top: "-10%", left: "30%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(60,200,100,0.12) 0%, rgba(80,220,120,0.05) 50%, transparent 70%)",
          animation: "aurora-sweep-2 11s ease-in-out infinite",
          pointerEvents: "none",
          filter: "blur(24px)",
        }} />

        {/* Subtle inner glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 80% 20%, rgba(80,220,120,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          position: "relative",
          zIndex: 2,
        }}>
          <div>
            <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 18, fontWeight: 500, letterSpacing: -0.1 }}>
              Savings over time
            </div>
            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 13, marginTop: 3 }}>
              Jan – Apr 2026
            </div>
          </div>
          <div style={{
            color: "#50dc78",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: -1.2,
            lineHeight: 1,
            textShadow: "0 0 20px rgba(80,220,120,0.4)",
            fontVariantNumeric: "tabular-nums",
          }}>
            €{counter.toLocaleString()}
          </div>
        </div>

        {/* SVG Chart */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: "block", overflow: "hidden", position: "relative", zIndex: 2 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleLeave}
        >
          <defs>
            <linearGradient id="sc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#50dc78" stopOpacity="0.35"/>
              <stop offset="85%"  stopColor="#50dc78" stopOpacity="0"/>
            </linearGradient>
            {/* Clip that reveals left→right with the line */}
            <clipPath id="sc-clip">
              <rect
                x="0" y="0"
                width={W * progress}
                height={H + 10}
              />
            </clipPath>
          </defs>

          {/* Area fill — revealed by clip */}
          <path
            d={areaPath}
            fill="url(#sc-area)"
            clipPath="url(#sc-clip)"
          />

          {/* Line — drawn via dashoffset */}
          <path
            d={linePath}
            fill="none"
            stroke="#50dc78"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            strokeDashoffset={dashOffset}
            style={{ filter: "drop-shadow(0 0 4px rgba(80,220,120,0.5))" }}
          />

          {/* Crosshair */}
          {hoverX !== null && (
            <>
              <line
                x1={hoverX} y1={PAD_T - 6}
                x2={hoverX} y2={H}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Crosshair dot */}
              <circle
                cx={hoverX}
                cy={hoverY}
                r="4"
                fill="#50dc78"
                style={{ filter: "drop-shadow(0 0 5px rgba(80,220,120,0.8))" }}
              />
              {/* Tooltip */}
              <g transform={`translate(${Math.min(hoverX, W - 48)}, ${Math.max((hoverY || 0) - 32, 2)})`}>
                <rect x="-2" y="0" width="50" height="22" rx="6"
                  fill="rgba(0,0,0,0.75)"
                  stroke="rgba(80,220,120,0.3)"
                  strokeWidth="1"
                />
                <text
                  x="23" y="15"
                  textAnchor="middle"
                  fill="#50dc78"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily='"SF Pro Rounded", sans-serif'
                >
                  €{tooltipVal}
                </text>
              </g>
            </>
          )}

          {/* Glowing end dot — appears when progress near complete */}
          {progress > 0.92 && (
            <foreignObject
              x={lastPt.x - 6}
              y={lastPt.y - 6}
              width="12"
              height="12"
              style={{ overflow: "visible" }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#50dc78",
                margin: 2,
                animation: "dot-pulse 2s ease-in-out infinite",
                opacity: Math.min(1, (progress - 0.92) / 0.08),
              }} />
            </foreignObject>
          )}
        </svg>

        {/* Month labels */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 8,
          position: "relative",
          zIndex: 2,
        }}>
          {DATA.map((d, i) => (
            <span key={d.month} style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
              fontWeight: 500,
              opacity: monthVis[i] ? 1 : 0,
              transform: monthVis[i] ? "translateY(0)" : "translateY(4px)",
              transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`,
            }}>
              {d.month}
            </span>
          ))}
        </div>

      </div>
    </>
  );
}
