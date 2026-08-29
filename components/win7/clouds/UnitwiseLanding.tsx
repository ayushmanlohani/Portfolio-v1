"use client";

import { coarsePointer } from "@/components/win7/coarsePointer";
import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";

import { TECH_LOGOS } from "@/components/win7/folders/techLogos";

import { CloudShader } from "./CloudShader";
import { mono, sans, serif } from "./fonts";
import {
  ArrowUpRightIcon,
  BoltIcon,
  BookmarkIcon,
  DocumentIcon,
  FilterIcon,
  HamburgerIcon,
  ProfileIcon,
  SearchIcon,
  SendIcon,
} from "./icons";

/**
 * The Unitwise marketing mockup Ayushman supplied as a reference image,
 * rebuilt in code and given a light Awwwards-tier pass (scroll reveals, a
 * cursor-tilt on the app preview, an idle float). It renders inside the
 * Clouds window in place of a bare shader fill — the shader itself moves
 * up into a recoloured strip behind the header, doing the actual "clouds"
 * work this window is named for.
 */

// Grounded in the real repo (github.com/ayushmanlohani/Unitwise), not the
// generic "upload a PDF" framing the reference mockup used — Unitwise
// answers from textbooks already indexed into ChromaDB, not files a
// student drops in at ask-time.
const STEPS = [
  {
    Icon: DocumentIcon,
    title: "Cited, page-level answers",
    text: "Every response names the exact textbook and page it came from.",
  },
  {
    Icon: FilterIcon,
    title: "A syllabus gate",
    text: "An LLM-powered filter turns away questions outside the indexed curriculum.",
  },
  {
    Icon: SearchIcon,
    title: "Retrieval over ChromaDB",
    text: "The 15 closest passages are pulled by all-MiniLM-L6-v2 embeddings before every answer.",
  },
  {
    Icon: BoltIcon,
    title: "Streamed in seconds",
    text: "LLaMA 3.1 8B, served by Groq, streams the reply over SSE — start to finish in about five seconds.",
  },
];

/** The stack row — ids resolve against TECH_LOGOS; unknown ids lettermark. */
const STACK = [
  { id: "", name: "RAG", Icon: SearchIcon },
  { id: "react", name: "React 19" },
  { id: "tailwindcss", name: "Tailwind CSS" },
  { id: "framer", name: "Framer Motion" },
  { id: "fastapi", name: "FastAPI" },
  { id: "", name: "Uvicorn" },
  { id: "", name: "LLaMA 3.1 8B Instant via Groq API" },
  { id: "langchain", name: "LangChain Core" },
  { id: "langchain", name: "LangChain Groq" },
  { id: "", name: "ChromaDB (SQLite-backed, persistent)" },
  { id: "huggingface", name: "all-MiniLM-L6-v2 (Sentence Transformers, 384-dim)" },
  { id: "", name: "PyMuPDF" },
  { id: "supabase", name: "Supabase (PostgreSQL + Auth)" },
];

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

function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/letterbox/unitwise-logo.png"
      alt=""
      width={size}
      height={size}
      // Next's built-in optimizer re-encodes this PNG as an indexed palette
      // image, and at the 128px variant (the header logo's 2x asset) the
      // quantizer drops several palette slots' alpha, leaving a solid
      // cream box behind the mark — invisible on the white cards this logo
      // also sits on, glaring on the orange header. Bypassing optimization
      // serves the source file's real alpha untouched; it's a 256×256 PNG
      // shown at 64px at most, so there's nothing worth resizing server-side.
      unoptimized
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

/** The chat-app screenshot mockup, with a gentle cursor tilt and idle float. */
function AppPreview() {
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
        className="overflow-hidden rounded-2xl border border-[#EAE2D3] bg-white shadow-[0_30px_60px_-25px_rgba(60,45,25,0.35)]"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#EFE8DA] px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="font-[family-name:var(--font-uw-sans)] text-[14px] font-semibold text-[#171412]">
              Unitwise
            </span>
          </div>
          <HamburgerIcon className="h-4 w-4 text-[#8a8375]" />
        </div>

        <div className="flex" style={{ minHeight: 330 }}>
          {/* Sidebar */}
          <div className="flex w-[128px] shrink-0 flex-col gap-1 border-r border-[#EFE8DA] bg-[#FCFAF4] p-2.5">
            <button
              type="button"
              className="mb-1.5 flex items-center justify-center gap-1 rounded-md bg-[#F3ECDD] py-1.5 text-[10.5px] font-semibold text-[#171412]"
            >
              + New Session
            </button>
            <div className="flex items-center gap-1.5 rounded-md bg-[#F6EFE0] px-2 py-1.5 text-[11px] font-medium text-[#171412]">
              <DocumentIcon className="h-3.5 w-3.5" />
              Sessions
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-[#8a8375]">
              <BookmarkIcon className="h-3.5 w-3.5" />
              Bookmarks
            </div>

            <div className="mt-auto flex items-center gap-1.5 rounded-lg border border-[#EFE8DA] bg-white p-2 text-[10px] font-semibold text-[#171412]">
              <ProfileIcon className="h-3 w-3 text-[#D9662E]" />
              Profile
            </div>
          </div>

          {/* Chat */}
          <div className="flex flex-1 flex-col gap-2.5 p-3.5">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#EFE8DA] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#171412]">
                🎓 Academic
              </span>
            </div>

            <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[#F3ECDD] px-3 py-1.5 text-[11.5px] text-[#171412]">
              Explain Dynamic Programming with an example.
            </div>

            <div className="rounded-xl border border-[#EFE8DA] bg-white p-3.5 text-[11.5px] leading-relaxed text-[#2b2620]">
              <p>
                Dynamic Programming (DP) is a method for solving complex problems by breaking
                them down into overlapping subproblems.
              </p>
              <p className="mt-2 font-semibold text-[#D9662E]">Example: Fibonacci Sequence</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-[#4a453c]">
                <li>F(n) = F(n-1) + F(n-2)</li>
                <li>Base cases: F(0) = 0, F(1) = 1</li>
                <li>Optimized using memoization or tabulation</li>
              </ul>
            </div>

            <div className="mt-auto flex items-center gap-2 rounded-full border border-[#EFE8DA] bg-[#FCFAF4] px-3 py-1.5">
              <span className="flex-1 text-[11px] text-[#a39c8c]">Ask a follow-up...</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D9662E] text-white">
                <SendIcon className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** One stack box: a logo that names itself on hover or keyboard focus. */
function StackChip({ id, name, Icon }: { id: string; name: string; Icon?: React.ComponentType<{ className?: string }> }) {
  const path = TECH_LOGOS[id];

  return (
    <div
      tabIndex={0}
      aria-label={name}
      className="group relative flex h-16 w-20 items-center justify-center rounded-xl border border-[#EEE4D2] bg-white text-[#171412] shadow-[0_1px_3px_rgba(60,45,25,0.06)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9662E]/50"
    >
      {Icon ? (
        <Icon className="h-7 w-7" />
      ) : path ? (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path d={path} fill="currentColor" />
        </svg>
      ) : (
        <span className="font-[family-name:var(--font-uw-serif)] text-[15px] font-semibold" aria-hidden="true">
          {name.slice(0, 2)}
        </span>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-[#171412] px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-white opacity-0 shadow-[0_6px_18px_rgba(23,20,18,0.25)] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {name}
      </span>
    </div>
  );
}

export function UnitwiseLanding() {
  return (
    <div
      className={`${serif.variable} ${sans.variable} ${mono.variable} absolute inset-0 overflow-y-auto overscroll-contain bg-[#FCFAF3]`}
      style={{ fontFamily: "var(--font-uw-sans), sans-serif" }}
    >
      <div className="relative overflow-hidden bg-[#FCFAF3]">
        {/* The Clouds component, retextured for this palette instead of its
            default blue sky — the "use the cloud component" ask, made
            literal: same shader, different props, no edits to the file. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_68%,transparent_92%)]">
          <CloudShader
            className="h-full w-full"
            speed={0.5}
            count={6}
            cloudColor="#FFFDF8"
            skyTopColor="#E2864A"
            skyBottomColor="#F6E0C0"
          />
        </div>

        <div className="relative mx-auto max-w-[1180px] px-8 pt-[68px] pb-10 sm:px-12 sm:pt-[84px]">
          {/* Header */}
          <div className="mb-10 flex flex-col items-center">
            <div className="flex items-end justify-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center -my-10 translate-y-[-44px] overflow-visible">
                <Logo size={128} className="h-[128px] w-[128px] max-w-none shrink-0 drop-shadow-[0_4px_8px_rgba(90,35,10,0.4)]" />
              </div>
              <span
                className="font-[family-name:var(--font-uw-serif)] text-[46px] leading-none font-semibold tracking-tight text-[#171412] sm:text-[54px]"
                style={{ textShadow: "0 3px 10px rgba(60,25,10,0.28)" }}
              >
                Unitwise
              </span>
            </div>
            <p className="mt-3 text-[13px] font-light text-[#6b6459]">
              This is just for presentation purposes — if you want to see the actual site, use the
              link at the bottom.
            </p>
          </div>

          {/* Hero */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_460px]">
            <Reveal>
              <h1 className="font-[family-name:var(--font-uw-serif)] text-[44px] leading-[1.05] font-bold text-[#171412] sm:text-[52px]">
                Agentic RAG Assistant
              </h1>
              <span className="mt-5 block h-1 w-14 rounded-full bg-[#D9662E]" />
              <p className="mt-8 text-[11px] font-semibold tracking-[0.12em] text-[#8a8375] uppercase">
                Why I made this
              </p>
              <p className="mt-3 max-w-md text-[17px] leading-relaxed text-[#6b6459]">
                I made this in my 6th semester cuz I had to give my mid terms and I was not
                going to college (uhm.. naturally), and I asked my friends for some notes and
                they didn&apos;t have any. So I pirated some books that are in my syllabus and
                made a WONDERFUL RAG chatbot to help me prepare in my second mid term and end
                terms. It worked great but I still procrastinated and didn&apos;t study.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <AppPreview />
            </Reveal>
          </div>

          {/* How it answers — replaces the mockup's generic feature tiles
              and tech-stack row with the real pipeline, laid out full-width
              (icon beside text, not stacked above it) so the copy has room
              to breathe instead of wrapping word-by-word. */}
          <Reveal delay={0.1}>
            <div className="mt-20">
              <span className="text-[13px] font-bold tracking-[0.14em] text-[#8a8375] uppercase">
                How it answers
              </span>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {STEPS.map(({ Icon, title, text }, i) => (
                  <Reveal key={title} delay={0.05 + i * 0.05}>
                    <div className="flex h-full items-start gap-4 rounded-2xl border border-[#EEE4D2] bg-[#F6EFDF]/60 p-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#171412]">
                        <Icon className="h-[22px] w-[22px]" />
                      </span>
                      <div>
                        <p className="text-[16px] leading-snug font-semibold text-[#171412]">{title}</p>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6b6459]">{text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Tech stack */}
          <Reveal delay={0.1}>
            <div className="mt-20">
              <span className="text-[13px] font-bold tracking-[0.14em] text-[#8a8375] uppercase">
                Tech stack
              </span>
              <div className="mt-5 flex flex-wrap gap-3">
                {STACK.map((tech) => (
                  <StackChip key={tech.name} {...tech} />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Footer */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#EEE4D2] pt-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <Logo size={26} />
              <span className="font-[family-name:var(--font-uw-serif)] text-[16px] font-bold text-[#171412]">
                Unitwise
              </span>
              <span className="mx-1 h-4 w-px bg-[#DCCFAF]" />
              <span className="text-[12.5px] text-[#6b6459]">Understand more. Study less. Score better.</span>
            </div>
            <a
              href="https://unitwise-weld.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12.5px] font-medium text-[#D9662E] transition-colors duration-300 hover:text-[#C6511F]"
            >
              unitwise.in
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
