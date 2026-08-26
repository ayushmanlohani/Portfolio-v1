"use client";

import { useEffect, useState } from "react";

import { ComputerIcon, NavArrowIcon, SearchIcon } from "@/components/win7/icons";
import { SCREEN_RES_ID } from "@/components/win7/apps";
import { type Scale, useDisplayScale } from "@/store/displayScale";
import { useWallpaper } from "@/store/wallpaper";
import { useWindowStore } from "@/store/windows";

/**
 * Control Panel's Screen Resolution page. The resolution/orientation/color
 * fields are informational — the monitor fills the viewport by design (see
 * CLAUDE.md), so there's no lower resolution to actually switch to — but DPI
 * scaling is real: Apply pushes the chosen percentage into `--os-px` on the
 * CRT (see Monitor.tsx), which resizes every OS measurement live.
 */

type Reading = {
  resolution: string;
  available: string;
  colorDepth: string;
  browserScale: string;
};

function readScreen(): Reading {
  const s = window.screen;
  const scale = Math.round(window.devicePixelRatio * 100);
  // Some sandboxed/headless browsers report a 0x0 screen with no real
  // display attached — fall back to the viewport so the dialog never
  // shows nonsense.
  const w = s.width || window.innerWidth;
  const h = s.height || window.innerHeight;
  const aw = s.availWidth || window.innerWidth;
  const ah = s.availHeight || window.innerHeight;
  return {
    resolution: `${w} x ${h}`,
    available: `${aw} x ${ah}`,
    colorDepth: `${s.colorDepth}-bit`,
    browserScale: `${scale}%`,
  };
}

const SCALE_OPTIONS: { value: Scale; label: string }[] = [
  { value: 1, label: "100% (Recommended)" },
  { value: 1.25, label: "125%" },
  { value: 1.5, label: "150%" },
];

export function ScreenResolution() {
  const close = useWindowStore((s) => s.close);
  const wallpaper = useWallpaper((s) => s.current);
  const scale = useDisplayScale((s) => s.scale);
  const setScale = useDisplayScale((s) => s.setScale);
  // Real screen values, not knowable at server-render time.
  const [reading, setReading] = useState<Reading | null>(null);
  // Picking a size doesn't move the actual UI until Apply/OK, same as real
  // Windows — it just previews as text next to the dropdown.
  const [pending, setPending] = useState<Scale>(scale);

  useEffect(() => {
    setReading(readScreen());
    const onChange = () => setReading(readScreen());
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }, []);

  const apply = () => setScale(pending);

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
          <ComputerIcon className="ex-icon" />
          <span className="ex-crumb">Screen Resolution</span>
        </div>

        <div className="ex-search">
          <span className="ex-search-text">Search Control Panel</span>
          <SearchIcon className="ex-icon ex-search-icon" />
        </div>
      </div>

      <div className="cp-body">
        <h1 className="cp-title">Change the appearance of your display</h1>

        <div className="sr-layout">
          <div className="sr-preview" aria-hidden="true">
            {wallpaper.type === "video" ? (
              <video src={wallpaper.src} className="sr-preview-media" muted loop autoPlay playsInline />
            ) : (
              <img src={wallpaper.src} alt="" className="sr-preview-media" />
            )}
          </div>

          <div className="sr-fields">
            <div className="sr-row">
              <span className="sr-label">Display:</span>
              <span className="sr-value">1. MULTISYNC</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Resolution:</span>
              <span className="sr-value">{reading?.resolution ?? "—"} (Recommended)</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Orientation:</span>
              <span className="sr-value">Landscape</span>
            </div>

            <div className="sr-sep" />

            <div className="sr-row">
              <span className="sr-label">Color quality:</span>
              <span className="sr-value">{reading?.colorDepth ?? "—"}</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Browser scaling:</span>
              <span className="sr-value">{reading?.browserScale ?? "—"}</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Available area:</span>
              <span className="sr-value">{reading?.available ?? "—"}</span>
            </div>

            <div className="sr-sep" />

            <div className="sr-row">
              <span className="sr-label">Make text larger:</span>
              <select
                className="sr-select"
                value={pending}
                onChange={(e) => setPending(Number(e.target.value) as Scale)}
              >
                {SCALE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="sr-note">
          The resolution and color fields above are read live from this monitor, informational
          only. &ldquo;Make text larger&rdquo; is real - Apply or OK actually resizes the desktop.
        </p>
      </div>

      <div className="sr-buttons">
        <button
          type="button"
          className="win7-dialog-btn"
          onClick={() => {
            apply();
            close(SCREEN_RES_ID);
          }}
        >
          OK
        </button>
        <button type="button" className="win7-dialog-btn" onClick={() => close(SCREEN_RES_ID)}>
          Cancel
        </button>
        <button type="button" className="win7-dialog-btn" disabled={pending === scale} onClick={apply}>
          Apply
        </button>
      </div>
    </div>
  );
}
