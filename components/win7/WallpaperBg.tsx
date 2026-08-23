"use client";

import { useEffect, useState } from "react";
import { useWallpaper, type WallpaperEntry } from "@/store/wallpaper";

/** Matches `.win7-wallpaper`'s own opacity transition in globals.css. */
const FADE_MS = 600;

/**
 * The desktop background layer. Reads the current wallpaper from the store
 * and renders it with a crossfade transition on change: fades the old
 * wallpaper out, swaps the image only once fully invisible, then fades in.
 */
export function WallpaperBg() {
  const current = useWallpaper((s) => s.current);
  const [displayed, setDisplayed] = useState<WallpaperEntry>(current);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (current.id === displayed.id) return;
    setVisible(false);
    const hide = setTimeout(() => {
      setDisplayed(current);
      requestAnimationFrame(() => setVisible(true));
    }, FADE_MS);
    return () => clearTimeout(hide);
  }, [current, displayed]);

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
