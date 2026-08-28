"use client";

import { useState } from "react";

import { LINKEDIN, LINKEDIN_URL } from "@/content/linkedin";

/**
 * linkedin.com/in/ayushmanlohani, rebuilt — LinkedIn's 2024 profile, rendered
 * inside a 2011 Chrome window. Same trick as the GitHub page: the site is
 * drawn as it looks today and the browser around it stays 2011, because that
 * gap is the joke.
 *
 * LinkedIn is behind a login wall, so unlike GitHub none of this could be
 * fetched. Every word was transcribed off Ayushman's own screenshots and now
 * lives in content/linkedin.ts, which is the file to edit. Nothing here
 * loads, saves, or navigates — the single working link is the one at the
 * bottom, which goes to the real profile.
 */

/* LinkedIn's own palette, by role. One list so no hex is guessed twice. */
const C = {
  page: "#f4f2ee",
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  fg: "rgba(0,0,0,0.9)",
  muted: "rgba(0,0,0,0.6)",
  faint: "rgba(0,0,0,0.45)",
  blue: "#0a66c2",
  green: "#01754f",
};

/** A blank line in `aboutMore` is a paragraph break. */
const BLANK_LINE = /\n\s*\n/;

const FONT =
  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`overflow-hidden rounded-[8px] border ${className}`}
      style={{ background: C.card, borderColor: C.border }}
    >
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] font-semibold leading-[1.4]" style={{ color: C.fg }}>
      {children}
    </h2>
  );
}

/** LinkedIn's pill buttons: filled blue, outlined blue, or outlined grey. */
function Pill({
  children,
  variant = "outline",
  href,
}: {
  children: React.ReactNode;
  variant?: "filled" | "outline" | "grey";
  href?: string;
}) {
  const styles = {
    filled: { background: C.blue, color: "#fff", border: "1px solid transparent" },
    outline: { background: "transparent", color: C.blue, border: `1px solid ${C.blue}` },
    grey: { background: "transparent", color: C.muted, border: "1px solid rgba(0,0,0,0.6)" },
  }[variant];
  const cls =
    "inline-flex h-[32px] items-center justify-center rounded-full px-[16px] text-[14px] font-semibold leading-none transition-colors";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls} style={styles}>
      {children}
    </a>
  ) : (
    <button type="button" className={cls} style={styles}>
      {children}
    </button>
  );
}

/** The grey pencil that sits in the corner of every editable LinkedIn card. */
function Pencil() {
  return (
    <svg viewBox="0 0 24 24" className="h-[24px] w-[24px] shrink-0" fill={C.muted} aria-hidden="true">
      <path d="M21.13 2.86a3 3 0 0 0-4.24 0l-13 13L2 22l6.13-1.89 13-13a3 3 0 0 0 0-4.25zM6.87 18.13l-1.5-1.5 9.62-9.63 1.51 1.5zM19.72 5.28l-1.79 1.79-1.5-1.5 1.79-1.79a1 1 0 0 1 1.41 0 1 1 0 0 1 .09 1.5z" />
    </svg>
  );
}

function Verified() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] shrink-0" fill={C.fg} aria-hidden="true">
      <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18 7 3.11V11c0 4.52-2.98 8.69-7 9.93C7.98 19.69 5 15.52 5 11V6.29l7-3.11zm-1.2 12.06L7.5 11.94l1.06-1.06 2.24 2.24 4.64-4.64 1.06 1.06-5.7 5.7z" />
    </svg>
  );
}

/** Reaction chips under a post: LinkedIn's like/celebrate/insight dots. */
function Reactions({ n, comments }: { n: number; comments?: string }) {
  return (
    <div className="flex items-center gap-[4px] text-[12px]" style={{ color: C.muted }}>
      <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#378fe9] text-[9px] text-white">
        👍
      </span>
      <span>{n}</span>
      {comments && <span className="ml-[12px]">{comments}</span>}
    </div>
  );
}


function TopCard() {
  return (
    <Card>
      {/* The banner is 4:1, the ratio LinkedIn crops uploads to. The card is
          wider than LinkedIn's own 780px column, so a strict 4:1 would make a
          280px slab of it — capped, and it crops rather than stretches. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LINKEDIN.banner}
        alt=""
        className="block aspect-[4/1] max-h-[220px] w-full object-cover"
      />

      <div className="relative px-[24px] pb-[16px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LINKEDIN.avatar}
          alt={LINKEDIN.name}
          className="-mt-[76px] h-[152px] w-[152px] rounded-full border-[4px] border-white object-cover"
        />
        <span className="absolute right-[24px] top-[16px]">
          <Pencil />
        </span>

        <div className="mt-[12px] flex flex-wrap items-start justify-between gap-[16px]">
          <div className="min-w-0">
            <h1
              className="flex items-center gap-[6px] text-[24px] font-semibold leading-[1.2]"
              style={{ color: C.fg }}
            >
              {LINKEDIN.name}
              <Verified />
            </h1>
            <p className="mt-[4px] text-[16px] leading-[1.5]" style={{ color: C.fg }}>
              {LINKEDIN.headline}
            </p>
            <p className="mt-[4px] text-[14px]" style={{ color: C.muted }}>
              {LINKEDIN.location} ·{" "}
              <span className="font-semibold" style={{ color: "#8c68cb" }}>
                Contact info
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-[8px] pt-[4px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LINKEDIN.school.logo} alt="" className="h-[32px] w-[32px] object-contain" />
            <span className="text-[14px] font-semibold" style={{ color: C.fg }}>
              {LINKEDIN.school.name}
            </span>
          </div>
        </div>

        <div className="mt-[16px] flex flex-wrap items-center gap-[8px]">
          <Pill variant="filled">Open to</Pill>
          <Pill>Add section</Pill>
          <Pill>Enhance profile</Pill>
          <span
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full border text-[14px]"
            style={{ borderColor: "rgba(0,0,0,0.6)", color: C.muted }}
          >
            •••
          </span>
        </div>

        <div className="mt-[16px] max-w-[400px] rounded-[8px] p-[12px]" style={{ background: "#dce6f1" }}>
          <div className="flex items-start justify-between gap-[8px]">
            <p className="text-[14px] font-semibold" style={{ color: C.fg }}>
              {LINKEDIN.openTo.title}
            </p>
            <Pencil />
          </div>
          <p className="mt-[2px] text-[14px]" style={{ color: C.muted }}>
            {LINKEDIN.openTo.detail}
          </p>
          <p className="mt-[2px] text-[14px] font-semibold" style={{ color: C.blue }}>
            Show details
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ── The rest of the profile ───────────────────────────────────── */

/**
 * About, with a working "… more".
 *
 * The button only exists when there is something behind it: `aboutMore` in
 * content/linkedin.ts starts empty, so today the card shows one paragraph and
 * no button. Write anything into `aboutMore` and the button appears on its
 * own — blank lines in that string become paragraph breaks.
 */
function About() {
  const [open, setOpen] = useState(false);
  const more = LINKEDIN.aboutMore.trim();

  return (
    <Card>
      <div className="p-[24px]">
        <div className="flex items-start justify-between gap-[16px]">
          <CardTitle>About</CardTitle>
          <Pencil />
        </div>
        <p className="mt-[16px] text-[14px] leading-[1.5]" style={{ color: C.fg }}>
          {LINKEDIN.about}
        </p>

        {open &&
          more.split(BLANK_LINE).map((para, i) => (
            <p key={i} className="mt-[12px] text-[14px] leading-[1.5]" style={{ color: C.fg }}>
              {para}
            </p>
          ))}

        {more && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-[8px] text-[14px] font-semibold hover:underline"
            style={{ color: C.muted }}
          >
            {open ? "see less" : "… more"}
          </button>
        )}
      </div>
    </Card>
  );
}

function Featured() {
  const f = LINKEDIN.featured;
  return (
    <Card>
      <div className="p-[24px]">
        <div className="flex items-start justify-between gap-[16px]">
          <CardTitle>Featured</CardTitle>
          <span className="flex items-center gap-[16px] text-[24px] leading-none" style={{ color: C.muted }}>
            +
            <Pencil />
          </span>
        </div>

        <div className="mt-[16px] rounded-[8px] border p-[12px]" style={{ borderColor: C.border }}>
          <p className="text-[12px]" style={{ color: C.muted }}>
            {f.kind}
          </p>
          <div className="mt-[8px] flex flex-col gap-[16px] sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.image}
              alt=""
              className="w-full shrink-0 rounded-[4px] object-cover sm:w-[240px]"
            />
            <div className="min-w-0 text-[14px] leading-[1.5]" style={{ color: C.fg }}>
              {f.body.map((p, i) => (
                <p key={i} className={i ? "mt-[12px]" : ""}>
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="mt-[12px] flex items-center justify-between">
            <Reactions n={f.reactions} />
            <span className="text-[12px]" style={{ color: C.muted }}>
              {f.comments}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Experience() {
  return (
    <Card>
      <div className="p-[24px]">
        <div className="flex items-start justify-between gap-[16px]">
          <CardTitle>Experience</CardTitle>
          <span className="flex items-center gap-[16px] text-[24px] leading-none" style={{ color: C.muted }}>
            +
            <Pencil />
          </span>
        </div>

        {LINKEDIN.experience.map((e) => (
          <div key={e.role} className="mt-[16px] flex gap-[12px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.logo} alt="" className="h-[48px] w-[48px] shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold leading-[1.4]" style={{ color: C.fg }}>
                {e.role}
              </p>
              <p className="text-[14px] leading-[1.4]" style={{ color: C.fg }}>
                {e.company} · {e.type}
              </p>
              <p className="text-[14px]" style={{ color: C.muted }}>
                {e.dates}
              </p>
              <p className="text-[14px]" style={{ color: C.muted }}>
                {e.place}
              </p>

              <p className="mt-[12px] text-[14px] leading-[1.5]" style={{ color: C.fg }}>
                • {e.bullet}{" "}
                <span className="font-semibold" style={{ color: C.muted }}>
                  more
                </span>
              </p>

              <div className="mt-[12px] flex items-center gap-[12px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.mediaThumb}
                  alt=""
                  className="h-[56px] w-[104px] rounded-[4px] border object-cover"
                  style={{ borderColor: C.border }}
                />
                <span className="text-[14px] font-semibold" style={{ color: C.fg }}>
                  {e.media}
                </span>
              </div>

              <p className="mt-[12px] text-[14px] font-semibold" style={{ color: C.fg }}>
                ▽ {e.skills}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Education() {
  return (
    <Card>
      <div className="p-[24px]">
        <div className="flex items-start justify-between gap-[16px]">
          <CardTitle>Education</CardTitle>
          <span className="flex items-center gap-[16px] text-[24px] leading-none" style={{ color: C.muted }}>
            +
            <Pencil />
          </span>
        </div>

        {LINKEDIN.education.map((e) => (
          <div key={e.school} className="mt-[16px] flex gap-[12px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.logo} alt="" className="h-[48px] w-[48px] shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold leading-[1.4]" style={{ color: C.fg }}>
                {e.school}
              </p>
              <p className="text-[14px] leading-[1.4]" style={{ color: C.fg }}>
                {e.degree}
              </p>
              <p className="text-[14px]" style={{ color: C.muted }}>
                {e.dates}
              </p>
              <p className="mt-[12px] text-[14px] font-semibold" style={{ color: C.fg }}>
                ▽ {e.skills}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Certifications() {
  return (
    <Card>
      <div className="p-[24px] pb-0">
        <div className="flex items-start justify-between gap-[16px]">
          <CardTitle>Licenses &amp; certifications ({LINKEDIN.certificationsCount})</CardTitle>
          <span className="flex items-center gap-[16px] text-[24px] leading-none" style={{ color: C.muted }}>
            +
            <Pencil />
          </span>
        </div>

        {LINKEDIN.certifications.map((c, i) => (
          <div
            key={c.title}
            className={`flex gap-[12px] py-[16px] ${i ? "border-t" : "mt-[16px]"}`}
            style={i ? { borderColor: C.border } : undefined}
          >
            {/* Oracle's mark, drawn rather than shipped as a file. */}
            <span
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[4px]"
              style={{ background: "#c74634" }}
            >
              <span className="block h-[16px] w-[26px] rounded-full border-[3px] border-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold leading-[1.4]" style={{ color: C.fg }}>
                {c.title}
              </p>
              <p className="text-[14px]" style={{ color: C.muted }}>
                {c.issuer}
              </p>
              <p className="text-[14px]" style={{ color: C.faint }}>
                {c.issued}
              </p>
              <span className="mt-[8px] inline-block">
                <Pill variant="grey">Show credential ↗</Pill>
              </span>
              <div className="mt-[12px] flex items-center gap-[12px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumb}
                  alt=""
                  className="h-[56px] w-[104px] rounded-[4px] border object-cover"
                  style={{ borderColor: C.border }}
                />
                <span className="text-[14px] font-semibold" style={{ color: C.fg }}>
                  {c.media}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p
        className="border-t py-[12px] text-center text-[16px] font-semibold"
        style={{ borderColor: C.border, color: C.muted }}
      >
        Show all {LINKEDIN.certificationsCount} licenses →
      </p>
    </Card>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export function LinkedInProfile() {
  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{ background: C.page, fontFamily: FONT, color: C.fg }}
    >
      {/* No global nav and no right rail, but the column keeps LinkedIn's own
          1128px measure and sits centred — full-bleed cards ran the About
          paragraph to an unreadable line length on a maximised window. */}
      <div className="mx-auto w-full max-w-[1128px] px-[16px] pb-[48px] pt-[24px]">
        <div className="flex w-full min-w-0 flex-col gap-[8px]">
          <TopCard />
          <About />
          <Featured />
          <Experience />
          <Education />
          <Certifications />

          {/* The one honest exit. Everything above is a frozen copy. */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-[16px] p-[24px]">
              <p className="text-[14px]" style={{ color: C.muted }}>
                This is a copy, transcribed on 28 August 2026. The live profile has moved on.
              </p>
              <Pill variant="filled" href={LINKEDIN_URL}>
                View the real profile on LinkedIn ↗
              </Pill>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
