"use client";

import { create } from "zustand";

import { node, registerFolder, relabel } from "@/components/win7/fs";
import { useRecycleBin } from "@/store/recycleBin";

/**
 * Folders made with Explorer's own New Folder command.
 *
 * In memory only, same as `store/files.ts` — a reload puts every folder-you-
 * made-up back to nothing, which is the same "nobody's visit outlives their
 * visit" rule everything else here follows.
 *
 * A folder's *place* in the tree is registered into `fs.ts` on creation, so
 * everything that already reads the tree — Explorer, the desktop, the
 * Recycle Bin, the right-click menu — picks it up with no changes of its
 * own. This store only owns what the tree itself can't enforce: how many
 * live in one parent, and that no two siblings share a name.
 */

export type CreatedFolder = { id: string; name: string; parentId: string };

/** Real Explorer's own ceiling isn't this low, but ten is plenty to prove
 *  the limit works without needing to actually create that many by hand. */
const MAX_PER_FOLDER = 10;

const DEFAULT_NAME = "New folder";

type FolderStore = {
  folders: CreatedFolder[];
  /** How many *live* (non-deleted) folders `create` has made inside
      `parentId`. */
  countIn: (parentId: string) => number;
  /** Makes a folder inside `parentId`, named "New folder" (suffixed if that's
      already taken) — the caller is expected to hand it straight to
      `useInlineEdit`'s rename so the user can type the real name over it.
      Returns null instead of creating one once `parentId` already holds
      `MAX_PER_FOLDER`. */
  create: (parentId: string) => string | null;
  /** Renames a created folder. Returns false and changes nothing if any
      other live item in the same parent — folder, page or file, created or
      not — already uses that name, checked case-insensitively, the way
      Windows itself treats names. */
  rename: (id: string, name: string) => boolean;
};

let nextId = 0;

/** Every live sibling's own name, lower-cased — the actual tree is the
 *  source of truth for what a folder holds, not this store's own list, so a
 *  new folder can't collide with a content page or a Notepad file either,
 *  not just with something else New Folder made. */
function takenNames(parentId: string, excludeId?: string): Set<string> {
  const deleted = useRecycleBin.getState().deleted;
  const children = node(parentId)?.children ?? [];
  return new Set(
    children
      .filter((childId) => childId !== excludeId && !deleted.includes(childId))
      .map((childId) => (node(childId)?.label ?? "").toLowerCase()),
  );
}

export const useFolders = create<FolderStore>((set, get) => ({
  folders: [],

  countIn: (parentId) => {
    const deleted = useRecycleBin.getState().deleted;
    return get().folders.filter((f) => f.parentId === parentId && !deleted.includes(f.id)).length;
  },

  create: (parentId) => {
    if (get().countIn(parentId) >= MAX_PER_FOLDER) return null;

    const taken = takenNames(parentId);
    let name = DEFAULT_NAME;
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${DEFAULT_NAME} (${n})`;

    const id = `folder-${++nextId}`;
    registerFolder(id, name, parentId);
    set((state) => ({ folders: [...state.folders, { id, name, parentId }] }));
    return id;
  },

  rename: (id, name) => {
    const target = get().folders.find((f) => f.id === id);
    if (!target) return false;

    if (takenNames(target.parentId, id).has(name.toLowerCase())) return false;

    set((state) => ({ folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    relabel(id, name);
    return true;
  },
}));
