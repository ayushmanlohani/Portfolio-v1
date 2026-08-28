"use client";

import { create } from "zustand";

export type WindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OpenWindow = WindowBounds & {
  /** Matches the id of the desktop item that spawned it. */
  id: string;
  title: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Bounds to return to when un-maximising. */
  restore: WindowBounds | null;
};

/** Size of the desktop the window opens onto — the glass, not the browser. */
export type Desk = { w: number; h: number };

type OpenOptions = {
  title: string;
  width: number;
  height: number;
  desk: Desk;
};

/**
 * Central window manager. Every window lives here rather than inside the
 * component that renders it, so a dock/taskbar (or window restore, or
 * persistence) can be layered on later by reading this store — no rewrite of
 * the window components required.
 */
type WindowStore = {
  windows: OpenWindow[];
  /** Monotonic counter; the focused window always holds the current value. */
  topZ: number;
  /** Number of windows opened this session — drives the cascade offset. */
  spawnCount: number;
  /**
   * Ids kept on the taskbar whether or not they are running. A pinned id with
   * no window draws a button that launches it; a pinned id that IS running
   * shares the one button its window already has, the way Windows merges the
   * two rather than showing the app twice.
   *
   * In memory only, so a reload clears it — same choice as desktop icon
   * positions. localStorage is a few lines if that turns out to be wrong.
   */
  pinned: string[];
  pin: (id: string) => void;
  unpin: (id: string) => void;

  open: (id: string, options: OpenOptions) => void;
  close: (id: string) => void;
  /** Explorer calls this as it navigates, so a window is named where it IS. */
  setTitle: (id: string, title: string) => void;
  focus: (id: string) => void;
  setBounds: (id: string, bounds: Partial<WindowBounds>) => void;
  minimize: (id: string) => void;
  /** Show Desktop — minimises everything, or restores it if nothing is up. */
  toggleShowDesktop: () => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string, desk: Desk) => void;
  closeAll: () => void;
};

const CASCADE_STEP = 34;
/** Windows' taskbar. Maximised windows stop above it, same as the real thing. */
const TASKBAR = 40;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

/** Full-screen bounds for a maximised window: the desktop minus the taskbar. */
export const maximizedBounds = (desk: Desk): WindowBounds => ({
  x: 0,
  y: 0,
  width: desk.w,
  height: Math.max(120, desk.h - TASKBAR),
});

/**
 * Places each new window one step down-right of the last, wrapping after 6.
 * The anchor is deliberately independent of window size — deriving it from
 * width/height centred every window on the same point, so a smaller window
 * opened first would vanish completely behind a larger one.
 */
function cascadePosition(spawnCount: number, width: number, height: number, desk: Desk) {
  const step = (spawnCount % 6) * CASCADE_STEP;
  // Clears the desktop icon column on the left.
  const anchorX = Math.max(96, desk.w * 0.1);
  const anchorY = Math.max(20, desk.h * 0.08);

  return {
    x: clamp(anchorX + step, 8, desk.w - width - 8),
    y: clamp(anchorY + step, 8, desk.h - TASKBAR - height - 8),
  };
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 10,
  spawnCount: 0,
  pinned: [],

  pin: (id) =>
    set((state) =>
      state.pinned.includes(id) ? state : { pinned: [...state.pinned, id] },
    ),

  unpin: (id) => set((state) => ({ pinned: state.pinned.filter((p) => p !== id) })),

  open: (id, { title, width, height, desk }) => {
    // Re-opening an already-open window un-minimises it and pulls it forward.
    if (get().windows.some((w) => w.id === id)) {
      get().restore(id);
      return;
    }

    set((state) => {
      const z = state.topZ + 1;
      const w = clamp(width, 280, Math.max(280, desk.w - 24));
      const h = clamp(height, 220, Math.max(220, desk.h - TASKBAR - 24));

      return {
        topZ: z,
        spawnCount: state.spawnCount + 1,
        windows: [
          ...state.windows,
          {
            id,
            title,
            width: w,
            height: h,
            z,
            minimized: false,
            maximized: false,
            restore: null,
            ...cascadePosition(state.spawnCount, w, h, desk),
          },
        ],
      };
    });
  },

  close: (id) =>
    set((state) => ({ windows: state.windows.filter((w) => w.id !== id) })),

  setTitle: (id, title) =>
    set((state) => {
      // Called from an effect on every navigation. Bailing out when nothing
      // changed is what keeps that from looping.
      const target = state.windows.find((w) => w.id === id);
      if (!target || target.title === title) return state;

      return {
        windows: state.windows.map((w) => (w.id === id ? { ...w, title } : w)),
      };
    }),

  focus: (id) =>
    set((state) => {
      const target = state.windows.find((w) => w.id === id);
      // Already frontmost and visible — skip the update so dragging doesn't
      // thrash state.
      if (!target || (target.z === state.topZ && !target.minimized)) return state;

      const z = state.topZ + 1;
      return {
        topZ: z,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, z, minimized: false } : w,
        ),
      };
    }),

  setBounds: (id, bounds) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, ...bounds } : w)),
    })),

  minimize: (id) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    })),

  /** Show Desktop. Windows toggles: if everything is already down, put it back. */
  toggleShowDesktop: () =>
    set((state) => {
      const anyVisible = state.windows.some((w) => !w.minimized);
      return {
        windows: state.windows.map((w) => ({ ...w, minimized: anyVisible })),
      };
    }),

  restore: (id) => get().focus(id),

  toggleMaximize: (id, desk) =>
    set((state) => {
      const z = state.topZ + 1;
      return {
        topZ: z,
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.maximized) {
            // `restore` can be null only if state was seeded maximised; falling
            // back to the current box keeps the window on screen either way.
            const back = w.restore ?? { x: w.x, y: w.y, width: w.width, height: w.height };
            return { ...w, ...back, maximized: false, restore: null, z, minimized: false };
          }
          return {
            ...w,
            restore: { x: w.x, y: w.y, width: w.width, height: w.height },
            ...maximizedBounds(desk),
            maximized: true,
            z,
            minimized: false,
          };
        }),
      };
    }),

  closeAll: () => set({ windows: [] }),
}));
