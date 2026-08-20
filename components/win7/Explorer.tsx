"use client";

import { useEffect, useState } from "react";

import { About } from "@/components/win7/folders/About";
import { Doc } from "@/components/win7/folders/Doc";
import { Project } from "@/components/win7/folders/Project";
import { contents, node, projectId, TREE } from "@/components/win7/fs";
import { PROJECTS } from "@/content/projects";
import { FolderIcon, NavArrowIcon, SearchIcon } from "@/components/win7/icons";
import { Network } from "@/components/win7/Network";
import { useRecycleBin } from "@/store/recycleBin";
import { useWindowStore } from "@/store/windows";

/**
 * The inside of a Windows 7 Explorer window.
 *
 * Every measurement is its real Win7 value times `--px`, so this is the size
 * Explorer actually is: 33px of navigation, 30px of command bar, a 180px
 * navigation pane, a 30px details pane at the foot.
 *
 * Where it is comes from components/win7/fs.ts, and the caption follows it —
 * walk from About Me to Desktop and the title bar, the taskbar button, the
 * address bar and the search box all say Desktop.
 */

/* ── The drive ─────────────────────────────────────────────────
   Everything about the meter is derived from these two numbers,
   so the bar, its caption and the details pane can never end up
   disagreeing with each other.
   ───────────────────────────────────────────────────────────── */

const DRIVE = { total: 69, free: 2 };
const USED_FRACTION = (DRIVE.total - DRIVE.free) / DRIVE.total;

/**
 * Windows turns the capacity bar red once a drive drops under 10% free. At
 * 2 GB of 69 it is well past that, which is the state being shown here.
 */
const LOW_SPACE = DRIVE.free / DRIVE.total < 0.1;

/** Windows writes drive sizes to two decimals. */
const gb = (n: number) => `${n.toFixed(2)} GB`;

/* Burn is gone, on request. */
const COMMANDS = ["Organize", "Include in library", "Share with", "New folder"];
const HAS_MENU = new Set(["Organize", "Include in library", "Share with"]);

export function Explorer({ id, title }: { id: string; title: string }) {
  // Which tree groups are expanded. Windows opens with the tree showing.
  const [open, setOpen] = useState<Record<string, boolean>>({ favorites: true, computer: true });

  // Where we are. A plain stack with a cursor is all back and forward need.
  const [history, setHistory] = useState<string[]>([id]);
  const [at, setAt] = useState(0);
  const view = history[at];

  const deleted = useRecycleBin((s) => s.deleted);
  const setTitle = useWindowStore((s) => s.setTitle);

  const here = node(view);
  const label = here?.label ?? title;

  // The caption, the taskbar button and the address bar are all this string, so
  // a window is named after wherever it currently is — not after whatever
  // folder happened to open it.
  useEffect(() => setTitle(id, label), [id, label, setTitle]);

  // `to`, not `id` — the folder this window IS arrives as a prop by that name,
  // and shadowing it here would be one rename away from a very quiet bug.
  function go(to: string) {
    if (to === view) return;
    // Anything ahead of the cursor is discarded, same as a browser.
    const next = [...history.slice(0, at + 1), to];
    setHistory(next);
    setAt(next.length - 1);
  }

  const Icon = here?.Icon ?? FolderIcon;

  return (
    <div className="ex">
      <div className="ex-nav">
        <button
          type="button"
          className="ex-nav-btn"
          aria-label="Back"
          disabled={at === 0}
          onClick={() => setAt(at - 1)}
        >
          <NavArrowIcon className="ex-nav-arrow" />
        </button>
        <button
          type="button"
          className="ex-nav-btn"
          aria-label="Forward"
          disabled={at === history.length - 1}
          onClick={() => setAt(at + 1)}
        >
          <NavArrowIcon className="ex-nav-arrow" flip />
        </button>

        <div className="ex-address">
          <Icon className="ex-icon" />
          <span className="ex-crumb">Ayushman</span>
          <span className="ex-sep" />
          <span className="ex-crumb">{label}</span>
          <span className="ex-sep" />
        </div>

        <div className="ex-search">
          <span className="ex-search-text">Search {label}</span>
          <SearchIcon className="ex-icon ex-search-icon" />
        </div>
      </div>

      <div className="ex-commands">
        {COMMANDS.map((command) => (
          <button type="button" className="ex-cmd" key={command}>
            {command}
            {HAS_MENU.has(command) && <span className="ex-cmd-caret" />}
          </button>
        ))}
      </div>

      <div className="ex-split">
        <nav className="ex-tree">
          {TREE.map((group) => {
            const g = node(group.id);
            if (!g) return null;

            return (
              <div key={group.id}>
                <div className="ex-tree-row" data-here={view === group.id || undefined}>
                  {group.children ? (
                    <button
                      type="button"
                      className="ex-twisty"
                      data-open={open[group.id] || undefined}
                      aria-expanded={!!open[group.id]}
                      aria-label={`${open[group.id] ? "Collapse" : "Expand"} ${g.label}`}
                      onClick={() => setOpen({ ...open, [group.id]: !open[group.id] })}
                    />
                  ) : (
                    <span className="ex-twisty-gap" />
                  )}

                  <button
                    type="button"
                    className="ex-tree-label ex-tree-group"
                    onClick={() => go(group.id)}
                  >
                    <g.Icon className="ex-icon" />
                    <span>{g.label}</span>
                  </button>
                </div>

                {open[group.id] &&
                  group.children?.map((childId) => {
                    const c = node(childId);
                    if (!c) return null;

                    return (
                      <div
                        className="ex-tree-row ex-tree-child"
                        key={childId}
                        data-here={view === childId || undefined}
                      >
                        <button type="button" className="ex-tree-label" onClick={() => go(childId)}>
                          <c.Icon className="ex-icon" />
                          <span>{c.label}</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="ex-content">
          <Contents view={view} deleted={deleted} onOpen={go} />
        </div>
      </div>

      <Details view={view} label={label} Icon={Icon} deleted={deleted} />
    </div>
  );
}

/* ── What a place shows ────────────────────────────────────── */

function Contents({
  view,
  deleted,
  onOpen,
}: {
  view: string;
  deleted: string[];
  onOpen: (id: string) => void;
}) {
  if (view === "about") return <About />;
  if (view === "network") return <Network />;

  // A project with a page of its own. Matched by id rather than by a flag on
  // the node, so content/projects.ts stays the only place a project is
  // declared. A plain text item under projects/ shares the prefix and simply
  // isn't in the map, so it falls through to the Doc below.
  const project = Object.keys(PROJECTS).find((key) => projectId(key) === view);
  if (project) return <Project data={PROJECTS[project]} />;

  // An item from content/folders.ts. Opening one replaces the listing with its
  // words, the same way About Me does — a file "opens" into the window it was
  // clicked in rather than spawning a second one, so Back still walks out of it.
  const here = node(view);
  if (here?.body) return <Doc title={here.label} body={here.body} size="file" />;

  if (view === "computer") {
    const Drive = node("drive-c")!.Icon;
    return (
      <>
        <div className="ex-heading">Hard Disk Drives (1)</div>
        <button type="button" className="ex-drive" onDoubleClick={() => onOpen("drive-c")}>
          <Drive className="ex-drive-icon" />
          <div className="ex-drive-text">
            <div className="ex-drive-name">Local Disk (C:)</div>
            <CapacityBar />
            <div className="ex-drive-space">
              {gb(DRIVE.free)} free of {gb(DRIVE.total)}
            </div>
          </div>
        </button>
      </>
    );
  }

  const items = contents(view, deleted);

  if (items.length === 0) {
    return (
      <p className="ex-empty">
        {view === "recycle" ? "The Recycle Bin is empty." : "This folder is empty."}
      </p>
    );
  }

  return (
    <div className="ex-list">
      <div className="ex-list-head">
        <span>Name</span>
        <span>Type</span>
      </div>

      {items.map((childId) => {
        const child = node(childId);
        if (!child) return null;

        return (
          <button
            type="button"
            className="ex-row"
            key={childId}
            title={`Open ${child.label}`}
            // Read by the right-click menu, which decides between Delete and
            // Restore from these two attributes alone.
            data-node-id={childId}
            data-in-bin={view === "recycle" ? "true" : undefined}
            onDoubleClick={() => onOpen(childId)}
          >
            <child.Icon className="ex-icon" />
            <span className="ex-row-name">{child.label}</span>
            <span className="ex-row-type">{child.type ?? "File folder"}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── The details pane ──────────────────────────────────────── */

function Details({
  view,
  label,
  Icon,
  deleted,
}: {
  view: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  deleted: string[];
}) {
  if (view === "drive-c") {
    return (
      <div className="ex-details">
        <Icon className="ex-icon" />
        <span className="ex-details-name">{label}</span>
        <CapacityBar className="ex-bar-small" />
        <span className="ex-details-meta">
          {gb(DRIVE.free)} free of {gb(DRIVE.total)}
        </span>
      </div>
    );
  }

  // A place that holds things reports how many; a leaf reports what it is.
  const holds = view === "recycle" || node(view)?.children !== undefined;
  const count = contents(view, deleted).length;

  return (
    <div className="ex-details">
      <Icon className="ex-icon" />
      <span className="ex-details-name">{label}</span>
      <span className="ex-details-meta">
        {holds ? `${count} ${count === 1 ? "item" : "items"}` : (node(view)?.type ?? "File folder")}
      </span>
    </div>
  );
}

/**
 * The capacity meter. Windows switches the fill to red rather than adding a
 * warning next to it — the bar itself is the warning.
 */
function CapacityBar({ className }: { className?: string }) {
  return (
    <div
      className={`ex-bar${className ? ` ${className}` : ""}`}
      data-low={LOW_SPACE || undefined}
      role="img"
      aria-label={`${gb(DRIVE.free)} free of ${gb(DRIVE.total)}`}
    >
      <span style={{ width: `${USED_FRACTION * 100}%` }} />
    </div>
  );
}
