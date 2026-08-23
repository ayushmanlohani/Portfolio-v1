"use client";

import { create } from "zustand";

/**
 * The desktop's own View menu — icon size, arrangement and visibility.
 *
 * In memory only, same rule every other piece of desktop state here follows:
 * a reload gets everyone the same intended layout, nobody's session leaks
 * into the next visitor's.
 */

export type IconSize = "large" | "medium" | "small";

/** "cv" is the order the six content folders appear in Ayushman's own resume. */
export type SortMode = "name" | "size" | "cv";

type DesktopView = {
  /** "medium" is the size the desktop has always shipped at. */
  iconSize: IconSize;
  setIconSize: (size: IconSize) => void;
  /** Auto Arrange: icons snap into the default order and can't be dragged
      out of it, same as real Windows. */
  autoArrange: boolean;
  toggleAutoArrange: () => void;
  /** Align to grid: on by default, which is how every icon here has always
      moved — dragging snaps to the invisible grid. Off lets an icon land
      anywhere, pixel for pixel, the way Windows itself allows once you turn
      this off. */
  alignToGrid: boolean;
  toggleAlignToGrid: () => void;
  showIcons: boolean;
  toggleShowIcons: () => void;

  /** Sort by is a one-off action, not a mode — DesktopIcons.tsx is the one
      that actually knows every icon's position, so this just hands it a
      request to act on and clears itself once picked up. The nonce is what
      makes picking the *same* mode twice in a row still fire the effect. */
  sortRequest: { mode: SortMode; nonce: number } | null;
  requestSort: (mode: SortMode) => void;
  clearSortRequest: () => void;
};

export const useDesktopView = create<DesktopView>((set) => ({
  iconSize: "medium",
  setIconSize: (iconSize) => set({ iconSize }),

  autoArrange: false,
  toggleAutoArrange: () => set((s) => ({ autoArrange: !s.autoArrange })),

  alignToGrid: true,
  toggleAlignToGrid: () => set((s) => ({ alignToGrid: !s.alignToGrid })),

  showIcons: true,
  toggleShowIcons: () => set((s) => ({ showIcons: !s.showIcons })),

  sortRequest: null,
  requestSort: (mode) =>
    set((s) => ({ sortRequest: { mode, nonce: (s.sortRequest?.nonce ?? 0) + 1 } })),
  clearSortRequest: () => set({ sortRequest: null }),
}));
