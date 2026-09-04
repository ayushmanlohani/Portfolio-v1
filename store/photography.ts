"use client";

import { createElement, useRef, type ReactElement } from "react";
import { create } from "zustand";

import { type FsNode, setFolderContents } from "@/components/win7/fs";
import { type MediaItem } from "@/components/win7/media";

/**
 * The Photography folder's contents, fetched from `/api/photos` the first
 * time the folder is opened — never on page load, so an idle visit costs
 * nothing. `setFolderContents` wires the result into fs.ts's tree; this
 * store is what components subscribe to for the re-render, the same split
 * `store/files.ts` uses for Notepad saves.
 *
 * Everything Drive-shaped lives here rather than in fs.ts, so the file tree
 * stays a plain tree and the dependency runs one way.
 */

/** A photo synced from Google Drive's "Photography" folder — see
 *  app/api/photos/route.ts for how these fields are produced. `id` is
 *  Drive's own file id, stable across re-fetches, which is what makes it
 *  safe to key a window or a retry on rather than the URL. */
export type DrivePhoto = {
  id: string;
  name: string;
  thumbUrl: string;
  fullUrl: string;
};

export const DRIVE_PHOTOS_PREFIX = "drivephoto:";

type PhotographyStore = {
  photos: DrivePhoto[];
  /** `force` re-asks Drive rather than settling for the route's 30-minute
   *  cache — what an expired thumbnail and Explorer's Refresh both need. */
  load: (force?: boolean) => Promise<void>;
};

// Module-level, not store state — concurrent callers (several thumbnails
// expiring at once) await the same request instead of each firing its own.
let inFlight: Promise<void> | null = null;

export const usePhotography = create<PhotographyStore>((set, get) => ({
  photos: [],

  load: (force = false) => {
    if (inFlight) return inFlight;
    if (!force && get().photos.length) return Promise.resolve();

    inFlight = (async () => {
      try {
        const res = await fetch(force ? "/api/photos?fresh=1" : "/api/photos");
        const { photos } = (await res.json()) as { photos: DrivePhoto[] };
        setFolderContents("photography", photos.map(photoNode));
        set({ photos });
      } catch {
        // Leave whatever was already showing in place — a failed reload
        // shouldn't blank the folder out.
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));

export const photoById = (id: string) => usePhotography.getState().photos.find((p) => p.id === id);

/**
 * One stable icon component per Drive photo id, cached so a reload
 * re-registers the *same* component: React then re-renders only the tile
 * whose data changed instead of remounting the whole grid. Each one reads
 * its own photo out of the store by id, so a fresh `thumbUrl` reaches it
 * with no plumbing of its own.
 *
 * Drive's `thumbnailLink` is short-lived (~1 hour), so one failed load
 * re-asks Drive and a second gives up rather than looping. Its
 * lh3.googleusercontent.com URLs also reject any request carrying a
 * Referer at all — hence `no-referrer`, without which every thumbnail
 * fails unconditionally.
 */
const icons = new Map<string, (props: { className?: string }) => ReactElement>();

function driveThumbnail(photoId: string) {
  const cached = icons.get(photoId);
  if (cached) return cached;

  const DriveThumbnail = ({ className }: { className?: string }) => {
    const photo = usePhotography((s) => s.photos.find((p) => p.id === photoId));
    const retried = useRef(false);
    return createElement("img", {
      className: `fs-thumb ${className ?? ""}`.trim(),
      src: photo?.thumbUrl,
      alt: "",
      loading: "lazy",
      referrerPolicy: "no-referrer",
      onError: () => {
        if (retried.current) return;
        retried.current = true;
        usePhotography.getState().load(true);
      },
    });
  };
  DriveThumbnail.displayName = `DriveThumbnail(${photoId})`;
  icons.set(photoId, DriveThumbnail);
  return DriveThumbnail;
}

const photoNode = (photo: DrivePhoto): FsNode => ({
  id: DRIVE_PHOTOS_PREFIX + photo.id,
  label: photo.name,
  Icon: driveThumbnail(photo.id),
  kind: "file",
  type: "JPEG image",
  deletable: false,
});

/** The Photography folder's contents as `PhotoViewer` already understands
 *  them. `driveId` is what its retry-on-expiry re-resolves a fresh URL
 *  with; `title` is Drive's real filename, since `src` is a CDN URL with no
 *  filename to parse out of it. */
export function toMediaItems(photos: DrivePhoto[]): MediaItem[] {
  return photos.map((photo) => ({
    src: photo.fullUrl,
    title: photo.name,
    driveId: photo.id,
    kind: "picture",
    album: "Photography",
  }));
}
