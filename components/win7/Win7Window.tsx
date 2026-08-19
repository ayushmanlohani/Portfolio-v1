"use client";

import { Rnd } from "react-rnd";

import { maximizedBounds, useWindowStore, type Desk, type OpenWindow } from "@/store/windows";

/**
 * A Windows 7 Aero window: translucent frame, glass caption bar, the three
 * caption buttons, draggable by the title and resizable from all eight edges.
 *
 * Sizes are written as their real Win7 pixel values times `--px`, same rule as
 * the rest of the chrome. Nothing here knows what it contains — the contents
 * are just children, so they can be rebuilt without touching the window.
 */

/** Win7 refuses to shrink a window past its caption buttons. So does this. */
const MIN_W = 320;
const MIN_H = 200;

export function Win7Window({
  win,
  desk,
  focused,
  children,
}: {
  win: OpenWindow;
  desk: Desk;
  focused: boolean;
  children: React.ReactNode;
}) {
  const { close, focus, setBounds, minimize, toggleMaximize } = useWindowStore();

  const box = win.maximized ? { ...win, ...maximizedBounds(desk) } : win;

  return (
    <Rnd
      className="w7-rnd"
      size={{ width: box.width, height: box.height }}
      position={{ x: box.x, y: box.y }}
      minWidth={MIN_W}
      minHeight={MIN_H}
      bounds="parent"
      dragHandleClassName="w7-caption"
      // Maximised windows are pinned, exactly like the real thing: the only way
      // to move one is to restore it first.
      disableDragging={win.maximized}
      enableResizing={!win.maximized}
      style={{ zIndex: win.z, display: win.minimized ? "none" : undefined }}
      onDragStart={() => focus(win.id)}
      onDragStop={(_e, d) => setBounds(win.id, { x: d.x, y: d.y })}
      onResizeStart={() => focus(win.id)}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setBounds(win.id, {
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: pos.x,
          y: pos.y,
        })
      }
    >
      <div
        className="w7-window"
        // Lets a particular app restyle the body it was given — the console
        // needs a black one — without this component knowing what it holds.
        data-app={win.id}
        data-focused={focused || undefined}
        data-maximized={win.maximized || undefined}
        onPointerDown={() => focus(win.id)}
      >
        <div
          className="w7-caption"
          onDoubleClick={() => toggleMaximize(win.id, desk)}
        >
          <span className="w7-title">{win.title}</span>

          <div className="w7-caption-buttons">
            <button
              type="button"
              className="w7-cap-btn"
              aria-label="Minimize"
              onClick={() => minimize(win.id)}
            >
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <rect x="1" y="6" width="8" height="1.5" />
              </svg>
            </button>
            <button
              type="button"
              className="w7-cap-btn"
              aria-label={win.maximized ? "Restore Down" : "Maximize"}
              onClick={() => toggleMaximize(win.id, desk)}
            >
              {win.maximized ? (
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <rect x="0.5" y="2.5" width="6" height="6" fill="none" strokeWidth="1.2" />
                  <path d="M3 2.5V1h6v6H7.5" fill="none" strokeWidth="1.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <rect x="1" y="1" width="8" height="8" fill="none" strokeWidth="1.4" />
                  <rect x="1" y="1" width="8" height="2.4" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="w7-cap-btn w7-cap-close"
              aria-label="Close"
              onClick={() => close(win.id)}
            >
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" fill="none" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="w7-body">{children}</div>
      </div>
    </Rnd>
  );
}
