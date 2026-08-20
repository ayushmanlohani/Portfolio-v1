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
 */
export const PAGES: Record<string, Record<string, Page>> = {
  projects: {
    unitwise: UNITWISE,
    sentinel: SENTINEL,
  },
  experience: EXPERIENCE,
};

/** The shape a page's content has to have. */
export type Page = {
  name: string;
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
