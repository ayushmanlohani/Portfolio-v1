"use client";

import { useEffect, useRef, useState } from "react";

import { launchWindow, TERMINAL_ID } from "@/components/win7/apps";
import { node } from "@/components/win7/fs";
import { FolderIcon, TerminalIcon } from "@/components/win7/icons";
import { StartMenu } from "@/components/win7/StartMenu";
import { Tray, type Panel } from "@/components/win7/Tray";
import { useWindowStore } from "@/store/windows";

const MENU_ID = "start-menu";

/** Icon for a taskbar button. Folders are the default; cmd is the exception. */
const TaskIcon = ({ id }: { id: string }) =>
  id === TERMINAL_ID ? (
    <TerminalIcon className="task-button-icon" />
  ) : (
    <FolderIcon className="task-button-icon" />
  );

/** Name for a pinned button that has no window to take a caption from. */
const taskLabel = (id: string) => (id === TERMINAL_ID ? "Command Prompt" : (node(id)?.label ?? id));

/**
 * Windows 7 taskbar — the Start orb, a button per open window, and the
 * notification area at the right end.
 *
 * The Start menu and every tray flyout share **one** `panel` value rather
 * than each holding its own open/closed flag. That is what makes them close
 * each other, and it means one document listener dismisses whichever is up:
 * two independent systems both anchored inside `.taskbar-root` would each
 * treat a click on the other as "inside".
 *
 * Buttons come from two places and merge into one row: every open window, plus
 * every pinned id that isn't currently running. A pinned id that IS running
 * shows once, as its window's button — Windows merges the two rather than
 * drawing the app twice. Pin and unpin live on the right-click menu.
 */
export function Taskbar() {
  const [panel, setPanel] = useState<Panel>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const windows = useWindowStore((s) => s.windows);
  const topZ = useWindowStore((s) => s.topZ);
  const pinned = useWindowStore((s) => s.pinned);
  const focus = useWindowStore((s) => s.focus);
  const minimize = useWindowStore((s) => s.minimize);

  // Launching closes the menu, the way it does in Windows. `launchWindow`
  // already un-minimises and refocuses a window that is already running.
  const launch = (id: string) => {
    launchWindow(id);
    setPanel(null);
  };

  const idlePins = pinned.filter((id) => !windows.some((w) => w.id === id));

  // Windows closes an open panel on Escape or on any click outside it —
  // including clicks on the desktop, which is why this listens on the
  // document rather than on a backdrop element.
  useEffect(() => {
    if (!panel) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPanel(null);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [panel]);

  return (
    <div className="taskbar-root" ref={rootRef}>
      {panel === "start" && <StartMenu id={MENU_ID} onLaunch={launch} />}

      <div className="taskbar">
        <button
          type="button"
          className="start-orb"
          aria-label="Start"
          aria-haspopup="menu"
          aria-expanded={panel === "start"}
          aria-controls={panel === "start" ? MENU_ID : undefined}
          data-open={panel === "start" || undefined}
          onClick={() => setPanel(panel === "start" ? null : "start")}
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
                // What the right-click menu reads to know which app it is on.
                data-task-id={w.id}
                data-active={active || undefined}
                data-pinned={pinned.includes(w.id) || undefined}
                // Clicking the active window's button minimises it, the way
                // Windows toggles rather than re-focusing what's already front.
                onClick={() => (active ? minimize(w.id) : focus(w.id))}
              >
                <TaskIcon id={w.id} />
                <span className="task-button-label">{w.title}</span>
              </button>
            );
          })}

          {/* Pinned but not running: an icon-only square that launches it. */}
          {idlePins.map((id) => (
            <button
              key={id}
              type="button"
              className="task-button"
              data-task-id={id}
              data-pinned
              data-idle
              title={taskLabel(id)}
              aria-label={taskLabel(id)}
              onClick={() => launchWindow(id)}
            >
              <TaskIcon id={id} />
            </button>
          ))}
        </div>

        <Tray panel={panel} setPanel={setPanel} />
      </div>
    </div>
  );
}
