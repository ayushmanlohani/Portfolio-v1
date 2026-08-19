"use client";

import { useEffect, useRef, useState } from "react";

import { TERMINAL_ID, TERMINAL_SIZE, TERMINAL_TITLE } from "@/components/win7/apps";
import { readDesk } from "@/components/win7/desk";
import { FolderIcon, TerminalIcon } from "@/components/win7/icons";
import { StartMenu } from "@/components/win7/StartMenu";
import { useWindowStore } from "@/store/windows";

const MENU_ID = "start-menu";

/**
 * Windows 7 taskbar — the bar, the Start orb, and the Start menu.
 *
 * Carries a button per open window — the bare minimum, added because
 * minimising needs somewhere for the window to go. Still no pinned apps, no
 * system tray and no clock: what else belongs on this bar is a decision we
 * haven't made yet.
 */
export function Taskbar() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const windows = useWindowStore((s) => s.windows);
  const topZ = useWindowStore((s) => s.topZ);
  const focus = useWindowStore((s) => s.focus);
  const minimize = useWindowStore((s) => s.minimize);
  const openWindow = useWindowStore((s) => s.open);

  // Launching closes the menu, the way it does in Windows. `open` already
  // un-minimises and refocuses a window that is already running.
  const launch = (id: string) => {
    if (id === TERMINAL_ID) {
      openWindow(id, { title: TERMINAL_TITLE, ...TERMINAL_SIZE, desk: readDesk() });
    }
    setOpen(false);
  };

  // Windows closes the menu on Escape or on any click outside it — including
  // clicks on the desktop, which is why this listens on the document rather
  // than on a backdrop element.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="taskbar-root" ref={rootRef}>
      {open && <StartMenu id={MENU_ID} onLaunch={launch} />}

      <div className="taskbar">
        <button
          type="button"
          className="start-orb"
          aria-label="Start"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? MENU_ID : undefined}
          data-open={open || undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="start-orb-sphere" />
          <svg className="start-orb-flag" viewBox="0 0 100 100" aria-hidden="true">
            <g fill="#ffffff" fillOpacity="0.92">
              <path d="M30 40 L47 36.5 L47 49.5 L30 50 Z" />
              <path d="M51 35.5 L70 31.5 L70 48.5 L51 49 Z" />
              <path d="M30 54 L47 53.5 L47 66.5 L30 63.5 Z" />
              <path d="M51 53 L70 52.5 L70 69 L51 65.5 Z" />
            </g>
          </svg>
        </button>

        <div className="taskbar-windows">
          {windows.map((w) => {
            const active = w.z === topZ && !w.minimized;
            return (
              <button
                key={w.id}
                type="button"
                className="task-button"
                data-active={active || undefined}
                // Clicking the active window's button minimises it, the way
                // Windows toggles rather than re-focusing what's already front.
                onClick={() => (active ? minimize(w.id) : focus(w.id))}
              >
                {w.id === TERMINAL_ID ? (
                  <TerminalIcon className="task-button-icon" />
                ) : (
                  <FolderIcon className="task-button-icon" />
                )}
                <span className="task-button-label">{w.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
