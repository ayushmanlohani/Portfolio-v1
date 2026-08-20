/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  WHAT'S INSIDE EACH FOLDER. EDIT THIS FILE.                   │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * HOW IT WORKS
 *   Each folder below holds a list of items. Open the folder in the
 *   portfolio and you see those items as rows, like a real Windows folder.
 *   Double-click a row and it opens and shows that item's words.
 *
 * ADDING AN ITEM
 *   Copy an existing block, change the words. That's the whole job.
 *
 *     { name: "Thing", type: "Web app", text: [`A sentence about it.`] },
 *
 *   `name`  what the row says, and the heading when you open it
 *   `type`  the little grey word in the Type column. Anything you like.
 *   `text`  the paragraphs. One entry in the list is one paragraph.
 *
 * LINKS
 *   Same as content/about.ts — write them as [the words](the address).
 *   An address of "#" means "no link yet": those words come out bold
 *   instead, so the page never carries a link that goes nowhere.
 *
 * REMOVING A FOLDER'S CONTENT
 *   Delete its items and the folder goes back to saying "This folder is
 *   empty." Nothing breaks.
 *
 * ── TODO for Ayushman ────────────────────────────────────────────
 *   Anything marked NEEDS YOUR WORDS below is a guess from what you'd
 *   already written in content/about.ts. Rewrite those freely — I only
 *   filled in what I could actually verify from your own copy.
 * ─────────────────────────────────────────────────────────────────
 */

export type Item = {
  /** Row label, and the heading when it opens. */
  name: string;
  /** The Type column and the details pane at the foot of the window. */
  type?: string;
  /** Paragraphs. Same [words](address) markup as content/about.ts. */
  text: string[];
};

export const FOLDERS: Record<string, Item[]> = {
  // Projects, Experience and Education are empty here on purpose. Everything
  // in them has a page of its own — see content/pages.ts, which points at
  // content/unitwise.ts, content/sentinel.ts, content/experience.ts and
  // content/education.ts. Adding an entry below would put a plain text file
  // alongside those folders, which is fine if you ever want one.
  projects: [],
  experience: [],
  education: [],

  // The one item here draws content/resume.ts instead of these words — see
  // Explorer's Contents. The text below is the fallback nobody should see.
  resume: [
    {
      name: "Resume",
      type: "Document",
      text: [`The full thing, on one page.`],
    },
  ],

  // Contact draws content/contact.ts instead of listing files — its three
  // items were each a single link, which wasn't worth a double-click apiece.
  contact: [],
};
