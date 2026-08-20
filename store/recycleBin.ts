"use client";

import { create } from "zustand";

/**
 * The Recycle Bin.
 *
 * In memory only, by choice: a reload puts everything back on the desktop.
 * The six content folders can never be destroyed — there is no path from
 * "in the bin" to "gone" for them, only Restore. A Notepad file is the one
 * thing that can go all the way: ContextMenu's permanent-delete action
 * purges it from the tree (`unregisterFile`) and from `useFiles`, then calls
 * `purge` here to stop tracking it as deleted. Nothing does that silently —
 * it always sits behind a confirm dialog first.
 */
type RecycleBin = {
  /** Ids of deleted nodes, oldest first. */
  deleted: string[];
  isEmpty: () => boolean;
  remove: (id: string) => void;
  restore: (id: string) => void;
  /** Stops tracking `id` as deleted without restoring it anywhere — the
      underlying item is expected to already be gone. */
  purge: (id: string) => void;
};

export const useRecycleBin = create<RecycleBin>((set, get) => ({
  deleted: [],

  isEmpty: () => get().deleted.length === 0,

  remove: (id) =>
    set((state) =>
      state.deleted.includes(id) ? state : { deleted: [...state.deleted, id] },
    ),

  restore: (id) =>
    set((state) => ({ deleted: state.deleted.filter((d) => d !== id) })),

  purge: (id) => set((state) => ({ deleted: state.deleted.filter((d) => d !== id) })),
}));
