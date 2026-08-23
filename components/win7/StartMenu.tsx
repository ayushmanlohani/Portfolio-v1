"use client";

import { useState } from "react";
import {
  CALC_ID,
  CHROME_ID,
  CONTROL_PANEL_ID,
  NOTEPAD_ID,
  PDF_ID,
  RACER_ID,
  TERMINAL_ID,
  WMP_ID,
} from "@/components/win7/apps";
import {
  CalculatorIcon,
  ChromeIcon,
  MediaPlayerIcon,
  NotepadIcon,
  PdfIcon,
  PowerIcon,
  RacerIcon,
  TerminalIcon,
} from "@/components/win7/icons";

/**
 * The Windows 7 Start menu.
 *
 * Laid out the way the real one is: a white left column of programs above a
 * search box, a pale blue right column of text-only shortcuts, and the shut
 * down button in the bottom-right corner.
 *
 * The left column's "recently used" block lists what actually runs here; the
 * rest are placeholders holding the shape. Windows Photo Viewer is deliberately
 * absent, the same as in Windows: it has no Start entry because it is what a
 * picture opens in, not something you launch on its own.
 */

type Program = {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Entries without this are decoration — they render but do nothing. */
  opens?: boolean;
};

/** The "recently used" block Windows fills in for you. */
const RECENT: Program[] = [
  {
    id: CHROME_ID,
    label: "Google Chrome",
    icon: <ChromeIcon className="sm-icon" />,
    opens: true,
  },
  {
    id: TERMINAL_ID,
    label: "Command Prompt",
    icon: <TerminalIcon className="sm-icon" />,
    opens: true,
  },
  { id: CALC_ID, label: "Calculator", icon: <CalculatorIcon className="sm-icon" />, opens: true },
  { id: NOTEPAD_ID, label: "Notepad", icon: <NotepadIcon className="sm-icon" />, opens: true },
  {
    id: WMP_ID,
    label: "Windows Media Player",
    icon: <MediaPlayerIcon className="sm-icon" />,
    opens: true,
  },
  {
    id: PDF_ID,
    label: "PDF Viewer",
    icon: <PdfIcon className="sm-icon" />,
    opens: true,
  },
  {
    id: RACER_ID,
    label: "Time Attack",
    icon: <RacerIcon className="sm-icon" />,
    opens: true,
  },
];

/**
 * Right column. Windows renders these as text only — no icons.
 *
 * Documents, Pictures, Music, My Computer and Control Panel lead somewhere —
 * Explorer views and apps Windows itself opens for them. Games used to be the
 * one left inert; it now opens Time Attack, which is what a Games entry on a
 * Windows 7 machine is for.
 */
const SHORTCUTS: { label: string; opens?: string }[] = [
  { label: "Documents", opens: "documents" },
  { label: "Pictures", opens: "pictures" },
  { label: "Music", opens: WMP_ID },
  { label: "Games", opens: RACER_ID },
  { label: "My Computer", opens: "computer" },
  { label: "Control Panel", opens: CONTROL_PANEL_ID },
];

/** Where Windows draws a divider in the right column. */
const SHORTCUT_DIVIDERS = new Set(["Games"]);

export function StartMenu({ id, onLaunch, onShutdown }: { id: string; onLaunch: (id: string) => void; onShutdown?: () => void }) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const easterEggQuery = query.trim().toLowerCase();
  const easterEgg =
    easterEggQuery.length >= 4 &&
    ("ayushman".startsWith(easterEggQuery) ||
      "lohani".startsWith(easterEggQuery) ||
      "ayushman lohani".includes(easterEggQuery));
  const results = searching
    ? RECENT.filter((p) => p.label.toLowerCase().includes(query.trim().toLowerCase()))
    : RECENT;

  const item = (p: Program) => (
    <li key={p.id}>
      <button
        type="button"
        className="sm-item"
        role="menuitem"
        onClick={p.opens ? () => onLaunch(p.id) : undefined}
      >
        {p.icon}
        <span>{p.label}</span>
      </button>
    </li>
  );

  return (
    <div className="start-menu" id={id} role="menu" aria-label="Start menu">
      <div className="sm-body">
        <div className="sm-left">
          {easterEgg ? (
            <p className="sm-no-results sm-easter-egg">
              He is everywhere, watching your moves.
            </p>
          ) : results.length > 0 ? (
            <ul className="sm-programs">{results.map(item)}</ul>
          ) : (
            <p className="sm-no-results">There isn&apos;t anything here matching that.</p>
          )}

          {!searching && (
            <button type="button" className="sm-item sm-all" role="menuitem">
              <span className="sm-all-arrow" aria-hidden="true" />
              <span>All Programs</span>
            </button>
          )}

          <div className="sm-search">
            <input
              type="text"
              placeholder="Search programs and files"
              aria-label="Search programs and files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="sm-search-glass" aria-hidden="true" />
          </div>
        </div>

        <div className="sm-right">
          <div className="sm-user">
            <img src="/letterbox/1234.png" alt="" className="sm-user-pic" />
            <div className="sm-user-name">Ayushman</div>
          </div>

          <ul className="sm-links">
            {SHORTCUTS.map(({ label, opens }) => (
              <li key={label} className={SHORTCUT_DIVIDERS.has(label) ? "sm-link-div" : undefined}>
                <button
                  type="button"
                  className="sm-link"
                  role="menuitem"
                  onClick={opens ? () => onLaunch(opens) : undefined}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="sm-shutdown">
            <button type="button" className="sm-shutdown-main" role="menuitem" onClick={onShutdown}>
              <PowerIcon className="sm-power" />
              <span>Shut down</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
