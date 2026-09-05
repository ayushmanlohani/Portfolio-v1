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

type AskBarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

type Result = { question: string; answer: string; error?: boolean };

export function AskBar({ open, setOpen }: AskBarProps) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* A long answer arrives all at once, so the panel can open already scrolled
     down from the previous one. Reset it, not the answer's own scroll. */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [result]);

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

      <span className="ask-band-glass" aria-hidden="true" />
      <input
        className="ask-band-input"
        type="text"
        value={query}
        maxLength={MAX_QUESTION}
        placeholder="Ask me anything"
        aria-label="Ask me anything about Ayushman"
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => result && setOpen(true)}
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
