import { NAME, PARAGRAPHS } from "@/content/about";
import { CONTACT } from "@/content/contact";
import { EDUCATION } from "@/content/education";

import { GITHUB, GITHUB_URL } from "@/content/github";
import { LINKEDIN, LINKEDIN_URL } from "@/content/linkedin";
import { RESUME } from "@/content/resume";
import { SENTINEL } from "@/content/sentinel";
import { UNITWISE } from "@/content/unitwise";

/**
 * Everything the assistant knows, in two layers.
 *
 * SITE is the site's own words, imported from `content/` and compiled in, so
 * it can never drift from what a visitor is reading in a window. Edit a
 * project page and the assistant's answer changes with it — there is nothing
 * to re-index.
 *
 * The second layer is the live Google Doc (`./drive.ts`), stitched on at
 * request time. Between them the whole corpus is a few thousand words, which
 * is why this is a string and not a vector store: it fits in the model's
 * context many times over, so retrieval would only add a way to be wrong.
 *
 * JSON is deliberate — these objects carry their own field names ("tagline",
 * "points", "heading"), and a model reads that structure better than prose
 * flattened out of it. Any stray component reference drops out on its own,
 * because JSON.stringify omits functions.
 */
export const SITE = JSON.stringify({
  name: NAME,
  about: PARAGRAPHS,
  contact: CONTACT,
  education: EDUCATION,
  resume: RESUME,
  projects: { unitwise: UNITWISE, rbiSentinel: SENTINEL },
  /* Cherry-picked, not spread. Both profile snapshots are mostly UI — avatar
     and banner paths, star counts, school logos — which cost tokens and tell
     the model nothing. Only the lines a visitor might actually ask about
     survive; EXPERIENCE is left out entirely because RESUME already carries
     the same roles. */
  github: {
    url: GITHUB_URL,
    publicRepos: GITHUB.publicRepos,
    pinned: GITHUB.pinned.map((r) => `${r.name}: ${r.description} (${r.language})`),
  },
  linkedin: { url: LINKEDIN_URL, headline: LINKEDIN.headline, about: LINKEDIN.about },
});

/**
 * The instructions. Two rules earn their place: answer only from what is
 * below, and say so when it isn't there — a portfolio bot that invents an
 * employer is worse than one that shrugs.
 */
export const systemPrompt = (notes: string) => `
You are the assistant built into Ayushman Lohani's portfolio site. The site is
a working replica of Windows 7 that runs in the browser: a desktop with folders
(About Me, Projects, Experience, Education, Resume, Contact, Photography), a
Start menu, a taskbar, Notepad, a browser, a media player, and two playable
games. Visitors are usually recruiters, engineers, or people who found it
interesting and started clicking.

Answer questions about Ayushman — his work, projects, background, interests —
and about the site itself.

Rules:
- Use ONLY the material below. If the answer isn't there, say you don't know
  and point them at the relevant folder or at his email.
- Never invent an employer, a date, a grade, a technology or a link.
- Write in third person about Ayushman. Be warm and plain-spoken, never
  markety. Two or three sentences unless more is genuinely needed.
- No markdown formatting; this renders in a small plain-text panel.
- If asked something personal, hostile, or off-topic, deflect lightly and
  steer back to his work.

--- SITE CONTENT ---
${SITE}

--- LIVE NOTES (Ayushman's own, most current, wins any conflict) ---
${notes || "(none available right now)"}
`.trim();
