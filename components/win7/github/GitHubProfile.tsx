"use client";

import { GITHUB, GITHUB_URL } from "@/content/github";

/**
 * github.com/ayushmanlohani, rebuilt — GitHub's 2024 dark profile, rendered
 * inside a 2011 Chrome window. The anachronism is the joke, so nothing here
 * is dressed down to match the browser frame: it's the site as it looks now.
 *
 * Everything visible is real and read off the live profile once (see
 * content/github.ts, which is the file to edit). Nothing fetches, nothing
 * updates itself, and no link leaves the page except the ones that go to the
 * actual profile — those are marked `real` below.
 *
 * The one piece of logic in here is the contribution calendar: 369 daily
 * counts laid out seven-to-a-column starting on a Sunday, which is exactly
 * how GitHub fills it. Month labels are derived from that same start date
 * rather than hardcoded, so refreshing the numbers moves the labels too.
 */

/* GitHub's dark theme, by its own token names. Kept here so the whole page
   reads from one list instead of scattering hexes through the markup. */
const C = {
  canvas: "#0d1117",
  inset: "#010409",
  subtle: "#161b22",
  border: "#30363d",
  fg: "#e6edf3",
  muted: "#9198a1",
  accent: "#4493f8",
  btn: "#21262d",
  btnBorder: "#3d444d",
  green: "#238636",
};

/** The five square shades, level 0 through 4. */
const LEVELS = ["#151b23", "#033a16", "#196c2e", "#2ea043", "#56d364"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** GitHub buckets by count, not by quantile: 1–2, 3–5, 6–9, 10+. */
function level(n: number): number {
  if (n === 0) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

function LangDot({ language }: { language: string }) {
  if (!language) return null;
  return (
    <span className="flex items-center gap-[5px]">
      <span
        className="inline-block h-[12px] w-[12px] rounded-full"
        style={{ background: GITHUB.languageColors[language] ?? "#8b949e" }}
      />
      {language}
    </span>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="currentColor" aria-hidden="true">
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-[16px] w-[16px] shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}

/** A GitHub-style pill button. `href` makes it a real outbound link. */
function Btn({
  children,
  href,
  primary = false,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  primary?: boolean;
  className?: string;
}) {
  const style = primary
    ? { background: C.green, borderColor: "#ffffff1a", color: "#ffffff" }
    : { background: C.btn, borderColor: C.btnBorder, color: C.fg };
  const cls = `inline-flex h-[32px] items-center justify-center gap-[6px] rounded-[6px] border px-[16px] text-[14px] font-semibold leading-none transition-colors hover:brightness-125 ${className}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} style={style}>
      {children}
    </button>
  );
}

/* ── The fixed top bar ─────────────────────────────────────────── */

function Header() {
  return (
    <header
      className="flex items-center gap-[12px] border-b px-[16px] py-[12px]"
      style={{ background: C.inset, borderColor: C.border }}
    >
      <svg viewBox="0 0 16 16" className="h-[32px] w-[32px] shrink-0" fill={C.fg} aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
      <span className="text-[16px] font-semibold leading-none" style={{ color: C.fg }}>
        {GITHUB.login}
      </span>
      {/* real — leaves for the actual profile. */}
      <Btn href={GITHUB_URL} className="ml-auto">
        <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
        View on GitHub
      </Btn>
    </header>
  );
}

/* ── Left column ───────────────────────────────────────────────── */

function Sidebar() {
  return (
    <div className="w-full shrink-0 lg:w-[296px]">
      <div className="flex items-end gap-[16px] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={GITHUB.avatar}
          alt={GITHUB.name}
          className="h-[104px] w-[104px] shrink-0 rounded-full border lg:h-[260px] lg:w-[260px]"
          style={{ borderColor: C.border }}
        />
        <div className="min-w-0 pb-[8px] lg:mt-[16px] lg:pb-0">
          <h1 className="truncate text-[26px] font-semibold leading-[1.25]" style={{ color: C.fg }}>
            {GITHUB.name}
          </h1>
          <p className="truncate text-[20px] font-light leading-[24px]" style={{ color: C.muted }}>
            {GITHUB.login}
          </p>
        </div>
      </div>

      {/* real — this is the button that leaves for the actual profile. */}
      <Btn href={GITHUB_URL} className="mt-[16px] w-full">
        Follow
      </Btn>

      <div className="mt-[16px] flex items-center gap-[4px] text-[14px]" style={{ color: C.muted }}>
        <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="currentColor" aria-hidden="true">
          <path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z" />
        </svg>
        <span>
          <strong style={{ color: C.fg }}>{GITHUB.followers}</strong> followers
        </span>
        <span>·</span>
        <span>
          <strong style={{ color: C.fg }}>{GITHUB.following}</strong> following
        </span>
      </div>

      <div className="mt-[8px] space-y-[4px] text-[14px]" style={{ color: C.fg }}>
        <div className="flex items-center gap-[8px]">
          <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill={C.muted} aria-hidden="true">
            <path d="m12.596 11.596-3.535 3.536a1.5 1.5 0 0 1-2.122 0l-3.535-3.536a6.5 6.5 0 1 1 9.192-9.193 6.5 6.5 0 0 1 0 9.193Zm-1.06-8.132a5 5 0 1 0-7.072 7.072L8 14.07l3.536-3.535a5 5 0 0 0 0-7.072ZM8 9a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 9Z" />
          </svg>
          {GITHUB.location}
        </div>
        <div className="flex items-center gap-[8px]" style={{ color: C.muted }}>
          <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="currentColor" aria-hidden="true">
            <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z" />
          </svg>
          {GITHUB.joined}
        </div>
      </div>
    </div>
  );
}

/* ── The profile README card ───────────────────────────────────── */

/** Renders GitHub's `**bold**` inline, which is all this README uses. */
function md(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Readme() {
  const r = GITHUB.readme;
  return (
    <section className="rounded-[6px] border" style={{ borderColor: C.border }}>
      <div
        className="flex items-center gap-[8px] border-b px-[16px] py-[8px] text-[12px]"
        style={{ borderColor: C.border, color: C.muted }}
      >
        <RepoIcon />
        <span style={{ color: C.accent }}>{GITHUB.login}</span>
        <span>/</span>
        <span style={{ color: C.accent }}>README.md</span>
      </div>

      <div className="px-[32px] py-[24px]" style={{ color: C.fg }}>
        <h2 className="border-b pb-[8px] text-[24px] font-semibold" style={{ borderColor: C.border }}>
          {r.heading}
        </h2>
        {r.intro.map((line, i) => (
          <p key={i} className="mt-[16px] text-[16px] leading-[1.6]">
            {md(line)}
          </p>
        ))}
      </div>
    </section>
  );
}

/* ── Pinned ────────────────────────────────────────────────────── */

function Pinned() {
  return (
    <section className="mt-[24px]">
      <h2 className="mb-[8px] text-[14px] font-normal" style={{ color: C.fg }}>
        Pinned
      </h2>
      <div className="grid gap-[16px] md:grid-cols-2">
        {GITHUB.pinned.map((p) => (
          <div
            key={p.name}
            className="flex min-h-[120px] flex-col rounded-[6px] border p-[16px]"
            style={{ borderColor: C.border, background: C.canvas }}
          >
            <div className="flex items-center gap-[8px]">
              <span style={{ color: C.muted }}>
                <RepoIcon />
              </span>
              <a
                href={`${GITHUB_URL}/${p.name}`}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[14px] font-semibold hover:underline"
                style={{ color: C.accent }}
              >
                {p.name}
              </a>
              <span
                className="ml-auto shrink-0 rounded-full border px-[7px] text-[12px] leading-[18px]"
                style={{ borderColor: C.btnBorder, color: C.muted }}
              >
                Public
              </span>
            </div>
            <p className="mt-[8px] flex-1 text-[12px] leading-[1.5]" style={{ color: C.muted }}>
              {p.description}
            </p>
            <div className="mt-[16px] flex items-center gap-[16px] text-[12px]" style={{ color: C.muted }}>
              <LangDot language={p.language} />
              {p.stars > 0 && (
                <span className="flex items-center gap-[4px]">
                  <StarIcon />
                  {p.stars}
                </span>
              )}
              {p.forks > 0 && (
                <span className="flex items-center gap-[4px]">
                  <ForkIcon />
                  {p.forks}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── The contribution calendar ─────────────────────────────────── */

function Calendar() {
  const start = new Date(`${GITHUB.graphStart}T00:00:00`);
  const days = GITHUB.graph;
  const weeks = Math.ceil(days.length / 7);

  // Month labels sit over the first column whose Sunday starts a new month.
  const labels: { col: number; text: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const d = new Date(start);
    d.setDate(d.getDate() + w * 7);
    if (d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      // Skip a label that would collide with the previous one. Two columns is
      // enough clearance for a three-letter month — and the graph opens
      // mid-August, so a stricter gap would swallow September entirely.
      if (labels.length === 0 || w - labels[labels.length - 1].col >= 2) {
        labels.push({ col: w, text: MONTHS[lastMonth] });
      }
    }
  }

  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;

  return (
    <section className="mt-[32px]">
      <h2 className="mb-[8px] text-[16px] font-normal" style={{ color: C.fg }}>
        {GITHUB.contributionsTotal} contributions in the last year
      </h2>
      <div className="rounded-[6px] border p-[16px]" style={{ borderColor: C.border }}>
        {(() => {
          const LABEL_W = 20;
          const LABEL_H = 16;
          const w = LABEL_W + weeks * STEP - GAP;
          const h = LABEL_H + 7 * STEP - GAP;
          return (
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ height: "auto", display: "block" }}>
              {["Mon", "Wed", "Fri"].map((d, row) => (
                <text
                  key={d}
                  x={LABEL_W - 4}
                  y={LABEL_H + (row * 2 + 1) * STEP + CELL / 2 + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill={C.muted}
                >
                  {d}
                </text>
              ))}
              {labels.map((l) => (
                <text key={`${l.col}-${l.text}`} x={LABEL_W + l.col * STEP} y={10} fontSize={10} fill={C.muted}>
                  {l.text}
                </text>
              ))}
              {Array.from({ length: weeks }, (_, wk) =>
                Array.from({ length: 7 }, (_, d) => {
                  const i = wk * 7 + d;
                  if (i >= days.length) return null;
                  const date = new Date(start);
                  date.setDate(date.getDate() + i);
                  const n = days[i];
                  return (
                    <rect
                      key={`${wk}-${d}`}
                      x={LABEL_W + wk * STEP}
                      y={LABEL_H + d * STEP}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill={LEVELS[level(n)]}
                    >
                      <title>
                        {n === 0 ? "No" : n} contribution{n === 1 ? "" : "s"} on{" "}
                        {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </title>
                    </rect>
                  );
                }),
              )}
            </svg>
          );
        })()}

        <div className="mt-[8px] flex items-center justify-end gap-[3px] text-[12px]" style={{ color: C.muted }}>
          <span className="mr-[2px]">Less</span>
          {LEVELS.map((bg) => (
            <span key={bg} style={{ width: CELL, height: CELL, borderRadius: 2, background: bg }} />
          ))}
          <span className="ml-[2px]">More</span>
        </div>
      </div>
    </section>
  );
}


const TABS = [
  ["Overview", ""],
  ["Repositories", String(GITHUB.publicRepos)],
  ["Projects", ""],
  ["Packages", ""],
  ["Stars", "0"],
] as const;

export function GitHubProfile() {
  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{
        background: C.canvas,
        color: C.fg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      }}
    >
      <Header />

      <div className="mx-auto w-full max-w-[1280px] px-[16px] pb-[64px] md:px-[32px]">
        <div className="flex flex-col gap-[24px] pt-[24px] lg:flex-row lg:gap-[32px]">
          <Sidebar />

          <main className="min-w-0 flex-1">
            <nav
              className="flex gap-[8px] overflow-x-auto border-b text-[14px]"
              style={{ borderColor: C.border }}
            >
              {TABS.map(([label, count], i) => (
                <span
                  key={label}
                  className="flex shrink-0 items-center gap-[8px] px-[8px] pb-[12px] pt-[4px]"
                  style={{
                    color: i === 0 ? C.fg : C.muted,
                    fontWeight: i === 0 ? 600 : 400,
                    boxShadow: i === 0 ? "inset 0 -2px 0 #fd8c73" : "none",
                  }}
                >
                  {label}
                  {count && (
                    <span
                      className="rounded-full px-[6px] text-[12px] leading-[18px]"
                      style={{ background: "#6e768166", color: C.fg }}
                    >
                      {count}
                    </span>
                  )}
                </span>
              ))}
            </nav>

            <div className="mt-[24px]">
              <Readme />
              <Pinned />
              <Calendar />
            </div>
          </main>
        </div>

        {/* The one honest exit. Everything above is a snapshot; this is live. */}
        <div
          className="mt-[32px] flex flex-col items-center justify-center gap-[8px] rounded-[6px] border px-[24px] py-[20px] text-center"
          style={{ borderColor: C.border, background: C.subtle }}
        >
          <p className="text-[14px]" style={{ color: C.muted }}>
            This is a snapshot, frozen on 28 August 2026. The live profile has moved on.
          </p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-[14px] font-semibold" style={{ color: C.accent }}>
            View the real profile on GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}
