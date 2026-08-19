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
  projects: [
    {
      name: "Unitwise",
      type: "Web app",
      text: [
        `A unit converter that stays out of your way. Live at [unitwise-weld.vercel.app](https://unitwise-weld.vercel.app/).`,

        // NEEDS YOUR WORDS — what it does, what you built it with, what broke.
        `Built it, shipped it, and then kept using it, which is the only test that counts.`,
      ],
    },
    {
      name: "RBI Sentinel",
      type: "Streamlit app",
      text: [
        `A tool for reading what the Reserve Bank of India actually publishes. Live at [rbi-sentinel.streamlit.app](https://rbi-sentinel.streamlit.app).`,

        // NEEDS YOUR WORDS — the problem it solves and how it solves it.
        `Streamlit on the front, the parsing underneath.`,
      ],
    },
    {
      name: "Lightweight CV model",
      type: "In progress",
      text: [
        `A lightweight computer vision model built on YOLO 26n. Still in progress — no link yet.`,

        // NEEDS YOUR WORDS — what it detects, why lightweight matters here.
        `The point is running small: a model that only works on a big machine isn't much use.`,
      ],
    },
  ],

  experience: [
    {
      name: "Research Assistant",
      type: "Current role",
      // NEEDS YOUR WORDS — where, since when, and what you actually do there.
      // This is the one thing I couldn't verify from anything you'd written,
      // so it's deliberately vague. Replace the whole paragraph.
      text: [
        `Currently working as a Research Assistant.`,
      ],
    },
  ],

  education: [
    {
      name: "University of Lucknow",
      type: "B.Tech, final year",
      text: [
        `Final-year student, Computer Science and Engineering with a specialisation in Artificial Intelligence.`,

        // NEEDS YOUR WORDS — years, coursework worth naming, anything you'd
        // want a reader to know. Delete this line if there's nothing to add.
        `Alongside the degree: AI agents, RAG, and whatever else catches my attention.`,
      ],
    },
  ],

  resume: [
    {
      name: "Resume",
      type: "PDF",
      // NEEDS A FILE — drop the PDF in public/letterbox/ and swap the "#"
      // below for its path, e.g. (/letterbox/ayushman-lohani-resume.pdf).
      // Until then this renders as bold text, not a broken link.
      text: [
        `The full thing, on one page: [Download the PDF](#).`,
      ],
    },
  ],

  contact: [
    {
      name: "GitHub",
      type: "Profile",
      text: [`The code, most of it in public: [github.com/ayushmanlohani](https://github.com/ayushmanlohani).`],
    },
    {
      name: "LeetCode",
      type: "Profile",
      text: [`[leetcode.com/u/ayushmanlohani](https://leetcode.com/u/ayushmanlohani/).`],
    },
    {
      name: "Email",
      type: "Mail",
      // NEEDS YOUR CALL — I left your address out on purpose. Putting an
      // email on a public page invites scrapers, and that's your decision to
      // make, not mine. To add it, swap the "#" for mailto:you@example.com.
      text: [`[Send me a mail](#).`],
    },
  ],
};
