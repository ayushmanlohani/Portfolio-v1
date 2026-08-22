"use client";

import { create } from "zustand";

import { registerFile, relabel, UNITWISE_TXT_ID, SENTINEL_TXT_ID } from "@/components/win7/fs";
import { SENTINEL_TEXT, UNITWISE_TEXT } from "@/content/projectText";
import { useRecycleBin } from "@/store/recycleBin";

/**
 * Text files saved by Notepad.
 *
 * In memory only, by choice — a reload clears the desktop back to the six
 * folders, same as icon positions and the Recycle Bin. Nothing a visitor types
 * outlives their visit, which is the point: this is someone's portfolio, not
 * storage.
 *
 * The *text* lives here; the file's place in the tree is registered into
 * `fs.ts` on save, so everything that already reads the tree — the desktop,
 * Explorer, the Recycle Bin, the right-click menu — picks it up with no
 * changes. Components subscribe to `files` here for the re-render.
 */

export type TextFile = { id: string; name: string; text: string };

type FileStore = {
  files: TextFile[];
  /** Saves under `name`, overwriting any file already called that — a file
      sitting in the Recycle Bin doesn't count as "already called that", so
      deleting one and saving a new file under its old name gets a fresh
      file rather than quietly resurrecting the deleted one. */
  save: (name: string, text: string) => string;
  read: (id: string) => TextFile | undefined;
  /** Renames a saved file. Returns false and changes nothing if another
      live (non-deleted) file already uses that name. */
  rename: (id: string, name: string) => boolean;
  /** Drops a file for good — only a permanent delete from the Recycle Bin
      calls this. */
  forget: (id: string) => void;
};

let nextId = 0;

export const useFiles = create<FileStore>((set, get) => ({
  // Unitwise and RBI Sentinel's writeups: real Notepad files from the moment
  // the desktop loads, rather than something Save has to create first — see
  // fs.ts for the folder nodes that list them.
  files: [
    { id: UNITWISE_TXT_ID, name: "unitwise.txt", text: UNITWISE_TEXT },
    { id: SENTINEL_TXT_ID, name: "sentinel.txt", text: SENTINEL_TEXT },
  ],

  save: (name, text) => {
    const deleted = useRecycleBin.getState().deleted;
    const existing = get().files.find((f) => f.name === name && !deleted.includes(f.id));
    if (existing) {
      set((state) => ({
        files: state.files.map((f) => (f.id === existing.id ? { ...f, text } : f)),
      }));
      return existing.id;
    }

    // Ids are internal and never shown; the name is what the desktop displays,
    // which is why renaming only has to touch the node's label.
    const id = `file-${++nextId}`;
    registerFile(id, name);
    set((state) => ({ files: [...state.files, { id, name, text }] }));
    return id;
  },

  read: (id) => get().files.find((f) => f.id === id),

  rename: (id, name) => {
    const deleted = useRecycleBin.getState().deleted;
    const clash = get().files.some((f) => f.id !== id && f.name === name && !deleted.includes(f.id));
    if (clash) return false;

    set((state) => ({ files: state.files.map((f) => (f.id === id ? { ...f, name } : f)) }));
    relabel(id, name);
    return true;
  },

  forget: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
}));
