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
 *   Every entry has `logo: ""`, which draws an empty 72px square above the
 *   name and holds that space. To fill one in:
 *
 *     1. Put the image in  public/letterbox/
 *     2. Change  logo: ""  to  logo: "/letterbox/lucknow.png"
 *
 *   Nothing else moves when you do — the box is already the right size, so
 *   the page won't jump. Remove the `logo` line entirely and the space goes
 *   away with it.
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

    logo: "",

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

  isc: {
    name: "Nirmala Convent — ISC",

    logo: "",

    meta: ["Nirmala Convent Inter College", "Class XI – XII · ISC"],

    tagline: [`Indian School Certificate.`, `Finished at 90%.`],

    links: [],

    sections: [],

    stack: [],
  },

  icse: {
    name: "Nirmala Convent — ICSE",

    logo: "",

    meta: ["Nirmala Convent Inter College", "Class I – X · ICSE"],

    tagline: [`Indian Certificate of Secondary Education.`, `Finished at 92%.`],

    links: [],

    sections: [],

    stack: [],
  },
};
