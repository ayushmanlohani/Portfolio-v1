"use client";

import { create } from "zustand";

import { node } from "@/components/win7/fs";
import { useFiles } from "@/store/files";
import { useFolders } from "@/store/folders";
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
      belongs to; Restore's and New Folder's are drawn at the foot of the
      window's content area instead, since neither has a field of its own to
      sit under (Restore has no open editor, and New Folder's limit is hit
      before there's a folder to name). */
  kind: "rename" | "restore" | "folder-limit";
};

type InlineEdit = {
  editingId: string | null;
  warning: Warning | null;

  start: (id: string) => void;
  cancel: () => void;
  /** Tries to commit whatever `editingId` is holding — as a folder's name if
      that's what it is, a file's otherwise. A collision leaves edit mode
      open with a warning instead of closing it. */
  commit: (id: string, value: string) => void;
  /** Tries to restore `id`. A name collision on the Desktop blocks the
      restore and raises the warning instead. */
  tryRestore: (id: string) => void;
  /** Raises the "10 folders" warning under `parentId`'s own window — called
      when New Folder finds that parent already full. */
  folderLimitReached: (parentId: string) => void;
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

    const isFolder = node(id)?.kind === "folder";
    // A folder's name is exactly what was typed — no extension to protect,
    // unlike a Notepad save, where no extension typed gets .txt.
    const value = isFolder ? typed : /\.[^.]+$/.test(typed) ? typed : `${typed}.txt`;

    const ok = isFolder ? useFolders.getState().rename(id, value) : useFiles.getState().rename(id, value);
    if (!ok) {
      if (warningTimer) clearTimeout(warningTimer);
      const text = isFolder
        ? `A folder named "${value}" already exists.`
        : `"${value}" is already in use.`;
      set({ warning: { id, text, kind: "rename" } });
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

  folderLimitReached: (parentId) => {
    if (warningTimer) clearTimeout(warningTimer);
    set({
      warning: { id: parentId, text: "This folder can only hold 10 new folders.", kind: "folder-limit" },
    });
    warningTimer = setTimeout(() => {
      set((s) => (s.warning?.id === parentId ? { warning: null } : s));
    }, 2600);
  },
}));
