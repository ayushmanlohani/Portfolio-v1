"use client";

import { useState } from "react";
import { CONTROL_PANEL_ID, PROGRAMS, WMP_ID } from "@/components/win7/apps";
import { PowerIcon } from "@/components/win7/icons";

/**
 * The Windows 7 Start menu.
 *
 * Laid out the way the real one is: a white left column of programs above a
 * search box, a pale blue right column of text-only shortcuts, and the shut
 * down button in the bottom-right corner.
 *
 * The left column's "recently used" block is PROGRAMS from apps.ts — the same
 * list the phone shell draws its app pages from. Windows Photo Viewer is deliberately
 * absent, the same as in Windows: it has no Start entry because it is what a
 * picture opens in, not something you launch on its own.
 */

/**
 * Right column. Windows renders these as text only — no icons.
 *
 * Documents, Pictures, Music, My Computer and Control Panel lead somewhere —
 * Explorer views and apps Windows itself opens for them. Games opens the Games
 * folder inside Local Disk (C:) — so the address bar reads
 * Ayushman ▸ Local Disk (C:) ▸ Games, same as Windows 7.
 */
const SHORTCUTS: { label: string; opens?: string }[] = [
  { label: "Documents", opens: "documents" },
  { label: "Pictures", opens: "pictures" },
  { label: "Music", opens: WMP_ID },
  { label: "Games", opens: "drive-c/games" },
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
    ? PROGRAMS.filter((p) => p.label.toLowerCase().includes(query.trim().toLowerCase()))
    : PROGRAMS;

  const item = (p: (typeof PROGRAMS)[number]) => (
    <li key={p.id}>
      <button
        type="button"
        className="sm-item"
        role="menuitem"
        onClick={() => onLaunch(p.id)}
      >
        <p.Icon className="sm-icon" />
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
