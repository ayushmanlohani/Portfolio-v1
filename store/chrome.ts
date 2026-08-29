"use client";

import { create } from "zustand";

/**
 * Chrome's tabs.
 *
 * They live in a store rather than inside the Chrome component because things
 * outside the browser open them: double-clicking unitwise.interactive in the
 * Projects folder has to load that page in a tab, whether Chrome is already
 * running or not. Component state can't be reached from Explorer; this can.
 */

/** A page this browser can reach. There is exactly one so far. */
export type Site = { url: string; title: string };

/**
 * The Unitwise mockup. The URL is invented — it matches the file's name in
 * Projects, which is the point: it reads like a real address without
 * pretending to be one.
 */
export const UNITWISE: Site = { url: "unitwise.interactive", title: "Unitwise" };
export const SENTINEL: Site = { url: "sentinel.interactive", title: "RBI Sentinel" };
export const ABOUTME: Site = { url: "aboutme.interactive", title: "About Me" };
/** Education and Experience's own interactive files — the same About Me
 *  page, opened straight to that section. The hash is what tells Chrome and
 *  AboutMeLanding which one, and what keeps each a distinct tab from a plain
 *  About Me visit rather than the same one refocused. */
export const EDUCATION: Site = { url: "aboutme.interactive#education", title: "About Me" };
export const EXPERIENCE: Site = { url: "aboutme.interactive#experience", title: "About Me" };
/**
 * The two real addresses. Unlike the project mockups above, these URLs are
 * the genuine ones — the pages they load are hand-built snapshots, but the
 * omnibox has no reason to lie about where they live.
 */
export const GITHUB_SITE: Site = { url: "github.com/ayushmanlohani", title: "ayushmanlohani (Ayushman Lohani)" };
export const LINKEDIN_SITE: Site = { url: "linkedin.com/in/ayushmanlohani", title: "Ayushman Lohani | LinkedIn" };
/** The New Tab page itself, bookmarkable as "Google". */
export const GOOGLE: Site = { url: "google.com", title: "Google" };
export const GMAIL_SITE: Site = { url: "mailto:aayushmanlohani@gmail.com", title: "Gmail" };

/**
 * Which page an `.interactive` file loads in Chrome.
 *
 * The mapping lived inline in Explorer, repeated once per way a file can be
 * opened; it lives here now because the phone shell opens the same files and
 * a second copy of this list is exactly the duplication we are avoiding.
 * Keyed by node id from components/win7/fs.ts.
 */
export const SITE_FOR: Record<string, Site> = {
  "projects/unitwise/unitwise.interactive": UNITWISE,
  "projects/sentinel/sentinel.interactive": SENTINEL,
  "about/aboutme.interactive": ABOUTME,
  "education/education.interactive": EDUCATION,
  "experience/experience.interactive": EXPERIENCE,
};

/** A tab with no site is a new tab, showing the search page. */
export type ChromeTab = {
  id: number;
  site: Site | null;
  /** Stack of previous pages for Back — oldest first, includes `null` (New Tab). */
  backStack: (Site | null)[];
  /** Stack for Forward — newest previous is last, cleared on new navigation. */
  forwardStack: (Site | null)[];
};

let nextId = 1;

const blank = (): ChromeTab => ({ id: 0, site: null, backStack: [], forwardStack: [] });

type ChromeState = {
  tabs: ChromeTab[];
  activeId: number;
  select: (id: number) => void;
  addTab: () => void;
  /** Drops a tab. Never the last one — closing that closes the window. */
  closeTab: (id: number) => void;
  /** Back to a single new tab, for when the window closes. */
  reset: () => void;
  /**
   * Opens a site: the tab already showing it if there is one, the current tab
   * if it's blank, a new tab otherwise. Same as clicking a link in Chrome.
   */
  visit: (site: Site) => void;
  /** Per-tab history: New Tab <-> Unitwise / Sentinel etc. */
  back: () => void;
  forward: () => void;
  /** Bookmarks shown as circles on the New Tab page — toggled by the star. */
  bookmarks: Site[];
  toggleBookmark: (site: Site) => void;
};

export const useChrome = create<ChromeState>((set) => ({
  tabs: [blank()],
  activeId: 0,
  bookmarks: [UNITWISE, SENTINEL, ABOUTME, GITHUB_SITE, LINKEDIN_SITE],

  select: (id) => set({ activeId: id }),

  addTab: () =>
    set((s) => {
      const id = nextId++;
      return { tabs: [...s.tabs, { id, site: null, backStack: [], forwardStack: [] }], activeId: id };
    }),

  closeTab: (id) =>
    set((s) => {
      if (s.tabs.length <= 1) return s;
      const tabs = s.tabs.filter((t) => t.id !== id);
      return { tabs, activeId: id === s.activeId ? tabs[tabs.length - 1].id : s.activeId };
    }),

  reset: () => set({ tabs: [blank()], activeId: 0 }),

  visit: (site) =>
    set((s) => {
      const already = s.tabs.find((t) => t.site?.url === site.url);
      if (already) return { activeId: already.id };

      const active = s.tabs.find((t) => t.id === s.activeId);
      if (active && !active.site) {
        // Reuse the blank New Tab — push its null onto back so Back returns to Google.
        return {
          tabs: s.tabs.map((t) =>
            t.id === active.id
              ? { ...t, site, backStack: [...t.backStack, t.site], forwardStack: [] }
              : t,
          ),
        };
      }
      // Active tab already has a site — like a real link click, it opens in
      // a fresh tab with its own history rather than navigating in place.
      const id = nextId++;
      return { tabs: [...s.tabs, { id, site, backStack: [], forwardStack: [] }], activeId: id };
    }),

  back: () =>
    set((s) => {
      const active = s.tabs.find((t) => t.id === s.activeId);
      if (!active || active.backStack.length === 0) return s;
      const prev = active.backStack[active.backStack.length - 1];
      return {
        tabs: s.tabs.map((t) =>
          t.id === active.id
            ? {
                ...t,
                site: prev,
                backStack: t.backStack.slice(0, -1),
                forwardStack: [...t.forwardStack, t.site],
              }
            : t,
        ),
      };
    }),

  forward: () =>
    set((s) => {
      const active = s.tabs.find((t) => t.id === s.activeId);
      if (!active || active.forwardStack.length === 0) return s;
      const next = active.forwardStack[active.forwardStack.length - 1];
      return {
        tabs: s.tabs.map((t) =>
          t.id === active.id
            ? {
                ...t,
                site: next,
                backStack: [...t.backStack, t.site],
                forwardStack: t.forwardStack.slice(0, -1),
              }
            : t,
        ),
      };
    }),

  toggleBookmark: (site) =>
    set((s) => {
      const exists = s.bookmarks.some((b) => b.url === site.url);
      return {
        bookmarks: exists ? s.bookmarks.filter((b) => b.url !== site.url) : [...s.bookmarks, site],
      };
    }),
}));
