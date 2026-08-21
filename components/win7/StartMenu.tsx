"use client";

import { CALC_ID, NOTEPAD_ID, PDF_PREFIX, TERMINAL_ID, WMP_ID } from "@/components/win7/apps";
import { RESUME } from "@/content/resume";
import {
  CalculatorIcon,
  FlagIcon,
  MediaPlayerIcon,
  NotepadIcon,
  PaintIcon,
  PdfIcon,
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
    id: TERMINAL_ID,
    label: "Command Prompt",
    icon: <TerminalIcon className="sm-icon" />,
    opens: true,
  },
  { id: "getting-started", label: "Getting Started", icon: <FlagIcon className="sm-icon" /> },
  { id: CALC_ID, label: "Calculator", icon: <CalculatorIcon className="sm-icon" />, opens: true },
  { id: NOTEPAD_ID, label: "Notepad", icon: <NotepadIcon className="sm-icon" />, opens: true },
  {
    id: WMP_ID,
    label: "Windows Media Player",
    icon: <MediaPlayerIcon className="sm-icon" />,
    opens: true,
  },
  {
    id: PDF_PREFIX + RESUME.pdf,
    label: "Resume (PDF)",
    icon: <PdfIcon className="sm-icon" />,
    opens: true,
  },
  { id: "paint", label: "Paint", icon: <PaintIcon className="sm-icon" /> },
  { id: "snipping-tool", label: "Snipping Tool", icon: <ScissorsIcon className="sm-icon" /> },
];

/**
 * Right column. Windows renders these as text only — no icons.
 *
 * Pictures and Music are the two that lead somewhere: they open the viewer and
 * the player, which is what those shortcuts do in Windows. The rest hold the
 * shape of the menu and are deliberately inert.
 */
const SHORTCUTS: { label: string; opens?: string }[] = [
  { label: "Documents" },
  { label: "Pictures", opens: "pictures" },
  { label: "Music", opens: WMP_ID },
  { label: "Games" },
  { label: "Computer" },
  { label: "Control Panel" },
  { label: "Devices and Printers" },
  { label: "Default Programs" },
  { label: "Help and Support" },
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
