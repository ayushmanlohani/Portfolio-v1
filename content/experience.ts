/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE EXPERIENCE FOLDERS. EDIT THIS FILE.                      │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * One entry per role. Each becomes a folder inside Experience, and opening it
 * shows that role's page. They appear in the order written below, so newest
 * or most important first.
 *
 * Same rules as content/about.ts: plain text, links written as
 * [the words](the address), and "#" as an address comes out bold instead of
 * as a link that goes nowhere.
 *
 *   name     the folder's name, and the heading when you open it
 *   meta     the small grey lines — employer, then dates and place
 *   tagline  two lines, centred. Keep each under ~80 characters
 *   stack    the logos. Hover shows the full name. An id with no logo in
 *            components/win7/folders/techLogos.ts draws its first two
 *            letters instead, which is normal, not a missing file.
 *
 * ── TODO for Ayushman ────────────────────────────────────────────
 *   The two internships below are transcribed straight off your CV.
 *   RESEARCH ASSISTANT IS A STUB — see the note on it.
 * ─────────────────────────────────────────────────────────────────
 */

export const EXPERIENCE = {
  research: {
    name: "Research Assistant",

    // NEEDS YOUR WORDS — all of it.
    // I couldn't find the YOLO work anywhere: it isn't in any Claude Code
    // session on this machine (all seven are this portfolio), and the only
    // thing you'd written about it is one line in content/about.ts. Rather
    // than invent a research role for you, this page says only what is
    // actually known. Tell me about the project and I'll write it properly.
    meta: ["Where — needed", "Dates — needed"],

    tagline: [
      `Building a lightweight computer vision model on YOLO 26n.`,
      `The rest of this page is waiting on me — see the note in content/experience.ts.`,
    ],

    links: [],

    sections: [
      {
        heading: "What I do",
        text: [
          `Currently working as a Research Assistant on a lightweight computer vision model built with YOLO 26n — small enough to run somewhere that isn't a workstation.`,
        ],
      },
    ],

    stackHeading: "Worked with",
    stack: [
      { id: "pytorch", name: "PyTorch" },
      { id: "python", name: "Python" },
      { id: "opencv", name: "OpenCV" },
    ],
  },

  "ai-ml": {
    name: "AI & Machine Learning Intern",

    meta: [
      "National Institute of Electronics & Information Technology (NIELIT)",
      "July 2025 – September 2025 · Online",
    ],

    tagline: [
      `Built a sequence-to-sequence Transformer from scratch in PyTorch —`,
      `no framework shortcuts, just attention and positional encoding.`,
    ],

    links: [],

    sections: [
      {
        heading: "What I did",
        text: [
          `Wrote the architecture behind generative AI rather than calling it: Multi-Head Attention and positional encoding implemented by hand, so the thing every model is built on stopped being an abstraction.`,
        ],
        points: [
          `A sequence-to-sequence Transformer from scratch in PyTorch, Multi-Head Attention and positional encoding included.`,
          `Training tuned across 175,000+ data points with dynamic learning rate schedulers — validation loss down to 0.84, convergence roughly 25% faster.`,
          `Experimental Jupyter notebooks refactored into modular, production-ready Python, which is what made real-time inference and a clean deployment handoff possible.`,
        ],
      },
    ],

    stackHeading: "Worked with",
    stack: [
      { id: "pytorch", name: "PyTorch" },
      { id: "python", name: "Python" },
      { id: "jupyter", name: "Jupyter" },
      { id: "numpy", name: "NumPy" },
      { id: "pandas", name: "pandas" },
    ],
  },

  "ml-data": {
    name: "Machine Learning & Data Science Intern",

    meta: ["Info Bharat Interns", "July 2025 – August 2025 · Online"],

    tagline: [
      `A time-series forecasting pipeline over 17,000+ records —`,
      `an R² of 0.96, and the preprocessing that made it hold.`,
    ],

    links: [],

    sections: [
      {
        heading: "What I did",
        text: [
          `Forecasting demand trends is mostly a data problem wearing a model's clothes. Most of the work was upstream of XGBoost, not in it.`,
        ],
        points: [
          `A time-series forecasting pipeline on XGBoost across 17,000+ temporal records, scoring R² 0.96 on demand trend prediction.`,
          `End-to-end preprocessing standardised — feature scaling and temporal alignment — which removed the data inconsistencies the model had been quietly inheriting.`,
        ],
      },
    ],

    stackHeading: "Worked with",
    stack: [
      { id: "xgboost", name: "XGBoost" },
      { id: "scikitlearn", name: "scikit-learn" },
      { id: "pandas", name: "pandas" },
      { id: "numpy", name: "NumPy" },
      { id: "python", name: "Python" },
    ],
  },
};
