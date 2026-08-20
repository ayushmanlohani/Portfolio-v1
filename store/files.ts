"use client";

import { create } from "zustand";

import { registerFile } from "@/components/win7/fs";

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
  /** Saves under `name`, overwriting any file already called that. */
  save: (name: string, text: string) => string;
  read: (id: string) => TextFile | undefined;
};

let nextId = 0;

export const useFiles = create<FileStore>((set, get) => ({
  files: [],

  save: (name, text) => {
    const existing = get().files.find((f) => f.name === name);
    if (existing) {
      set((state) => ({
        files: state.files.map((f) => (f.id === existing.id ? { ...f, text } : f)),
      }));
      return existing.id;
    }

    // Ids are internal and never shown; the name is what the desktop displays,
    // which is why renaming would only need to touch the node's label.
    const id = `file-${++nextId}`;
    registerFile(id, name);
    set((state) => ({ files: [...state.files, { id, name, text }] }));
    return id;
  },

  read: (id) => get().files.find((f) => f.id === id),
}));
