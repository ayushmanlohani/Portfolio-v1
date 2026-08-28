/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE GITHUB PAGE. EDIT THIS FILE.                             │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Every number below was read off github.com/ayushmanlohani on 2026-08-28:
 * the follower counts, the fifteen repositories, the three pinned cards, the
 * profile README, and all 369 squares of the contribution graph. It is a
 * SNAPSHOT, not a feed — nothing refetches. When the real profile moves on,
 * this file is what you edit to catch up.
 *
 * ── HOW TO REFRESH THE CONTRIBUTION GRAPH ────────────────────────
 *   curl -sL https://github.com/users/ayushmanlohani/contributions
 *   …then pull `data-date` / `data-level` off every <td>. `graphStart` is
 *   the first date, `graph` is one number per day after it, in order.
 * ─────────────────────────────────────────────────────────────────
 */

/** Where the "View on GitHub" button actually goes. The only real link. */
export const GITHUB_URL = "https://github.com/ayushmanlohani";

export const GITHUB = {
  login: "ayushmanlohani",
  name: "Ayushman Lohani",
  avatar: "/letterbox/gh-avatar.png",
  /** The real profile has no bio set. Leaving it empty is the honest thing. */
  bio: "",
  location: "India",
  followers: 2,
  following: 2,
  joined: "Joined August 2025",
  publicRepos: 15,

  /** The three cards he actually pinned, in the order GitHub shows them. */
  pinned: [
    {
      name: "Unitwise",
      description:
        "RAG-based academic chatbot that answers syllabus questions with textbook citations",
      language: "JavaScript",
      stars: 1,
      forks: 1,
    },
    {
      name: "rbi-sentiment-volatility-forecasting",
      description: "FinBERT-powered market sentiment analyzer for RBI policy documents",
      language: "Python",
      stars: 1,
      forks: 0,
    },
    {
      name: "HealthGuard-AI",
      description: "Web-based AI system for early detection of Diabetes & Heart Disease",
      language: "JavaScript",
      stars: 0,
      forks: 0,
    },
  ],

  /**
   * The profile README — github.com/ayushmanlohani/ayushmanlohani. GitHub
   * renders this above the pinned cards. Transcribed, not fetched.
   */
  readme: {
    heading: "Hi, I'm Ayushman 👋",
    intro: [
      "I'm a final-year B.Tech CS (AI) student at University of Lucknow, building things at the intersection of **LLMs, NLP, and production ML systems**.",
      "Currently focused on RAG pipelines, financial NLP, and MLOps.",
    ],
    stack: [
      { label: "Languages", tags: ["Python", "SQL", "C++"] },
      {
        label: "ML / AI",
        tags: ["PyTorch", "Scikit-Learn", "LangChain", "HuggingFace", "XGBoost", "FinBERT"],
      },
      {
        label: "Concepts",
        tags: [
          "RAG",
          "LLMs",
          "Transformers",
          "NLP",
          "Vector Databases",
          "Embeddings",
          "Prompt Engineering",
        ],
      },
      {
        label: "Tools & Libraries",
        tags: ["FastAPI", "Pandas", "NumPy", "Streamlit", "Git", "Jupyter"],
      },
    ],
    featured: [
      {
        title: "Unitwise — AI Academic Chatbot",
        repo: "Unitwise",
        blurb: "RAG-based chatbot that answers B.Tech syllabus questions with textbook citations.",
        built: "LangChain · FastAPI · ChromaDB · Groq · React · Supabase",
      },
      {
        title: "RBI Sentinel — Market Volatility Forecaster",
        repo: "rbi-sentiment-volatility-forecasting",
        blurb:
          "FinBERT NLP pipeline on 140+ RBI policy documents to predict India VIX volatility shocks.",
        built: "FinBERT · Random Forest · Scikit-Learn · Statsmodels · Pandas",
      },
    ],
  },

  /**
   * NOT DRAWN. The Repositories list was removed from the page on 2026-08-28
   * — only the tab's "15" counter survives. The data is kept because putting
   * the section back is a one-line change, and re-reading fifteen repos off
   * the API is not. Delete this block if the section is never coming back.
   *
   * All fifteen, newest activity first.
   */
  repos: [
    { name: "Portfolio-v1", description: "", language: "JavaScript", stars: 0, forks: 0, updated: "Aug 27, 2026", fork: false },
    { name: "ayushmanlohani", description: "", language: "", stars: 0, forks: 0, updated: "Aug 27, 2026", fork: false },
    { name: "caura-build-fleet", description: "A runnable reference implementation of multi-agent constraint propagation using MemClaw", language: "", stars: 0, forks: 0, updated: "Aug 26, 2026", fork: true },
    { name: "DevBoard", description: "Kanban for Developers — An open source Kanban board built specifically for developers", language: "", stars: 0, forks: 0, updated: "Aug 25, 2026", fork: true },
    { name: "01_MCP", description: "Practice project for creating MCP servers and learning tool development", language: "Python", stars: 0, forks: 0, updated: "Aug 17, 2026", fork: false },
    { name: "practice-mcp-server", description: "", language: "Python", stars: 0, forks: 0, updated: "Aug 6, 2026", fork: false },
    { name: "langgraph-cookbook", description: "", language: "Python", stars: 0, forks: 0, updated: "Jul 29, 2026", fork: false },
    { name: "Unitwise", description: "RAG-based academic chatbot that answers syllabus questions with textbook citations", language: "JavaScript", stars: 1, forks: 1, updated: "Jul 24, 2026", fork: false },
    { name: "rbi-sentiment-volatility-forecasting", description: "FinBERT-powered market sentiment analyzer for RBI policy documents", language: "Python", stars: 1, forks: 0, updated: "Jul 21, 2026", fork: false },
    { name: "frontend", description: "", language: "JavaScript", stars: 0, forks: 0, updated: "Feb 19, 2026", fork: false },
    { name: "HealthGuard-AI", description: "Web-based AI system for early detection of Diabetes & Heart Disease", language: "JavaScript", stars: 0, forks: 0, updated: "Feb 19, 2026", fork: false },
    { name: "Neural-translator-eng-fr-", description: "", language: "Jupyter Notebook", stars: 0, forks: 0, updated: "Jan 12, 2026", fork: false },
    { name: "fake-news-detection", description: "", language: "Python", stars: 0, forks: 0, updated: "Dec 21, 2025", fork: false },
    { name: "House-Prices-Regression", description: "", language: "Jupyter Notebook", stars: 0, forks: 0, updated: "Sep 20, 2025", fork: false },
    { name: "BIke-Rental-Project-IBI-", description: "Machine learning practice project for bike rental prediction", language: "Jupyter Notebook", stars: 0, forks: 0, updated: "Aug 14, 2025", fork: false },
  ],

  /** GitHub's own language dot colours, so the legend reads as the real one. */
  languageColors: {
    Python: "#3572A5",
    JavaScript: "#f1e05a",
    "Jupyter Notebook": "#DA5B0B",
    "C++": "#f34b7d",
  } as Record<string, string>,

  contributionsTotal: 230,
  /** The Sunday the calendar opens on. Every square below follows it by a day. */
  graphStart: "2025-08-24",
  /** One count per day, 369 of them. Rendered seven-to-a-column, Sunday first. */
  graph: [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,8,0,0,
    0,0,1,2,6,0,0,1,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,4,0,1,0,2,1,0,
    2,3,2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,9,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,2,2,4,5,2,2,1,4,3,1,2,0,3,7,1,1,0,0,1,0,0,0,
    1,2,0,0,0,0,0,5,4,1,0,0,0,0,0,0,0,0,0,1,3,0,0,22,11,3,
    9,5,10,15,11,
  ],
};
