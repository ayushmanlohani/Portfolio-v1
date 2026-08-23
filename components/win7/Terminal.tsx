"use client";

import { useEffect, useRef, useState } from "react";

import { CONTROL_PANEL_ID, launchWindow } from "@/components/win7/apps";

/**
 * The Command Prompt.
 *
 * A console, not an emulator: it prints, it takes a line, it answers.
 * Commands are `/`-prefixed and live in the `COMMANDS` table below — mostly
 * shortcuts that open the same folders the desktop and Start menu do.
 * Anything else gets cmd's own error, the honest placeholder for a command
 * that doesn't exist.
 */

const PROMPT = "C:\\Users\\Ayush> ";

/**
 * A 4×5 block font, one entry per letter this name needs — narrow enough
 * that the full name fits one 80-column line. Each string is one row, "#"
 * for a lit cell, kept as a data table rather than literal "█" so the
 * glyphs below stay readable as a grid instead of a wall of blocks.
 */
const GLYPH: Record<string, string[]> = {
  A: ["·##·", "#··#", "####", "#··#", "#··#"],
  Y: ["#··#", "·##·", "··#·", "··#·", "··#·"],
  U: ["#··#", "#··#", "#··#", "#··#", "·##·"],
  S: ["·###", "#···", "·##·", "···#", "###·"],
  H: ["#··#", "#··#", "####", "#··#", "#··#"],
  M: ["#··#", "####", "#··#", "#··#", "#··#"],
  N: ["#··#", "##·#", "#·##", "#··#", "#··#"],
  L: ["#···", "#···", "#···", "#···", "####"],
  O: ["·##·", "#··#", "#··#", "#··#", "·##·"],
  I: ["####", "·#··", "·#··", "·#··", "####"],
};

/** One word's raw glyph rows, letters one space apart, "·"/"#" still literal. */
function wordRows(word: string): string[] {
  const glyphs = word.toUpperCase().split("").map((ch) => GLYPH[ch] ?? GLYPH.O);
  return Array.from({ length: 5 }, (_, row) => glyphs.map((g) => g[row]).join(" "));
}

/** The whole name across a single line, a wider gap between words than
 *  between letters so the two names read as separate, not run together. */
function nameBanner(name: string): string[] {
  const words = name.toUpperCase().split(" ").map(wordRows);
  const lines = Array.from({ length: 5 }, (_, row) => words.map((w) => w[row]).join("   "));
  return [...lines.map((l) => l.replace(/·/g, " ").replace(/#/g, "█")), ""];
}

/** Same shape as cmd's own banner, with his name where Microsoft's goes. */
const BANNER = [
  ...nameBanner("Ayushman Lohani"),
  "Ayushman Lohani [Version 1.0.0]",
  "(c) 2026 Ayushman Lohani. All rights reserved.",
  "",
];

/** Ghost text sitting ahead of the caret on the prompt line — gone the
 *  instant a real keystroke lands, the way a placeholder works. */
const HINT = "Type /help to see all the commands.";

/**
 * A command opens a window and says so. `/whoami` and `/clear` are the two
 * exceptions — one just prints, the other is handled in `submit()` because
 * it replaces the scrollback rather than appending to it. `/help` is
 * generated from this table, not hand-written, so a new command can't drift
 * out of sync with its own listing.
 */
const COMMANDS: { cmd: string; desc: string; open?: string; label?: string; say?: string }[] = [
  { cmd: "/about", desc: "Open the About Me folder", open: "about", label: "About Me" },
  { cmd: "/projects", desc: "Open the Projects folder", open: "projects", label: "Projects" },
  {
    cmd: "/experience",
    desc: "Open the Experience folder",
    open: "experience",
    label: "Experience",
  },
  { cmd: "/education", desc: "Open the Education folder", open: "education", label: "Education" },
  { cmd: "/resume", desc: "Open the Resume folder", open: "resume", label: "Resume" },
  { cmd: "/contact", desc: "Open the Contact folder", open: "contact", label: "Contact" },
  { cmd: "/computer", desc: "Open My Computer", open: "computer", label: "My Computer" },
  {
    cmd: "/controlpanel",
    desc: "Open Control Panel",
    open: CONTROL_PANEL_ID,
    label: "Control Panel",
  },
  { cmd: "/whoami", desc: "Print who this computer belongs to", say: "Ayushman Lohani" },
  { cmd: "/clear", desc: "Clear the screen" },
];

/** Runs one line and returns what to print under it. */
function run(input: string): string[] {
  const line = input.trim();
  if (!line) return [];

  const name = line.split(/\s+/)[0].toLowerCase();

  if (name === "/help") {
    return ["Commands:", ...COMMANDS.map((c) => `  ${c.cmd.padEnd(15)} ${c.desc}`), ""];
  }

  const found = COMMANDS.find((c) => c.cmd === name);
  if (found) {
    if (found.open) {
      launchWindow(found.open);
      return [`Opening ${found.label}...`, ""];
    }
    return found.say ? [found.say, ""] : [];
  }

  // Unknown input gets cmd's own error, down to the line break — the honest
  // placeholder for anything that isn't a real command above.
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
    if (input.trim().toLowerCase() === "/clear") {
      // Back to the same view the window opens with, name banner and all —
      // not a blank screen.
      setLines(BANNER);
    } else {
      // `run` can open a window as a side effect (launchWindow → another
      // store's setState) — it has to happen here, eagerly, rather than
      // inside the updater below. React calls a setState updater during
      // the render phase, and a side effect that fires from inside one
      // trips "Cannot update a component while rendering a different
      // component" the moment a command opens a window.
      const output = run(input);
      setLines((prev) => [...prev, PROMPT + input, ...output]);
    }

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
    // focus behaviour a terminal has. Without preventDefault, the browser's
    // own default focus handling runs after this and steals it right back —
    // the click target (a line of text) isn't focusable, so it lands on
    // <body> instead of staying on the hidden input.
    <div
      className="term"
      onPointerDown={(e) => {
        e.preventDefault();
        inputRef.current?.focus();
      }}
    >

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
        {!input && <span className="term-hint">{HINT}</span>}
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
