"use client";

import { create } from "zustand";

/**
 * The Recycle Bin.
 *
 * In memory only, by choice: a reload puts everything back on the desktop.
 * Nothing here can be destroyed — there is no empty(), because a visitor
 * shouldn't be able to permanently remove anything from someone else's
 * portfolio. Deleting is a toy, and the reload is the undo.
 */
type RecycleBin = {
  /** Ids of deleted nodes, oldest first. */
  deleted: string[];
  isEmpty: () => boolean;
  remove: (id: string) => void;
  restore: (id: string) => void;
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
}));
