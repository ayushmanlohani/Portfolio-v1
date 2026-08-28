/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE LINKEDIN PAGE. EDIT THIS FILE.                           │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Transcribed from the screenshots you sent on 2026-08-28 — headline,
 * connections, About, Featured, Activity, Experience, Education, and the
 * first two of ten certifications. LinkedIn is behind a login wall, so
 * nothing here can be fetched: it is a hand-copied SNAPSHOT and it only
 * changes when you change it.
 *
 * The images live in public/letterbox/linkedin/ — the banner and the post
 * thumbnails came out of those same screenshots.
 */

/** Where "View the real profile" goes. The only real link on the page. */
export const LINKEDIN_URL = "https://linkedin.com/in/ayushmanlohani";

export const LINKEDIN = {
  name: "Ayushman Lohani",
  headline: "CSE AI '27 | ML Engineer | LLMs & RAG | Data Science.",
  location: "Greater Lucknow Area",
  avatar: "/letterbox/linkedin/avatar.png",
  banner: "/letterbox/linkedin/banner.png",

  /** The school chip on the right of the top card. */
  school: { name: "University of Lucknow", logo: "/letterbox/lu-logo.png" },

  openTo: {
    title: "Open to work · Recruiters only",
    detail: "India +4 more | On-site · Hybrid · Remote",
  },

  about: `Hi, I'm Ayushman. I work with LLMs and RAG systems, and lately I've been exploring how to scale AI pipelines beyond just making them work. Most of my best ideas come from rabbit holes at 3am that I probably shouldn't have started.`,

  /**
   * ── WRITE HERE ──────────────────────────────────────────────────
   * What the "… more" button reveals. It is empty, so right now the
   * About card shows the paragraph above and no button at all. Type
   * anything below and the button appears by itself; leave a blank
   * line between paragraphs and it breaks them apart.
   * ────────────────────────────────────────────────────────────────
   */
  aboutMore: ``,

  featured: {
    kind: "Post",
    image: "/letterbox/linkedin/featured-unitwise.png",
    /** Two paragraphs, then LinkedIn's own "…" truncation. */
    body: [
      `Last semester, I had a problem.`,
      `Every time I sat down to study, I'd spend the first hour just collecting notes, PDFs, and books from friends — only to get answers that were either too vague or way more detailed than what my …`,
    ],
    reactions: 8,
    comments: "2 comments",
  },

  /**
   * NOT DRAWN. The Activity section was removed from the page on 2026-08-28.
   * Kept because putting it back is one line, and the post thumbnails in
   * public/letterbox/linkedin/ were cropped by hand. Delete this block, and
   * post-turboquant.png / post-unitwise.png with it, if it is never coming
   * back.
   */
  activity: [
    {
      age: "1mo",
      body: `I was doomscrolling at 1am and thought i found a new Google model called TurboQuant. Turns out it's way more complex and more useful.…`,
      image: "/letterbox/linkedin/post-turboquant.png",
      /** LinkedIn's carousel counter, top-right of the image. */
      pages: "1/4",
      reactions: 3,
      comments: "",
      impressions: "557 impressions",
    },
    {
      age: "2mo",
      body: `Last semester, I had a problem.\n\nEvery time I sat down to study, I'd spend the…`,
      image: "/letterbox/linkedin/post-unitwise.png",
      pages: "",
      reactions: 8,
      comments: "2",
      impressions: "737 impressions",
    },
  ],

  experience: [
    {
      role: "AI & Machine Learning Intern",
      company: "NATIONAL INSTITUTE OF ELECTRONICS & INFORMATION TECHNOLOGY (NIELIT)",
      type: "Internship",
      dates: "Jul 2025 - Sep 2025 · 3 mos",
      place: "New Delhi, Delhi, India · Remote",
      logo: "/letterbox/nielit.png",
      bullet: `Built a sequence-to-sequence Transformer from scratch using PyTorch, training on 175,000+ data points to master…`,
      media: "NIELIT Certificate",
      mediaThumb: "/letterbox/linkedin/cert-nielit.png",
      skills: "Large Language Models (LLM), Python (Programming Language) and +13 skills",
    },
  ],

  education: [
    {
      school: "University of Lucknow",
      degree: "Bachelor of Technology, Computer Science (Artificial Intelligence)",
      dates: "Oct 2023 – Sep 2027",
      logo: "/letterbox/lu-logo.png",
      skills: "SQL, Pandas (Software) and +8 skills",
    },
  ],

  /** Ten in total; LinkedIn shows two and collapses the rest. */
  certificationsCount: 10,
  certifications: [
    { title: "Agentic AI Certified Foundations Associate", issuer: "Oracle", issued: "Issued Jul 2026", media: "Agentic AI Foundations", thumb: "/letterbox/linkedin/cert-agentic.png" },
    { title: "Certified Data Science Professional", issuer: "Oracle", issued: "Issued Oct 2025", media: "Data Science Professional", thumb: "/letterbox/linkedin/cert-datascience.png" },
  ],
};
