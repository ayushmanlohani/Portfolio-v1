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
    const upd = () => setS({ w: el.clientWidth, h: el.clientHeight });
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
function Draggable({
  children,
  targetX,
  targetY,
  rotate,
  z = 1,
  compact,
  disabled = false,
}: {
  children: React.ReactNode;
  targetX: number;
  targetY: number;
  rotate: number;
  z?: number;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [pos, setPos] = useState({ x: targetX, y: targetY });
  const [drag, setDrag] = useState(false);
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

  if (compact) {
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

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        if (disabled) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        off.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setDrag(true);
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag || disabled) return;
        const parent = (ref.current?.parentElement as HTMLElement)?.getBoundingClientRect();
        if (!parent) return;
        // parent is chaos container (position relative)
        const nx = e.clientX - parent.left - off.current.x;
        const ny = e.clientY - parent.top - off.current.y;
        setPos({ x: nx, y: ny });
      }}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transform: `rotate(${rotate}deg)`,
        zIndex: drag ? 20 : z,
        cursor: disabled ? "default" : drag ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        pointerEvents: "auto",
        willChange: "transform",
        filter: drag ? "drop-shadow(0 8px 18px rgba(62,62,66,0.18))" : "none",
        transition: drag ? "none" : "left 0.65s cubic-bezier(0.16,1,0.3,1), top 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1), filter 0.3s",
      }}
    >
      {children}
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
      "/letterbox/projects/unitwise-a.png",
      "/letterbox/projects/unitwise-b.png",
      "/letterbox/projects/unitwise-c.png",
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
 *  top of the screen — see the request this was built from. */
const CLUSTER_LAYOUT = [
  { dx: -85, dy: 18, rot: -7, z: 1, w: 175, h: 122, fromX: -140, fromY: 0 },
  { dx: 25, dy: -22, rot: 2, z: 3, w: 210, h: 146, fromX: 0, fromY: -75 },
  { dx: 100, dy: 30, rot: 8, z: 2, w: 175, h: 122, fromX: 140, fromY: 0 },
];

function RecentlyMadeProjects({ size }: { size: { w: number; h: number } }) {
  const [activeId, setActiveId] = useState("unitwise");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeProj = RECENT_PROJECTS.find((p) => p.id === activeId) || RECENT_PROJECTS[0];
  const isStacked = size.w > 0 && size.w < 880;
  const isNarrow = size.w > 0 && size.w < 600;
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Resting state (no hover) is empty — the cluster only assembles once a
  // project tile is hovered, each image sliding in from its own side.
  useEffect(() => {
    const els = cardRefs.current;
    if (els.some((el) => !el)) return;
    gsap.killTweensOf(els);
    els.forEach((el, i) => {
      if (!el) return;
      const l = CLUSTER_LAYOUT[i];
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
  }, [hoveredId]);

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
                setHoveredId(proj.id);
                setActiveId(proj.id);
              }}
              onMouseLeave={() => setHoveredId(null)}
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
        <div style={{ position: "relative", width: 320, height: 220 }}>
          {activeProj.images.map((src, i) => {
            const l = CLUSTER_LAYOUT[i];
            return (
              <div
                key={src}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: l.w,
                  height: l.h,
                  marginLeft: -l.w / 2,
                  marginTop: -l.h / 2,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#FFFFFF",
                  border: "1px solid rgba(62,62,66,0.08)",
                  boxShadow: "0 14px 34px rgba(62,62,66,0.16)",
                  zIndex: l.z,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                <img
                  src={src}
                  alt={`${activeProj.name} preview`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AboutMeLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(containerRef);
  const compact = size.w > 0 && size.w < 760;
  const narrow = size.w > 0 && size.w < 600;
  const [deskMode, setDeskMode] = useState<"chaos" | "clean">("chaos");



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
          }}
        >
          {/* Sticky note */}
          <Draggable
            targetX={deskMode === "chaos" ? 58 : 68}
            targetY={deskMode === "chaos" ? 92 : 140}
            rotate={deskMode === "chaos" ? -7 : 0}
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
            targetX={deskMode === "chaos" ? (size.w ? size.w - 248 : 820) : (size.w ? size.w - 240 : 830)}
            targetY={deskMode === "chaos" ? 78 : 130}
            rotate={deskMode === "chaos" ? 3 : 0}
            z={2}
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
            targetX={deskMode === "chaos" ? 72 : 72}
            targetY={deskMode === "chaos" ? 320 : 290}
            rotate={deskMode === "chaos" ? -12 : 0}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <div
              style={{
                width: compact ? 132 : 168,
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "10px 10px 18px",
                boxShadow: "0 4px 18px rgba(166,166,166,0.22)",
                pointerEvents: "auto",
              }}
            >
              <div
                style={{
                  aspectRatio: "1.05 / 1",
                  background: "linear-gradient(180deg, #F3EFE8 0%, #EDE6DA 100%)",
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid #EDE8D8",
                }}
              >
                <span style={{ fontFamily: "var(--font-jackie-script)", fontSize: compact ? 38 : 44, color: "#C9BFB0" }}>AL</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: T.muted, textAlign: "center" }}>Ayushman • 2026</div>
            </div>
          </Draggable>

          {/* Code snippet card */}
          <Draggable
            targetX={deskMode === "chaos" ? (size.w ? size.w - 220 : 860) : (size.w ? size.w - 230 : 850)}
            targetY={deskMode === "chaos" ? 320 : 290}
            rotate={deskMode === "chaos" ? 8 : 0}
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
          <Draggable targetX={260} targetY={40} rotate={-10} z={3} compact={compact} disabled={deskMode === "clean"}>
            <img
              src="/letterbox/pngs/cat-headphones.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 84 : 110, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={300}
            targetY={480}
            rotate={14}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/coke-can.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 76 : 100, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={size.w ? size.w - 420 : 720}
            targetY={30}
            rotate={9}
            z={2}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/kitten.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 84 : 110, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={size.w ? size.w - 380 : 760}
            targetY={470}
            rotate={-8}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/pow.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 68 : 90, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>

          <Draggable
            targetX={size.w ? size.w / 2 - 40 : 500}
            targetY={20}
            rotate={5}
            compact={compact}
            disabled={deskMode === "clean"}
          >
            <img
              src="/letterbox/pngs/skull.png"
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: compact ? 60 : 80, height: "auto", display: "block", pointerEvents: "auto", filter: "drop-shadow(0 6px 14px rgba(62,62,66,0.22))" }}
            />
          </Draggable>
        </div>

        {/* Center stack – Jackie: script name + mono product design + tagline */}
        <div style={{ position: "relative", zIndex: 5, textAlign: "center", maxWidth: 760, width: "100%", pointerEvents: "none", userSelect: "none" }}>
          <Reveal delay={0.05}>
            <div style={{ fontFamily: "var(--font-jackie-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, transform: "translateY(-55px)" }}>
              University of Lucknow • B.Tech CSE (AI) 2023—2027
            </div>
          </Reveal>

          <div style={{ marginTop: narrow ? 12 : 18 }}>
            {/* Jackie 85px script – we use Caveat at 82-96px to echo hand-written */}
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
            <Reveal delay={0.28}>
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
            </Reveal>
          </div>

          {/* Chaos / Clean Mode Toggle – Sketch Buttons */}
          <Reveal delay={0.38}>
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
                  onClick={() => setDeskMode("chaos")}
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
                  onClick={() => setDeskMode("clean")}
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
          <RecentlyMadeProjects size={size} />
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
            "Hey — I'm Ayushman. Final-year CSE (AI) at University of Lucknow. I like things that people can actually click, break, and complain about.",
            "Research side: lightweight YOLO, small models that run on not-small egos. I spend a lot of time pruning, distilling, and pretending eval is fun. RAG is the connective tissue — retrieval isn't a feature, it's the product.",
            "Web side: React, Next.js, TypeScript. I rebuild marketing pages from scratch when I'm bored. Unitwise started because I pirated textbooks for mids and needed a bot that cites the page, not the hallucination. RBI Sentinel started because fiscal CSVs shouldn't need a decoder ring.",
            "Outside the editor: Linux, Docker, Figma, VS Code, and a growing collection of half-finished side quests. If it's useful and a little stubborn, I probably shipped a v0.",
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
            <a href="mailto:ayushmanlohani@example.com" style={{ color: T.ink, textDecoration: "underline", textUnderlineOffset: 3 }}>
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
    </div>
  );
}
