"use client";

import { useEffect, useState } from "react";

import { fileName, PICTURES, type MediaItem } from "@/components/win7/media";
import { useWindowStore } from "@/store/windows";

/**
 * Windows Photo Viewer.
 *
 * The menu strip across the top and the floating pill of controls along the
 * bottom, in that order left to right: zoom, fit to window, previous,
 * slide show, next, rotate counter-clockwise, rotate clockwise, delete.
 *
 * Two things behave the way Windows does rather than the way a web page
 * usually would. Zoom sits at "fit to window" until you touch it, and the
 * moment you do, the picture is drawn at a real scale and the frame scrolls —
 * fit is a state, not a maximum. And Delete asks first, because it is the one
 * control here that takes something away.
 *
 * Deletion is per-window and per-session: it removes the picture from this
 * viewer's list, not from disk. Nothing in a portfolio should be able to
 * destroy the portfolio.
 */

const ICON = { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true } as const;
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" } as const;

/** Steps the zoom slider and the +/- keys move through. */
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;
const SLIDESHOW_MS = 3000;

/** What each message box calls itself, same as the Windows caption would. */
const DIALOG_TITLE = {
  delete: "Delete Picture",
  burn: "Burn a Disc",
  properties: "Properties",
} as const;

/** Share by mail: the picture's title as the subject, its URL in the body. */
const mailto = (title: string, src: string) => {
  const url = typeof window === "undefined" ? src : new URL(src, window.location.origin).href;
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title} — ${url}`)}`;
};

export function PhotoViewer({ windowId, src }: { windowId: string; src: string }) {
  const [pictures, setPictures] = useState<MediaItem[]>(PICTURES);
  const [index, setIndex] = useState(() => Math.max(0, PICTURES.findIndex((p) => p.src === src)));
  const [zoom, setZoom] = useState<number | null>(null); // null = fit to window
  const [angle, setAngle] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"burn" | "delete" | "properties" | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const current = pictures[index];

  // The caption follows the picture, the way Explorer's follows the folder.
  const setTitle = useWindowStore((s) => s.setTitle);
  useEffect(() => {
    if (current) setTitle(windowId, fileName(current.src));
  }, [current, setTitle, windowId]);

  /** Every control that changes picture goes through here, so zoom, rotation
   *  and the measured size never survive from one picture to the next. */
  const goTo = (next: number) => {
    if (pictures.length === 0) return;
    setIndex(((next % pictures.length) + pictures.length) % pictures.length);
    setZoom(null);
    setAngle(0);
    setSize(null);
  };

  useEffect(() => {
    if (!slideshow) return;
    const id = setInterval(() => goTo(index + 1), SLIDESHOW_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideshow, index, pictures.length]);

  // Esc leaves the slide show, the same key that leaves it in Windows.
  useEffect(() => {
    if (!slideshow) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSlideshow(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slideshow]);

  const remove = () => {
    const rest = pictures.filter((_, i) => i !== index);
    setPictures(rest);
    setIndex((i) => (i >= rest.length ? Math.max(0, rest.length - 1) : i));
    setZoom(null);
    setAngle(0);
    setDialog(null);
  };

  const nudgeZoom = (by: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (z ?? 1) + by)));

  const menuButton = (label: string, items: React.ReactNode) => (
    <div className="pv-menu-wrap" key={label}>
      <button
        type="button"
        className="pv-menu-btn"
        aria-haspopup="menu"
        aria-expanded={menu === label}
        onClick={(e) => {
          e.stopPropagation();
          setMenu((m) => (m === label ? null : label));
        }}
      >
        {label}
      </button>
      {menu === label && (
        <ul className="pv-dropdown" role="menu">
          {items}
        </ul>
      )}
    </div>
  );

  const item = (label: string, onClick: () => void, disabled?: boolean) => (
    <li key={label}>
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={() => {
          setMenu(null);
          onClick();
        }}
      >
        {label}
      </button>
    </li>
  );

  if (!current) {
    return (
      <div className="pv pv-empty">
        <p>No pictures left in this folder.</p>
      </div>
    );
  }

  return (
    <div
      className="pv"
      data-slideshow={slideshow || undefined}
      tabIndex={0}
      onClick={() => menu && setMenu(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") goTo(index + 1);
        if (e.key === "ArrowLeft") goTo(index - 1);
        if (e.key === "+" || e.key === "=") nudgeZoom(0.25);
        if (e.key === "-") nudgeZoom(-0.25);
      }}
    >
      <div className="pv-menu">
        {menuButton(
          "File",
          <>
            {item("Copy image address", () => navigator.clipboard?.writeText(
              new URL(current.src, window.location.origin).href,
            ).catch(() => {}))}
            {item("Properties", () => setDialog("properties"))}
            {item("Delete", () => setDialog("delete"))}
          </>,
        )}
        {menuButton("Print", <>{item("Print…", () => window.print())}</>)}

        {/* A real mailto link rather than a scripted one: the browser hands it
            to whatever mail client the visitor actually uses. */}
        <a className="pv-menu-btn pv-menu-link" href={mailto(current.title, current.src)}>
          E-mail
        </a>

        {menuButton("Burn", <>{item("Data disc…", () => setDialog("burn"))}</>)}

        {menuButton(
          "Open",
          <>
            {pictures.map((p, i) => (
              <li key={p.src}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={i === index}
                  onClick={() => {
                    setMenu(null);
                    goTo(i);
                  }}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </>,
        )}
      </div>

      <div className="pv-frame" data-zoomed={zoom !== null || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pv-image"
          src={current.src}
          alt={current.title}
          style={{
            transform: `rotate(${angle}deg)`,
            width: zoom === null ? undefined : `${zoom * 100}%`,
          }}
          onLoad={(e) =>
            setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          onDoubleClick={() => setZoom((z) => (z === null ? 1 : null))}
        />
      </div>

      <div className="pv-bar">
        <div className="pv-pill">
          <div className="pv-zoom-wrap">
            <button
              type="button"
              className="pv-btn"
              aria-label="Zoom"
              aria-expanded={menu === "zoom"}
              onClick={(e) => {
                e.stopPropagation();
                setMenu((m) => (m === "zoom" ? null : "zoom"));
              }}
            >
              <svg {...ICON}>
                <circle cx="10.5" cy="10.5" r="6" {...STROKE} />
                <path d="M15 15l5 5M8 10.5h5M10.5 8v5" {...STROKE} />
              </svg>
              <span className="pv-caret" aria-hidden="true" />
            </button>

            {menu === "zoom" && (
              <div className="pv-zoom-pop" onClick={(e) => e.stopPropagation()}>
                <span>{Math.round((zoom ?? 1) * 100)}%</span>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={0.05}
                  value={zoom ?? 1}
                  aria-label="Zoom level"
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="pv-btn"
            aria-label="Fit to window"
            onClick={() => {
              setZoom(null);
              setAngle(0);
            }}
          >
            <svg {...ICON}>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...STROKE} />
            </svg>
          </button>

          <span className="pv-sep" aria-hidden="true" />

          <button
            type="button"
            className="pv-btn"
            aria-label="Previous picture"
            onClick={() => goTo(index - 1)}
          >
            <svg {...ICON}>
              <path d="M16 5 8 12l8 7z" fill="currentColor" />
              <rect x="5.5" y="5" width="2" height="14" rx="0.7" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            className="pv-play"
            aria-label={slideshow ? "Stop slide show" : "Play slide show"}
            aria-pressed={slideshow}
            onClick={() => setSlideshow((s) => !s)}
          >
            <svg viewBox="0 0 40 40" aria-hidden="true">
              {slideshow ? (
                <g fill="#ffffff">
                  <rect x="14" y="13" width="4.5" height="14" rx="1" />
                  <rect x="21.5" y="13" width="4.5" height="14" rx="1" />
                </g>
              ) : (
                <>
                  <rect x="11" y="13" width="18" height="14" rx="1.5" fill="#ffffff" />
                  <path d="M12.5 24.5 17 19l3.5 3.5L24 18l3.5 6.5z" fill="#3f7fb8" />
                  <circle cx="15" cy="16.5" r="1.6" fill="#ffd964" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            className="pv-btn"
            aria-label="Next picture"
            onClick={() => goTo(index + 1)}
          >
            <svg {...ICON}>
              <path d="M8 5l8 7-8 7z" fill="currentColor" />
              <rect x="16.5" y="5" width="2" height="14" rx="0.7" fill="currentColor" />
            </svg>
          </button>

          <span className="pv-sep" aria-hidden="true" />

          <button
            type="button"
            className="pv-btn"
            aria-label="Rotate counterclockwise"
            onClick={() => setAngle((a) => a - 90)}
          >
            <svg {...ICON}>
              <path d="M5 11a7 7 0 1 1 2.1 5" {...STROKE} />
              <path d="M4 6.5v5h5" {...STROKE} strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            className="pv-btn"
            aria-label="Rotate clockwise"
            onClick={() => setAngle((a) => a + 90)}
          >
            <svg {...ICON} style={{ transform: "scaleX(-1)" }}>
              <path d="M5 11a7 7 0 1 1 2.1 5" {...STROKE} />
              <path d="M4 6.5v5h5" {...STROKE} strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            className="pv-btn pv-delete"
            aria-label="Delete"
            onClick={() => setDialog("delete")}
          >
            <svg {...ICON}>
              <path d="M6 6l12 12M18 6 6 18" {...STROKE} strokeWidth={2.2} />
            </svg>
          </button>
        </div>
      </div>

      {/* The OS already owns a message box — Notepad's Save As and the
          context menu's delete confirm both use it, so these do too. */}
      {dialog && (
        <div className="win7-dialog-layer">
          <div className="win7-dialog" role="dialog" aria-modal="true" aria-label={DIALOG_TITLE[dialog]}>
            <div className="win7-dialog-caption">{DIALOG_TITLE[dialog]}</div>

            <div className="win7-dialog-body">
              {dialog === "delete" && (
                <>
                  <p className="win7-dialog-message">
                    Are you sure you want to move this picture to the Recycle Bin?
                  </p>
                  <p className="win7-dialog-where">{fileName(current.src)}</p>
                </>
              )}

              {dialog === "burn" && (
                <>
                  <p className="win7-dialog-message">There is no disc in the drive.</p>
                  <p className="win7-dialog-where">Insert a writable CD or DVD and try again.</p>
                </>
              )}

              {dialog === "properties" && (
                <>
                  <p className="win7-dialog-message">{fileName(current.src)}</p>
                  <dl className="pv-props">
                    <dt>Title</dt>
                    <dd>{current.title}</dd>
                    <dt>Album</dt>
                    <dd>{current.album}</dd>
                    <dt>Dimensions</dt>
                    <dd>{size ? `${size.w} × ${size.h}` : "Reading…"}</dd>
                  </dl>
                </>
              )}
            </div>

            <div className="win7-dialog-buttons">
              {dialog === "delete" ? (
                <>
                  <button type="button" className="win7-dialog-btn" onClick={remove}>
                    Yes
                  </button>
                  <button type="button" className="win7-dialog-btn" onClick={() => setDialog(null)}>
                    No
                  </button>
                </>
              ) : (
                <button type="button" className="win7-dialog-btn" onClick={() => setDialog(null)}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
