import { createElement } from "react";

import {
  ComputerIcon,
  DriveIcon,
  FolderIcon,
  NetworkIcon,
  NotepadIcon,
  PdfIcon,
  RecycleBinIcon,
  StarIcon,
  TextFileIcon,
} from "@/components/win7/icons";
import { fileName, PDF_PREFIX, PHOTOS_PREFIX, PICTURES } from "@/components/win7/media";
import { FOLDERS } from "@/content/folders";
import { type Entry, isGroup, PAGES } from "@/content/pages";
import { RESUME } from "@/content/resume";

/**
 * The file tree.
 *
 * One description of what contains what, read by the desktop, the navigation
 * pane, the address bar, the window caption and the folder listings. Before
 * this existed the desktop and Explorer each kept their own idea of what a
 * folder was, which is why opening About Me and walking to Desktop left the
 * caption still saying "About Me".
 *
 * Nothing here is a real filesystem. It is a map of places, and `children` is
 * what a place shows when you open it.
 */

export type NodeKind = "folder" | "file" | "drive" | "bin" | "computer" | "network" | "group";

export type FsNode = {
  id: string;
  label: string;
  /** Component rather than element, so the same node draws at 16px or 48px. */
  Icon: (props: { className?: string }) => React.ReactElement;
  kind: NodeKind;
  /** Ids of what this place contains. Absent means "nothing to list". */
  children?: string[];
  /** Only these can be sent to the Recycle Bin. */
  deletable?: boolean;
  /** What the details pane calls it. */
  type?: string;
  /** A file's words, straight from content/folders.ts. Folders have none. */
  body?: readonly string[];
};

/** The six folders on the desktop, in the order Windows stacks them. */
export const DESKTOP_FOLDERS = [
  "about",
  "projects",
  "experience",
  "education",
  "resume",
  "contact",
] as const;

/**
 * A file's id is `<folder>/<name>`, so it is unique without anyone having to
 * invent and maintain a second set of ids in the content file. Ayushman writes
 * a name; the id follows from it.
 */
const fileId = (parent: string, name: string) =>
  `${parent}/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

/**
 * Every folder that comes from content/pages.ts, and what each one holds.
 *
 * Walked once at module load rather than looked up per render. A page becomes
 * a childless folder — you open it and you are somewhere, and Back walks out
 * again — and a group becomes a folder holding more of them, to whatever depth
 * the content file nests.
 */
const PAGE_FOLDERS: FsNode[] = [];

function walk(parent: string, entries: Record<string, Entry>): string[] {
  return Object.entries(entries).map(([key, entry]) => {
    const id = `${parent}/${key}`;

    // Children first: a group's own node needs the ids of what's inside it,
    // and those only exist once its children have been walked.
    const children = isGroup(entry) ? walk(id, entry.children) : undefined;

    PAGE_FOLDERS.push({
      id,
      label: entry.name,
      Icon: FolderIcon,
      kind: "folder",
      type: "File folder",
      children,
    });

    return id;
  });
}

const PAGE_CHILDREN: Record<string, string[]> = Object.fromEntries(
  Object.entries(PAGES).map(([top, entries]) => [top, walk(top, entries)]),
);

/**
 * What a desktop folder contains, gathered from both content files: the
 * entries that have a page of their own first, then the plain text items.
 *
 * `undefined` rather than an empty array when there is nothing, because the
 * two mean different things — an empty array is "empty folder", `undefined` is
 * "somewhere that doesn't list things at all". About Me is the second kind: it
 * draws its own pane instead of a listing.
 */
function childrenOf(id: string): string[] | undefined {
  const pages = PAGE_CHILDREN[id] ?? [];
  const items = FOLDERS[id]?.map((item) => fileId(id, item.name)) ?? [];
  const all = [...pages, ...items];
  // The Resume folder holds the real PDF, not a text item — its node id is
  // its viewer window id, the same trick the Pictures folder uses.
  if (id === "resume") all.push(PDF_PREFIX + RESUME.pdf);
  return all.length > 0 ? all : undefined;
}

/**
 * A desktop folder. Its children come from the content files, so adding an
 * item there is the whole job — nothing here has to be touched.
 */
const folder = (id: string, label: string): FsNode => ({
  id,
  label,
  Icon: FolderIcon,
  kind: "folder",
  deletable: true,
  type: "File folder",
  children: childrenOf(id),
});

/** One node per item in content/folders.ts. */
const FILES: FsNode[] = Object.entries(FOLDERS).flatMap(([parent, items]) =>
  items.map(
    (item): FsNode => ({
      id: fileId(parent, item.name),
      label: item.name,
      Icon: NotepadIcon,
      kind: "file",
      type: item.type ?? "Text Document",
      body: item.text,
    }),
  ),
);

/**
 * The Pictures folder.
 *
 * A picture's node id is its viewer window id — `photos:/letterbox/...` — so
 * opening one from a folder and opening it from anywhere else land on the
 * same window instead of two. Its icon is the picture itself, which is what
 * Windows does with an image file and is the whole reason a Pictures folder
 * looks different from every other folder.
 */
const thumbnail = (src: string) => {
  const Thumbnail = ({ className }: { className?: string }) =>
    createElement("img", { className: `fs-thumb ${className ?? ""}`.trim(), src, alt: "" });
  Thumbnail.displayName = `Thumbnail(${fileName(src)})`;
  return Thumbnail;
};

const PICTURE_NODES: FsNode[] = PICTURES.map((picture) => ({
  id: PHOTOS_PREFIX + picture.src,
  label: fileName(picture.src),
  Icon: thumbnail(picture.src),
  kind: "file",
  type: picture.src.endsWith(".png") ? "PNG image" : "JPEG image",
}));

/** The resume as a file in the Resume folder. Opening it opens the viewer. */
const RESUME_PDF_NODE: FsNode = {
  id: PDF_PREFIX + RESUME.pdf,
  label: fileName(RESUME.pdf),
  Icon: PdfIcon,
  kind: "file",
  type: "PDF Document",
};

const NODE_LIST: FsNode[] = [
  {
    id: "pictures",
    label: "Pictures",
    Icon: FolderIcon,
    kind: "folder",
    type: "File folder",
    children: PICTURE_NODES.map((n) => n.id),
  },
  ...PICTURE_NODES,
  RESUME_PDF_NODE,

  folder("about", "About Me"),
  folder("projects", "Projects"),
  folder("experience", "Experience"),
  folder("education", "Education"),
  folder("resume", "Resume"),
  folder("contact", "Contact"),

  {
    id: "recycle",
    label: "Recycle Bin",
    Icon: RecycleBinIcon,
    kind: "bin",
    children: [],
    type: "System folder",
  },

  // The Desktop folder lists what is actually on the desktop, Recycle Bin
  // included — same as Windows. Its children are filled in at read time,
  // because deleting something has to change both at once.
  {
    id: "desktop",
    label: "Desktop",
    Icon: FolderIcon,
    kind: "folder",
    children: [...DESKTOP_FOLDERS, "recycle"],
    type: "File folder",
  },
  { id: "downloads", label: "Downloads", Icon: FolderIcon, kind: "folder", type: "File folder" },
  { id: "recent", label: "Recent Places", Icon: FolderIcon, kind: "folder", type: "File folder" },

  {
    id: "favorites",
    label: "Favorites",
    Icon: StarIcon,
    kind: "group",
    children: ["desktop", "downloads", "recent"],
    type: "System folder",
  },
  {
    id: "computer",
    label: "Computer",
    Icon: ComputerIcon,
    kind: "computer",
    children: ["drive-c"],
    type: "System folder",
  },
  {
    id: "drive-c",
    label: "Local Disk (C:)",
    Icon: DriveIcon,
    kind: "drive",
    children: ["desktop", "downloads", "pictures"],
    type: "Local Disk",
  },
  { id: "network", label: "Network", Icon: NetworkIcon, kind: "network", type: "System folder" },

  ...PAGE_FOLDERS,
  ...FILES,
];

export const NODES = new Map(NODE_LIST.map((n) => [n.id, n]));

export const node = (id: string) => NODES.get(id);

/**
 * Every ancestor id on the way to `id`, root first — ids are built as
 * `parent/child` (see `fileId` and `walk` above), so splitting on `/` and
 * re-joining each prefix walks the path without a separate parent pointer.
 * The address bar is the only reader; it turns these into the crumb trail.
 */
export function crumbIds(id: string): string[] {
  const parts = id.split("/");
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}

/**
 * Adds a text file saved by Notepad to the tree, on the Desktop.
 *
 * It goes into the same map every other place lives in, rather than a second
 * list the desktop and Explorer would each have to merge: `node()` and
 * `contents()` then keep working untouched, and a saved file is deletable,
 * restorable and listable exactly like a folder. `store/files.ts` owns the
 * text and is what components subscribe to for the re-render.
 */
export function registerFile(id: string, name: string) {
  NODES.set(id, {
    id,
    label: name,
    Icon: TextFileIcon,
    kind: "file",
    deletable: true,
    type: "Text Document",
  });

  const desktop = NODES.get("desktop")!;
  desktop.children = [...(desktop.children ?? []), id];
}

/** Changes a registered file's display name in place — used by Rename, and by
 *  restoring a file whose old name collides with one already on the Desktop. */
export function relabel(id: string, name: string) {
  const existing = NODES.get(id);
  if (existing) NODES.set(id, { ...existing, label: name });
}

/**
 * Fully removes a registered file from the tree: the Desktop stops listing
 * it and `node(id)` stops finding it. Only a permanent delete from the
 * Recycle Bin calls this — everything else (drag-to-bin, Delete) only moves
 * an id in and out of `useRecycleBin`'s `deleted` list.
 */
export function unregisterFile(id: string) {
  NODES.delete(id);
  const desktop = NODES.get("desktop");
  if (desktop) desktop.children = (desktop.children ?? []).filter((child) => child !== id);
}

/**
 * What a place contains right now, with anything in the Recycle Bin taken out
 * and the bin's own contents put in. Everywhere that lists files goes through
 * here, so a deleted folder disappears from the desktop, from the Desktop
 * folder and from C:\Desktop in the same instant.
 */
export function contents(id: string, deleted: readonly string[]): string[] {
  if (id === "recycle") return [...deleted];

  const children = NODES.get(id)?.children ?? [];
  return children.filter((child) => !deleted.includes(child));
}

/** The navigation pane, top to bottom. Libraries was removed on request. */
export const TREE: { id: string; children?: string[] }[] = [
  { id: "favorites", children: ["desktop", "downloads", "recent"] },
  { id: "computer", children: ["drive-c"] },
  { id: "network" },
];
