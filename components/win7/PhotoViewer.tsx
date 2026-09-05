"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fileName, mediaBySrc, PICTURES, type MediaItem } from "@/components/win7/media";
import { photoById, toMediaItems, usePhotography } from "@/store/photography";
import { useRecycleBin } from "@/store/recycleBin";
import { useWindowStore } from "@/store/windows";

/**
 * Windows Photo Viewer.
 *
 * The menu strip across the top and the floating pill of controls along the
 * bottom, in that order left to right: zoom, fit-to-window/actual-size
 * toggle, previous, slide show, next, rotate counter-clockwise, rotate
 * clockwise, delete.
 *
 * Two things behave the way Windows does rather than the way a web page
 * usually would. Zoom sits at "fit to window" until you touch it, and the
 * moment you do, the picture is drawn at a real scale and the frame scrolls —
 * fit is a state, not a maximum. And Delete asks first, because it is the one
 * control here that takes something away.
 *
 * Delete moves the picture to the Recycle Bin the same way Explorer's does —
 * `useRecycleBin`'s soft delete, keyed by the picture's window id — so it
 * disappears from the Pictures folder and shows up in the bin, restorable
 * from there. Nothing here can purge a file for good; only the Recycle Bin's
 * own permanent-delete does that.
 */

const ICON = { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true } as const;
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" } as const;

/** Steps the zoom slider and the +/- keys move through. Fit is the floor —
 *  zooming out past original size snaps back to it, never smaller. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const SLIDESHOW_MS = 3000;

/** What each message box calls itself, same as the Windows caption would. */
const DIALOG_TITLE = {
  delete: "Delete Picture",
  properties: "Properties",
} as const;

/** Share by mail: the picture's title as the subject, its URL in the body. */
const mailto = (title: string, src: string) => {
  const url = typeof window === "undefined" ? src : new URL(src, window.location.origin).href;
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title} — ${url}`)}`;
};

/**
 * Pictures not in the library — TrySomethingElse.jpg, opened only from the
 * one Control Panel link that points at it — get a standalone one-item list
 * instead of falling back to whatever PICTURES[0] happens to be. That keeps
 * them out of the library, the Pictures folder, and every "Open"/next-prev
 * list, reachable only by the exact window id that names them.
 */
function initialPictures(src: string, drivePictures: MediaItem[]): MediaItem[] {
  if (drivePictures.some((p) => p.src === src)) return drivePictures;
  if (PICTURES.some((p) => p.src === src)) return PICTURES;
  const item = mediaBySrc(src);
  return [item ?? { src, title: fileName(src), kind: "picture", album: "Pictures" }];
}

/** A Drive picture's `src` is a CDN URL with no filename in it, so its name
 *  is its title; everything else reads its name off the path. */
const nameOf = (picture: MediaItem) =>
  picture.driveId ? picture.title : fileName(picture.src);

export function PhotoViewer({ windowId, src }: { windowId: string; src: string }) {
  const drivePhotos = usePhotography((s) => s.photos);
  const driveMediaItems = useMemo(() => toMediaItems(drivePhotos), [drivePhotos]);
  const retriedDriveIds = useRef<Set<string>>(new Set());

  const [pictures, setPictures] = useState<MediaItem[]>(() => initialPictures(src, driveMediaItems));
  const [index, setIndex] = useState(() => Math.max(0, pictures.findIndex((p) => p.src === src)));
  const [zoom, setZoom] = useState<number | null>(null); // null = fit to window
  const [angle, setAngle] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"delete" | "properties" | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  /** Which whitespace half the pointer is over — drives the faint nav arrow. */
  const [hoverSide, setHoverSide] = useState<"prev" | "next" | null>(null);

  // Drag-to-pan while zoomed: the frame is the scroller, so panning is just
  // moving its scroll offset. `moved` tells the click handler a drag just
  // ended, so it doesn't read it as a prev/next click.
  const pan = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const recycle = useRecycleBin((s) => s.remove);

  // For a Drive picture the store is the source of truth for `src`, so a
  // link refreshed after expiry reaches the <img> with nothing to patch.
  const shown = pictures[index];
  const freshUrl = shown?.driveId ? photoById(shown.driveId)?.fullUrl : undefined;
  const current = useMemo(
    () => (freshUrl && shown ? { ...shown, src: freshUrl } : shown),
    [shown, freshUrl],
  );

  // The caption follows the picture, the way Explorer's follows the folder.
  const setTitle = useWindowStore((s) => s.setTitle);
  useEffect(() => {
    if (current) setTitle(windowId, nameOf(current));
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
    recycle(windowId);
    const rest = pictures.filter((_, i) => i !== index);
    setPictures(rest);
    setIndex((i) => (i >= rest.length ? Math.max(0, rest.length - 1) : i));
    setZoom(null);
    setAngle(0);
    setDialog(null);
  };

  const nudgeZoom = (by: number) =>
    setZoom((z) => {
      const next = (z ?? ZOOM_MIN) + by;
      if (next <= ZOOM_MIN) return null;
      return Math.min(ZOOM_MAX, next);
    });

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

  /** A real download link — the browser saves the file, no clipboard trick. */
  const downloadItem = (label: string, href: string, name: string) => (
    <li key={label}>
      <a role="menuitem" href={href} download={name} onClick={() => setMenu(null)}>
        {label}
      </a>
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
            {downloadItem("Download", current.src, nameOf(current))}
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

        {menuButton("Burn", <>{item("You don't have a CD", () => {})}</>)}

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

      <div
        className="pv-frame"
        ref={frameRef}
        data-zoomed={zoom !== null || undefined}
        onClick={(e) => {
          // A drag that just ended isn't a prev/next click.
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          // Whitespace beside the picture steps through the folder: left
          // goes back, right goes forward. Clicks on the picture itself
          // are left alone for double-click zoom.
          if (e.target !== e.currentTarget) return;
          const rect = e.currentTarget.getBoundingClientRect();
          goTo(index + (e.clientX < rect.left + rect.width / 2 ? -1 : 1));
        }}
        onPointerDown={(e) => {
          // Pan only when zoomed past fit — otherwise clicks navigate.
          if (zoom === null || e.button !== 0) return;
          const frame = e.currentTarget;
          pan.current = { x: e.clientX, y: e.clientY, left: frame.scrollLeft, top: frame.scrollTop, moved: false };
          frame.setPointerCapture(e.pointerId);
          setHoverSide(null);
        }}
        onPointerMove={(e) => {
          const p = pan.current;
          if (p) {
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) p.moved = true;
            e.currentTarget.scrollLeft = p.left - dx;
            e.currentTarget.scrollTop = p.top - dy;
            return;
          }
          // Arrow follows the pointer half, but never over the picture.
          if (e.target !== e.currentTarget) return setHoverSide(null);
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverSide(e.clientX < rect.left + rect.width / 2 ? "prev" : "next");
        }}
        onPointerUp={() => {
          if (pan.current?.moved) suppressClick.current = true;
          pan.current = null;
        }}
        onPointerCancel={() => {
          pan.current = null;
        }}
        onMouseLeave={() => setHoverSide(null)}
      >
        {pictures.length > 1 && (
          <>
            <span className="pv-nav pv-nav-prev" data-show={hoverSide === "prev" || undefined} aria-hidden="true">
              ‹
            </span>
            <span className="pv-nav pv-nav-next" data-show={hoverSide === "next" || undefined} aria-hidden="true">
              ›
            </span>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pv-image"
          ref={imgRef}
          src={current.src}
          alt={current.title}
          draggable={false}
          // Drive's lh3.googleusercontent.com URLs reject any request that
          // carries a Referer header — harmless for local /letterbox/ images,
          // required for Drive ones (see fs.ts's driveThumbnail for the same).
          referrerPolicy="no-referrer"
          style={{
            transform: `rotate(${angle}deg)`,
            // Real pixels of the photo's natural size, not a percentage of
            // the frame — 100% has to mean the actual original image.
            width: zoom === null ? undefined : size ? `${zoom * size.w}px` : `${zoom * 100}%`,
          }}
          onLoad={(e) =>
            setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          onDoubleClick={() => setZoom((z) => (z === null ? 1 : null))}
          onError={() => {
            // A Drive link expires after ~an hour. One reload re-asks Drive
            // and `current` picks the fresh URL up on its own; a second
            // failure gives up rather than looping.
            const driveId = current.driveId;
            if (!driveId || retriedDriveIds.current.has(driveId)) return;
            retriedDriveIds.current.add(driveId);
            usePhotography.getState().load(true);
          }}
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
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setZoom(v <= ZOOM_MIN ? null : v);
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="pv-btn"
            aria-label={zoom === null ? "Actual size" : "Fit to window"}
            // A no-op reset to "fit" when already fit looks broken — nothing
            // on screen moves. Toggling to actual size instead means the
            // button always visibly does something, same as double-clicking
            // the picture does.
            onClick={() => setZoom((z) => (z === null ? 1 : null))}
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

          {PICTURES.some((p) => p.src === current.src) && (
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
          )}
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
                  <p className="win7-dialog-where">{nameOf(current)}</p>
                </>
              )}

              {dialog === "properties" && (
                <>
                  <p className="win7-dialog-message">{nameOf(current)}</p>
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
