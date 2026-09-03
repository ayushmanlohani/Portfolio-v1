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
  refresh: () => Promise<void>;
};

// Module-level, not store state — a second `refresh()` call while one is
// already in flight (e.g. several expired thumbnails failing at once)
// should await the same request rather than firing its own, so N
// simultaneously-stale images share one network round trip.
let inFlight: Promise<void> | null = null;

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

  // Used to self-heal an expired Drive link. Unlike `load()`, this always
  // hits the network with `cache: "no-store"` — a plain `fetch("/api/photos")`
  // is still served by app/api/photos/route.ts's 30-minute ISR cache, so a
  // retry moments after a link expires can get back the very same expired
  // response and the caller's one-shot retry guard then gives up for good.
  refresh: () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const res = await fetch("/api/photos", { cache: "no-store" });
        const data = (await res.json()) as { photos: DrivePhoto[] };
        registerPhotos(data.photos);
        set({ photos: data.photos, status: "loaded" });
      } catch {
        // Leave the existing (stale) photos in place — a failed refresh
        // shouldn't blank out what was already showing.
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
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
