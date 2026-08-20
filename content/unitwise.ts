/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE UNITWISE PROJECT PAGE. EDIT THIS FILE.                   │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Same rules as content/about.ts: plain text, links written as
 * [the words](the address), and an address of "#" comes out bold instead of
 * as a link that goes nowhere.
 *
 * THE TECH STACK ROW
 *   Each entry is a logo. `id` picks which logo to draw; `name` is what
 *   appears when you hover or tab onto it.
 *
 *     { id: "react", name: "React 19" }
 *
 *   Logos live in components/win7/folders/techLogos.ts. An id with no logo
 *   there is fine — it draws the first two letters of the name instead, which
 *   is what Groq, ChromaDB and PyMuPDF do. To add a real one, find the slug at
 *   simpleicons.org and paste its path into that file.
 *
 *   Order matters: they render left to right, so put the headline
 *   technologies first.
 */

export const UNITWISE = {
  name: "Unitwise",

  /* Two lines, centred under the name. Keep each one short enough to hold a
     single line — roughly 80 characters — or it wraps and you get three. */
  tagline: [
    `A RAG chatbot that answers syllabus questions from your own textbooks —`,
    `every reply cited to the page it came from.`,
  ],

  /* The buttons under the tagline. */
  links: [
    { label: "Open the live app", href: "https://unitwise-weld.vercel.app/" },
    { label: "GitHub", href: "https://github.com/ayushmanlohani/Unitwise" },
  ],

  sections: [
    {
      heading: "What it does",
      text: [
        `B.Tech students ask a question in the words their syllabus uses, and Unitwise answers from the prescribed textbooks — with the page it came from attached. No hallucinated sources, no "as an AI model", no guessing at what a unit covers.`,
      ],
      points: [
        `Cited answers — every response carries the textbook page behind it.`,
        `A syllabus gate — off-topic questions are turned away before they reach the model.`,
        `Two registers — Academic for the exam, Simplified for the night before it.`,
        `Streamed live — answers arrive word by word over server-sent events.`,
      ],
    },
    {
      heading: "How it works",
      text: [
        `Textbooks are parsed with PyMuPDF, split, and embedded with all-MiniLM-L6-v2. The vectors sit in ChromaDB, and a question pulls the fifteen nearest passages. LangChain assembles those into a grounded prompt, LLaMA 3.1 8B Instant answers it through Groq, and the response streams back to a React front end.`,

        `The interesting part isn't the model — it's everything that decides what the model is allowed to see.`,
      ],
    },
  ],

  /* Hover any of these to see its full name. */
  stack: [
    { id: "langchain", name: "LangChain" },
    { id: "chromadb", name: "ChromaDB — vector store" },
    { id: "groq", name: "Groq — LLaMA 3.1 8B Instant" },
    { id: "huggingface", name: "all-MiniLM-L6-v2 embeddings" },
    { id: "fastapi", name: "FastAPI" },
    { id: "python", name: "Python" },
    { id: "pymupdf", name: "PyMuPDF — document parsing" },
    { id: "react", name: "React 19" },
    { id: "tailwindcss", name: "Tailwind CSS" },
    { id: "framer", name: "Framer Motion" },
    { id: "supabase", name: "Supabase — auth on PostgreSQL" },
    { id: "vercel", name: "Vercel" },
  ],
};
