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

  open(id, { title: node(id)?.label ?? id, ...FOLDER_SIZE, desk });
}
