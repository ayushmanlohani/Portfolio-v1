"use client";

import { create } from "zustand";

import { node } from "@/components/win7/fs";
import { useFiles } from "@/store/files";
import { useRecycleBin } from "@/store/recycleBin";

/**
 * Rename-in-place, and the small warning Restore raises on a name collision.
 *
 * Real Windows renames by turning the icon's own label into a text box —
 * there's no separate dialog. `editingId` is read by whichever component is
 * actually drawing that node (a desktop icon or an Explorer tile), and it
 * swaps its label for an input when it matches. `warning` is the balloon
 * Windows shows under a name that's taken; it carries the node id so only
 * the one tile that caused it lights up, and it clears itself after a few
 * seconds or the next attempt.
 *
 * Restoring into a taken name doesn't rename anything automatically — it
 * just refuses and raises the same warning, every time it's tried, until
 * whoever's in the bin gets a new name from an explicit Rename.
 */
type Warning = {
  id: string;
  text: string;
  /** Which action raised it — Rename's collision stays under the field it
      belongs to, while Restore's is drawn at the foot of the bin's content
      area instead, so a tile near the left edge never buries it. */
  kind: "rename" | "restore";
};

type InlineEdit = {
  editingId: string | null;
  warning: Warning | null;

  start: (id: string) => void;
  cancel: () => void;
  /** Tries to commit whatever `editingId` is holding. A collision leaves
      edit mode open with a warning instead of closing it. */
  commit: (id: string, value: string) => void;
  /** Tries to restore `id`. A name collision on the Desktop blocks the
      restore and raises the warning instead. */
  tryRestore: (id: string) => void;
};

let warningTimer: ReturnType<typeof setTimeout> | null = null;

export const useInlineEdit = create<InlineEdit>((set, get) => ({
  editingId: null,
  warning: null,

  start: (id) => set({ editingId: id, warning: null }),
  cancel: () => set({ editingId: null, warning: null }),

  commit: (id, raw) => {
    const typed = raw.trim();
    if (!typed) {
      set({ editingId: null, warning: null });
      return;
    }

    // Same rule Notepad's own Save As uses: no extension typed gets .txt.
    const value = /\.[^.]+$/.test(typed) ? typed : `${typed}.txt`;

    const ok = useFiles.getState().rename(id, value);
    if (!ok) {
      if (warningTimer) clearTimeout(warningTimer);
      set({ warning: { id, text: `"${value}" is already in use.`, kind: "rename" } });
      warningTimer = setTimeout(() => {
        set((s) => (s.warning?.id === id ? { warning: null } : s));
      }, 2600);
      return;
    }
    set({ editingId: null, warning: null });
  },

  tryRestore: (id) => {
    const item = node(id);
    const deletedNow = useRecycleBin.getState().deleted;
    const clashes =
      item?.kind === "file" &&
      useFiles
        .getState()
        .files.some((f) => f.id !== id && f.name === item.label && !deletedNow.includes(f.id));

    if (clashes) {
      if (warningTimer) clearTimeout(warningTimer);
      set({ warning: { id, text: "A file with the same name already exists.", kind: "restore" } });
      warningTimer = setTimeout(() => {
        set((s) => (s.warning?.id === id ? { warning: null } : s));
      }, 2600);
      return;
    }

    useRecycleBin.getState().restore(id);
    // Only meaningful if a stale warning from an earlier attempt is still up.
    if (get().warning?.id === id) set({ warning: null });
  },
}));
