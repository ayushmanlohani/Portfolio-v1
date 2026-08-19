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
