"use client";

import { useEffect, useRef, useState } from "react";

import "./assistant.css";

/**
 * The "Ask me anything" deskband — a permanent box on the taskbar, right of
 * the Start orb, with its answer in a flyout above it. Win7 really did put
 * toolbars there (the Address and Search deskbands), so it belongs.
 *
 * It borrows the taskbar's existing `panel` state rather than owning its own,
 * which is what gives it Escape-to-close, click-away-to-close and mutual
 * exclusion with the Start menu for free — see the effect in Taskbar.tsx.
 *
 * One question, one answer, no history. Asking again replaces what's there,
 * the way a search box does.
 */

const MAX_QUESTION = 500;

/* The band is easy to miss against the taskbar's glass, so it says what it is
   in two quiet ways: the placeholder cycles through real questions, and a
   Windows-7 balloon tip points at it once, a few seconds after sign-in. */
const HINTS = [
  "Ask me anything",
  "What has he built?",
  "Where has he worked?",
  "What is RBI Sentinel?",
  "How do I reach him?",
];
const HINT_MS = 5000;
const HINT_FADE_MS = 200;

/** Long enough after sign-in that the desktop's welcome toast is gone. */
const TIP_DELAY_MS = 7000;

type AskBarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The login screen has faded; the desktop is the visitor's now. */
  signedIn?: boolean;
};

type Result = { question: string; answer: string; error?: boolean };

export function AskBar({ open, setOpen, signedIn }: AskBarProps) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [hint, setHint] = useState(0);
  const [dim, setDim] = useState(false);
  const [tip, setTip] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* A long answer arrives all at once, so the panel can open already scrolled
     down from the previous one. Reset it, not the answer's own scroll. */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [result]);

  /* Placeholder carousel. Stops the moment there is a question in the box —
     the visitor's own words outrank the hint. */
  useEffect(() => {
    if (query) return;
    const swap = setInterval(() => {
      setDim(true);
      setTimeout(() => {
        setHint((h) => (h + 1) % HINTS.length);
        setDim(false);
      }, HINT_FADE_MS);
    }, HINT_MS);
    return () => clearInterval(swap);
  }, [query]);

  /* The balloon: one delay in, and its own CSS animation out — `ask-tip`
     fades in, holds and fades away, then `onAnimationEnd` unmounts it. The
     band's own focus dismisses it early — once the caret is in there, the
     visitor has already found the thing the balloon points at. */
  useEffect(() => {
    if (!signedIn) return;
    const t = setTimeout(() => setTip(true), TIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [signedIn]);

  async function ask() {
    const question = query.trim();
    if (!question || busy) return;

    setBusy(true);
    setOpen(true);
    setResult({ question, answer: "" });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      setResult(
        res.ok && data.answer
          ? { question, answer: data.answer }
          : { question, answer: data.error ?? "Something went wrong.", error: true },
      );
    } catch {
      setResult({ question, answer: "No connection. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ask-band" data-open={open || undefined}>
      {open && result && (
        <div className="ask-flyout" role="status" aria-live="polite">
          <div className="ask-flyout-question">{result.question}</div>
          <div className="ask-flyout-body" ref={bodyRef} data-error={result.error || undefined}>
            {busy ? <span className="ask-dots" aria-label="Thinking" /> : result.answer}
          </div>
        </div>
      )}

      {tip && (
        <div className="ask-tip" role="note" onAnimationEnd={() => setTip(false)}>
          <button
            type="button"
            className="ask-tip-close"
            aria-label="Close"
            onClick={() => setTip(false)}
          >
            ×
          </button>
          <svg className="ask-tip-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M2 2h12v9H8.6L5 14.2V11H2V2z"
              fill="url(#ask-tip-fill)"
              stroke="#2a5c8f"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M5 5.4h6M5 7.8h4" stroke="#2a5c8f" strokeWidth="1" strokeLinecap="round" />
            <linearGradient id="ask-tip-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dcedff" />
              <stop offset="1" stopColor="#9fc9f0" />
            </linearGradient>
          </svg>
          <button
            type="button"
            className="ask-tip-text"
            onClick={() => {
              setTip(false);
              inputRef.current?.focus();
            }}
          >
            <span className="ask-tip-title">Ask me anything</span>
            <span className="ask-tip-body">
              Type a question about his projects, his work, or how to reach him.
            </span>
          </button>
        </div>
      )}

      <span className="ask-band-glass" aria-hidden="true" />
      <input
        ref={inputRef}
        className="ask-band-input"
        data-dim={dim || undefined}
        type="text"
        value={query}
        maxLength={MAX_QUESTION}
        placeholder={HINTS[hint]}
        aria-label="Ask me anything about Ayushman"
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setTip(false);
          if (result) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") ask();
          // Escape hands back to the taskbar's own handler, but only after
          // clearing a half-typed question, which is what a search box does.
          if (e.key === "Escape" && query) setQuery("");
        }}
      />
    </div>
  );
}
