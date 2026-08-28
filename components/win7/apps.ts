"use client";

import { readDesk } from "@/components/win7/desk";
import { MediaPlayerIcon, PingPongIcon, RacerIcon } from "@/components/win7/icons";
import { node } from "@/components/win7/fs";
import { PDF_PREFIX, PHOTOS_PREFIX } from "@/components/win7/media";
import { useWindowStore } from "@/store/windows";

/**
 * Windows that aren't folders.
 *
 * A window's id is what decides which component fills it and which icon its
 * taskbar button carries, so the id has to be the same string in the Start
 * menu, the window layer and the taskbar. One constant, three readers.
 */

export const TERMINAL_ID = "terminal";

/** The size cmd.exe opens at: 80 columns by 25 rows, plus its chrome. */
export const TERMINAL_SIZE = { width: 660, height: 420 };

/** What the caption bar reads. */
export const TERMINAL_TITLE = "Ayush";

export const CALC_ID = "calculator";
export const CALC_SIZE = { width: 320, height: 448 };

export const NOTEPAD_ID = "notepad";
export const NOTEPAD_SIZE = { width: 620, height: 460 };

/**
 * The media apps are opened per file, so their window id carries the file:
 * `photos:/letterbox/pngs/kitten.png`. Two pictures then open as two windows,
 * each with its own caption, and re-opening one refocuses it instead of
 * spawning a duplicate — all of that falls out of the store's existing rule
 * that a window is its id. Windows Media Player has one window, like WMP.
 */
export const WMP_ID = "wmp";
export const WMP_SIZE = { width: 826, height: 586 };
export const WMP_TITLE = "Windows Media Player";

/** The PDF viewer as an app: one window, opens on nothing. */
export const PDF_ID = "pdfviewer";
export const PDF_TITLE = "PDF Viewer";

/**
 * The Control Panel's Personalization page, opened from the desktop
 * right-click menu. It keeps the centred caption Explorer folders use —
 * no caption icon — so its title sits dead centre of the bar.
 */
export const PERSONALIZE_ID = "personalize";
export const PERSONALIZE_SIZE = { width: 820, height: 600 };

/**
 * The desktop right-click menu's "Screen resolution" — informational only,
 * reading real numbers off `window.screen` rather than actually resizing
 * anything (the monitor always fills the viewport, see CLAUDE.md).
 */
export const SCREEN_RES_ID = "screenres";
export const SCREEN_RES_SIZE = { width: 560, height: 480 };

/**
 * Time Attack, the racing game. One window, opens on its own menu, and like
 * every other application here it is only ever its id.
 */
export const RACER_ID = "racer";
export const RACER_TITLE = "Time Attack";
export const RACER_SIZE = { width: 880, height: 520 };

/**
 * Ping Pong (Deparkanoid), the breakout arcade game.
 */
export const PINGPONG_ID = "pingpong";
export const PINGPONG_TITLE = "Ping Pong";
export const PINGPONG_SIZE = { width: 880, height: 540 };

/** Control Panel Home — the category grid, opened from the Start menu. */
export const CONTROL_PANEL_ID = "controlpanel";
export const CONTROL_PANEL_SIZE = { width: 820, height: 600 };

export { PDF_PREFIX, PHOTOS_PREFIX } from "@/components/win7/media";

export const PHOTOS_SIZE = { width: 640, height: 512 };
export const PDF_SIZE = { width: 780, height: 680 };

/**
 * Windows that put their icon in the caption bar beside a left-aligned title,
 * rather than taking the centred title the rest of the desktop uses. Windows 7
 * does this for its own applications and not for Explorer folders, and Media
 * Player is the one here that reads as an application.
 */
export const CAPTION_ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  [WMP_ID]: MediaPlayerIcon,
  [RACER_ID]: RacerIcon,
  [PINGPONG_ID]: PingPongIcon,
};

/** The file a `photos:` or `pdf:` window is showing. */
export const mediaSrc = (id: string) => id.slice(id.indexOf(":") + 1);

/** What Windows would call the file — the caption bar of both viewers. */
const baseName = (src: string) => src.slice(src.lastIndexOf("/") + 1);

/**
 * A cosmetic Chrome browser — an installed program, so it has a desktop
 * shortcut and a Start menu entry rather than living inside a folder. Its
 * icon and label come from the `chrome` node in fs.ts, which is what the
 * desktop and the taskbar read.
 */
export const CHROME_ID = "chrome";
export const CHROME_SIZE = { width: 1040, height: 680 };

/** What a folder window opens at. */
const FOLDER_SIZE = { width: 900, height: 600 };

/**
 * What each application window opens as: its caption and its size. Folders
 * aren't here — they all open the same way, off the file tree, and so are the
 * two media viewers, whose caption is the file they were handed.
 */
const APPS: Record<string, { title: string; width: number; height: number }> = {
  [TERMINAL_ID]: { title: TERMINAL_TITLE, ...TERMINAL_SIZE },
  [CALC_ID]: { title: "Calculator", ...CALC_SIZE },
  [NOTEPAD_ID]: { title: "Untitled - Notepad", ...NOTEPAD_SIZE },
  [RACER_ID]: { title: RACER_TITLE, ...RACER_SIZE },
  [PINGPONG_ID]: { title: PINGPONG_TITLE, ...PINGPONG_SIZE },
  [WMP_ID]: { title: WMP_TITLE, ...WMP_SIZE },
  [PDF_ID]: { title: PDF_TITLE, ...PDF_SIZE },
  [PERSONALIZE_ID]: { title: "Personalization", ...PERSONALIZE_SIZE },
  [SCREEN_RES_ID]: { title: "Screen Resolution", ...SCREEN_RES_SIZE },
  [CONTROL_PANEL_ID]: { title: "Control Panel", ...CONTROL_PANEL_SIZE },
  [CHROME_ID]: { title: "New Tab - Google Chrome", ...CHROME_SIZE },
};

/**
 * Opens any window by id, folder or app, at the size and title that id calls
 * for. The store's own `open` already handles the re-open case: it
 * un-minimises and refocuses rather than spawning a second window.
 *
 * Called outside a component in places — a pinned taskbar button, a context
 * menu — so it reaches the store through `getState()` rather than a hook.
 */
export function launchWindow(id: string) {
  const { open } = useWindowStore.getState();
  const desk = readDesk();

  const app = APPS[id];
  if (app) {
    open(id, { ...app, desk });
    return;
  }

  // A viewer's id carries the file it was opened on, so its caption is that
  // file's name rather than anything fixed.
  if (id.startsWith(PHOTOS_PREFIX)) {
    open(id, { title: baseName(mediaSrc(id)), ...PHOTOS_SIZE, desk });
    return;
  }

  if (id.startsWith(PDF_PREFIX)) {
    open(id, { title: baseName(mediaSrc(id)), ...PDF_SIZE, desk });
    return;
  }

  const item = node(id);

  // A saved text file opens in Notepad rather than Explorer. The window is
  // keyed by the file's own id, so the same file can't open twice.
  if (item?.kind === "file") {
    open(id, { title: `${item.label} - Notepad`, ...NOTEPAD_SIZE, desk });
    return;
  }

  open(id, { title: item?.label ?? id, ...FOLDER_SIZE, desk });
}
