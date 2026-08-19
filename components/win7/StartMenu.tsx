"use client";

import { TERMINAL_ID } from "@/components/win7/apps";
import {
  CalculatorIcon,
  FlagIcon,
  FolderIcon,
  NotepadIcon,
  PaintIcon,
  PowerIcon,
  ScissorsIcon,
  TerminalIcon,
  UserIcon,
} from "@/components/win7/icons";

/**
 * The Windows 7 Start menu.
 *
 * Laid out the way the real one is: a white left column of programs above a
 * search box, a pale blue right column of text-only shortcuts, and the shut
 * down button in the bottom-right corner.
 *
 * "About Me" is pinned at the top of the left column, above the separator,
 * which is where Windows puts pinned items. Command Prompt is the only entry
 * wired to anything so far; the rest are placeholders holding the shape.
 */

type Program = {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Entries without this are decoration — they render but do nothing. */
  opens?: boolean;
};

/** Pinned — sits above the separator. */
const PINNED: Program[] = [
  { id: "about", label: "About Me", icon: <FolderIcon className="sm-icon" /> },
];

/** The "recently used" block Windows fills in for you. */
const RECENT: Program[] = [
  {
    id: TERMINAL_ID,
    label: "Command Prompt",
    icon: <TerminalIcon className="sm-icon" />,
    opens: true,
  },
  { id: "getting-started", label: "Getting Started", icon: <FlagIcon className="sm-icon" /> },
  { id: "calculator", label: "Calculator", icon: <CalculatorIcon className="sm-icon" /> },
  { id: "notepad", label: "Notepad", icon: <NotepadIcon className="sm-icon" /> },
  { id: "paint", label: "Paint", icon: <PaintIcon className="sm-icon" /> },
  { id: "snipping-tool", label: "Snipping Tool", icon: <ScissorsIcon className="sm-icon" /> },
];

/** Right column. Windows renders these as text only — no icons. */
const SHORTCUTS = [
  "Documents",
  "Pictures",
  "Music",
  "Games",
  "Computer",
  "Control Panel",
  "Devices and Printers",
  "Default Programs",
  "Help and Support",
];

/** Where Windows draws a divider in the right column. */
const SHORTCUT_DIVIDERS = new Set(["Games", "Devices and Printers"]);

export function StartMenu({ id, onLaunch }: { id: string; onLaunch: (id: string) => void }) {
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
          <ul className="sm-programs">
            {PINNED.map(item)}

            <li className="sm-sep" aria-hidden="true" />

            {RECENT.map(item)}
          </ul>

          <button type="button" className="sm-item sm-all" role="menuitem">
            <span className="sm-all-arrow" aria-hidden="true" />
            <span>All Programs</span>
          </button>

          <div className="sm-search">
            <input
              type="text"
              placeholder="Search programs and files"
              aria-label="Search programs and files"
              readOnly
            />
            <span className="sm-search-glass" aria-hidden="true" />
          </div>
        </div>

        <div className="sm-right">
          <div className="sm-user">
            <UserIcon className="sm-user-pic" />
            <div className="sm-user-name">Ayushman</div>
          </div>

          <ul className="sm-links">
            {SHORTCUTS.map((label) => (
              <li key={label} className={SHORTCUT_DIVIDERS.has(label) ? "sm-link-div" : undefined}>
                <button type="button" className="sm-link" role="menuitem">
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="sm-shutdown">
            <button type="button" className="sm-shutdown-main" role="menuitem">
              <PowerIcon className="sm-power" />
              <span>Shut down</span>
            </button>
            <button
              type="button"
              className="sm-shutdown-arrow"
              role="menuitem"
              aria-label="Shut down options"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
