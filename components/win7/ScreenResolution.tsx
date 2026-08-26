"use client";

import { useEffect, useState } from "react";

import { ComputerIcon, NavArrowIcon, SearchIcon } from "@/components/win7/icons";
import { SCREEN_RES_ID } from "@/components/win7/apps";
import { useWallpaper } from "@/store/wallpaper";
import { useWindowStore } from "@/store/windows";

/**
 * Control Panel's Screen Resolution page. Informational only — the monitor
 * fills the viewport by design (see CLAUDE.md), so there is no lower
 * resolution to actually switch to. Every number on it is read live from
 * `window.screen`, not invented.
 */

type Reading = {
  resolution: string;
  available: string;
  colorDepth: string;
  scaling: string;
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
    scaling: `${scale}%${scale === 100 ? "" : " (Custom)"}`,
  };
}

export function ScreenResolution() {
  const close = useWindowStore((s) => s.close);
  const wallpaper = useWallpaper((s) => s.current);
  // Real screen values, not knowable at server-render time.
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    setReading(readScreen());
    const onChange = () => setReading(readScreen());
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }, []);

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
              <span className="sr-value">1. Generic PnP Monitor</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Resolution:</span>
              <span className="sr-value">{reading?.resolution ?? "—"} (Recommended)</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Orientation:</span>
              <span className="sr-value">Landscape</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Multiple displays:</span>
              <span className="sr-value">Show desktop only on 1</span>
            </div>

            <div className="sr-sep" />

            <div className="sr-row">
              <span className="sr-label">Color quality:</span>
              <span className="sr-value">{reading?.colorDepth ?? "—"}</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Display scaling:</span>
              <span className="sr-value">{reading?.scaling ?? "—"}</span>
            </div>
            <div className="sr-row">
              <span className="sr-label">Available area:</span>
              <span className="sr-value">{reading?.available ?? "—"}</span>
            </div>
          </div>
        </div>

        <p className="sr-note">
          These values are read live from this monitor. Windows lets you make text and other
          items larger or smaller by changing the resolution.
        </p>
      </div>

      <div className="sr-buttons">
        <button type="button" className="win7-dialog-btn" onClick={() => close(SCREEN_RES_ID)}>
          OK
        </button>
        <button type="button" className="win7-dialog-btn" onClick={() => close(SCREEN_RES_ID)}>
          Cancel
        </button>
        <button type="button" className="win7-dialog-btn" disabled>
          Apply
        </button>
      </div>
    </div>
  );
}
