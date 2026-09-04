/**
 * What Windows Media Player and Windows Photo Viewer have to play.
 *
 * One list, two readers: the Player takes the videos, the Photo Viewer takes
 * the pictures. Both index into the same array, so "next" in either app means
 * the next item of that kind and nothing has to stay in sync by hand.
 *
 * Everything here is already in public/letterbox — the rule is that Ayushman
 * drops a file there and it gets wired up. Add a line, it appears in the app.
 */

/**
 * A viewer window's id is its prefix plus the file it shows, so two pictures
 * open as two windows and re-opening one refocuses it. They live here rather
 * than in apps.ts because the file tree needs them too, and apps.ts already
 * reads the tree — the other direction would be a cycle.
 */
export const PHOTOS_PREFIX = "photos:";
export const PDF_PREFIX = "pdf:";

export type MediaKind = "video" | "picture";

export type MediaItem = {
  /** Also the window id suffix, so two pictures open as two windows. */
  src: string;
  /** What the library lists and the caption bar reads. */
  title: string;
  kind: MediaKind;
  /** Library's second column. Videos get theirs measured on load instead. */
  album: string;
  /** Still frame the library shows before the video has ever been played. */
  poster?: string;
  /** Drive's own file id — only set for Drive-synced photos, and only used
   *  by PhotoViewer to re-resolve a fresh URL if `src` has expired. */
  driveId?: string;
};

export const MEDIA: MediaItem[] = [
  {
    src: "/letterbox/wallpaper-1440.mp4",
    title: "Harmony (1440p)",
    kind: "video",
    album: "Wallpapers",
    poster: "/letterbox/wallpaper-poster.jpg",
  },
  { src: "/letterbox/pngs/coke-can.png", title: "Coke Can", kind: "picture", album: "Drawings" },
  { src: "/letterbox/pngs/mustang.png", title: "Mustang", kind: "picture", album: "Drawings" },
  { src: "/letterbox/pngs/kitten.png", title: "Kitten", kind: "picture", album: "Drawings" },
  {
    src: "/letterbox/pngs/cat-headphones.png",
    title: "Cat with Headphones",
    kind: "picture",
    album: "Drawings",
  },
  { src: "/letterbox/pngs/charminar.png", title: "Charminar", kind: "picture", album: "Drawings" },
  { src: "/letterbox/pngs/skull.png", title: "Skull", kind: "picture", album: "Drawings" },
  { src: "/letterbox/pngs/pow.png", title: "Pow", kind: "picture", album: "Drawings" },
  {
    src: "/letterbox/pngs/artistic-badge.png",
    title: "Artistic Badge",
    kind: "picture",
    album: "Drawings",
  },
  {
    src: "/letterbox/Z0Ts3J2-windows-7-official-wallpapers.jpg",
    title: "Harmony",
    kind: "picture",
    album: "Wallpapers",
  },
];

export const VIDEOS = MEDIA.filter((m) => m.kind === "video");
export const PICTURES = MEDIA.filter((m) => m.kind === "picture");

export const mediaBySrc = (src: string) => MEDIA.find((m) => m.src === src);

/** m:ss, the way both the seek bar and the library column write a duration. */
export function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  return `${m}:${String(total % 60).padStart(2, "0")}`;
}

/** The file name Windows would show — what a Properties dialog reports. */
export const fileName = (src: string) => src.slice(src.lastIndexOf("/") + 1);
