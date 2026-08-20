import {
  ComputerIcon,
  DriveIcon,
  FolderIcon,
  NetworkIcon,
  NotepadIcon,
  RecycleBinIcon,
  StarIcon,
} from "@/components/win7/icons";
import { FOLDERS } from "@/content/folders";
import { PAGES } from "@/content/pages";

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
 * A thing with a page of its own is a folder, not a text file — you open it
 * and you are somewhere, and Back walks out again.
 */
export const pageId = (parent: string, key: string) => `${parent}/${key}`;

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
  const pages = Object.keys(PAGES[id] ?? {}).map((key) => pageId(id, key));
  const items = FOLDERS[id]?.map((item) => fileId(id, item.name)) ?? [];
  const all = [...pages, ...items];
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

/**
 * One folder per page, across every folder that has them. Named by the `name`
 * in its content file, so renaming a project or a job is a one-word edit there
 * and nothing here changes.
 */
const PAGE_FOLDERS: FsNode[] = Object.entries(PAGES).flatMap(([parent, entries]) =>
  Object.entries(entries).map(
    ([key, page]): FsNode => ({
      id: pageId(parent, key),
      label: page.name,
      Icon: FolderIcon,
      kind: "folder",
      type: "File folder",
    }),
  ),
);

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

const NODE_LIST: FsNode[] = [
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
    children: ["desktop", "downloads"],
    type: "Local Disk",
  },
  { id: "network", label: "Network", Icon: NetworkIcon, kind: "network", type: "System folder" },

  ...PAGE_FOLDERS,
  ...FILES,
];

export const NODES = new Map(NODE_LIST.map((n) => [n.id, n]));

export const node = (id: string) => NODES.get(id);

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
