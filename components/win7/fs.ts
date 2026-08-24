import { createElement } from "react";

import {
  ChromeIcon,
  ComputerIcon,
  DriveIcon,
  FolderIcon,
  NetworkIcon,
  NotepadIcon,
  PdfIcon,
  RacerIcon,
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

export type NodeKind =
  | "folder"
  | "file"
  | "drive"
  | "bin"
  | "computer"
  | "network"
  | "group"
  | "app";

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

/** A filename read off a slug, Windows-cased: capitalised, not upper-cased —
 *  `research` becomes `Research`, not `RESEARCH`. */
const capitalize = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);

/**
 * Every folder that comes from content/pages.ts, and what each one holds.
 *
 * Walked once at module load rather than looked up per render. A group
 * becomes a folder holding more of them, to whatever depth the content file
 * nests. A page becomes a .txt file — Research Assistant and every other
 * role or qualification opens in Notepad now, not by navigating into a
 * folder — styled exactly as it was, since Notepad reads it straight back
 * out of content/pages.ts via `entryAt` (see Notepad.tsx).
 */
const PAGE_FOLDERS: FsNode[] = [];

function walk(parent: string, entries: Record<string, Entry>): string[] {
  return Object.entries(entries).map(([key, entry]) => {
    const id = `${parent}/${key}`;

    if (isGroup(entry)) {
      // Children first: the group's own node needs their ids, and those
      // only exist once its children have been walked.
      PAGE_FOLDERS.push({
        id,
        label: entry.name,
        Icon: FolderIcon,
        kind: "folder",
        type: "File folder",
        children: walk(id, entry.children),
      });
    } else {
      PAGE_FOLDERS.push({
        id,
        label: `${entry.fileLabel ?? capitalize(key)}.txt`,
        Icon: TextFileIcon,
        kind: "file",
        type: "Text Document",
      });
    }

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
/**
 * The Unitwise mockup, sitting inside the Unitwise folder as a document
 * rather than a folder of its own. Double-clicking it opens it in Chrome —
 * see Explorer.tsx — which is why it wears Chrome's icon, the same way
 * Windows badges an .html file with whichever browser opens it.
 */
export const UNITWISE_FILE_ID = "projects/unitwise/unitwise.interactive";
export const SENTINEL_FILE_ID = "projects/sentinel/sentinel.interactive";

/** The writeup that used to be Unitwise/RBI Sentinel's own page — see
 *  content/projectText.ts — now a real Notepad file, seeded into
 *  `useFiles` at store creation rather than created through Save. */
export const UNITWISE_TXT_ID = "projects/unitwise/unitwise.txt";
export const SENTINEL_TXT_ID = "projects/sentinel/sentinel.txt";

/** About Me and Contact, each now the one file inside its folder rather
 *  than something the folder draws in place of a listing. */
export const ABOUT_TXT_ID = "about/about.txt";
export const CONTACT_TXT_ID = "contact/contact.txt";

// Unitwise, RBI Sentinel, About Me and Contact aren't pages from
// content/pages.ts — each is a hand-built component with its own layout —
// so their files are added by hand here, the same way the desktop folders
// themselves are.
const EXTRA_CHILDREN: Record<string, string[]> = {
  projects: ["projects/unitwise", "projects/sentinel"],
  about: [ABOUT_TXT_ID],
  contact: [CONTACT_TXT_ID],
};

function childrenOf(id: string): string[] | undefined {
  const pages = PAGE_CHILDREN[id] ?? [];
  const items = FOLDERS[id]?.map((item) => fileId(id, item.name)) ?? [];
  const all = [...pages, ...items, ...(EXTRA_CHILDREN[id] ?? [])];
  // The Resume folder holds the real PDF, not a text item — its node id is
  // its viewer window id, the same trick the Pictures folder uses.
  if (id === "resume") all.push(PDF_PREFIX + RESUME.pdf);
  return all.length > 0 ? all : undefined;
}

/**
 * Unitwise and RBI Sentinel as ordinary folders — like any drive folder,
 * not the styled project page they used to be — each holding its writeup
 * and its Chrome shortcut.
 */
const PROJECT_FOLDERS: FsNode[] = [
  {
    id: "projects/unitwise",
    label: "Unitwise",
    Icon: FolderIcon,
    kind: "folder",
    type: "File folder",
    children: [UNITWISE_TXT_ID, UNITWISE_FILE_ID],
  },
  {
    id: UNITWISE_TXT_ID,
    label: "Unitwise.txt",
    Icon: TextFileIcon,
    kind: "file",
    type: "Text Document",
  },
  {
    id: "projects/sentinel",
    label: "RBI Sentinel",
    Icon: FolderIcon,
    kind: "folder",
    type: "File folder",
    children: [SENTINEL_TXT_ID, SENTINEL_FILE_ID],
  },
  {
    id: SENTINEL_TXT_ID,
    label: "Sentinel.txt",
    Icon: TextFileIcon,
    kind: "file",
    type: "Text Document",
  },
];

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
  deletable: true,
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

  // An installed program, not a place. Double-clicking it launches a window
  // rather than listing anything, so it has no `children` — see
  // `launchWindow` in components/win7/apps.ts.
  {
    id: "chrome",
    label: "Google Chrome",
    Icon: ChromeIcon,
    kind: "app",
    type: "Application",
    deletable: true,
  },

  // Same shape as Chrome above: a program, not a place.
  {
    id: "racer",
    label: "Time Attack",
    Icon: RacerIcon,
    kind: "app",
    type: "Application",
    deletable: true,
  },

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
    children: ["computer", ...DESKTOP_FOLDERS, "chrome", "racer", "recycle"],
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
    label: "My Computer",
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
    children: ["desktop", "documents", "downloads", "pictures"],
    type: "Local Disk",
  },
  {
    id: "documents",
    label: "Documents",
    Icon: FolderIcon,
    kind: "folder",
    type: "File folder",
    // The resume PDF is the only document there is — same node the Resume
    // desktop folder lists, so opening it from either place lands on the
    // same viewer window.
    children: [RESUME_PDF_NODE.id],
  },
  { id: "network", label: "Network", Icon: NetworkIcon, kind: "network", type: "System folder" },

  {
    id: UNITWISE_FILE_ID,
    label: "unitwise.interactive",
    Icon: ChromeIcon,
    kind: "folder",
    type: "Chrome HTML Document",
  },
  {
    id: SENTINEL_FILE_ID,
    label: "sentinel.interactive",
    Icon: ChromeIcon,
    kind: "folder",
    type: "Chrome HTML Document",
  },
  {
    id: ABOUT_TXT_ID,
    label: "About.txt",
    Icon: TextFileIcon,
    kind: "file",
    type: "Text Document",
  },
  {
    id: CONTACT_TXT_ID,
    label: "Contact.txt",
    Icon: TextFileIcon,
    kind: "file",
    type: "Text Document",
  },
  ...PROJECT_FOLDERS,
  ...PAGE_FOLDERS,
  ...FILES,
];

export const NODES = new Map(NODE_LIST.map((n) => [n.id, n]));

export const node = (id: string) => NODES.get(id);

/**
 * Every ancestor id on the way to `id`, root first — walked via parent
 * pointers so `about` correctly shows `Local Disk (C:) → Desktop → About Me`
 * instead of just `About Me`. The address bar is the only reader.
 */
export function crumbIds(id: string): string[] {
  // Walk parent chain via NODES so `about` (child of `desktop` child of
  // `drive-c`) yields [drive-c, desktop, about] and `projects/unitwise`
  // yields [drive-c, desktop, projects, projects/unitwise].
  const chain: string[] = [];
  let cur: string | undefined = id;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    chain.unshift(cur);
    // Find parent by scanning children — `parentOf` is defined below, so
    // inline the search here to avoid ordering issues. `favorites` lists
    // `desktop` too (it's the nav-pane shortcut, not real containment), so
    // it's skipped here — otherwise it wins the scan ahead of `drive-c` and
    // cuts every path short at "Desktop", one node above where it should.
    let parentId: string | undefined;
    for (const candidate of NODES.values()) {
      if (candidate.id === "favorites") continue;
      if (candidate.children?.includes(cur)) {
        parentId = candidate.id;
        break;
      }
    }
    if (!parentId) break;
    // Stop before `computer`/`favorites` — the bar already shows the hardcoded
    // `Ayushman` root, and the user expects `Ayushman → C: → Desktop → …`
    if (parentId === "computer" || parentId === "favorites") break;
    // For `drive-c` the parent is `computer`, so the next loop would push
    // `drive-c` then stop; we want `drive-c` in the trail, so continue one
    // more iteration to include it, then break above.
    cur = parentId;
    // Include `drive-c` itself then stop — don't walk beyond it.
    if (cur === "drive-c") {
      // `drive-c` will be added at top of next loop; after that break.
      continue;
    }
  }
  // Filter out any non-file-system roots that slipped in (e.g. `computer`)
  return chain.filter((cid) => cid !== "computer" && cid !== "favorites");
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

/**
 * Adds an empty folder to the tree, made with Explorer's own New Folder
 * command — inside whichever folder was open when it was clicked, not
 * always the Desktop the way a Notepad save is. `store/folders.ts` owns the
 * bookkeeping (the count and name-collision rules a real folder needs, that
 * a lone id in the tree can't enforce on its own) and is what components
 * subscribe to for the re-render.
 */
export function registerFolder(id: string, name: string, parentId: string) {
  NODES.set(id, {
    id,
    label: name,
    Icon: FolderIcon,
    kind: "folder",
    deletable: true,
    type: "File folder",
    children: [],
  });

  const parent = NODES.get(parentId);
  if (parent) parent.children = [...(parent.children ?? []), id];
}

/** Changes a registered file's or folder's display name in place — used by
 *  Rename, and by restoring a file whose old name collides with one already
 *  on the Desktop. */
export function relabel(id: string, name: string) {
  const existing = NODES.get(id);
  if (existing) NODES.set(id, { ...existing, label: name });
}

/** Whichever node currently lists `id` as a child — a registered file is
 *  always the Desktop, but a registered folder can be anywhere, so removal
 *  has to search rather than assume. */
function parentOf(id: string): FsNode | undefined {
  for (const candidate of NODES.values()) {
    if (candidate.children?.includes(id)) return candidate;
  }
  return undefined;
}

/**
 * Fully removes a registered file or folder from the tree: wherever it was
 * listed stops listing it, and `node(id)` stops finding it. Only a permanent
 * delete from the Recycle Bin calls this — everything else (drag-to-bin,
 * Delete) only moves an id in and out of `useRecycleBin`'s `deleted` list.
 */
export function unregisterFile(id: string) {
  NODES.delete(id);
  const parent = parentOf(id);
  if (parent) parent.children = (parent.children ?? []).filter((child) => child !== id);
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
