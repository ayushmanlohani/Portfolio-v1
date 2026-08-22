"use client";

import {
  WALLPAPERS,
  LIVE_WALLPAPERS,
  useWallpaper,
  type WallpaperEntry,
} from "@/store/wallpaper";

import { NavArrowIcon, PersonalizeIcon, SearchIcon } from "@/components/win7/icons";

function Thumb({ entry }: { entry: WallpaperEntry }) {
  if (entry.type === "video") {
    return (
      <span className="cp-thumb cp-thumb--video" aria-hidden="true">
        <video src={entry.src} muted loop preload="metadata" />
      </span>
    );
  }
  return (
    <span
      className="cp-thumb cp-thumb--image"
      style={{ backgroundImage: `url(${entry.src})` }}
      aria-hidden="true"
    />
  );
}

export function Personalize() {
  const current = useWallpaper((s) => s.current);
  const pending = useWallpaper((s) => s.pending);
  const confirming = useWallpaper((s) => s.confirming);
  const select = useWallpaper((s) => s.select);
  const confirm = useWallpaper((s) => s.confirm);
  const cancel = useWallpaper((s) => s.cancel);

  const selected = pending ?? current;

  const tile = (entry: WallpaperEntry) => (
    <button
      type="button"
      className="cp-theme"
      key={entry.id}
      data-selected={selected.id === entry.id || undefined}
      onClick={() => select(entry)}
    >
      <Thumb entry={entry} />
      <span className="cp-name">{entry.label}</span>
    </button>
  );

  return (
    <div className="cp">
      <div className="ex-nav">
        <button type="button" className="ex-nav-btn" aria-label="Back" disabled>
          <NavArrowIcon className="ex-nav-arrow" />
        </button>
        <button type="button" className="ex-nav-btn" aria-label="Forward" disabled>
          <NavArrowIcon className="ex-nav-arrow" flip />
        </button>

        <div className="ex-address">
          <PersonalizeIcon className="ex-icon" />
          <span className="ex-crumb">Personalization</span>
        </div>

        <div className="ex-search">
          <span className="ex-search-text">Search Control Panel</span>
          <SearchIcon className="ex-icon ex-search-icon" />
        </div>
      </div>

      <div className="cp-body">
        <h1 className="cp-title">Change the wallpaper on your computer</h1>

        <section>
          <h2 className="cp-group-heading">
            Static Wallpaper <span className="cp-count">({WALLPAPERS.length})</span>
          </h2>
          <div className="cp-themes">{WALLPAPERS.map(tile)}</div>
        </section>

        <section>
          <h2 className="cp-group-heading">
            Live Wallpaper <span className="cp-count">({LIVE_WALLPAPERS.length})</span>
          </h2>
          <div className="cp-themes">{LIVE_WALLPAPERS.map(tile)}</div>
        </section>
      </div>

      {confirming && (
        <div className="cp-confirm-overlay" role="presentation">
          <div
            className="cp-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm wallpaper change"
          >
            <p className="cp-confirm-text">
              Do you want this to be your desktop background?
            </p>
            <div className="cp-confirm-preview">
              {pending?.type === "video" ? (
                <video src={pending.src} muted loop autoPlay className="cp-confirm-thumb" controls={false} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture />
              ) : (
                <img src={pending?.src} alt="" className="cp-confirm-thumb" />
              )}
            </div>
            <div className="cp-confirm-actions">
              <button
                type="button"
                className="cp-confirm-btn cp-confirm-btn--ok"
                onClick={confirm}
              >
                OK
              </button>
              <button
                type="button"
                className="cp-confirm-btn"
                onClick={cancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
