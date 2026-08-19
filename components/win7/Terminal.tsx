"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Command Prompt.
 *
 * A console, not an emulator: it prints, it takes a line, it answers. Anything
 * it doesn't know gets cmd's own error, which is the honest placeholder — the
 * window works before a single command exists.
 *
 * `run()` below is the seam. Adding a command means adding a case to it and
 * nothing else; the scrollback, the prompt, the caret and the history all stay
 * where they are.
 */

const PROMPT = "C:\\Users\\Ayush>";

/** Same shape as cmd's own banner, with his name where Microsoft's goes. */
const BANNER = [
  "Ayushman Lohani [Version 1.0.0]",
  "(c) 2026 Ayushman Lohani. All rights reserved.",
  "",
];

/**
 * Runs one line and returns what to print under it.
 *
 * Nothing is implemented yet on purpose — commands are the next conversation.
 * An unknown command answers exactly the way cmd does, down to the line break.
 */
function run(input: string): string[] {
  const line = input.trim();
  if (!line) return [];

  const name = line.split(/\s+/)[0];
  return [
    `'${name}' is not recognized as an internal or external command,`,
    "operable program or batch file.",
    "",
  ];
}

export function Terminal() {
  const [lines, setLines] = useState<string[]>(BANNER);
  const [input, setInput] = useState("");

  // Past commands, newest last, and where ↑/↓ currently sit in them. `at` being
  // past the end means "not browsing" — the live input, not a recalled line.
  const [history, setHistory] = useState<string[]>([]);
  const [at, setAt] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // New output should leave the caret in view, the way a real console scrolls.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines, input]);

  function submit() {
    setLines((prev) => [...prev, PROMPT + input, ...run(input)]);

    if (input.trim()) {
      const next = [...history, input];
      setHistory(next);
      setAt(next.length);
    }

    setInput("");
  }

  function recall(step: number) {
    if (history.length === 0) return;
    const next = Math.min(Math.max(at + step, 0), history.length);
    setAt(next);
    // Stepping past the newest entry returns to an empty line, not to the
    // newest command again — same as a real shell.
    setInput(next === history.length ? "" : history[next]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      recall(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      recall(1);
    }
  }

  return (
    // Clicking anywhere in the console puts the caret back, which is the only
    // focus behaviour a terminal has.
    <div className="term" onPointerDown={() => inputRef.current?.focus()}>
      {lines.map((line, i) => (
        // Output is append-only and never reordered, so the index IS the identity.
        <div className="term-line" key={i}>
          {line || "\u00a0"}
        </div>
      ))}

      <div className="term-line">
        <span>{PROMPT}</span>
        <span className="term-typed">{input}</span>
        <span className="term-caret" aria-hidden="true" />
      </div>

      {/* The real input, parked out of sight. Keeps paste, IME and mobile
          keyboards working while the line above stays ours to draw. */}
      <input
        ref={inputRef}
        className="term-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Command Prompt"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />

      <div ref={endRef} />
    </div>
  );
}
