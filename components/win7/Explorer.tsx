"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { Doc } from "@/components/win7/folders/Doc";
import { CHROME_ID, launchWindow } from "@/components/win7/apps";
import { contents, crumbIds, node, TREE } from "@/components/win7/fs";
import { PDF_PREFIX, PHOTOS_PREFIX } from "@/components/win7/media";
import { SITE_FOR, useChrome } from "@/store/chrome";
import { FolderIcon, NavArrowIcon, SearchIcon } from "@/components/win7/icons";
import { Network } from "@/components/win7/Network";
import { RenameField } from "@/components/win7/RenameField";
import { useMarquee } from "@/components/win7/useMarquee";
import { useFiles } from "@/store/files";
import { useFolders } from "@/store/folders";
import { useInlineEdit } from "@/store/inlineEdit";
import { usePhotography } from "@/store/photography";
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

/* Burn is gone, on request. "Include in library" and "Share with" followed
   it — neither did anything, and New Folder now does. */
const COMMANDS = ["Organize", "New folder"];
const HAS_MENU = new Set(["Organize"]);

export function Explorer({ id, title }: { id: string; title: string }) {
  // Which tree groups are expanded. Windows opens with the tree showing.
  const [open, setOpen] = useState<Record<string, boolean>>({ favorites: true, computer: true });

  // Where we are. A plain stack with a cursor is all back and forward need.
  const [history, setHistory] = useState<string[]>([id]);
  const [at, setAt] = useState(0);
  const view = history[at];

  const deleted = useRecycleBin((s) => s.deleted);
  const setTitle = useWindowStore((s) => s.setTitle);
  // Not read directly below — `node()` is what actually supplies labels and
  // listings. Subscribing is what makes this window repaint the moment a
  // file is saved, renamed or forgotten while it's open, the same way
  // DesktopIcons already does for the desktop itself.
  useFiles((s) => s.files);
  // Same reason, for folders New Folder has made.
  useFolders((s) => s.folders);
  // The bin's Restore-collision balloon and New Folder's limit warning are
  // both drawn at the foot of the content area by this component (see
  // `.win7-warn-bin` below), so the window needs its own subscription
  // rather than borrowing `Contents`'.
  const warning = useInlineEdit((s) => s.warning);
  const startRename = useInlineEdit((s) => s.start);

  const here = node(view);
  const label = here?.label ?? title;

  // Search in this window — same easter egg as Start menu: typing
  // "ayus…"/"lohan…" shows "He is everywhere, watching your moves."
  const [query, setQuery] = useState("");
  const queryTrim = query.trim();
  const easterEggQuery = queryTrim.toLowerCase();
  const isEasterEgg =
    easterEggQuery.length >= 4 &&
    ("ayushman".startsWith(easterEggQuery) ||
      "lohani".startsWith(easterEggQuery) ||
      "ayushman lohani".includes(easterEggQuery));

  // Changing folder clears the search, same as Windows Explorer.
  useEffect(() => setQuery(""), [view]);

  // The caption, the taskbar button and the address bar are all this string, so
  // a window is named after wherever it currently is — not after whatever
  // folder happened to open it.
  useEffect(() => setTitle(id, label), [id, label, setTitle]);

  // `to`, not `id` — the folder this window IS arrives as a prop by that name,
  // and shadowing it here would be one rename away from a very quiet bug.
  function go(to: string) {
    // A picture or a PDF is not a place. Walking into one would show an empty
    // folder; it opens in its own viewer instead, and this window stays put.
    if (to.startsWith(PHOTOS_PREFIX) || to.startsWith(PDF_PREFIX)) {
      launchWindow(to);
      return;
    }

    if (to === view) return;
    // Anything ahead of the cursor is discarded, same as a browser.
    const next = [...history.slice(0, at + 1), to];
    setHistory(next);
    setAt(next.length - 1);
  }

  // Made in `view` itself — wherever this window is standing, not wherever
  // it was opened from. Handed straight to rename-in-place so typing the
  // real name over "New folder" is the whole "ask for its name" step; a full
  // parent gets the limit warning instead of a folder nobody asked for.
  function newFolder() {
    const created = useFolders.getState().create(view);
    if (!created) {
      useInlineEdit.getState().folderLimitReached(view);
      return;
    }
    startRename(created);
  }

  const Icon = here?.Icon ?? FolderIcon;

  // Every folder on the way to `view`, so a nested page reads
  // "Ayushman ▸ Education ▸ Nirmala Convent Inter College ▸" instead of
  // skipping straight from the root to wherever the window happens to be.
  const crumbs = crumbIds(view)
    .map((cid) => node(cid))
    .filter((n): n is NonNullable<typeof n> => !!n);

  return (
    <div className="ex" data-ex-view={view}>
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
          <button
            type="button"
            className="ex-crumb ex-crumb-btn"
            onClick={() => go("desktop")}
            title="Go to Desktop"
          >
            Ayushman
          </button>
          <span className="ex-sep" />
          {crumbs.map((c) => (
            <Fragment key={c.id}>
              <button
                type="button"
                className="ex-crumb ex-crumb-btn"
                onClick={() => go(c.id)}
                aria-current={c.id === view ? "page" : undefined}
              >
                {c.label}
              </button>
              <span className="ex-sep" />
            </Fragment>
          ))}
        </div>

        <div className="ex-search">
          <input
            type="text"
            className="ex-search-input"
            placeholder={`Search ${label}`}
            aria-label={`Search ${label}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchIcon className="ex-icon ex-search-icon" />
        </div>
      </div>

      <div className="ex-commands">
        {COMMANDS.map((command) => (
          <button
            type="button"
            className="ex-cmd"
            key={command}
            onClick={command === "New folder" ? newFolder : undefined}
          >
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
          <Contents
            key={view}
            view={view}
            deleted={deleted}
            onOpen={go}
            query={queryTrim}
            isEasterEgg={isEasterEgg}
          />
          {view === "recycle" && warning?.kind === "restore" && (
            <div className="win7-warn win7-warn-bin">{warning.text}</div>
          )}
          {warning?.kind === "folder-limit" && warning.id === view && (
            <div className="win7-warn win7-warn-bin">{warning.text}</div>
          )}
        </div>
      </div>

      <Details view={view} label={label} Icon={Icon} deleted={deleted} />
    </div>
  );
}

/* ── What a place shows ────────────────────────────────────── */

/**
 * A web page opens in the browser, not in Explorer — load the tab first so
 * Chrome comes up already on it. Returns false for anything that isn't one,
 * so callers can fall through to their normal open. The id-to-page mapping
 * lives in store/chrome.ts, shared with the phone shell.
 */
function openInChrome(id: string) {
  const site = SITE_FOR[id];
  if (!site) return false;
  useChrome.getState().visit(site);
  launchWindow(CHROME_ID);
  return true;
}

function Contents({
  view,
  deleted,
  onOpen,
  query,
  isEasterEgg,
}: {
  view: string;
  deleted: string[];
  onOpen: (id: string) => void;
  query: string;
  isEasterEgg: boolean;
}) {
  // Hooks first — several early returns follow, and only the tiles grid at
  // the bottom actually uses these. Explorer remounts this component with
  // `key={view}` on every navigation, so a selection never survives into the
  // next folder.
  const [selected, setSelected] = useState<string[]>([]);
  const tilesRef = useRef<HTMLDivElement>(null);
  const { band, startBand } = useMarquee(tilesRef, ".ex-tile", selected, setSelected);
  const editingId = useInlineEdit((s) => s.editingId);
  const warning = useInlineEdit((s) => s.warning);
  const commitRename = useInlineEdit((s) => s.commit);
  const cancelRename = useInlineEdit((s) => s.cancel);

  // Fetches /api/photos the first time this folder is opened, never on page
  // load — see store/photography.ts for why that's what keeps an idle visit
  // at zero bandwidth.
  useEffect(() => {
    if (view === "photography") usePhotography.getState().load();
  }, [view]);

  // Easter egg — same as Start menu search (works in every folder)
  if (isEasterEgg) {
    return (
      <p className="ex-empty" style={{ fontStyle: "italic", color: "#7a1f1f" }}>
        He is everywhere, watching your moves.
      </p>
    );
  }

  if (view === "network") return <Network />;

  // An item from content/folders.ts, navigated into — nothing currently in
  // that file has words, but adding some there is meant to work without
  // touching this component.
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

  // Filter by search query (case-insensitive substring on label)
  const filtered = query
    ? items.filter((cid) => node(cid)?.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (query && filtered.length === 0) {
    return <p className="ex-empty">There isn&apos;t anything here matching that.</p>;
  }

  if (items.length === 0) {
    return (
      <p className="ex-empty">
        {view === "recycle" ? "The Recycle Bin is empty." : "This folder is empty."}
      </p>
    );
  }

  // Windows' Large Icons view: 48px icons on a grid that reflows as the window
  // is resized. There is no Name/Type header and no Type column, same as the
  // real thing — a tile is a picture and a name. `type` still reaches the
  // reader through the details pane once the item is open.
  return (
    <div className="ex-tiles" ref={tilesRef} onPointerDown={startBand}>
      {band && (
        <div
          className="desktop-band"
          style={{
            left: Math.min(band.x0, band.x1) - band.left,
            top: Math.min(band.y0, band.y1) - band.top,
            width: Math.abs(band.x1 - band.x0),
            height: Math.abs(band.y1 - band.y0),
          }}
        />
      )}

      {filtered.map((childId) => {
        const child = node(childId);
        if (!child) return null;

        return (
          <button
            type="button"
            className="ex-tile"
            key={childId}
            title={`Open ${child.label}`}
            // Read by the right-click menu, which decides between Delete and
            // Restore from these two attributes alone. Also what the marquee
            // above reads back off each tile it overlaps.
            data-node-id={childId}
            data-in-bin={view === "recycle" ? "true" : undefined}
            data-selected={selected.includes(childId) || undefined}
            // Same reason the desktop icons set this: a native HTML5 file
            // drag from the label/icon fires pointercancel and kills the
            // marquee mid-gesture otherwise.
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => {
              const additive = e.ctrlKey || e.metaKey;
              setSelected((prev) => {
                if (additive) return prev.includes(childId) ? prev.filter((s) => s !== childId) : [...prev, childId];
                return [childId];
              });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Enter on a multi-selection opens everything in its own window
              const targets = selected.includes(childId) && selected.length > 1 ? selected : [childId];
              // If only one and it's a folder, navigate in-place like double-click
              if (targets.length === 1) {
                const single = targets[0];
                if (node(single)?.kind === "app") {
                  launchWindow(single);
                  return;
                }
                if (openInChrome(single)) return;
                if (node(single)?.kind === "file") {
                  launchWindow(single);
                  return;
                }
                onOpen(single);
                return;
              }
              targets.forEach((cid) => {
                if (openInChrome(cid)) return;
                launchWindow(cid);
              });
            }}
            onDoubleClick={() => {
              // A program launches; only places are navigated into.
              if (node(childId)?.kind === "app") {
                launchWindow(childId);
                return;
              }
              if (openInChrome(childId)) return;
              // A text file opens in Notepad rather than being navigated
              // into — the same rule DesktopIcons already applies to every
              // file kind of node.
              if (node(childId)?.kind === "file") {
                launchWindow(childId);
                return;
              }
              onOpen(childId);
            }}
          >
            <child.Icon className="ex-tile-icon" />
            {editingId === childId ? (
              <RenameField
                id={childId}
                label={child.label}
                onCommit={commitRename}
                onCancel={cancelRename}
              />
            ) : (
              <span className="ex-tile-name">{child.label}</span>
            )}
            {/* Rename's collision stays under the field it belongs to. Restore's
                is drawn at the foot of the content area by the window itself —
                see `.win7-warn-bin` — because anchoring it to a tile near the
                left edge would slide it under the navigation pane. */}
            {warning?.id === childId && warning.kind === "rename" && (
              <div className="win7-warn">{warning.text}</div>
            )}
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
