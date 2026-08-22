"use client";

import { create } from "zustand";

export type WallpaperEntry = {
  id: string;
  src: string;
  type: "image" | "video";
  label: string;
};

export const WALLPAPERS: WallpaperEntry[] = [
  {
    id: "win7-harmony",
    src: "/letterbox/Z0Ts3J2-windows-7-official-wallpapers.jpg",
    type: "image",
    label: "Windows 7",
  },
];

export const LIVE_WALLPAPERS: WallpaperEntry[] = [
  {
    id: "live-island",
    src: "/letterbox/wallpaper-1440.mp4",
    type: "video",
    label: "Island",
  },
];

type WallpaperStore = {
  current: WallpaperEntry;
  pending: WallpaperEntry | null;
  confirming: boolean;
  select: (entry: WallpaperEntry) => void;
  confirm: () => void;
  cancel: () => void;
};

export const useWallpaper = create<WallpaperStore>((set, get) => ({
  current: WALLPAPERS[0],
  pending: null,
  confirming: false,

  select: (entry) => set({ pending: entry, confirming: true }),

  confirm: () => {
    const { pending } = get();
    if (pending) set({ current: pending, pending: null, confirming: false });
  },

  cancel: () => set({ pending: null, confirming: false }),
}));
