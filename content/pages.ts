import { EDUCATION } from "@/content/education";
import { EXPERIENCE } from "@/content/experience";
import { SENTINEL } from "@/content/sentinel";
import { UNITWISE } from "@/content/unitwise";

/**
 * Folders whose children are pages rather than text files.
 *
 * A folder listed here shows one sub-folder per entry, and opening that
 * sub-folder shows the entry's page. Anything NOT listed here falls back to
 * content/folders.ts and stays a plain text file.
 *
 * TO ADD A PROJECT
 *   1. Copy content/unitwise.ts to content/<name>.ts and rewrite the words.
 *   2. Import it above.
 *   3. Add one line under `projects` below. The key is what shows in the
 *      address bar; the folder is named by the `name` in the content file.
 *
 * TO ADD A JOB
 *   Add an entry to content/experience.ts. Nothing here changes — the roles
 *   are all in that one file because each is short, where a project is long
 *   enough to earn a file of its own.
 *
 * NESTING
 *   An entry can be a folder of its own instead of a page — give it `children`
 *   rather than a `tagline` and it lists what's inside instead. Nothing on the
 *   site currently uses this, but it nests to any depth if something needs to.
 */
export const PAGES: Record<string, Record<string, Entry>> = {
  projects: {
    unitwise: UNITWISE,
    sentinel: SENTINEL,
  },
  experience: EXPERIENCE,
  education: EDUCATION,
};

/** A page you can open, or a folder holding more of them. */
export type Entry = Page | Group;

/** A folder inside a folder. It has no page of its own — it lists its children. */
export type Group = {
  name: string;
  children: Record<string, Entry>;
};

/**
 * `children` is the whole distinction, and it's structural rather than a flag
 * anyone has to remember to set — a group has children, a page has a tagline.
 */
export const isGroup = (entry: Entry): entry is Group => "children" in entry;

/**
 * The entry at a path like `education/nirmala/isc`, or undefined if there
 * isn't one. Walks a key at a time, so a path that runs through a page rather
 * than a group stops rather than pretending to descend into it.
 */
export function entryAt(path: string): Entry | undefined {
  const [top, ...rest] = path.split("/");
  let level: Record<string, Entry> | undefined = PAGES[top];
  let found: Entry | undefined;

  for (const key of rest) {
    found = level?.[key];
    if (!found) return undefined;
    level = isGroup(found) ? found.children : undefined;
  }

  return found;
}

/** The shape a page's content has to have. */
export type Page = {
  name: string;
  /**
   * A crest above the name — a university or school badge.
   *
   * Omit it entirely and nothing is drawn. Set it to `""` and the page holds
   * the space empty, so dropping the file in later doesn't shift the layout.
   * Set it to a path under `public/` and that image appears.
   */
  logo?: string;
  /**
   * Small grey lines under the name, before the tagline. Where a job was and
   * when — an employer and a date range, one per line. Projects skip it.
   */
  meta?: string[];
  /** Two lines, centred. Keep each under roughly 80 characters or it wraps. */
  tagline: string[];
  /** Buttons under the tagline. An empty list renders nothing. */
  links: { label: string; href: string }[];
  sections: {
    heading: string;
    text: string[];
    /** Optional bullets under the paragraphs. */
    points?: string[];
  }[];
  /** `id` picks the logo, `name` is what the tooltip says. */
  stack: { id: string; name: string }[];
  /**
   * What the stack row is called. Defaults to "Built with", which is right for
   * a project you built and wrong for a job you held — those say "Worked with".
   */
  stackHeading?: string;
};
