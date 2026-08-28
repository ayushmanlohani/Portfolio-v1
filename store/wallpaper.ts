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
  {
    id: "moraine-lake",
    src: "/letterbox/wallpaper/wp10712770-windows-nature-wallpapers.jpg",
    type: "image",
    label: "Moraine Lake",
  },
  {
    id: "maldives",
    src: "/letterbox/wallpaper/wp12288247-nature-windows-wallpapers.jpg",
    type: "image",
    label: "Maldives",
  },
  {
    id: "aero-leaves",
    src: "/letterbox/wallpaper/wp13865974-windows-aero-wallpapers.png",
    type: "image",
    label: "Aero Leaves",
  },
  {
    id: "w7-glow",
    src: "/letterbox/wallpaper/wp14261814-w7-wallpapers.jpg",
    type: "image",
    label: "Windows 7 Glow",
  },
  {
    id: "coastal-sunset",
    src: "/letterbox/wallpaper/wp14261826-w7-wallpapers.jpg",
    type: "image",
    label: "Coastal Sunset",
  },
  {
    id: "bliss-hills",
    src: "/letterbox/wallpaper/wp14261828-w7-wallpapers.jpg",
    type: "image",
    label: "Bliss Hills",
  },
  {
    id: "rolling-hills",
    src: "/letterbox/wallpaper/wp15133312-windows-7-nature-wallpapers.webp",
    type: "image",
    label: "Rolling Hills",
  },
  {
    id: "sandstone-wave",
    src: "/letterbox/wallpaper/wp15133315-windows-7-nature-wallpapers.webp",
    type: "image",
    label: "Sandstone Wave",
  },
  {
    id: "flying-turtle",
    src: "/letterbox/wallpaper/wp4474573-characters-wallpapers.jpg",
    type: "image",
    label: "Flying Turtle",
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
