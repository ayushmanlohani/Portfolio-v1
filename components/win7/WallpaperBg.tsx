"use client";

import { useEffect, useState } from "react";
import { nextWallpaper, useWallpaper, type WallpaperEntry } from "@/store/wallpaper";

/** Matches `.win7-wallpaper`'s own opacity transition in globals.css. */
const FADE_MS = 600;

/** How long each wallpaper stays up before the slideshow advances. */
const ROTATE_MS = 15000;

/** The longest the swap will hold the dark waiting on a slow image. */
const MAX_WAIT_MS = 2500;

/** Resolves after `ms`. */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetches a wallpaper, resolving once the bytes are in. A cold image
 * swapped in mid-fade would show `.win7-wallpaper`'s own background colour
 * until it arrives — the blue flash this exists to avoid. Videos stream,
 * so there is nothing to wait for.
 *
 * `load`, not `decode()`: Chrome defers decoding in a background tab, so
 * `decode()` can hang there and leave the desktop faded out to nothing.
 */
function preload(entry: WallpaperEntry): Promise<unknown> {
  if (entry.type !== "image") return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = entry.src;
  });
}

/**
 * The desktop background layer. Reads the current wallpaper from the store
 * and renders it with a crossfade transition on change: fades the old
 * wallpaper out, swaps the image only once fully invisible, then fades in.
 */
export function WallpaperBg() {
  const current = useWallpaper((s) => s.current);
  const pinned = useWallpaper((s) => s.pinned);
  const rotate = useWallpaper((s) => s.rotate);
  const [displayed, setDisplayed] = useState<WallpaperEntry>(current);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (current.id === displayed.id) return;
    setVisible(false);
    let cancelled = false;
    /* Both, not either: the fade has to finish *and* the image has to be
       loaded before the swap. The dwell preload usually has it cached
       already, so in practice this is still a plain 600ms fade — and the
       ceiling means a slow image can only ever hold the dark a moment
       longer, never strand the desktop there. */
    Promise.all([
      Promise.race([preload(current), wait(MAX_WAIT_MS)]),
      wait(FADE_MS),
    ]).then(() => {
      if (cancelled) return;
      setDisplayed(current);
      requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelled = true;
    };
  }, [current, displayed]);

  /* Fetch the next one during this one's dwell. Fifteen seconds of lead
     time means the swap almost never waits on the network. */
  useEffect(() => {
    preload(nextWallpaper(displayed));
  }, [displayed]);

  // Slideshow: advance until the visitor picks a wallpaper of their own.
  useEffect(() => {
    if (pinned) return;
    const id = setInterval(rotate, ROTATE_MS);
    return () => clearInterval(id);
  }, [pinned, rotate]);

  const style = { opacity: visible ? 1 : 0 };

  if (displayed.type === "video") {
    return (
      <div className="win7-wallpaper win7-wallpaper--video" style={style}>
        <video
          key={displayed.id}
          src={displayed.src}
          muted
          loop
          autoPlay
          playsInline
        />
      </div>
    );
  }

  return (
    <div
      className="win7-wallpaper"
      style={{ ...style, backgroundImage: `url(${displayed.src})` }}
    />
  );
}
