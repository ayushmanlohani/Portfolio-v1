/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE RESUME. EDIT THIS FILE.                                  │
 * │  Nothing here is code. Change the words, save, and the page    │
 * │  updates itself — the dev server reloads on its own.           │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Every word below was transcribed from your own compiled PDF
 * (public/letterbox/AyushmanLohani_Resume.pdf), so the page and the file say
 * the same thing. Change the LaTeX and you have to change this too — they are
 * two copies, and nothing checks that they agree.
 *
 * ── THE ONE THING TO DECIDE ──────────────────────────────────────
 *   `contact` below publishes your phone number and email address in plain
 *   text on a public page. That is what your PDF carries, so it is what the
 *   page carries. Delete either line if you'd rather it weren't crawlable —
 *   the row closes up on its own.
 * ─────────────────────────────────────────────────────────────────
 *
 * SHAPE
 *   Every section is a heading plus a list of entries. An entry has up to
 *   four corners of text — that is the LaTeX layout this resume uses:
 *
 *       title ............................. right
 *       subtitle ........................ subright     (italic)
 *       • bullets
 *
 *   Anything you leave out simply isn't drawn.
 */

export type ResumeEntry = {
  /** Bold, left. The role, the degree, the project name. */
  title: string;
  /** Right of the title — a date range. */
  right?: string;
  /** Italic, left, under the title — the employer or the tech row. */
  subtitle?: string;
  /** Right of the subtitle — a location. */
  subright?: string;
  /** Buttons after the title: [GitHub] [Live]. */
  links?: { label: string; href: string }[];
  points?: string[];
};

export const RESUME = {
  name: "Ayushman Lohani",

  tagline: "GenAI Engineer | Agentic RAG & LLM Systems | PyTorch, LangChain, FastAPI",

  /** The centred line under the name. An entry with no `href` is plain text. */
  contact: [
    { text: "+91 6393095246" },
    { text: "aayushmanlohani@gmail.com", href: "mailto:aayushmanlohani@gmail.com" },
    { text: "linkedin.com/in/ayushmanlohani", href: "https://linkedin.com/in/ayushmanlohani" },
    { text: "github.com/ayushmanlohani", href: "https://github.com/ayushmanlohani" },
  ],

  sections: [
    {
      heading: "Education",
      entries: [
        {
          title: "University of Lucknow",
          right: "Lucknow, UP",
          subtitle: "Bachelor of Technology in Computer Science (Artificial Intelligence)",
          subright: "Oct. 2023 – Sep. 2027",
        },
      ],
    },

    {
      heading: "Experience",
      entries: [
        {
          title: "AI & Machine Learning Intern",
          right: "July 2025 – Sep. 2025",
          subtitle: "National Institute of Electronics & Information Technology (NIELIT)",
          subright: "Online",
          points: [
            `Built a sequence-to-sequence Transformer from scratch in PyTorch, implementing Multi-Head Attention and positional encoding to replicate core generative AI architecture.`,
            `Optimized training across 175,000+ data points using dynamic learning rate schedulers, reducing validation loss to 0.84 and cutting convergence time by ~25%.`,
            `Refactored experimental Jupyter notebooks into modular, production-ready Python scripts, enabling real-time model inference and clean deployment handoff.`,
          ],
        },
        {
          title: "Machine Learning & Data Science Intern",
          right: "Jul. 2025 – Aug. 2025",
          subtitle: "Info Bharat Interns",
          subright: "Online",
          points: [
            `Engineered a time-series forecasting pipeline using XGBoost across 17,000+ temporal records, achieving an R² score of 0.96 in demand trend prediction.`,
            `Standardized end-to-end data preprocessing workflows including feature scaling and temporal alignment, eliminating data inconsistencies and improving model reliability.`,
          ],
        },
      ],
    },

    {
      heading: "Projects",
      entries: [
        {
          title: "Unitwise | Agentic RAG Study Assistant",
          links: [
            { label: "GitHub", href: "https://github.com/ayushmanlohani/Unitwise" },
            { label: "Live", href: "https://unitwise-weld.vercel.app" },
          ],
          subtitle: "Python, LangChain, FastAPI, Vector DB, Groq API",
          points: [
            `Engineered a FastAPI backend supporting 10 simultaneous users via API rate limiting and request load balancing, ensuring stable performance under concurrent usage.`,
            `Built an agentic Retrieval-Augmented Generation (RAG) pipeline using LangChain and Vector DB to answer curriculum-based queries, serving 50+ registered users with 1,000+ questions answered collectively.`,
            `Engineered prompt templates and context-window management strategies to optimize LLM response quality while controlling API costs at scale.`,
          ],
        },
        {
          title: "RBI Sentinel | Market Volatility Forecaster",
          links: [
            {
              label: "GitHub",
              href: "https://github.com/ayushmanlohani/rbi-sentiment-volatility-forecasting",
            },
            { label: "Live", href: "https://rbi-sentinel.streamlit.app/" },
          ],
          subtitle: "Python, FinBERT, Scikit-Learn, Pandas, Statsmodels",
          points: [
            `Engineered an NLP pipeline using FinBERT to classify hawkish/dovish sentiment across 140+ RBI monetary policy documents, converting central bank language into quantifiable econometric signals.`,
            `Trained a Random Forest classifier to predict India VIX volatility shocks from extracted sentiment features, achieving an R² score of 0.91 on held-out test data.`,
            `Aligned time-series data by forward-filling weekend policy releases to Monday market open, validating the information content hypothesis between RBI communications and market movement.`,
          ],
        },
      ],
    },

    {
      heading: "Technical Skills",
      entries: [
        {
          title: "",
          // `[words](#)` is this project's existing way of writing bold — the
          // same convention content/about.ts uses. No new markup was invented.
          points: [
            `[Languages:](#) Python, SQL, C++`,
            `[ML/AI Frameworks:](#) PyTorch, Scikit-Learn, LangChain, LangGraph, HuggingFace, XGBoost, FinBERT`,
            `[Concepts:](#) Large Language Models, RAG, NLP, Agentic AI, Embeddings, Vector Databases, Prompt Engineering`,
            `[Libraries, Tools:](#) Pandas, NumPy, FastAPI, Streamlit, Git, Jupyter`,
          ],
        },
      ],
    },

    {
      heading: "Certifications",
      entries: [
        {
          title: "",
          points: [
            `Artificial Intelligence Fundamentals | IBM`,
            `Certified Data Science Professional | Oracle`,
          ],
        },
      ],
    },
  ] as { heading: string; entries: ResumeEntry[] }[],

  /** The compiled PDF, offered as a download above the page. */
  pdf: "/letterbox/AyushmanLohani_Resume.pdf",
};
