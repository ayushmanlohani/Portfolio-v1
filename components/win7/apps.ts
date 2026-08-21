"use client";

import { readDesk } from "@/components/win7/desk";
import { node } from "@/components/win7/fs";
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

  if (id === TERMINAL_ID) {
    open(id, { title: TERMINAL_TITLE, ...TERMINAL_SIZE, desk });
    return;
  }

  if (id === CALC_ID) {
    open(id, { title: "Calculator", ...CALC_SIZE, desk });
    return;
  }

  if (id === NOTEPAD_ID) {
    open(id, { title: "Untitled - Notepad", ...NOTEPAD_SIZE, desk });
    return;
  }

  if (id === CHROME_ID) {
    open(id, { title: "New Tab - Google Chrome", ...CHROME_SIZE, desk });
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
