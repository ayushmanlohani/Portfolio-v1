"use client";

import { useEffect, useRef, useState } from "react";
import { Caveat, IBM_Plex_Mono } from "next/font/google";
import { gsap } from "gsap";
import MouseEffects from "./MouseEffects";

/* ─── Fonts ─── Jackie uses Historia Sky Script 85px + IBM Plex Mono everywhere.
   We approximate script with Caveat (hand-written, warm) + mono for all UI. */
const script = Caveat({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jackie-script",
});
const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jackie-mono",
});

/* ─── Jackie Tokens ─── extracted from html: warm paper, hairline border, ink, vermillion */
const T = {
  bg: "#FFFAF5",
  card: "#FCF7F2",
  card2: "#F6F6F6",
  border: "#E7E6DE",
  line: "#DEDEDE",
  ink: "#3E3E42",
  taupe: "#69645E",
  muted: "#878686",
  accent: "#F76240",
  accentSoft: "rgba(247,98,64,0.12)",
  dark: "#545454",
} as const;

/* ─── Container size hook (same pattern as AboutMeLanding) ─── */
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [s, setS] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A minimised window is `display:none`, so it measures 0×0. Keeping the
    // last real measurement stops every desk prop from being repositioned
    // (and any dragging the visitor did from being thrown away) each time the
    // window is minimised and restored.
    const upd = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setS({ w, h });
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return s;
}

/* ─── Scroll reveal ─── Jackie appear: opacity 0.001 + blur 10px + translateY 10-20px */
function Reveal({
  children,
  delay = 0,
  style,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.14 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0.001,
        filter: on ? "blur(0px)" : "blur(10px)",
        transform: on ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, filter 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        minWidth: 0,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Letter stagger ─── Jackie stacks each letter as span for stagger blur-up */
function StaggerLetters({
  text,
  style,
  delayStep = 0.03,
}: {
  text: string;
  style?: React.CSSProperties;
  delayStep?: number;
}) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setOn(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ display: "inline-flex", flexWrap: "wrap", ...style }}>
      {text.split("").map((ch, i) =>
        ch === " " ? (
          <span key={i} style={{ width: "0.32em" }} />
        ) : (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: on ? 1 : 0.001,
              filter: on ? "blur(0)" : "blur(10px)",
              transform: on ? "translateY(0)" : "translateY(10px)",
              transition: `all 0.65s cubic-bezier(0.16,1,0.3,1) ${i * delayStep}s`,
            }}
          >
            {ch}
          </span>
        )
      )}
    </div>
  );
}

/* ─── Draggable desk prop ─── minimal grab physics, window-confined */
export type EditValue = { x: number; y: number; rot: number; w: number };

function Draggable({
  children,
  targetX,
  targetY,
  rotate,
  z = 1,
  compact,
  disabled = false,
  onFront,
  editId,
  baseWidth,
  scaleFactor = 1,
  onEditChange,
}: {
  children: React.ReactNode;
  targetX: number;
  targetY: number;
  rotate: number;
  z?: number;
  compact?: boolean;
  disabled?: boolean;
  /** Claims the next z-index. Called whenever this prop is touched. */
  onFront?: () => number;
  /** Set (with baseWidth + onEditChange) to turn on the ?edit=1 live-arrange
   *  overlay: free dragging regardless of `disabled`, plus resize/rotate
   *  handles, reporting values back in the same pre-scale units the JSX
   *  ternaries are written in — copy-pasteable straight into the source. */
  editId?: string;
  baseWidth?: number;
  scaleFactor?: number;
  onEditChange?: (id: string, val: EditValue) => void;
}) {
  const editable = !!editId;
  const [pos, setPos] = useState({ x: targetX, y: targetY });
  const [drag, setDrag] = useState(false);
  const [editRot, setEditRot] = useState(rotate);
  const [editScale, setEditScale] = useState(1);
  // Nothing owns a fixed layer: `z` is only where this prop starts, and
  // touching it lifts it above every other prop for good.
  const [zi, setZi] = useState(z);
  const off = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const prevTarget = useRef({ x: targetX, y: targetY });

  // Only sync position when target coordinates intentionally change (e.g. Mode toggle)
  useEffect(() => {
    if (prevTarget.current.x !== targetX || prevTarget.current.y !== targetY) {
      prevTarget.current = { x: targetX, y: targetY };
      setPos({ x: targetX, y: targetY });
    }
  }, [targetX, targetY]);

  // Draggable mounts before the ?edit=1 effect flips deskMode to "clean", so
  // editRot's initial useState still snapshots the chaos-mode rotate prop.
  // Resync once the real value arrives.
  useEffect(() => {
    setEditRot(rotate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotate]);

  useEffect(() => {
    if (editable && editId && onEditChange && baseWidth) {
      onEditChange(editId, {
        x: Math.round(pos.x / scaleFactor),
        y: Math.round(pos.y / scaleFactor),
        rot: Math.round(editRot),
        w: Math.round(baseWidth * editScale),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, pos.x, pos.y, editRot, editScale]);

  const disabledNow = editable ? false : disabled;
  const displayRotate = editable ? editRot : rotate;
  const displayScale = editable ? editScale : 1;

  if (compact && !editable) {
    // on narrow window: flow as relative pills, no drag, no rotate craziness
    return (
      <div
        style={{
          position: "relative",
          display: "inline-flex",
          transform: `rotate(${rotate * 0.35}deg)`,
          margin: 6,
        }}
      >
        {children}
      </div>
    );
  }

  function startResize(e: React.PointerEvent) {
    e.stopPropagation();
    const startX = e.clientX;
    const startScale = editScale;
    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      setEditScale(Math.max(0.2, startScale + (dx / (baseWidth || 100)) * 2));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startRotate(e: React.PointerEvent) {
    e.stopPropagation();
    function move(ev: PointerEvent) {
      const rect = ref.current!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      setEditRot(Math.round(angle));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={ref}
      className={editable ? "edit-item" : undefined}
      onPointerDown={(e) => {
        if (disabledNow) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        off.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (onFront) setZi(onFront());
        setDrag(true);
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag || disabledNow) return;
        const parent = (ref.current?.parentElement as HTMLElement)?.getBoundingClientRect();
        if (!parent) return;
        // Positions are offsets from the stage centre — where the name sits —
        // so a drag has to be recorded the same way.
        const nx = e.clientX - parent.left - off.current.x - parent.width / 2;
        const ny = e.clientY - parent.top - off.current.y - parent.height / 2;
        setPos({ x: nx, y: ny });
      }}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
      style={{
        position: "absolute",
        // Anchored to the centre of the stage in CSS rather than to a measured
        // pixel value. The browser recomputes it on every resize, so the ring
        // around the name keeps its shape and nothing drifts when the window is
        // minimised and restored.
        left: `calc(50% + ${pos.x}px)`,
        top: `calc(50% + ${pos.y}px)`,
        transform: `rotate(${displayRotate}deg) scale(${displayScale})`,
        zIndex: zi,
        cursor: disabledNow ? "default" : drag ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        pointerEvents: "auto",
        willChange: "transform",
        filter: drag ? "drop-shadow(0 8px 18px rgba(62,62,66,0.18))" : "none",
        transition: drag ? "none" : "left 0.65s cubic-bezier(0.16,1,0.3,1), top 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1), filter 0.3s",
      }}
    >
      {children}
      {editable && (
        <>
          <div className="edit-frame" />
          <div className="edit-label">{editId}</div>
          <div className="edit-handle resize" onPointerDown={startResize} />
          <div className="edit-handle rotate" onPointerDown={startRotate} />
        </>
      )}
    </div>
  );
}

/** Drag-only editable wrapper for the hero's text/button pieces — unlike
 *  Draggable, position is a plain translate on top of normal document flow
 *  (not stage-center-relative), so chaos mode's flex-stacked layout is
 *  untouched when baseX/baseY are 0. Only active inside ?edit=1. */
function EditableGroup({
  id,
  editMode,
  baseX,
  baseY,
  k,
  onEditChange,
  children,
}: {
  id: string;
  editMode: boolean;
  baseX: number;
  baseY: number;
  k: number;
  onEditChange: (id: string, val: EditValue) => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ x: baseX, y: baseY });
  const prevBase = useRef({ x: baseX, y: baseY });

  useEffect(() => {
    if (prevBase.current.x !== baseX || prevBase.current.y !== baseY) {
      prevBase.current = { x: baseX, y: baseY };
      setPos({ x: baseX, y: baseY });
    }
  }, [baseX, baseY]);

  useEffect(() => {
    if (editMode) onEditChange(id, { x: Math.round(pos.x / k), y: Math.round(pos.y / k), rot: 0, w: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, pos.x, pos.y]);

  function startDrag(e: React.PointerEvent) {
    if (!editMode) return;
    const startX = e.clientX, startY = e.clientY;
    const ox = pos.x, oy = pos.y;
    function move(ev: PointerEvent) {
      setPos({ x: ox + (ev.clientX - startX), y: oy + (ev.clientY - startY) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className={editMode ? "edit-item" : undefined}
      onPointerDown={startDrag}
      style={{
        position: "relative",
        display: "inline-block",
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: editMode ? "none" : "transform 0.65s cubic-bezier(0.16,1,0.3,1)",
        cursor: editMode ? "grab" : undefined,
        pointerEvents: editMode ? "auto" : undefined,
      }}
    >
      {children}
      {editMode && (
        <>
          <div className="edit-frame" />
          <div className="edit-label">{id}</div>
        </>
      )}
    </div>
  );
}

/* ─── Data ─── re-skinned */

const INTERNSHIPS = [
  {
    id: "nielit",
    role: "AI & ML Intern",
    company: "NIELIT",
    fullName: "National Institute of Electronics & Information Technology",
    period: "Jun 2024 — Aug 2024",
    type: "Govt. Research Lab",
    stamp: "GOVT LAB",
    color: "#EBF3FE",
    accentColor: "#2563EB",
    summary: "Trained neural architectures, analyzed sensor & CV pipelines, and optimized models for low-resource hardware benchmarks.",
    bullets: [
      "Developed and evaluated computer vision & deep learning models using PyTorch.",
      "Engineered feature extraction and automated data pre-processing pipelines.",
      "Benchmarked inference latency and model memory footprints across edge environments.",
    ],
    skills: ["Deep Learning", "PyTorch", "Computer Vision", "Python", "Data Pipelines"],
  },
  {
    id: "ibi",
    role: "Software & AI Intern",
    company: "IBI",
    fullName: "IBI Group / Tech",
    period: "Jan 2024 — Mar 2024",
    type: "Industry Internship",
    stamp: "INDUSTRY",
    color: "#FEF4EB",
    accentColor: "#F76240",
    summary: "Built scalable backend services, integrated AI endpoints, and developed internal tooling for data workflows.",
    bullets: [
      "Architected backend micro-services and RESTful API endpoints for data integration.",
      "Integrated machine learning inferences into full-stack web modules.",
      "Automated internal regression workflows and reduced query latencies.",
    ],
    skills: ["Full-Stack", "FastAPI", "Python", "REST APIs", "SQL"],
  },
];


/* ─── Experience Dossier Card (3D Tilt + Accordion Drawer) ─── */
function ExperienceDossierCard({ exp, narrow }: { exp: (typeof INTERNSHIPS)[0]; narrow: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, s: 1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || narrow) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rx = ((y - centerY) / centerY) * -5;
    const ry = ((x - centerX) / centerX) * 5;
    setTilt({ rx, ry, s: 1.015 });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, s: 1 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setExpanded(!expanded)}
      style={{
        position: "relative",
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 22,
        padding: narrow ? "18px 16px" : "22px 22px",
        boxShadow: "0 2px 12px rgba(166,166,166,0.12)",
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.s})`,
        transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s, border-color 0.2s",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
      }}
      className="exp-card"
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-jackie-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: exp.accentColor,
                  textTransform: "uppercase",
                }}
              >
                {exp.company}
              </span>
              <span style={{ fontSize: 11, color: T.muted }}>• {exp.type}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jackie-script)",
                fontSize: narrow ? 26 : 30,
                lineHeight: 1.1,
                color: T.ink,
                marginTop: 4,
                fontWeight: 700,
              }}
            >
              {exp.role}
            </div>
          </div>

          <div
            style={{
              padding: "4px 8px",
              border: `1.5px dashed ${exp.accentColor}`,
              borderRadius: 6,
              background: exp.color,
              color: exp.accentColor,
              fontFamily: "var(--font-jackie-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              transform: "rotate(-3deg)",
              flexShrink: 0,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
            className="exp-stamp"
          >
            {exp.stamp}
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: T.muted, fontFamily: "var(--font-jackie-mono)", letterSpacing: "0.04em" }}>
          {exp.period} • {exp.fullName}
        </div>

        <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: T.taupe, margin: "12px 0 0" }}>
          {exp.summary}
        </p>

        {/* Highlights / Expandable key deliverables */}
        <div
          style={{
            marginTop: 12,
            maxHeight: expanded ? 320 : 0,
            opacity: expanded ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(255,255,255,0.75)",
              border: `1px solid ${T.line}`,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
              lineHeight: 1.5,
              color: T.ink,
            }}
          >
            {exp.bullets.map((b, bi) => (
              <div key={bi} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ color: exp.accentColor, fontSize: 11, marginTop: 1 }}>✦</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {exp.skills.map((s) => (
            <span
              key={s}
              style={{
                fontSize: 10.5,
                fontFamily: "var(--font-jackie-mono)",
                fontWeight: 600,
                color: T.taupe,
                background: "#fff",
                border: `1px solid ${T.border}`,
                padding: "3px 7px",
                borderRadius: 999,
              }}
            >
              {s}
            </span>
          ))}
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-jackie-mono)",
            color: exp.accentColor,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {expanded ? "less ▴" : "details ▾"}
        </span>
      </div>
    </div>
  );
}

/* ─── Education Data & Component (Thin sleek boxes + Logo hover preview) ─── */
const EDUCATION_ITEMS = [
  {
    id: "lu",
    name: "University of Lucknow",
    degree: "B.Tech in Computer Science (Artificial Intelligence)",
    period: "2023 — 2027",
    score: "8.2 SGPA",
    scoreLabel: "Current SGPA",
    logo: "/letterbox/lu-logo.png",
    previewImage: "/letterbox/lu-logo.png",
    previewCaption: "University of Lucknow • Faculty of Engineering",
    accent: T.accent,
  },
  {
    id: "ncic",
    name: "Nirmala Convent Inter College",
    degree: "Senior Secondary (ISC) & Secondary (ICSE)",
    period: "2009 — 2023",
    score: "90% (XII) • 92% (X)",
    scoreLabel: "Board Marks",
    logo: "/letterbox/ncic-logo.png",
    previewImage: "/letterbox/ncic-logo.png",
    previewCaption: "Nirmala Convent Inter College • Lucknow",
    accent: "#2563EB",
  },
];

function EducationItem({ item, narrow }: { item: (typeof EDUCATION_ITEMS)[0]; narrow: boolean }) {
  const [logoHovered, setLogoHovered] = useState(false);

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: narrow ? "12px 12px" : "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: narrow ? 8 : 12,
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
        height: "100%",
        boxShadow: "0 1px 4px rgba(166,166,166,0.06)",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
      }}
      className="edu-item"
    >
      <div style={{ display: "flex", alignItems: "center", gap: narrow ? 8 : 12, minWidth: 0, flex: 1 }}>
        {/* Logo with hover expansion preview */}
        <div
          style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <div
            style={{
              width: narrow ? 38 : 44,
              height: narrow ? 38 : 44,
              borderRadius: 12,
              background: "#fff",
              border: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: 6,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              cursor: "pointer",
              transform: logoHovered ? "scale(1.12)" : "scale(1)",
              transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s",
            }}
          >
            <img
              src={item.logo}
              alt={item.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
                margin: "auto",
              }}
            />
          </div>

          {/* Floating Hover Picture Preview Lightbox */}
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: 0,
              zIndex: 100,
              background: "#FFFFFF",
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 8,
              boxShadow: "0 12px 32px rgba(62,62,66,0.18)",
              pointerEvents: "none",
              opacity: logoHovered ? 1 : 0,
              transform: logoHovered ? "translateY(0) scale(1)" : "translateY(6px) scale(0.96)",
              transition: "opacity 0.25s, transform 0.25s cubic-bezier(0.16,1,0.3,1)",
              width: 156,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 140,
                height: 104,
                borderRadius: 8,
                overflow: "hidden",
                background: "#FAF7F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
              }}
            >
              <img
                src={item.previewImage}
                alt={item.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  margin: "auto",
                }}
              />
            </div>
            <div style={{ fontSize: 9.5, fontFamily: "var(--font-jackie-mono)", color: T.muted, textAlign: "center", lineHeight: 1.3 }}>
              {item.previewCaption}
            </div>
          </div>
        </div>

        {/* Institution & Degree Info */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: narrow ? 12.5 : 14, fontWeight: 600, letterSpacing: "-0.01em", color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.name}
          </div>
          <div style={{ fontSize: narrow ? 10.5 : 11.5, color: T.taupe, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.degree}
          </div>
          <div style={{ fontSize: narrow ? 9.5 : 10, fontFamily: "var(--font-jackie-mono)", color: T.muted, marginTop: 3 }}>
            {item.period}
          </div>
        </div>
      </div>

      {/* Marks / SGPA Pill */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", marginLeft: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-jackie-mono)",
            fontSize: narrow ? 10 : 11,
            fontWeight: 700,
            color: item.accent,
            background: "#fff",
            border: `1px solid ${T.line}`,
            padding: narrow ? "3px 7px" : "4px 9px",
            borderRadius: 999,
            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {item.score}
        </span>
      </div>
    </div>
  );
}

/* ─── Projects Data & Interactive Showcase (Jackie "Recently Made ▶" Style) ─── */
const RECENT_PROJECTS = [
  {
    id: "unitwise",
    name: "Unitwise",
    subtitle: "AI textbook citation & study engine",
    url: "https://unitwise-weld.vercel.app",
    githubUrl: "https://github.com/ayushmanlohani/Unitwise",
    iconBg: "transparent",
    iconImg: "/letterbox/unitwise-logo.png",
    images: [
      "/letterbox/projects/unitwise-1.png",
      "/letterbox/projects/unitwise-2.png",
      "/letterbox/projects/unitwise-3.png",
    ],
    accent: "#10B981",
  },
  {
    id: "sentinel",
    name: "RBI Sentinel",
    subtitle: "Central bank NLP & volatility forecaster",
    url: "https://rbi-sentinel.streamlit.app/",
    githubUrl: "https://github.com/ayushmanlohani/rbi-sentiment-volatility-forecasting",
    iconBg: "#E04824",
    iconText: "RBI",
    iconImg: "/letterbox/sentinel.png",
    images: [
      "/letterbox/projects/sentinel-a.png",
      "/letterbox/projects/sentinel-b.png",
      "/letterbox/projects/sentinel-c.png",
    ],
    accent: "#F76240",
  },
];

/** Where each of a project's 3 images lands in the hover cluster, and how far
 *  out (in its own direction — left, top, right) it starts before sliding
 *  and fading in. B leads from above but only by a small nudge, not from the
 *  top of the screen — see the request this was built from. This is the
 *  fallback shared by any project without its own `clusterLayout` below. */
const CLUSTER_LAYOUT = [
  { dx: -85, dy: 18, rot: -7, z: 1, w: 175, h: 122, fromX: -140, fromY: 0 },
  { dx: 25, dy: -22, rot: 2, z: 3, w: 210, h: 146, fromX: 0, fromY: -75 },
  { dx: 100, dy: 30, rot: 8, z: 2, w: 175, h: 122, fromX: 140, fromY: 0 },
];

/** Unitwise's own hierarchical cluster — three different sizes, spread wide
 *  enough that none of them cover each other. Tune via ?editproj=1. */
const UNITWISE_CLUSTER_LAYOUT: typeof CLUSTER_LAYOUT = [
  // Box ratios match each screenshot's real aspect ratio (515x651, 768x336,
  // 1480x565) so objectFit:"cover" never has to crop into the content.
  { dx: -125, dy: 40, rot: -6, z: 1, w: 119, h: 150, fromX: -140, fromY: 0 },
  { dx: 30, dy: -55, rot: 3, z: 3, w: 220, h: 96, fromX: 0, fromY: -75 },
  { dx: 150, dy: 55, rot: 7, z: 2, w: 200, h: 76, fromX: 140, fromY: 0 },
];

function RecentlyMadeProjects({
  size,
  editProjMode,
}: {
  size: { w: number; h: number };
  editProjMode?: boolean;
}) {
  const [activeId, setActiveId] = useState("unitwise");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeProj = RECENT_PROJECTS.find((p) => p.id === activeId) || RECENT_PROJECTS[0];
  const isStacked = size.w > 0 && size.w < 880;
  const isNarrow = size.w > 0 && size.w < 600;
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Per-project cluster layout, editable live via ?editproj=1 (Unitwise only
  // for now — Sentinel stays frozen on its old shared layout, "blocked" per
  // request while this work is dedicated to Unitwise).
  const [layouts, setLayouts] = useState<Record<string, typeof CLUSTER_LAYOUT>>(() => ({
    unitwise: JSON.parse(JSON.stringify(UNITWISE_CLUSTER_LAYOUT)),
    sentinel: JSON.parse(JSON.stringify(CLUSTER_LAYOUT)),
  }));
  const isEditingUnitwise = !!editProjMode && activeProj.id === "unitwise";

  // ?editproj=1 pins the view on Unitwise, cluster permanently visible —
  // hovering away no longer hides it, and Sentinel is blocked from taking over.
  useEffect(() => {
    if (editProjMode) {
      setActiveId("unitwise");
      setHoveredId("unitwise");
    }
  }, [editProjMode]);

  // Resting state (no hover) is empty — the cluster only assembles once a
  // project tile is hovered, each image sliding in from its own side.
  // Skipped entirely while editing: edit mode drives style directly.
  useEffect(() => {
    if (editProjMode) return;
    const els = cardRefs.current;
    if (els.some((el) => !el)) return;
    gsap.killTweensOf(els);
    const activeLayout = layouts[activeProj.id] || CLUSTER_LAYOUT;
    els.forEach((el, i) => {
      if (!el) return;
      const l = activeLayout[i];
      if (hoveredId) {
        gsap.fromTo(
          el,
          { x: l.dx + l.fromX, y: l.dy + l.fromY, rotation: l.rot, opacity: 0 },
          { x: l.dx, y: l.dy, rotation: l.rot, opacity: 1, duration: 0.6, delay: i * 0.08, ease: "power3.out" },
        );
      } else {
        gsap.to(el, {
          x: l.dx + l.fromX * 0.2,
          y: l.dy + l.fromY * 0.2,
          opacity: 0,
          duration: 0.35,
          ease: "power2.in",
        });
      }
    });
  }, [hoveredId, activeProj.id, editProjMode, layouts]);

  function updateImgLayout(i: number, patch: Partial<(typeof CLUSTER_LAYOUT)[0]>) {
    setLayouts((prev) => {
      const next = [...prev.unitwise];
      next[i] = { ...next[i], ...patch };
      return { ...prev, unitwise: next };
    });
  }

  function startImgDrag(e: React.PointerEvent, i: number) {
    const l = layouts.unitwise[i];
    const startX = e.clientX, startY = e.clientY;
    const ox = l.dx, oy = l.dy;
    function move(ev: PointerEvent) {
      updateImgLayout(i, { dx: Math.round(ox + (ev.clientX - startX)), dy: Math.round(oy + (ev.clientY - startY)) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startImgResize(e: React.PointerEvent, i: number) {
    e.stopPropagation();
    const l = layouts.unitwise[i];
    const startX = e.clientX;
    const ow = l.w, oh = l.h;
    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const scale = Math.max(0.3, 1 + dx / ow);
      updateImgLayout(i, { w: Math.round(ow * scale), h: Math.round(oh * scale) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startImgRotate(e: React.PointerEvent, i: number, el: HTMLDivElement) {
    e.stopPropagation();
    function move(ev: PointerEvent) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      updateImgLayout(i, { rot: Math.round(angle) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isStacked ? "1fr" : "1fr 1.2fr",
        gap: isStacked ? 20 : 28,
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Left List of Projects */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {RECENT_PROJECTS.map((proj) => {
          const isHovered = proj.id === hoveredId;
          return (
            <a
              key={proj.id}
              href={proj.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => {
                if (editProjMode) return;
                setHoveredId(proj.id);
                setActiveId(proj.id);
              }}
              onMouseLeave={() => !editProjMode && setHoveredId(null)}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#FAF7F2",
                border: "1px solid rgba(220, 216, 208, 0.6)",
                borderRadius: 22,
                padding: isNarrow ? "14px 18px" : "18px 24px",
                display: "flex",
                alignItems: "center",
                gap: isNarrow ? 14 : 18,
                cursor: "pointer",
                boxShadow: isHovered ? "0 8px 24px rgba(62,62,66,0.08), 0 2px 6px rgba(62,62,66,0.03)" : "none",
                transform: isHovered && !isStacked ? "translateX(5px) scale(1.015)" : "translateX(0) scale(1)",
                transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
              }}
              className="proj-tile-item"
            >
              {/* App Icon */}
              <div
                style={{
                  width: isNarrow ? 50 : 60,
                  height: isNarrow ? 50 : 60,
                  borderRadius: proj.iconImg ? 0 : 16,
                  background: proj.iconImg ? "transparent" : proj.iconBg,
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                  fontSize: isNarrow ? 14 : 16,
                  fontWeight: 700,
                  fontFamily: "var(--font-jackie-mono)",
                  letterSpacing: "-0.01em",
                  flexShrink: 0,
                  overflow: "visible",
                  padding: 0,
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                  transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                {proj.iconImg ? (
                  <img
                    src={proj.iconImg}
                    alt={proj.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : (
                  proj.iconText
                )}
              </div>

              {/* Text Block */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-jackie-mono)",
                    fontSize: isNarrow ? 15 : 16,
                    fontWeight: 500,
                    color: "#3E3E42",
                    letterSpacing: "0.02em",
                  }}
                >
                  {proj.name}
                </div>
                <div
                  style={{
                    fontSize: isNarrow ? 12.5 : 13.5,
                    fontWeight: 400,
                    color: "#78746D",
                    marginTop: 5,
                    fontFamily: "var(--font-jackie-mono)",
                    lineHeight: 1.45,
                  }}
                >
                  {proj.subtitle}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Right Stage: empty at rest — a cluster of the hovered project's own
          screenshots assembles from three directions on hover. */}
      <div
        style={{
          position: "relative",
          minHeight: isNarrow ? 220 : 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        <div style={{ position: "relative", width: isEditingUnitwise ? 420 : 320, height: isEditingUnitwise ? 300 : 220 }}>
          {activeProj.images.map((src, i) => {
            const l = (layouts[activeProj.id] || CLUSTER_LAYOUT)[i];
            const editableHere = isEditingUnitwise;
            return (
              <div
                key={src}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={editableHere ? "edit-item" : undefined}
                onPointerDown={editableHere ? (e) => startImgDrag(e, i) : undefined}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: l.w,
                  height: l.h,
                  marginLeft: -l.w / 2,
                  marginTop: -l.h / 2,
                  borderRadius: 20,
                  overflow: "hidden",
                  background: "#FFFFFF",
                  border: "1px solid rgba(62,62,66,0.08)",
                  boxShadow: "0 14px 34px rgba(62,62,66,0.16)",
                  zIndex: l.z,
                  opacity: editableHere ? 1 : 0,
                  pointerEvents: editableHere ? "auto" : "none",
                  transform: editableHere ? `translate(${l.dx}px, ${l.dy}px) rotate(${l.rot}deg)` : undefined,
                  cursor: editableHere ? "grab" : undefined,
                  transition: editableHere ? "none" : undefined,
                }}
              >
                <img
                  src={src}
                  alt={`${activeProj.name} preview`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                />
                {editableHere && (
                  <>
                    {/* Placeholder screenshots crop to mostly-blank regions at
                        these sizes and vanish against the page background —
                        this badge keeps each card identifiable regardless. */}
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "rgba(62,62,66,0.85)",
                        color: "#fff",
                        fontFamily: "var(--font-jackie-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="edit-frame" />
                    <div className="edit-label">{`img ${i + 1}`}</div>
                    <div className="edit-handle resize" onPointerDown={(e) => startImgResize(e, i)} />
                    <div
                      className="edit-handle rotate"
                      onPointerDown={(e) => startImgRotate(e, i, cardRefs.current[i]!)}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isEditingUnitwise && <ProjectEditPanel layout={layouts.unitwise} />}
    </div>
  );
}

/** Copy-JSON readout for the ?editproj=1 Unitwise cluster overlay. */
function ProjectEditPanel({ layout }: { layout: typeof CLUSTER_LAYOUT }) {
  const json = JSON.stringify(layout, null, 2);
  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        width: 230,
        zIndex: 999,
        background: "#FCF7F2",
        border: "1px solid #E7E6DE",
        borderRadius: 16,
        boxShadow: "0 8px 28px rgba(62,62,66,0.14)",
        padding: 12,
        fontFamily: "var(--font-jackie-mono)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#69645E", marginBottom: 8 }}>
        Unitwise cluster
      </div>
      {layout.map((l, i) => (
        <div key={i} style={{ fontSize: 10.5, color: "#69645E", marginBottom: 4 }}>
          img {i + 1}: dx:{l.dx} dy:{l.dy} rot:{l.rot}&deg; w:{l.w} h:{l.h}
        </div>
      ))}
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(json)}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "9px 12px",
          borderRadius: 999,
          border: "none",
          background: "#3E3E42",
          color: "#fff",
          fontFamily: "var(--font-jackie-mono)",
          fontSize: 11.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Copy JSON
      </button>
    </div>
  );
}

export function AboutMeLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(containerRef);
  const compact = size.w > 0 && size.w < 760;
  const narrow = size.w > 0 && size.w < 600;
  const [deskMode, setDeskMode] = useState<"chaos" | "clean">("chaos");

  // Every desk prop is an offset from the centre of the stage, which is exactly
  // where the name sits — CSS does the centring, so there is no measurement to
  // go stale. The offsets are tuned against the stage at its full 1200px width;
  // on anything narrower the whole ring contracts by the same factor instead of
  // flinging props off the edges.
  const k = size.w ? Math.min(1, size.w / 1200) : 1;
  const px = (off: number) => off * k;
  const py = (off: number) => off * k;

  // Touching a prop hands it the next number, so it lands above everything the
  // visitor has not touched since. A ref, not state — the count itself never
  // needs to re-render the whole desk, only the prop that just claimed it.
  const zTop = useRef(20);
  const bringToFront = () => ++zTop.current;

  // Live-arrange overlay: ?edit=1 turns every desk prop draggable/resizable/
  // rotatable regardless of deskMode, reporting values in the same pre-scale
  // units the JSX ternaries are written in. What you drag is the real DOM —
  // no separate mockup to fall out of sync with.
  const [editMode, setEditMode] = useState(false);
  const [editProjMode, setEditProjMode] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const on = params.get("edit") === "1";
    setEditMode(on);
    // Editing always targets one locked mode so flipping modes mid-edit never
    // clobbers in-progress drags via the target-sync effect. ?edit=1 edits
    // clean (default); ?edit=1&mode=chaos edits chaos — same tool, same
    // reported x/y/rot/w, just reads/writes whichever ternary branch is active.
    if (on) setDeskMode(params.get("mode") === "chaos" ? "chaos" : "clean");
    // ?editproj=1 — separate overlay for the Recently Made project cluster.
    setEditProjMode(params.get("editproj") === "1");
  }, []);
  const [editValues, setEditValues] = useState<Record<string, EditValue>>({});
  const handleEditChange = (id: string, val: EditValue) =>
    setEditValues((prev) => ({ ...prev, [id]: val }));

  return (
    <div
      ref={containerRef}
      className={`${mono.variable} ${script.variable}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: T.bg,
        color: T.ink,
        fontFamily: "var(--font-jackie-mono)",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* SVG turbulence for About paragraphs – Jackie's wobbly ink */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="j-turbulence">
            <feTurbulence baseFrequency="0.018" numOctaves={1} seed={2} result="t" />
            <feDisplacementMap in="SourceGraphic" in2="t" scale={1.6} />
          </filter>
        </defs>
      </svg>

      {/* Cursor Click Effect */}
      <MouseEffects color={T.accent} interactionMode="sniper" showLabel={false} />

      {/* ─── HERO CHAOS ─── Jackie flatlay: center stack + orbiting draggable props */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: compact ? undefined : "92vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: narrow ? "36px 18px 28px" : compact ? "40px 22px" : "56px 24px 40px",
          maxWidth: 1200,
          margin: "0 auto",
          overflow: "visible",
        }}
      >
        {/* chaos stage – absolute props orbit the center text */}
        <div
          style={{
            position: compact ? "relative" : "absolute",
            inset: compact ? undefined : 0,
            width: compact ? "100%" : undefined,
            height: compact ? "auto" : undefined,
            display: compact ? "flex" : undefined,
            flexWrap: compact ? "wrap" : undefined,
            justifyContent: compact ? "center" : undefined,
            alignItems: compact ? "center" : undefined,
            gap: compact ? 8 : undefined,
            pointerEvents: compact ? "auto" : "none",
            marginBottom: compact ? 18 : 0,
            // Its own stacking context. However high a prop's z-index climbs as
            // it is picked up, the whole desk stays one layer below the name —
            // the text is the only thing locked to the top.
            zIndex: 1,
          }}
        >
          {/* Sticky note */}
          <Draggable
            targetX={px(deskMode === "chaos" ? -453 : 247)}
            targetY={py(deskMode === "chaos" ? -304 : -71)}
            rotate={deskMode === "chaos" ? -7 : 1}
            z={1}
            onFront={bringToFront}
            editId={editMode ? "sticky-note" : undefined}
            baseWidth={148}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <div
              style={{
                width: compact ? 116 : 148,
                background: "#FFF6B5",
                border: "1px solid #EDE6A8",
                borderRadius: 10,
                padding: "10px 12px",
                boxShadow: "0 2px 10px rgba(166,166,166,0.18)",
                pointerEvents: "auto",
                transform: "rotate(-1deg)",
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9A8F2A", fontWeight: 700 }}>Now</div>
              <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.4, color: T.ink, fontWeight: 500 }}>YOLO 26n • RAG • Agents</div>
              <div style={{ marginTop: 4, fontSize: 11, color: T.muted }}>pruning for edge →</div>
            </div>
          </Draggable>

          {/* Vinyl player – Jackie music widget reinterpreted as coding lofi */}
          <Draggable
            targetX={px(deskMode === "chaos" ? 287 : 127)}
            targetY={py(deskMode === "chaos" ? -279 : -241)}
            rotate={deskMode === "chaos" ? 7 : 0}
            z={2}
            onFront={bringToFront}
            editId={editMode ? "vinyl" : undefined}
            baseWidth={190}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <div
              style={{
                width: compact ? 148 : 190,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 18,
                padding: 12,
                boxShadow: "0 2px 14px rgba(166,166,166,0.20)",
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 30% 30%, #2b2b2b 0 18%, #111 18% 26%, #2b2b2b 26% 34%, #0a0a0a 34% 100%)",
                    border: "3px solid #fff",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                    animation: "j-spin 8s linear infinite",
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.accent, border: "2px solid #fff" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    lofi • late night
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>1:10 / 3:32 • RAG & chill</div>
                  <div style={{ display: "flex", gap: 2, marginTop: 6, alignItems: "end" }}>
                    {[7, 12, 5, 14, 9, 6, 11].map((h, i) => (
                      <span key={i} style={{ width: 3, height: h, background: T.accent, borderRadius: 99, opacity: 0.85 - i * 0.06, display: "inline-block" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Draggable>

          {/* Polaroid – placeholder for Ayushman photo (AL monogram) */}
          <Draggable
            targetX={px(deskMode === "chaos" ? -572 : -560)}
            targetY={py(deskMode === "chaos" ? -186 : -37)}
            rotate={deskMode === "chaos" ? -12 : 0}
            z={3}
            onFront={bringToFront}
            editId={editMode ? "polaroid" : undefined}
            baseWidth={122}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <div
              style={{
                width: compact ? 132 : deskMode === "clean" ? 159 : 165,
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "10px 10px 18px",
                boxShadow: "0 4px 18px rgba(166,166,166,0.22)",
                pointerEvents: "auto",
              }}
            >
              {/* ayush.png arrives as a 1421×1107 scan with a polaroid border
                  already printed on it. Dropping it in whole would sit that
                  border inside this card's own white frame, and letterboxing it
                  would shrink him to a stamp. So the image is scaled until the
                  photo *inside* its border fills this frame exactly — 874px of
                  photo height stretched to 100% is 126.7% of the whole scan —
                  and then slid left so his face, not the composition's middle,
                  lands on the centre of the frame. */}
              <div
                style={{
                  aspectRatio: "1.05 / 1",
                  background: "linear-gradient(180deg, #F3EFE8 0%, #EDE6DA 100%)",
                  borderRadius: 8,
                  border: "1px solid #EDE8D8",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/letterbox/ayush.png"
                  alt="Ayushman Lohani"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  style={{
                    position: "absolute",
                    height: "127.2%",
                    width: "auto",
                    top: "-9.8%",
                    left: "-22.4%",
                    display: "block",
                    maxWidth: "none",
                  }}
                />
              </div>
              <div style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: T.muted, textAlign: "center" }}>Ayushman • 2026</div>
            </div>
          </Draggable>

          {/* Code snippet card */}
          <Draggable
            targetX={px(deskMode === "chaos" ? 339 : -354)}
            targetY={py(deskMode === "chaos" ? -2 : -55)}
            rotate={deskMode === "chaos" ? 8 : 0}
            z={4}
            onFront={bringToFront}
            editId={editMode ? "code-snippet" : undefined}
            baseWidth={182}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <div
              style={{
                width: compact ? 150 : 182,
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 4px 18px rgba(166,166,166,0.18)",
                pointerEvents: "auto",
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "#FF5F56" }} />
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "#FFBD2E" }} />
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "#27C93F" }} />
              </div>
              <div style={{ color: T.ink }}>
                <span style={{ color: T.muted }}>// RAG retrieve</span>
                <br />
                <span style={{ color: T.accent, fontWeight: 700 }}>chunks</span> = embed(<span style={{ color: T.ink }}>query</span>).topk(<b>15</b>)
              </div>
              <div style={{ marginTop: 8, display: "inline-flex", background: T.accentSoft, color: T.accent, fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 99 }}>
                ChromaDB • MiniLM
              </div>
            </div>
          </Draggable>

          {/* Desk clutter — real PNGs from the Pictures folder, free to drag around */}
          <Draggable
            targetX={px(deskMode === "chaos" ? 341 : -150)}
            targetY={py(deskMode === "chaos" ? -250 : -147)}
            rotate={deskMode === "chaos" ? -20 : 0}
            z={7}
            onFront={bringToFront}
            editId={editMode ? "cat-headphones" : undefined}
            baseWidth={242}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/cat-headphones.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 84 : 242, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={px(deskMode === "chaos" ? -383 : 441)}
            targetY={py(deskMode === "chaos" ? 59 : -80)}
            rotate={deskMode === "chaos" ? 14 : 0}
            z={5}
            onFront={bringToFront}
            editId={editMode ? "coke-can" : undefined}
            baseWidth={156}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/coke-can.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 76 : deskMode === "clean" ? 135 : 153, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={px(deskMode === "chaos" ? -579 : 75)}
            targetY={py(deskMode === "chaos" ? -50 : -89)}
            rotate={deskMode === "chaos" ? 9 : 0}
            z={6}
            onFront={bringToFront}
            editId={editMode ? "kitten" : undefined}
            baseWidth={145}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/kitten.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 84 : deskMode === "clean" ? 145 : 207, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={px(deskMode === "chaos" ? 231 : 412)}
            targetY={py(deskMode === "chaos" ? 67 : -280)}
            rotate={deskMode === "chaos" ? 5 : 0}
            z={8}
            onFront={bringToFront}
            editId={editMode ? "skull" : undefined}
            baseWidth={103}
            scaleFactor={k}
            onEditChange={handleEditChange}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/skull.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 60 : deskMode === "clean" ? 119 : 117, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>
        </div>

        {/* Center stack – Jackie: script name + mono product design + tagline.
            Each piece below is wrapped in EditableGroup so ?edit=1 can drag it
            independently; base offsets are chaos-mode-identical unless a
            clean-mode override was hand-picked via that overlay. */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            textAlign: "center",
            maxWidth: 760,
            width: "100%",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <Reveal delay={0.05}>
            <EditableGroup
              id="btech-line"
              editMode={editMode}
              baseX={deskMode === "clean" ? px(28) : px(0)}
              baseY={deskMode === "clean" ? py(-153) : py(-65)}
              k={k}
              onEditChange={handleEditChange}
            >
              <div style={{ fontFamily: "var(--font-jackie-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                University of Lucknow • B.Tech CSE (AI) 2023—2027
              </div>
            </EditableGroup>
          </Reveal>

          <div style={{ marginTop: narrow ? 12 : 18 }}>
            {/* Jackie 85px script – we use Caveat at 82-96px to echo hand-written */}
            <EditableGroup id="name" editMode={editMode} baseX={deskMode === "clean" ? px(-270) : px(0)} baseY={deskMode === "clean" ? py(-157) : py(-32)} k={k} onEditChange={handleEditChange}>
              <div
                className="hero-name-title"
                style={{
                  fontFamily: "var(--font-jackie-script)",
                  fontSize: narrow ? "56px" : compact ? "66px" : "92px",
                  lineHeight: 0.9,
                  fontWeight: 700,
                  color: T.ink,
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  pointerEvents: "none",
                }}
              >
                <StaggerLetters text="Ayushman Lohani" delayStep={0.028} />
              </div>
            </EditableGroup>
            <Reveal delay={0.28}>
              <EditableGroup id="quote" editMode={editMode} baseX={deskMode === "clean" ? px(-227) : px(36)} baseY={deskMode === "clean" ? py(-158) : py(-44)} k={k} onEditChange={handleEditChange}>
                <div
                  style={{
                    marginTop: narrow ? 10 : 14,
                    fontFamily: "var(--font-jackie-mono)",
                    fontSize: narrow ? 13 : 15,
                    fontWeight: 500,
                    fontStyle: "italic",
                    letterSpacing: "-0.01em",
                    color: T.taupe,
                    display: "inline-flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px 8px",
                  }}
                >
                  <span>“Interesting people are interested.”</span>
                  <span
                    style={{
                      fontStyle: "normal",
                      fontSize: 11,
                      color: T.muted,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    — Anthony Bourdain
                  </span>
                </div>
              </EditableGroup>
            </Reveal>
          </div>

          {/* Chaos / Clean Mode Toggle – Sketch Buttons */}
          <Reveal delay={0.38}>
            <EditableGroup id="buttons" editMode={editMode} baseX={0} baseY={0} k={k} onEditChange={handleEditChange}>
            <div
              style={{
                marginTop: narrow ? 26 : 38,
                display: "inline-flex",
                gap: 12,
                alignItems: "center",
                pointerEvents: "auto",
              }}
            >
              {/* Chaos Mode Button (Coffee Cup) */}
              <div className="mode-btn-wrapper">
                <button
                  type="button"
                  onClick={() => !editMode && setDeskMode("chaos")}
                  className={`mode-btn ${deskMode === "chaos" ? "active" : ""}`}
                  aria-label="Chaos mode"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: deskMode === "chaos" ? "#EAE6DE" : "#FFFFFF",
                    border: `1.5px solid ${deskMode === "chaos" ? "#D0CCC3" : T.border}`,
                    boxShadow: deskMode === "chaos" ? "inset 0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)" : "0 3px 12px rgba(62,62,66,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: deskMode === "chaos" ? T.ink : T.taupe,
                    cursor: "pointer",
                    transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1), background 0.2s, border-color 0.2s, box-shadow 0.2s",
                    outline: "none",
                  }}
                >
                  {/* Sketch Coffee Cup */}
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 5.5h12l-1-2.5H7L6 5.5z" />
                    <path d="M5 5.5h14" />
                    <path d="M6.5 5.5L8 20a1.2 1.2 0 0 0 1.2 1.2h5.6a1.2 1.2 0 0 0 1.2-1.2l1.5-14.5" />
                    <path d="M6.8 10h10.4" />
                    <path d="M7.3 15h9.4" />
                    <ellipse cx="12" cy="12.5" rx="1.8" ry="1.2" transform="rotate(-25 12 12.5)" />
                  </svg>
                </button>
                <div className="mode-tooltip mode-tooltip-left">chaos mode</div>
              </div>

              {/* Clean Mode Button (Broom) */}
              <div className="mode-btn-wrapper">
                <button
                  type="button"
                  onClick={() => !editMode && setDeskMode("clean")}
                  className={`mode-btn ${deskMode === "clean" ? "active" : ""}`}
                  aria-label="Clean mode"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: deskMode === "clean" ? "#EAE6DE" : "#FFFFFF",
                    border: `1.5px solid ${deskMode === "clean" ? "#D0CCC3" : T.border}`,
                    boxShadow: deskMode === "clean" ? "inset 0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)" : "0 3px 12px rgba(62,62,66,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: deskMode === "clean" ? T.ink : T.taupe,
                    cursor: "pointer",
                    transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1), background 0.2s, border-color 0.2s, box-shadow 0.2s",
                    outline: "none",
                  }}
                >
                  {/* Sketch Broom */}
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.5v10" />
                    <rect x="10.5" y="12.5" width="3" height="2" rx="0.5" />
                    <path d="M6.5 19.5l2.2-5h6.6l2.2 5a1 1 0 0 1-.9 1.5H7.4a1 1 0 0 1-.9-1.5z" />
                    <path d="M9.5 21v-3.5" />
                    <path d="M12 21v-3.5" />
                    <path d="M14.5 21v-3.5" />
                  </svg>
                </button>
                <div className="mode-tooltip mode-tooltip-right">clean mode</div>
              </div>
            </div>
            </EditableGroup>
          </Reveal>

          <Reveal delay={0.58}>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "center",
                gap: 8,
                fontSize: 11,
                color: T.muted,
              }}
            >
              <span style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {deskMode === "chaos" ? "Drag the desk • grab & toss" : "Clean mode • locked in place"}
              </span>
            </div>
          </Reveal>
        </div>

        <style>{`
          @keyframes j-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
          .edit-item{cursor:grab;}
          .edit-item .edit-frame{position:absolute;inset:-6px;border:1.5px dashed transparent;border-radius:8px;pointer-events:none;transition:border-color .12s;}
          .edit-item:hover .edit-frame{border-color:rgba(247,98,64,0.55);}
          .edit-item .edit-label{position:absolute;left:50%;bottom:-22px;transform:translateX(-50%);font-size:9.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#F76240;white-space:nowrap;opacity:0;transition:opacity .12s;pointer-events:none;}
          .edit-item:hover .edit-label{opacity:1;}
          .edit-handle{position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #F76240;box-shadow:0 2px 6px rgba(0,0,0,0.15);opacity:0;transition:opacity .12s;}
          .edit-item:hover .edit-handle{opacity:1;}
          .edit-handle.resize{right:-14px;bottom:-14px;cursor:nwse-resize;}
          .edit-handle.rotate{left:50%;top:-34px;transform:translateX(-50%);cursor:grab;background:#3E3E42;border-color:#3E3E42;}
          .mode-btn-wrapper { position: relative; display: inline-flex; }
          .mode-btn:hover { transform: rotate(7deg) scale(1.04); }
          .mode-btn:active { transform: rotate(4deg) scale(0.97); }
          .mode-tooltip {
            position: absolute;
            top: 50%;
            background: #000000;
            color: #FFFFFF;
            font-family: var(--font-jackie-mono);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.04em;
            padding: 5px 10px;
            border-radius: 999px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1);
            box-shadow: 0 4px 14px rgba(0,0,0,0.18);
            z-index: 30;
          }
          .mode-tooltip-left {
            right: calc(100% + 10px);
            transform: translateY(-50%) translateX(6px);
          }
          .mode-btn-wrapper:hover .mode-tooltip-left {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
          .mode-tooltip-right {
            left: calc(100% + 10px);
            transform: translateY(-50%) translateX(-6px);
          }
          .mode-btn-wrapper:hover .mode-tooltip-right {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
          .exp-card:hover {
            border-color: #D0CCC3;
            box-shadow: 0 8px 24px rgba(62,62,66,0.12);
          }
          .exp-card:hover .exp-stamp {
            transform: rotate(2deg) scale(1.06);
          }
          .edu-item:hover {
            border-color: #D0CCC3;
            box-shadow: 0 4px 16px rgba(62,62,66,0.08);
          }
        `}</style>
      </section>



      {/* ─── LITTLE THINGS TEASER ─── Jackie "Currently cooking" centered poem */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "min(1160px, 94%)",
          margin: "0 auto",
          padding: narrow ? "28px 14px" : "48px 24px",
          textAlign: "center",
        }}
      >
        <Reveal>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted }}>Currently</div>
        </Reveal>
        <Reveal delay={0.08}>
          <div
            style={{
              marginTop: 14,
              fontFamily: "var(--font-jackie-script)",
              fontSize: narrow ? "46px" : "62px",
              lineHeight: 0.9,
              color: T.ink,
            }}
          >
            Research Assistant
          </div>
        </Reveal>
        <Reveal delay={0.14}>
          <p
            style={{
              marginTop: 14,
              maxWidth: 540,
              marginInline: "auto",
              fontSize: 13.5,
              lineHeight: 1.7,
              color: T.taupe,
            }}
          >
            Researching lightweight YOLO architectures at the University of Lucknow, experimenting with custom attention heads and pruned feature backbones for real-time edge vision.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div style={{ marginTop: 16, display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <span
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                background: T.accent,
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              YOLO & Edge AI ✦
            </span>
            <span style={{ color: T.muted }}>• University of Lucknow</span>
          </div>
        </Reveal>
      </section>

      {/* ─── OTHER EXPERIENCE ─── Tactile Dossier Cards for NIELIT & IBI */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "min(1160px, 94%)",
          margin: "0 auto",
          padding: narrow ? "12px 14px 24px" : "16px 24px 32px",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: `1px solid ${T.line}`,
              paddingBottom: 14,
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
              Other Experience <span style={{ color: T.accent }}>✦</span>
            </h2>
            <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted }}>click to expand</span>
          </div>
        </Reveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: narrow ? "1fr" : "1fr 1fr",
            gap: 16,
          }}
        >
          {INTERNSHIPS.map((exp, i) => (
            <Reveal key={exp.id} delay={i * 0.08}>
              <ExperienceDossierCard exp={exp} narrow={narrow} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── EDUCATION ─── 2-column side-by-side sleek boxes */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "min(1160px, 94%)",
          margin: "0 auto",
          padding: narrow ? "10px 14px 20px" : "12px 24px 24px",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: `1px solid ${T.line}`,
              paddingBottom: 14,
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
              Education <span style={{ color: T.muted }}>⌥</span>
            </h2>
            <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted }}>
              hover logo for preview
            </span>
          </div>
        </Reveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: size.w > 0 && size.w < 920 ? "1fr" : "1fr 1fr",
            gap: 14,
            width: "100%",
          }}
        >
          {EDUCATION_ITEMS.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08}>
              <EducationItem item={item} narrow={narrow} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── RECENTLY MADE ─── Jackie Hu "Recently Made ▶" Project Showcase */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "min(1160px, 94%)",
          margin: "0 auto",
          padding: narrow ? "14px 14px 28px" : "18px 24px 36px",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: `1px solid ${T.line}`,
              paddingBottom: 14,
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              Recently Made <span style={{ fontSize: 13, color: T.ink }}>▶</span>
            </h2>
            <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted }}>
              hover to preview • click to open
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <RecentlyMadeProjects size={size} editProjMode={editProjMode} />
        </Reveal>
      </section>


      {/* ─── ABOUT ─── Jackie turbulence paragraphs, mono 18px */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "min(1160px, 94%)",
          margin: "0 auto",
          padding: narrow ? "20px 14px 28px" : "32px 24px 40px",
          borderTop: `1px solid ${T.line}`,
          marginTop: 8,
        }}
      >
        <Reveal>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: `1px solid ${T.line}`,
              paddingBottom: 14,
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
              About <span style={{ color: T.muted }}>⌘</span>
            </h2>
            <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted }}>
              bio & philosophy
            </span>
          </div>
        </Reveal>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: narrow ? 14 : 18,
            width: "100%",
          }}
        >
          {[
            "Hey, I’m Ayushman. Final-year CSE (AI) at the University of Lucknow. I like building things that people can actually use, click, break, and complain about.",
            "I work across AI/ML and web development, mostly around RAG, computer vision, smaller AI models, and building useful things around them. I like taking ideas out of notebooks and turning them into something you can actually try.",
            "I’ve built things like Unitwise, an AI study tool, and RBI Sentinel, a project around sentiment and volatility forecasting. I also spend a questionable amount of time with different AI harnesses like Claude Code, Codex, and OpenCode.",
            "If it’s useful and a little stubborn, I’ll probably build it. And if it works well enough, I’ve probably shipped a v0.",
            "Other than that, I like taking photos and sometimes editing videos. If I’m not doing any of this, I’m probably playing guitar or flute, or cooking some random dish I saw an aunty make on Pinterest or Instagram."
          ].map((p, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <p
                style={{
                  margin: 0,
                  fontSize: narrow ? 14 : 15.5,
                  lineHeight: 1.8,
                  color: T.taupe,
                  filter: "url(#j-turbulence)",
                  width: "100%",
                }}
              >
                {p}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.28}>
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px dashed ${T.line}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              fontSize: 12,
              color: T.muted,
            }}
          >
            <span style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: T.ink }}>Find me</span>
            <span style={{ width: 1, height: 14, background: T.line }} />
            <a href="https://github.com/ayushmanlohani" target="_blank" rel="noopener noreferrer" style={{ color: T.ink, textDecoration: "underline", textUnderlineOffset: 3 }}>
              GitHub
            </a>
            <a href="https://leetcode.com/u/ayushmanlohani/" target="_blank" rel="noopener noreferrer" style={{ color: T.ink, textDecoration: "underline", textUnderlineOffset: 3 }}>
              LeetCode
            </a>
            <a href="https://linkedin.com/in/ayushmanlohani" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>
              LinkedIn
            </a>
            <a href="mailto:aayushmanlohani@gmail.com" style={{ color: T.ink, textDecoration: "underline", textUnderlineOffset: 3 }}>
              Email
            </a>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── thin line, mono */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "min(1160px, 94%)",
          margin: "0 auto",
          padding: narrow ? "16px 14px 24px" : "18px 24px 28px",
          borderTop: `1px solid ${T.line}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 11,
          color: T.muted,
          letterSpacing: "0.04em",
        }}
      >
        <span>Designed & built by Ayushman Lohani — inspired by jackiehu.design</span>
        <span style={{ color: T.ink, fontWeight: 600 }}>2026 • Lucknow, IN</span>
      </footer>

      {editMode && <EditPanel values={editValues} />}
    </div>
  );
}

/** Live readout for the ?edit=1 overlay — drag/resize/rotate values from the
 *  real Draggable instances, ready to paste into the clean-mode ternaries.
 *  Starts collapsed to a small pill (it was sitting on top of the desk props
 *  otherwise) and its own header is draggable so it can be parked anywhere. */
function EditPanel({ values }: { values: Record<string, EditValue> }) {
  const ids = ["btech-line", "name", "quote", "buttons", "sticky-note", "vinyl", "polaroid", "code-snippet", "cat-headphones", "coke-can", "kitten", "skull"];
  const json = JSON.stringify(
    ids.filter((id) => values[id]).map((id) => ({ id, ...values[id] })),
    null,
    2
  );

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null); // null = default corner
  const dragOff = useRef({ x: 0, y: 0 });

  function startDrag(e: React.PointerEvent) {
    const el = (e.currentTarget as HTMLElement).closest("[data-panel-root]") as HTMLElement;
    const rect = el.getBoundingClientRect();
    dragOff.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    function move(ev: PointerEvent) {
      setPos({ x: ev.clientX - dragOff.current.x, y: ev.clientY - dragOff.current.y });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const posStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 16, top: 72, bottom: "auto", left: "auto" };

  if (!open) {
    return (
      <button
        type="button"
        data-panel-root
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          ...posStyle,
          zIndex: 999,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid #E7E6DE",
          background: "#3E3E42",
          color: "#fff",
          fontFamily: "var(--font-jackie-mono)",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(62,62,66,0.2)",
        }}
      >
        Values &middot; {Object.keys(values).length}/{ids.length}
      </button>
    );
  }

  return (
    <div
      data-panel-root
      style={{
        position: "fixed",
        ...posStyle,
        width: 240,
        maxHeight: "70vh",
        zIndex: 999,
        background: "#FCF7F2",
        border: "1px solid #E7E6DE",
        borderRadius: 16,
        boxShadow: "0 8px 28px rgba(62,62,66,0.14)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--font-jackie-mono)",
      }}
    >
      <div
        onPointerDown={startDrag}
        style={{
          padding: "10px 8px 10px 14px",
          borderBottom: "1px solid #DEDEDE",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#69645E",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <span>Live edit &middot; drag me</span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "1px solid #E7E6DE",
            background: "#fff",
            color: "#69645E",
            fontSize: 13,
            lineHeight: 1,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          &minus;
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8, fontSize: 10.5, color: "#69645E" }}>
        {ids.map((id) => {
          const v = values[id];
          return (
            <div key={id} style={{ padding: "8px 8px", borderBottom: "1px solid #F0EEE8" }}>
              <div style={{ fontWeight: 700, color: "#3E3E42", marginBottom: 3 }}>{id}</div>
              {v ? (
                <div>x:{v.x} y:{v.y} rot:{v.rot}&deg; w:{v.w}</div>
              ) : (
                <div>touch it to register</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 10, borderTop: "1px solid #DEDEDE" }}>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(json)}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 999,
            border: "none",
            background: "#3E3E42",
            color: "#fff",
            fontFamily: "var(--font-jackie-mono)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
}
