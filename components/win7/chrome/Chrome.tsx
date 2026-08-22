"use client";

import { useEffect, useRef, useState } from "react";

import { Clouds } from "@/components/win7/clouds/Clouds";
import { SentinelLanding } from "@/components/win7/sentinel/SentinelLanding";
import { SENTINEL, UNITWISE, useChrome, type ChromeTab } from "@/store/chrome";
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
 */
const SHORTCUTS = [
  { label: "Unitwise", hue: "#d9662e", site: UNITWISE },
  { label: "RBI Sentinel", hue: "#0d1b26", site: SENTINEL },
  { label: "GitHub", hue: "#24292f" },
  { label: "LinkedIn", hue: "#0a66c2" },
  { label: "Gmail", hue: "#d93025" },
];

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

/** A stand-in favicon: the site's colour with its initial. */
function Favicon({ hue, label, size = 13 }: { hue: string; label: string; size?: number }) {
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
  return (
    <div className="w7-drag flex h-[30px] shrink-0 items-end pl-[6px] pr-[116px]">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            // Tabs overlap by the width of their slant, so the leans interlock
            // instead of leaving a wedge of frame between every pair. The outer
            // div is the 1px outline; clip-path would eat a real border.
            style={{ clipPath: TAB_CLIP, marginRight: -8, zIndex: active ? 2 : 1 }}
            className="group h-[25px] w-[186px] shrink-0 cursor-pointer bg-[#6d82a0] px-px pt-px"
          >
            <div
              style={{ clipPath: TAB_CLIP }}
              className={`flex h-full items-center gap-[5px] px-[6px] text-[12px] ${
                active
                  ? "bg-gradient-to-b from-[#fcfcfc] to-[#f0f0f0] text-[#1a1a1a]"
                  : "bg-gradient-to-b from-[#e3eaf3] to-[#c6d3e3] text-[#3d4652] group-hover:from-[#f2f6fa] group-hover:to-[#dae3ee]"
              }`}
            >
              <ChromeMarkIcon className="ml-[7px] h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{tab.site?.title ?? "New Tab"}</span>
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
  loading,
  tab,
}: {
  onReload: () => void;
  loading: boolean;
  tab: ChromeTab | undefined;
}) {
  const [starred, setStarred] = useState(false);

  return (
    <div className="flex h-[33px] shrink-0 items-center gap-[2px] border-b border-[#9e9e9e] bg-gradient-to-b from-[#f5f5f5] to-[#dedede] px-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <ToolButton label="Back" disabled>
        <BackIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Forward" disabled>
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
          key={tab?.id}
          type="text"
          defaultValue={tab?.site?.url ?? ""}
          placeholder="Search Google or type a URL"
          aria-label="Address and search bar"
          className="min-w-0 flex-1 bg-transparent text-[12px] leading-none text-[#1a1a1a] outline-none placeholder:text-[#9b9b9b]"
        />
        <button
          type="button"
          aria-label="Bookmark this page"
          aria-pressed={starred}
          onClick={() => setStarred((s) => !s)}
          className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[2px] text-[#8a8a8a] hover:bg-[#e8e8e8]"
        >
          <StarIcon className="h-[13px] w-[13px]" filled={starred} />
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
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.site ? () => visit(s.site) : undefined}
            className="group flex w-[76px] flex-col items-center gap-[7px]"
          >
            <span className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#cfcfcf] bg-gradient-to-b from-[#fdfdfd] to-[#e4e4e4] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.12)] group-hover:from-[#ffffff] group-hover:to-[#d8e4f2] group-hover:border-[#9db8d8]">
              <Favicon hue={s.hue} label={s.label} size={22} />
            </span>
            <span className="w-full truncate text-center text-[12px] text-[#3c3c3c]">{s.label}</span>
          </button>
        ))}

        {/* Chrome's own "add one" circle, kept so the row reads as a set the
            user owns rather than a fixed list. */}
        <button type="button" className="group flex w-[76px] flex-col items-center gap-[7px]">
          <span className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#cfcfcf] bg-gradient-to-b from-[#fdfdfd] to-[#e4e4e4] text-[#5a5a5a] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.12)] group-hover:from-[#ffffff] group-hover:to-[#d8e4f2] group-hover:border-[#9db8d8]">
            <PlusIcon className="h-[15px] w-[15px]" />
          </span>
          <span className="w-full truncate text-center text-[12px] text-[#3c3c3c]">Add shortcut</span>
        </button>
      </div>
    </div>
  );
}

export function Chrome({ windowId }: { windowId: string }) {
  const close = useWindowStore((s) => s.close);
  const setTitle = useWindowStore((s) => s.setTitle);
  const { tabs, activeId, select, addTab, closeTab, reset } = useChrome();
  const [loading, setLoading] = useState(false);

  const active = tabs.find((t) => t.id === activeId);

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
    window.setTimeout(() => setLoading(false), 500);
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <TabStrip tabs={tabs} activeId={activeId} onSelect={select} onClose={onClose} onAdd={addTab} />
      <Toolbar onReload={reload} loading={loading} tab={active} />
      {/* `relative` because a page can fill itself with `absolute inset-0` —
          both project pages do. Without it that anchors to .w7-body instead
          and the page covers the tabs and the toolbar. */}
      <div className="relative min-h-0 flex-1">
        {active?.site?.url === SENTINEL.url ? (
          <SentinelLanding />
        ) : active?.site ? (
          <Clouds />
        ) : (
          <NewTabPage />
        )}
      </div>
    </div>
  );
}
