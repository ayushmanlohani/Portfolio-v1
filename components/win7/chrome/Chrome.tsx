"use client";

import { useEffect, useRef, useState } from "react";

import { Clouds } from "@/components/win7/clouds/Clouds";
import { SentinelLanding } from "@/components/win7/sentinel/SentinelLanding";
import { AboutMeLanding } from "@/components/win7/aboutme/AboutMeLanding";
import { GitHubProfile } from "@/components/win7/github/GitHubProfile";
import { LinkedInProfile } from "@/components/win7/linkedin/LinkedInProfile";
import { CONTACT } from "@/content/contact";
import {
  ABOUTME,
  GITHUB_SITE,
  GMAIL_SITE,
  GOOGLE,
  LINKEDIN_SITE,
  SENTINEL,
  UNITWISE,
  useChrome,
  type ChromeTab,
} from "@/store/chrome";
import { useWindowStore } from "@/store/windows";

import {
  BackIcon,
  ChromeMarkIcon,
  CloseIcon,
  ForwardIcon,
  LockIcon,
  PlusIcon,
  ReloadIcon,
  SearchGlassIcon,
  StarIcon,
  StopIcon,
  WrenchIcon,
} from "./icons";

/**
 * Google Chrome as it looked on Windows 7 — roughly Chrome 13, 2011.
 *
 * That means the *old* Chrome, not today's: trapezoid tabs that overlap and
 * sit on the window frame, a grey gradient toolbar, a square-cornered omnibox
 * with the star inside it, a wrench for the menu, and the Most Visited
 * thumbnail wall as the new tab page. No avatar chip, no puzzle piece, no
 * pill-shaped search bar — none of that existed yet.
 *
 * Nothing here browses anywhere. The omnibox doesn't navigate, bookmarks
 * don't open, the star doesn't save. It's a shell to wire real behaviour into
 * one button at a time. Everything Chrome-specific lives in this folder; the
 * outside touches are the ordinary "new app" wiring (apps.ts, fs.ts,
 * DesktopIcons.tsx, StartMenu.tsx, WindowLayer.tsx, globals.css).
 */

/**
 * The tab outline. Chrome's tabs aren't rectangles — they lean outward and
 * overlap their neighbours, which is what makes the strip read as tabs on a
 * window frame rather than buttons in a row.
 */
const TAB_CLIP =
  "polygon(0 100%, 5px 55%, 17px 0, calc(100% - 17px) 0, calc(100% - 5px) 55%, 100% 100%)";

/** Same lean, scaled down — a tab's 17px slant would leave the nub a triangle. */
const NUB_CLIP =
  "polygon(0 100%, 3px 55%, 9px 0, calc(100% - 9px) 0, calc(100% - 3px) 55%, 100% 100%)";

/**
 * The shortcut circles under the search box — Ayushman's bookmarks, moved
 * off the bookmarks bar and onto the page where he wanted them.
 *
 * Bookmarked sites (Unitwise, Sentinel, Google) come from the bookmark store
 * so starring/unstarring is reflected here. The rest are static shortcuts
 * that are always shown — they have no Site, so the star never touches them.
 *
 * GitHub, LinkedIn and Gmail all carry a `site`, so clicking any of them
 * loads a page like any other bookmark. Gmail's page isn't a real inbox —
 * there's nothing behind it to fake — just the address to reach him at.
 */
const STATIC_SHORTCUTS: { label: string; hue: string; site?: typeof GITHUB_SITE; icon: React.ReactNode }[] = [
  { label: "GitHub", hue: "#24292f", site: GITHUB_SITE, icon: <GitHubMark /> },
  { label: "LinkedIn", hue: "#0a66c2", site: LINKEDIN_SITE, icon: <LinkedInMark /> },
  { label: "Gmail", hue: "#ffffff", site: GMAIL_SITE, icon: <GmailMark /> },
];

function bookmarkHue(site: { url: string }): string {
  if (site.url === UNITWISE.url) return "#d9662e";
  if (site.url === SENTINEL.url) return "#0d1b26";
  if (site.url === ABOUTME.url) return "#F76240";
  if (site.url === GOOGLE.url) return "#4285f4";
  if (site.url === GITHUB_SITE.url) return "#24292f";
  if (site.url === LINKEDIN_SITE.url) return "#0a66c2";
  return "#5a5a5a";
}

/**
 * Google's wordmark in the colours it wore through the Windows 7 years — the
 * serif logo it kept until 2015, not today's flat sans one. Blue, red,
 * yellow, blue, green, red, in that order, every time.
 */
const WORDMARK = [
  ["G", "#3369e8"],
  ["o", "#d50f25"],
  ["o", "#eeb211"],
  ["g", "#3369e8"],
  ["l", "#009925"],
  ["e", "#d50f25"],
] as const;

/** Raised-grey button styling, shared by the toolbar and the bookmarks bar. */
const RAISED =
  "border border-transparent hover:border-[#a9a9a9] hover:bg-gradient-to-b hover:from-[#fdfdfd] hover:to-[#e3e3e3] active:bg-gradient-to-b active:from-[#dcdcdc] active:to-[#eeeeee]";

function ToolButton({
  children,
  label,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-[26px] w-[27px] shrink-0 items-center justify-center rounded-[2px] ${
        disabled ? "border border-transparent text-[#b6b6b6]" : `text-[#4d4d4d] ${RAISED}`
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A site's favicon: its real mark when there is one — a project's own logo
 * image, or a hand-drawn brand glyph for GitHub/LinkedIn/Gmail — falling back
 * to the site's colour with its initial for everything else.
 */
function Favicon({
  hue,
  label,
  size = 13,
  imgSrc,
  icon,
}: {
  hue: string;
  label: string;
  size?: number;
  imgSrc?: string;
  icon?: React.ReactNode;
}) {
  if (imgSrc) {
    return (
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] bg-white"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  if (icon) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-[2px]"
        style={{ background: hue, width: size, height: size }}
        aria-hidden="true"
      >
        {icon}
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[2px] font-bold leading-none text-white"
      style={{ background: hue, width: size, height: size, fontSize: Math.round(size * 0.62) }}
      aria-hidden="true"
    >
      {label[0]}
    </span>
  );
}

/** GitHub's Octocat mark — the same path used on the profile page's header, sized for a 22px favicon. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="#fff" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** LinkedIn's "in" mark, set the way the real badge does. */
function LinkedInMark() {
  return (
    <span
      className="font-bold leading-none text-white"
      style={{ fontSize: 13, fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: "-0.02em" }}
      aria-hidden="true"
    >
      in
    </span>
  );
}

/** Gmail's envelope mark — the same path used on the Gmail page. */
function GmailMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" aria-hidden="true">
      <path
        fill="#ea4335"
        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.933l9.431 7.396 9.431-7.396h.933c.904 0 1.636.732 1.636 1.636Z"
      />
    </svg>
  );
}

/** The real project logos, for the two bookmarks that have one. */
const BOOKMARK_IMG: Record<string, string> = {
  [UNITWISE.url]: "/letterbox/unitwise-logo.png",
  [SENTINEL.url]: "/letterbox/sentinel.png",
};

function TabStrip({
  tabs,
  activeId,
  onSelect,
  onClose,
  onAdd,
}: {
  tabs: ChromeTab[];
  activeId: number;
  onSelect: (id: number) => void;
  onClose: (id: number) => void;
  onAdd: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripW, setStripW] = useState(0);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () => setStripW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Real Chrome: full 186px until strip would overflow, then shrink fluidly.
  // Available = strip width minus the 6px left + 116px right padding that keeps
  // the caption buttons (min/max/close) clear. Tabs overlap by 8px, nub is
  // 42px + 14px gap = 56px.
  const TAB_MAX = 186;
  const TAB_MIN = 48;
  const OVERLAP = 8;
  const NUB_TOTAL = 56;
  const n = tabs.length;
  const available = Math.max(0, stripW - 6 - 116);
  const ideal = n > 0 ? (available - NUB_TOTAL + (n - 1) * OVERLAP) / n : TAB_MAX;
  const tabW = stripW === 0 ? TAB_MAX : Math.max(TAB_MIN, Math.min(TAB_MAX, Math.floor(ideal)));

  return (
    <div ref={stripRef} className="chrome-tabstrip w7-drag flex h-[30px] shrink-0 items-end overflow-hidden pl-[6px] pr-[116px]">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            // Tabs overlap by the width of their slant, so the leans interlock
            // instead of leaving a wedge of frame between every pair. The outer
            // div is the 1px outline; clip-path would eat a real border.
            style={{
              clipPath: TAB_CLIP,
              marginRight: -8,
              zIndex: active ? 2 : 1,
              width: tabW,
              minWidth: tabW,
              maxWidth: tabW,
              transition: "width 150ms cubic-bezier(0.22, 0.61, 0.36, 1)",
            }}
            className="group flex h-[25px] shrink-0 cursor-pointer bg-[#6d82a0] px-px pt-px"
          >
            <div
              style={{ clipPath: TAB_CLIP }}
              className={`flex h-full w-full min-w-0 items-center gap-[5px] overflow-hidden px-[6px] text-[12px] ${
                active
                  ? "bg-gradient-to-b from-[#fcfcfc] to-[#f0f0f0] text-[#1a1a1a]"
                  : "bg-gradient-to-b from-[#e3eaf3] to-[#c6d3e3] text-[#3d4652] group-hover:from-[#f2f6fa] group-hover:to-[#dae3ee]"
              }`}
            >
              <ChromeMarkIcon className="ml-[7px] h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{tab.site?.title ?? "New Tab"}</span>
              <button
                type="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className={`mr-[8px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[2px] text-[#6b6b6b] hover:bg-[#d24a3d] hover:text-white ${
                  active ? "" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <CloseIcon className="h-[9px] w-[9px]" />
              </button>
            </div>
          </div>
        );
      })}

      {/* The half-height nub Chrome used for "new tab", same lean as a tab. */}
      <button
        type="button"
        aria-label="New tab"
        onClick={onAdd}
        style={{ clipPath: NUB_CLIP }}
        className="ml-[14px] flex h-[15px] w-[42px] shrink-0 items-center justify-center bg-gradient-to-b from-[#e8eef6]/90 to-[#c3d1e1]/90 text-[#414d5d] hover:from-[#f7fafd] hover:to-[#d8e3f0]"
      >
        <PlusIcon className="h-[9px] w-[9px]" />
      </button>
    </div>
  );
}

function Toolbar({
  onReload,
  onBack,
  onForward,
  canBack,
  canForward,
  loading,
  tab,
}: {
  onReload: () => void;
  onBack: () => void;
  onForward: () => void;
  canBack: boolean;
  canForward: boolean;
  loading: boolean;
  tab: ChromeTab | undefined;
}) {
  // Draft lets the omnibox stay editable while always snapping back to the
  // tab's real URL on navigation (back/forward/visit/new-tab) — defaultValue
  // with key={tab?.id} only reset on new tabs, so back to New Tab kept the
  // old url visible. Controlled `value` synced to tab.site fixes every page.
  const [draft, setDraft] = useState(tab?.site?.url ?? "");
  useEffect(() => {
    setDraft(tab?.site?.url ?? "");
  }, [tab?.site?.url]);

  // Star is yellow when the current page is bookmarked. On New Tab the star
  // bookmarks Google itself, otherwise it bookmarks the Site the tab is on.
  const bookmarks = useChrome((s) => s.bookmarks);
  const toggleBookmark = useChrome((s) => s.toggleBookmark);
  const currentSite = tab?.site ?? GOOGLE;
  const isBookmarked = bookmarks.some((b) => b.url === currentSite.url);

  return (
    <div className="flex h-[33px] shrink-0 items-center gap-[2px] border-b border-[#9e9e9e] bg-gradient-to-b from-[#f5f5f5] to-[#dedede] px-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <ToolButton label="Back" disabled={!canBack} onClick={onBack}>
        <BackIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Forward" disabled={!canForward} onClick={onForward}>
        <ForwardIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton label={loading ? "Stop" : "Reload"} onClick={onReload}>
        {loading ? <StopIcon className="h-[13px] w-[13px]" /> : <ReloadIcon className="h-4 w-4" />}
      </ToolButton>

      {/* The omnibox: square corners, a hairline border and an inset shadow —
           a sunken field, not the floating pill Chrome uses now. The star sits
           inside it, at the right end, where 2011 put it. */}
      <div className="mx-[4px] flex h-[24px] flex-1 items-center gap-[5px] rounded-[2px] border border-[#a5a5a5] bg-white px-[4px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.13)] focus-within:border-[#5a8fd6] focus-within:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_0_3px_rgba(90,143,214,0.75)]">
        <LockIcon className="h-[14px] w-[14px] shrink-0" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search Google or type a URL"
          aria-label="Address and search bar"
          className="min-w-0 flex-1 bg-transparent text-[12px] leading-none text-[#1a1a1a] outline-none placeholder:text-[#9b9b9b]"
        />
        <button
          type="button"
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
          aria-pressed={isBookmarked}
          onClick={() => toggleBookmark(currentSite)}
          className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[2px] text-[#8a8a8a] hover:bg-[#e8e8e8]"
          title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
        >
          <StarIcon className="h-[13px] w-[13px]" filled={isBookmarked} />
        </button>
      </div>

      {/* The wrench. Chrome had exactly one menu button in 2011. */}
      <ToolButton label="Customize and control Google Chrome">
        <WrenchIcon className="h-[15px] w-[15px]" />
      </ToolButton>
    </div>
  );
}

/**
 * The new tab page: the Google wordmark, a search box, and Ayushman's
 * bookmarks as shortcut circles under it.
 *
 * The arrangement is the one he asked for, dressed for 2011 — the serif
 * wordmark in its old six colours, a square-cornered sunken search field
 * rather than a floating pill, and glossy Aero circles instead of today's
 * flat grey ones. (The real 2011 new tab page had no search box at all; it
 * was a wall of thumbnails. This is deliberately his layout, not Chrome's.)
 */
function NewTabPage() {
  const visit = useChrome((s) => s.visit);
  const bookmarks = useChrome((s) => s.bookmarks);

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto bg-white px-[24px] pt-[9%] pb-[32px]">
      <h1 className="flex select-none items-baseline text-[62px] leading-none tracking-[-0.02em]">
        {WORDMARK.map(([letter, hue], i) => (
          <span
            key={i}
            style={{
              color: hue,
              fontFamily: "Georgia, 'Times New Roman', serif",
              // The old logo had a real drop shadow under it — that soft
              // offset grey is half of what makes it read as pre-2015.
              textShadow: "1px 1px 2px rgba(0,0,0,0.28)",
            }}
          >
            {letter}
          </span>
        ))}
      </h1>

      <div className="mt-[30px] flex h-[32px] w-full max-w-[540px] items-center gap-[8px] rounded-[2px] border border-[#a5a5a5] bg-white px-[9px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)] focus-within:border-[#5a8fd6] focus-within:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_0_4px_rgba(90,143,214,0.7)]">
        <SearchGlassIcon className="h-[15px] w-[15px] shrink-0 text-[#9b9b9b]" />
        <input
          type="text"
          placeholder="Search Google or type a URL"
          aria-label="Search Google"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#9b9b9b]"
        />
      </div>

      <div className="mt-[42px] flex flex-wrap justify-center gap-x-[22px] gap-y-[18px]">
        {/* Sites with their own static shortcut (GitHub, LinkedIn) render once,
            down in STATIC_SHORTCUTS — bookmarking them shouldn't draw a second circle. */}
        {bookmarks
          .filter((site) => !STATIC_SHORTCUTS.some((s) => s.site?.url === site.url))
          .map((site) => (
          <button
            key={site.url}
            type="button"
            onClick={() => visit(site)}
            className="group flex w-[76px] flex-col items-center gap-[7px]"
            title={site.url}
          >
            <span className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#cfcfcf] bg-gradient-to-b from-[#fdfdfd] to-[#e4e4e4] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.12)] group-hover:from-[#ffffff] group-hover:to-[#d8e4f2] group-hover:border-[#9db8d8]">
              <Favicon hue={bookmarkHue(site)} label={site.title} size={22} imgSrc={BOOKMARK_IMG[site.url]} />
            </span>
            <span className="w-full truncate text-center text-[12px] text-[#3c3c3c]">{site.title}</span>
          </button>
        ))}
        {STATIC_SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.site ? () => visit(s.site!) : undefined}
            title={s.site?.url}
            className="group flex w-[76px] flex-col items-center gap-[7px]"
          >
            <span className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#cfcfcf] bg-gradient-to-b from-[#fdfdfd] to-[#e4e4e4] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.12)] group-hover:from-[#ffffff] group-hover:to-[#d8e4f2] group-hover:border-[#9db8d8]">
              <Favicon hue={s.hue} label={s.label} size={22} icon={s.icon} />
            </span>
            <span className="w-full truncate text-center text-[12px] text-[#3c3c3c]">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Gmail's "page" — there's no inbox behind it, just the address itself: the
 * envelope mark, big, with the address underneath. Same treatment as the
 * GitHub/LinkedIn snapshots, minus the pretense of a live product.
 */
function GmailPage() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[28px] bg-white">
      <div
        className="flex h-[168px] w-[168px] items-center justify-center rounded-[28px]"
        style={{ background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.1)" }}
      >
        <svg viewBox="0 0 24 24" className="h-[104px] w-[104px]" aria-hidden="true">
          <path
            fill="#ea4335"
            d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.933l9.431 7.396 9.431-7.396h.933c.904 0 1.636.732 1.636 1.636Z"
          />
        </svg>
      </div>
      <p className="text-[20px] font-medium" style={{ color: "#3c4043" }}>
        {CONTACT.email}
      </p>
    </div>
  );
}

export function Chrome({ windowId }: { windowId: string }) {
  const close = useWindowStore((s) => s.close);
  const setTitle = useWindowStore((s) => s.setTitle);
  const { tabs, activeId, select, addTab, closeTab, reset, back, forward } = useChrome();
  const [loading, setLoading] = useState(false);

  const active = tabs.find((t) => t.id === activeId);
  const canBack = !!active && active.backStack.length > 0;
  const canForward = !!active && active.forwardStack.length > 0;

  // The taskbar button reads the window's title, not the tab strip, so it has
  // to be kept in sync with whichever tab is active — otherwise every Chrome
  // window says "New Tab" forever, since that's the title it opened with.
  useEffect(() => {
    setTitle(
      windowId,
      active?.site ? `${active.site.title} - Google Chrome` : "New Tab - Google Chrome",
    );
  }, [windowId, active?.site, setTitle]);

  // The tab strip lives in a store, not component state, so that a
  // double-click on unitwise.interactive in Explorer can load a tab whether
  // Chrome is running or not. That means it also outlives the window unless
  // something clears it: closing the caption's own × button unmounts this
  // component without ever touching `tabs`, so without this, reopening
  // Chrome from the desktop icon reopened it wherever it was left rather
  // than on the start page. One reset on unmount covers every way the
  // window can close — the × button, the taskbar, Alt+F4, all of them —
  // rather than reimplementing it per close path.
  //
  // The reset is debounced through a ref rather than called straight from
  // the cleanup: React's dev-only Strict Mode rehearses every mount by
  // firing it, running its cleanup immediately, then mounting again — and a
  // bare `useEffect(() => reset, [reset])` treated that rehearsal as a real
  // close, wiping `visit(UNITWISE)` a moment after Explorer had just set it.
  // The settled mount that follows cancels the pending reset; only a unmount
  // with no mount behind it (a real close) lets the timeout run.
  const resetTimer = useRef<number | null>(null);
  useEffect(() => {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    return () => {
      resetTimer.current = window.setTimeout(() => {
        resetTimer.current = null;
        reset();
      }, 0);
    };
  }, [reset]);

  const [reloadKey, setReloadKey] = useState(0);

  function onClose(id: number) {
    // Closing the last tab closes the browser, same as the real thing.
    if (tabs.length <= 1) {
      close(windowId);
      return;
    }
    closeTab(id);
  }

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
    window.setTimeout(() => setLoading(false), 500);
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <TabStrip tabs={tabs} activeId={activeId} onSelect={select} onClose={onClose} onAdd={addTab} />
      <Toolbar onReload={reload} onBack={back} onForward={forward} canBack={canBack} canForward={canForward} loading={loading} tab={active} />
      {/* `relative` because a page can fill itself with `absolute inset-0` —
          both project pages do. Without it that anchors to .w7-body instead
          and the page covers the tabs and the toolbar. */}
      <div key={`${active?.id}-${reloadKey}`} className="relative min-h-0 flex-1">
        {active?.site?.url === SENTINEL.url ? (
          <SentinelLanding />
        ) : active?.site?.url.startsWith(ABOUTME.url) ? (
          <AboutMeLanding scrollTo={active.site.url.split("#")[1]} />
        ) : active?.site?.url === GITHUB_SITE.url ? (
          <GitHubProfile />
        ) : active?.site?.url === LINKEDIN_SITE.url ? (
          <LinkedInProfile />
        ) : active?.site?.url === GMAIL_SITE.url ? (
          <GmailPage />
        ) : active?.site?.url === GOOGLE.url ? (
          <NewTabPage />
        ) : active?.site ? (
          <Clouds />
        ) : (
          <NewTabPage />
        )}
      </div>
    </div>
  );
}
