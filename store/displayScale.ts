"use client";

import { create } from "zustand";

/**
 * Windows DPI scaling — "Make text and other items larger or smaller".
 * Drives `--os-px` on `.crt` (see globals.css), so 125%/150% actually grows
 * every OS measurement, not just text. 100% is the real Win7 pixel.
 */
export type Scale = 1 | 1.25 | 1.5;

type DisplayScaleStore = {
  scale: Scale;
  setScale: (scale: Scale) => void;
};

export const useDisplayScale = create<DisplayScaleStore>((set) => ({
  scale: 1,
  setScale: (scale) => set({ scale }),
}));
