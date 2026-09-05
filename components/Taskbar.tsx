"use client";

import { AskBar } from "@/assistant/AskBar";
import { StartOrbFace } from "@/components/win7/StartOrbFace";
import { useEffect, useRef, useState } from "react";

import {
  CALC_ID,
  CONTROL_PANEL_ID,
  launchWindow,
  NOTEPAD_ID,
  PDF_ID,
  PDF_PREFIX,
  PERSONALIZE_ID,
  PHOTOS_PREFIX,
  RACER_ID,
  TERMINAL_ID,
  RACER_TITLE,
  WMP_ID,
  WMP_TITLE,
} from "@/components/win7/apps";
import { node } from "@/components/win7/fs";
import {
  CalculatorIcon,
  ComputerIcon,
  FolderIcon,
  MediaPlayerIcon,
  NotepadIcon,
  PdfIcon,
  PersonalizeIcon,
  PhotoViewerIcon,
  RacerIcon,
  TerminalIcon,
} from "@/components/win7/icons";
import { StartMenu } from "@/components/win7/StartMenu";
import { Tray, type Panel } from "@/components/win7/Tray";
import { useWindowStore } from "@/store/windows";

const MENU_ID = "start-menu";

/** Icon for a taskbar button. Folders and saved files fall back to the tree. */
const TaskIcon = ({ id }: { id: string }) => {
  if (id === TERMINAL_ID) return <TerminalIcon className="task-button-icon" />;
  if (id === CALC_ID) return <CalculatorIcon className="task-button-icon" />;
  if (id === NOTEPAD_ID) return <NotepadIcon className="task-button-icon" />;
  if (id === WMP_ID) return <MediaPlayerIcon className="task-button-icon" />;
  if (id === RACER_ID) return <RacerIcon className="task-button-icon" />;
  if (id === PDF_ID || id.startsWith(PDF_PREFIX)) return <PdfIcon className="task-button-icon" />;
  if (id.startsWith(PHOTOS_PREFIX)) return <PhotoViewerIcon className="task-button-icon" />;
  if (id === PERSONALIZE_ID) return <PersonalizeIcon className="task-button-icon" />;
  if (id === CONTROL_PANEL_ID) return <ComputerIcon className="task-button-icon" />;

  const Icon = node(id)?.Icon ?? FolderIcon;
  return <Icon className="task-button-icon" />;
};

/** Name for a pinned button that has no window to take a caption from. */
const APP_NAMES: Record<string, string> = {
  [TERMINAL_ID]: "Command Prompt",
  [CALC_ID]: "Calculator",
  [NOTEPAD_ID]: "Notepad",
  [WMP_ID]: WMP_TITLE,
  [RACER_ID]: RACER_TITLE,
};

const taskLabel = (id: string) => APP_NAMES[id] ?? node(id)?.label ?? id;

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
export function Taskbar({ onShutdown }: { onShutdown?: () => void } = {}) {
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
      {panel === "start" && <StartMenu id={MENU_ID} onLaunch={launch} onShutdown={onShutdown} />}

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
          <StartOrbFace />
        </button>

        <AskBar open={panel === "ask"} setOpen={(open) => setPanel(open ? "ask" : null)} />

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
