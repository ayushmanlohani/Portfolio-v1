/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE EDUCATION FOLDERS. EDIT THIS FILE.                       │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * One entry per qualification, newest first. Each becomes a folder inside
 * Education, and opening it shows that qualification's page.
 *
 * ── THE LOGOS ────────────────────────────────────────────────────
 *   Both entries carry a crest now — the university's on the degree, the
 *   school's on its one entry. To swap one:
 *
 *     1. Put the image in  public/letterbox/
 *     2. Point `logo` at it, e.g.  logo: "/letterbox/lu-logo.png"
 *
 *   `logo: ""` draws an empty 72px square instead, holding the space for a
 *   crest that hasn't arrived. Remove the `logo` line entirely and the space
 *   goes away with it. Either way nothing below moves.
 * ─────────────────────────────────────────────────────────────────
 *
 *   name     the folder's name, and the heading when you open it
 *   meta     the small grey lines — the institution, then the dates or class
 *   tagline  two lines, centred. Keep each under ~80 characters
 *
 * Percentages are on the two school entries only. The degree deliberately
 * carries no SGPA — that was Ayushman's call, not an oversight.
 */

export const EDUCATION = {
  lucknow: {
    name: "University of Lucknow",

    logo: "/letterbox/lu-logo.png",

    meta: [
      "Bachelor of Technology — Computer Science (Artificial Intelligence)",
      "October 2023 – September 2027 · Lucknow, Uttar Pradesh",
    ],

    tagline: [
      `Computer Science with an Artificial Intelligence specialisation.`,
      `Final year, and where the research assistantship sits.`,
    ],

    links: [],

    sections: [
      {
        heading: "What I'm studying",
        text: [
          `A four-year B.Tech in Computer Science, specialising in Artificial Intelligence. Most of what's in Projects was built alongside it rather than for it.`,
        ],
      },
    ],

    stack: [],
  },

  nirmala: {
    name: "Nirmala Convent Inter College",

    logo: "/letterbox/ncic-logo.png",

    tagline: ["ISC · Class XI – XII · 90%", "ICSE · Class I – X · 92%"],

    links: [],

    sections: [],

    stack: [],
  },
};
