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

/** A tab with no site is a new tab, showing the search page. */
export type ChromeTab = { id: number; site: Site | null };

let nextId = 1;

const blank = (): ChromeTab => ({ id: 0, site: null });

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
};

export const useChrome = create<ChromeState>((set) => ({
  tabs: [blank()],
  activeId: 0,

  select: (id) => set({ activeId: id }),

  addTab: () =>
    set((s) => {
      const id = nextId++;
      return { tabs: [...s.tabs, { id, site: null }], activeId: id };
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
        return { tabs: s.tabs.map((t) => (t.id === active.id ? { ...t, site } : t)) };
      }

      const id = nextId++;
      return { tabs: [...s.tabs, { id, site }], activeId: id };
    }),
}));
