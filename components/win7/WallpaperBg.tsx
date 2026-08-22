"use client";

import { useWallpaper } from "@/store/wallpaper";

/**
 * The desktop background layer. Reads the current wallpaper from the store
 * and renders it with a crossfade transition on change.
 */
export function WallpaperBg() {
  const current = useWallpaper((s) => s.current);

  if (current.type === "video") {
    return (
      <div className="win7-wallpaper win7-wallpaper--video">
        <video
          key={current.id}
          src={current.src}
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
      style={{ backgroundImage: `url(${current.src})` }}
    />
  );
}
