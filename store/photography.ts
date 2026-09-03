"use client";

import { create } from "zustand";

import { type DrivePhoto, registerPhotos } from "@/components/win7/fs";
import { type MediaItem } from "@/components/win7/media";

/**
 * The Photography folder's contents, fetched from `/api/photos` the first
 * time the folder is opened — never on page load, so an idle visit costs
 * nothing. `registerPhotos` wires the result into fs.ts's tree; this store
 * exists so components have something to subscribe to and re-render on,
 * the same split `store/files.ts` uses for Notepad saves.
 */

type PhotographyStore = {
  photos: DrivePhoto[];
  status: "idle" | "loading" | "loaded" | "error";
  load: () => Promise<void>;
};

export const usePhotography = create<PhotographyStore>((set, get) => ({
  photos: [],
  status: "idle",

  load: async () => {
    if (get().status === "loading" || get().status === "loaded") return;
    set({ status: "loading" });
    try {
      const res = await fetch("/api/photos");
      const data = (await res.json()) as { photos: DrivePhoto[] };
      registerPhotos(data.photos);
      set({ photos: data.photos, status: "loaded" });
    } catch {
      set({ status: "error" });
    }
  },
}));

/** The Photography folder's contents as `PhotoViewer` already understands
 *  them — `driveId` is what its retry-on-expiry uses to re-resolve a fresh
 *  URL, `displayName` is Drive's real filename rather than something
 *  parsed out of a CDN URL. */
export function toMediaItems(photos: DrivePhoto[]): MediaItem[] {
  return photos.map((photo) => ({
    src: photo.fullUrl,
    title: photo.name,
    displayName: photo.name,
    driveId: photo.id,
    kind: "picture",
    album: "Photography",
  }));
}
