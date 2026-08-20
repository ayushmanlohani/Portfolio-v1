import { SENTINEL } from "@/content/sentinel";
import { UNITWISE } from "@/content/unitwise";

/**
 * Projects that get a full page of their own.
 *
 * These become folders inside Projects, and opening one shows its page. A
 * project that only needs a paragraph doesn't belong here — put it in
 * content/folders.ts under `projects` instead and it stays a plain text file.
 *
 * TO ADD THE NEXT PROJECT
 *   1. Copy content/unitwise.ts to content/<name>.ts and rewrite the words.
 *   2. Import it above.
 *   3. Add one line to the list below. The key is what appears in the address
 *      bar; the folder itself is named by the `name` in the content file.
 */
export const PROJECTS: Record<string, Project> = {
  unitwise: UNITWISE,
  sentinel: SENTINEL,
};

/** The shape a project content file has to have. */
export type Project = {
  name: string;
  /** Two lines, centred under the name. */
  tagline: string[];
  links: { label: string; href: string }[];
  sections: {
    heading: string;
    text: string[];
    /** Optional bullets under the paragraphs. */
    points?: string[];
  }[];
  /** `id` picks the logo, `name` is what the tooltip says. */
  stack: { id: string; name: string }[];
};
