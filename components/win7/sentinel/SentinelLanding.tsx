"use client";

import { coarsePointer } from "@/components/win7/coarsePointer";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { mono, sans, serif } from "@/components/win7/clouds/fonts";
import { TECH_LOGOS } from "@/components/win7/folders/techLogos";

import { AuroraBackdrop } from "./AuroraBackdrop";
import {
  ArrowUpRightIcon,
  CorpusIcon,
  ForestIcon,
  GithubIcon,
  JoinIcon,
  ScoreIcon,
  SentinelMark,
  ShockIcon,
  WindowIcon,
} from "./icons";

/**
 * The RBI Sentinel project page, the sibling of UnitwiseLanding.tsx: same
 * window (Chrome), same typefaces, opposite world. Unitwise is cream and
 * warm; this is the palette of the real Streamlit dashboard Ayushman built —
 * near-black navy, one mint accent, numbers in green mono.
 *
 * The idea holding it together: the serif of a central-bank bulletin set on
 * the black of a trading terminal. Source Serif carries the prose, JetBrains
 * Mono carries every measured value, and nothing in between is decorative.
 *
 * Two things on the page are interactive. The dashboard panel is the real
 * output card from the live app, rebuilt and replayable. The dial under
 * "The finding" is pure arithmetic — it folds a signed score onto its own
 * absolute value, which is the entire result of the project made touchable.
 * No model output is invented anywhere; the run's numbers are the ones the
 * deployed dashboard produced.
 */

/* ─── palette ──────────────────────────────────────────────────────────── */

const C = {
  bg: "#0A0E13",
  panel: "#131A22",
  panelSoft: "#0F151C",
  line: "#212C38",
  lineSoft: "#1A232D",
  text: "#E4ECF3",
  dim: "#9FB0C2",
  faint: "#7E8DA0",
  mint: "#00E0A4",
  green: "#3CE07C",
  amber: "#E0A93C",
  red: "#E5484D",
};

/* ─── the run ──────────────────────────────────────────────────────────── */

/** One real run, captured from the deployed dashboard. Nothing here is made up. */
const RUN = {
  shock: 13.5,
  verdict: "Low risk",
  sentiment: 0.316,
  label: "Positive",
  vix: "11.20",
  nifty: "−0.47%",
  vol: "0.0047",
};

/** The observed sentiment range across all 140 documents. */
/* ─── the backdrop ─────────────────────────────────────────────────────── */

/**
 * A volatility trace behind the header. Built from a fixed sum of sines with
 * two authored spikes, so it is identical on the server and the client — a
 * random walk would hydrate as a mismatch, and this needs to look like an
 * index, not like noise.
 */
const TRACE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 240; i++) {
    const x = (i / 240) * 1200;
    const base =
      Math.sin(i * 0.11) * 9 +
      Math.sin(i * 0.29 + 1.4) * 5 +
      Math.sin(i * 0.63 + 0.3) * 2.4 +
      Math.sin(i * 1.7) * 1.1;
    const spike = 46 * Math.exp(-((i - 96) ** 2) / 26) + 30 * Math.exp(-((i - 178) ** 2) / 14);
    pts.push(`${x.toFixed(1)} ${(150 - base - spike).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
})();

/* ─── small parts ──────────────────────────────────────────────────────── */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Runs a value from 0 to `to` once, on a cubic ease-out. Both the readouts
 * and the gauge needle ride this, so the number and the dial land together
 * rather than on two separate timings.
 */
function useEased(to: number, duration = 1100) {
  const [n, setN] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return n;
}

function CountUp({
  to,
  decimals = 1,
  signed = false,
}: {
  to: number;
  decimals?: number;
  signed?: boolean;
}) {
  const n = useEased(to);
  const s = n.toFixed(decimals);
  return <>{signed && n >= 0 ? `+${s}` : s}</>;
}

/* ─── the gauge ────────────────────────────────────────────────────────── */

const G = { cx: 150, cy: 132, r: 104, w: 17 };

function polar(p: number, r: number) {
  const a = ((180 - p * 1.8) * Math.PI) / 180;
  return [G.cx + r * Math.cos(a), G.cy - r * Math.sin(a)] as const;
}

function arc(p0: number, p1: number, r = G.r) {
  const [x0, y0] = polar(p0, r);
  const [x1, y1] = polar(p1, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const BANDS = [
  { from: 0, to: 40, color: C.green },
  { from: 40, to: 60, color: C.amber },
  { from: 60, to: 100, color: C.red },
];

function Gauge({ value }: { value: number }) {
  // The needle is drawn from its own polar coordinates rather than rotated
  // with a CSS transform: `transform-origin` on an SVG <g> resolves against
  // the element's own bounding box, not the viewBox, so the rotated needle
  // detached from its pivot. Trigonometry has no such ambiguity.
  const v = useEased(value, 1200);
  const [tipX, tipY] = polar(v, G.r - 26);
  const [tailX, tailY] = polar(v, -13);

  return (
    <svg viewBox="0 0 300 182" className="w-full" role="img" aria-label={`Shock probability ${value}%`}>
      {BANDS.map((b) => (
        <path
          key={b.from}
          d={arc(b.from, b.to)}
          stroke={b.color}
          strokeWidth={G.w}
          fill="none"
          opacity={0.18}
        />
      ))}

      {/* The live reading, drawn over the muted bands. */}
      <path
        d={arc(0, Math.max(v, 0.6))}
        stroke={C.green}
        strokeWidth={G.w}
        strokeLinecap="round"
        fill="none"
        style={{ filter: `drop-shadow(0 0 10px ${C.green}55)` }}
      />

      {[0, 20, 40, 60, 80, 100].map((t) => {
        const [x1, y1] = polar(t, G.r + G.w / 2 + 3);
        const [x2, y2] = polar(t, G.r + G.w / 2 + 9);
        const [lx, ly] = polar(t, G.r + G.w / 2 + 20);
        return (
          <g key={t}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.line} strokeWidth={1.5} />
            <text
              x={lx}
              y={ly + 4}
              textAnchor="middle"
              fill={C.faint}
              fontSize={11}
              style={{ fontFamily: "var(--font-uw-mono), monospace" }}
            >
              {t}
            </text>
          </g>
        );
      })}

      <line
        x1={tailX}
        y1={tailY}
        x2={tipX}
        y2={tipY}
        stroke={C.text}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={G.cx} cy={G.cy} r={6} fill={C.bg} stroke={C.text} strokeWidth={2} />
    </svg>
  );
}

/* ─── the dashboard panel ──────────────────────────────────────────────── */

function Stat({
  label,
  children,
  foot,
}: {
  label: string;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] bg-[#131A22] p-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7E8DA0] uppercase">{label}</p>
      <div className="mt-3">{children}</div>
      {foot ? <div className="mt-2.5">{foot}</div> : null}
    </div>
  );
}

function DashboardPanel() {
  // Bumping this key remounts the readouts, which replays every entrance.
  const [run, setRun] = useState(0);

  // The same cursor-tilt + idle float UnitwiseLanding's AppPreview card
  // uses — this is the sibling page's one image-card, and it was the only
  // thing on either page not carrying that effect.
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -9, y: px * 14 });
  }

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      style={{ perspective: 1200 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={coarsePointer() ? undefined : onMove}
        onMouseLeave={coarsePointer() ? undefined : () => setTilt({ x: 0, y: 0 })}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="overflow-hidden rounded-[18px] border border-[#212C38] bg-[#0F151C] shadow-[0_34px_70px_-30px_rgba(0,0,0,0.9)]"
      >
      <div className="flex items-center justify-between border-b border-[#1A232D] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SentinelMark className="h-[18px] w-[18px] text-[#00E0A4]" />
          <span className="text-[12.5px] font-semibold text-[#E4ECF3]">Sentinel · analysis</span>
        </div>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="rounded-[7px] border border-[#00E0A4]/35 px-2.5 py-1 font-[family-name:var(--font-uw-mono)] text-[10.5px] tracking-[0.08em] text-[#00E0A4] uppercase transition-colors duration-200 hover:border-[#00E0A4] hover:bg-[#00E0A4]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0A4]/60"
        >
          Replay
        </button>
      </div>

      <div key={run} className="space-y-2.5 p-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat
            label="Shock probability"
            foot={
              <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#3CE07C]/40 px-2 py-1 font-[family-name:var(--font-uw-mono)] text-[10px] tracking-[0.1em] text-[#3CE07C] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3CE07C]" />
                {RUN.verdict}
              </span>
            }
          >
            <p className="font-[family-name:var(--font-uw-mono)] text-[34px] leading-none font-medium text-[#3CE07C] tabular-nums">
              <CountUp to={RUN.shock} decimals={1} />%
            </p>
          </Stat>

          <Stat
            label="Sentiment score"
            foot={
              <p className="text-[11px] text-[#9FB0C2]">
                {RUN.label} · intensity {Math.abs(RUN.sentiment).toFixed(2)}
              </p>
            }
          >
            <p className="font-[family-name:var(--font-uw-mono)] text-[34px] leading-none font-medium text-[#3CE07C] tabular-nums">
              <CountUp to={RUN.sentiment} decimals={3} signed />
            </p>
          </Stat>
        </div>

        <div className="rounded-[14px] bg-[#131A22] px-4 py-3.5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7E8DA0] uppercase">
            Market regime
          </p>
          <dl className="mt-2 font-[family-name:var(--font-uw-mono)] text-[12.5px] tabular-nums">
            {[
              ["India VIX", RUN.vix],
              ["Nifty 5D", RUN.nifty],
              ["Volatility", RUN.vol],
            ].map(([k, v], i) => (
              <div
                key={k}
                className={`flex items-center justify-between py-[7px] ${
                  i ? "border-t border-[#1A232D]" : ""
                }`}
              >
                <dt className="text-[11px] tracking-[0.06em] text-[#9FB0C2] uppercase">{k}</dt>
                <dd className="text-[#E4ECF3]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-[14px] bg-[#131A22] px-4 pt-3.5 pb-2">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7E8DA0] uppercase">
            VIX shock probability
          </p>
          {/* Capped: the panel goes full-width when the browser window is
              narrow, and an uncapped `w-full` dial grew to 600px tall. */}
          <div className="relative mt-1 mx-auto max-w-[320px]">
            <Gauge value={RUN.shock} />
            <p className="pointer-events-none absolute inset-x-0 bottom-[6px] text-center font-[family-name:var(--font-uw-mono)] text-[30px] leading-none font-medium text-[#3CE07C] tabular-nums">
              <CountUp to={RUN.shock} decimals={1} />%
            </p>
          </div>
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── the pipeline ─────────────────────────────────────────────────────── */

const PIPELINE = [
  {
    Icon: CorpusIcon,
    title: "140 documents come out of PDFs",
    text: "102 speeches and 38 sets of MPC minutes, January 2020 to February 2026, pulled with pdfplumber.",
  },
  {
    Icon: WindowIcon,
    title: "A sliding window beats the token limit",
    text: "FinBERT stops at 512 tokens. Chunking with overlap means a forty-minute speech is scored end to end instead of truncated at the first page.",
  },
  {
    Icon: ScoreIcon,
    title: "FinBERT scores the tone",
    text: "ProsusAI/FinBERT returns one signed score per document. Across the corpus they run from −0.4512 to +0.7419.",
  },
  {
    Icon: JoinIcon,
    title: "Market data joins on the date",
    text: "Nifty and India VIX from yfinance, merged to each document, giving five features — sentiment intensity, a VIX lag and Nifty momentum among them.",
  },
  {
    Icon: ForestIcon,
    title: "A Random Forest, split by time",
    text: "300 trees, depth 4, balanced class weights. Trained on 2024 and earlier, tested on 2025 onward, so no future price can leak backwards into the fit.",
  },
  {
    Icon: ShockIcon,
    title: "Out comes a shock probability",
    text: "A shock is a VIX return above the 80th percentile of the training period. The dashboard scores any speech you paste into it.",
  },
];

/* ─── the spec sheet ───────────────────────────────────────────────────── */

const SPEC: [string, string][] = [
  ["Corpus", "140 documents"],
  ["Composition", "102 speeches · 38 MPC minutes"],
  ["Window", "Jan 2020 — Feb 2026"],
  ["Sentiment model", "ProsusAI/FinBERT"],
  ["Observed range", "−0.4512 … +0.7419"],
  ["Classifier", "Random Forest · 300 trees · depth 4"],
  ["Class weights", "balanced"],
  ["Split", "chronological · train ≤2024 · test 2025+"],
  ["Shock threshold", "VIX return > 80th pct of train"],
];

/* ─── stack ────────────────────────────────────────────────────────────── */

const STACK = [
  { id: "huggingface", name: "ProsusAI/FinBERT via Hugging Face" },
  { id: "pytorch", name: "PyTorch" },
  { id: "scikitlearn", name: "scikit-learn — Random Forest" },
  { id: "pandas", name: "pandas" },
  { id: "numpy", name: "NumPy" },
  { id: "scipy", name: "SciPy" },
  { id: "statsmodels", name: "statsmodels" },
  { id: "plotly", name: "Plotly" },
  { id: "pdfplumber", name: "pdfplumber — PDF extraction" },
  { id: "yfinance", name: "yfinance — market data" },
  { id: "streamlit", name: "Streamlit" },
  { id: "python", name: "Python" },
];

function StackChip({ id, name }: { id: string; name: string }) {
  const path = TECH_LOGOS[id];

  return (
    // The lift lives on an inner wrapper, not this element: :hover and the
    // transform that responds to it can't share an element, or the lift
    // carries the hit box away from a cursor that never moved, un-hovering
    // it, snapping back down, re-hovering — a flicker loop rather than a
    // lift. This div owns hover/focus and never moves; only its child does.
    <div
      tabIndex={0}
      aria-label={name}
      className="group relative flex h-16 w-20 items-center justify-center rounded-[13px] border border-[#212C38] bg-[#131A22] text-[#C6D3E0] transition-[border-color,color] duration-200 ease-out hover:border-[#00E0A4]/55 hover:text-[#00E0A4] focus-visible:border-[#00E0A4]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0A4]/45"
    >
      <div className="flex items-center justify-center transition-transform duration-200 ease-out will-change-transform group-hover:-translate-y-1 group-focus-visible:-translate-y-1">
        {path ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path d={path} fill="currentColor" />
          </svg>
        ) : (
          <span className="font-[family-name:var(--font-uw-mono)] text-[15px] font-medium" aria-hidden="true">
            {name.slice(0, 2)}
          </span>
        )}
      </div>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-[9px] border border-[#212C38] bg-[#0A0E13] px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-[#E4ECF3] opacity-0 shadow-[0_10px_26px_rgba(0,0,0,0.7)] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {name}
      </span>
    </div>
  );
}

/* ─── section label ────────────────────────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-[family-name:var(--font-uw-mono)] text-[11.5px] font-medium tracking-[0.16em] text-[#00E0A4] uppercase">
      {children}
    </span>
  );
}

/* ─── the page ─────────────────────────────────────────────────────────── */

export function SentinelLanding() {
  return (
    <div
      className={`sn-page ${serif.variable} ${sans.variable} ${mono.variable} absolute inset-0 overflow-y-auto overscroll-contain bg-[#0A0E13]`}
      style={{ fontFamily: "var(--font-uw-sans), sans-serif" }}
    >
      {/* Browser surfaces this page would otherwise inherit from the OS:
          the scrollbar and the selection. */}
      <style>{`
        .sn-page { scrollbar-color: #26333F #0A0E13; scrollbar-width: thin; }
        .sn-page ::selection { background: #00E0A4; color: #04120D; }
        .sn-page ::-webkit-scrollbar { width: 11px; }
        .sn-page ::-webkit-scrollbar-track { background: #0A0E13; }
        .sn-page ::-webkit-scrollbar-thumb {
          background: #26333F; border-radius: 6px;
          border: 3px solid #0A0E13;
        }
        .sn-page ::-webkit-scrollbar-thumb:hover { background: #3A4A5A; }
      `}</style>

      <div className="relative">
        {/* The trace: an index behind the masthead, at the opacity of a
            watermark. It is the page's own subject, not a texture.
            560px reaches the vertical middle of the dashboard panel beside
            it; the mask holds that fully through the top half before
            tapering, rather than fading out well short of it. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_96%)]">
          <AuroraBackdrop />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 50% -20%, rgba(10,14,19,0.5) 0%, rgba(10,14,19,0.15) 42%, transparent 72%)",
            }}
          />
          <svg
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-[120px] h-[260px] w-full"
            aria-hidden="true"
          >
            <motion.path
              d={TRACE}
              fill="none"
              stroke="#00E0A4"
              strokeWidth={1.4}
              strokeOpacity={0.4}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </div>

        <div className="relative mx-auto max-w-[1180px] px-8 pt-[62px] pb-10 sm:px-12 sm:pt-[78px]">
          {/* Masthead */}
          <div className="mb-14 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3.5">
              <SentinelMark className="h-[52px] w-[52px] shrink-0 text-[#00E0A4] drop-shadow-[0_0_18px_rgba(0,224,164,0.45)]" />
              <span
                className="font-[family-name:var(--font-uw-serif)] text-[46px] leading-none font-semibold tracking-[-0.02em] text-[#E4ECF3] sm:text-[54px]"
                style={{ textShadow: "0 4px 24px rgba(10,14,19,0.85)" }}
              >
                RBI Sentinel
              </span>
            </div>
            <p className="mt-4 max-w-md text-[13px] font-light text-[#7E8DA0]">
              This is just for presentation purposes — if you want to use the real thing, the link
              at the bottom opens the live dashboard.
            </p>
          </div>

          {/* Hero */}
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_440px]">
            <Reveal>
              <h1 className="max-w-[15ch] font-[family-name:var(--font-uw-serif)] text-[44px] leading-[1.04] font-bold tracking-[-0.02em] text-[#E4ECF3] sm:text-[52px]">
                Does the tone of a central bank move the market?
              </h1>
              <span className="mt-6 block h-1 w-14 rounded-full bg-[#00E0A4]" />
              <p className="mt-8 max-w-[52ch] text-[17px] leading-relaxed text-[#9FB0C2]">
                Every speech and every set of MPC minutes the Reserve Bank of India published
                between 2020 and 2026 — 140 documents — scored for sentiment with FinBERT, merged
                with Indian equity market data, and handed to a classifier that predicts volatility
                shocks in the Nifty.
              </p>
              <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-[#9FB0C2]">
                It began as a question I could not answer by reading: central bankers choose words
                the way other people choose numbers, and I wanted to know whether the choosing shows
                up in the price. Six years of PDFs later, it does — just not in the way I expected.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="https://rbi-sentinel.streamlit.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#00E0A4] px-5 py-3 text-[14px] font-semibold text-[#04120D] shadow-[0_10px_30px_-12px_rgba(0,224,164,0.75)] transition-colors duration-200 hover:bg-[#5CF0C8] focus-visible:ring-2 focus-visible:ring-[#00E0A4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0E13] focus-visible:outline-none"
                >
                  Score a speech yourself
                  <ArrowUpRightIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com/ayushmanlohani/rbi-sentiment-volatility-forecasting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[#212C38] px-5 py-3 text-[14px] font-semibold text-[#9FB0C2] transition-colors duration-200 hover:border-[#33414F] hover:text-[#E4ECF3] focus-visible:ring-2 focus-visible:ring-[#00E0A4]/60 focus-visible:outline-none"
                >
                  <GithubIcon className="h-4 w-4" />
                  Read the code
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <DashboardPanel />
              <p className="mt-3 text-center text-[11.5px] text-[#7E8DA0]">
                One real run, captured from the deployed dashboard.
              </p>
            </Reveal>
          </div>

          {/* The finding */}
          <Reveal delay={0.1}>
            <div className="mt-28">
              <Label>The finding</Label>
              <h2 className="mt-5 max-w-[22ch] font-[family-name:var(--font-uw-serif)] text-[32px] leading-[1.12] font-bold tracking-[-0.02em] text-[#E4ECF3] sm:text-[38px]">
                The market does not care whether the RBI sounds hawkish or dovish.
              </h2>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-relaxed text-[#9FB0C2]">
                It cares how hard the RBI says anything at all. Intensity — the absolute value,
                direction thrown away — carries a signal the signed score does not. A strongly
                worded speech moves volatility whichever way it leans.
              </p>
            </div>
          </Reveal>

          {/* How it works */}
          <Reveal delay={0.1}>
            <div className="mt-28">
              <Label>How it works</Label>
              <ol className="mt-8">
                {PIPELINE.map(({ Icon, title, text }, i) => (
                  <li key={title} className="relative flex gap-5 pb-9 last:pb-0">
                    {/* The rail. It stops at the last step rather than running
                        past it, because the pipeline ends there. */}
                    {i < PIPELINE.length - 1 && (
                      <span className="absolute top-[46px] left-[22px] h-[calc(100%-46px)] w-px bg-gradient-to-b from-[#212C38] to-[#141C25]" />
                    )}
                    <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-[#212C38] bg-[#131A22] text-[#00E0A4]">
                      <Icon className="h-[21px] w-[21px]" />
                    </span>
                    <div className="pt-1.5">
                      <p className="text-[17px] leading-snug font-semibold text-[#E4ECF3]">{title}</p>
                      <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-[#9FB0C2]">
                        {text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* Spec sheet */}
          <Reveal delay={0.1}>
            <div className="mt-24">
              <Label>The specification</Label>
              <dl className="mt-6 font-[family-name:var(--font-uw-mono)] text-[13px]">
                {SPEC.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-[11px] ${
                      i ? "border-t border-[#1A232D]" : ""
                    }`}
                  >
                    <dt className="tracking-[0.06em] text-[#7E8DA0] uppercase">{k}</dt>
                    <dd className="text-[#C6D3E0] tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          {/* Tech stack */}
          <Reveal delay={0.1}>
            <div className="mt-24">
              <Label>Tech stack</Label>
              <div className="mt-6 flex flex-wrap gap-3">
                {STACK.map((tech) => (
                  <StackChip key={tech.name} {...tech} />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Footer */}
          <div className="mt-20 flex flex-col items-start justify-between gap-5 border-t border-[#1A232D] pt-7 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <SentinelMark className="h-[22px] w-[22px] text-[#00E0A4]" />
              <span className="font-[family-name:var(--font-uw-serif)] text-[16px] font-bold text-[#E4ECF3]">
                RBI Sentinel
              </span>
              <span className="mx-1 h-4 w-px bg-[#212C38]" />
              <span className="text-[12.5px] text-[#9FB0C2]">
                Monetary policy sentiment → volatility shock prediction
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-5">
              <a
                href="https://github.com/ayushmanlohani/rbi-sentiment-volatility-forecasting"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#9FB0C2] transition-colors duration-300 hover:text-[#E4ECF3]"
              >
                <GithubIcon className="h-4 w-4" />
                Source
              </a>
              <a
                href="https://rbi-sentinel.streamlit.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12.5px] font-medium text-[#00E0A4] transition-colors duration-300 hover:text-[#5CF0C8]"
              >
                rbi-sentinel.streamlit.app
                <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
