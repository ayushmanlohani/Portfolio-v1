/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE RBI SENTINEL PROJECT PAGE. EDIT THIS FILE.               │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Same rules as content/about.ts and content/unitwise.ts: plain text, links
 * written as [the words](the address), and an address of "#" comes out bold
 * instead of as a link that goes nowhere.
 *
 * THE TECH STACK ROW
 *   `id` picks the logo, `name` is what shows on hover or keyboard focus.
 *   An id with no logo in components/win7/folders/techLogos.ts draws the first
 *   two letters of its name instead — pdfplumber, yfinance and statsmodels all
 *   do that here, and it is a normal case, not a missing file.
 */

export const SENTINEL = {
  name: "RBI Sentinel",

  /* Two lines, centred under the name. Keep each under roughly 80 characters
     or it wraps and you get three. */
  tagline: [
    `Reads six years of Reserve Bank speeches with FinBERT to ask one question —`,
    `does the tone of a central bank predict a shock in the market?`,
  ],

  links: [
    { label: "Open the live dashboard", href: "https://rbi-sentinel.streamlit.app/" },
    {
      label: "GitHub",
      href: "https://github.com/ayushmanlohani/rbi-sentiment-volatility-forecasting",
    },
  ],

  sections: [
    {
      heading: "What it does",
      text: [
        `Every speech and set of MPC minutes the Reserve Bank of India published between 2020 and 2026 — 140 documents — scored for sentiment with FinBERT, merged with Indian equity market data, and handed to a classifier that predicts volatility shocks in the Nifty.`,
      ],
      points: [
        `140 documents — 102 speeches and 38 MPC minutes, January 2020 to February 2026.`,
        `Sentiment scored from −0.4512 to +0.7419 by ProsusAI/FinBERT.`,
        `Random Forest — 300 trees, depth 4, balanced class weights.`,
        `A shock is a VIX return above the 80th percentile of the training period.`,
      ],
    },
    {
      heading: "The finding",
      text: [
        `The market does not care whether the RBI sounds hawkish or dovish. It cares how hard the RBI says anything at all.`,

        `Sentiment intensity — the absolute value, direction thrown away — carries a signal that the signed score does not. A strongly worded speech moves volatility whichever way it leans.`,
      ],
    },
    {
      heading: "How it works",
      text: [
        `Documents come out of PDFs with pdfplumber and are chunked with a sliding window, so anything past FinBERT's 512-token limit still gets scored end to end rather than truncated. Market data comes from yfinance.`,

        `Five features — sentiment intensity, a VIX lag and Nifty momentum among them — feed a scikit-learn Random Forest. The split is chronological, training on 2024 and earlier and testing on 2025 onward, so no future information can leak backwards into the model. The whole thing is explorable in a Streamlit dashboard.`,
      ],
    },
  ],

  /* Hover any of these to see its full name. */
  stack: [
    { id: "huggingface", name: "ProsusAI/FinBERT via Hugging Face" },
    { id: "pytorch", name: "PyTorch" },
    { id: "scikitlearn", name: "scikit-learn — Random Forest" },
    { id: "pandas", name: "pandas" },
    { id: "numpy", name: "NumPy" },
    { id: "scipy", name: "SciPy" },
    { id: "statsmodels", name: "statsmodels" },
    { id: "plotly", name: "Plotly" },
    { id: "pdfplumber", name: "pdfplumber — PDF extraction" },
    { id: "yfinance", name: "yfinance — market data" },
    { id: "streamlit", name: "Streamlit" },
    { id: "python", name: "Python" },
  ],
};
