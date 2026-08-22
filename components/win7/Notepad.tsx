"use client";

import { useEffect, useRef, useState } from "react";

import { About } from "@/components/win7/folders/About";
import { Contact } from "@/components/win7/folders/Contact";
import { Project } from "@/components/win7/folders/Project";
import { launchWindow, NOTEPAD_ID } from "@/components/win7/apps";
import { ABOUT_TXT_ID, CONTACT_TXT_ID, SENTINEL_TXT_ID, UNITWISE_TXT_ID } from "@/components/win7/fs";
import { entryAt, isGroup } from "@/content/pages";
import { SENTINEL as SENTINEL_PAGE } from "@/content/sentinel";
import { UNITWISE as UNITWISE_PAGE } from "@/content/unitwise";
import { useFiles } from "@/store/files";
import { useWindowStore } from "@/store/windows";

/**
 * Every writeup that moved out of a folder and into Notepad keeps the styled
 * page it had before — headings, taglines, link buttons, whatever that page
 * drew — rather than showing as raw text. Nothing else opened here gets
 * this: it's keyed on the file's own id, and every other file falls through
 * to the plain textarea below.
 *
 * About Me, Contact, Unitwise and RBI Sentinel are hand-built pages with no
 * entry in content/pages.ts, so they're matched by id here. Every role in
 * Experience and every qualification in Education *is* in content/pages.ts,
 * and its file's id is exactly the path `entryAt` expects — walk() in fs.ts
 * built it that way — so those are read straight back out rather than
 * hand-listed one by one.
 */
function richContent(fileId: string | undefined) {
  if (fileId === ABOUT_TXT_ID) return <About />;
  if (fileId === CONTACT_TXT_ID) return <Contact />;
  if (fileId === UNITWISE_TXT_ID) return <Project data={UNITWISE_PAGE} size="file" />;
  if (fileId === SENTINEL_TXT_ID) return <Project data={SENTINEL_PAGE} size="file" />;

  const entry = fileId ? entryAt(fileId) : undefined;
  if (entry && !isGroup(entry)) return <Project data={entry} />;

  return undefined;
}

/**
 * Windows 7 Notepad.
 *
 * File > Save puts a text file on the desktop. There is no disk behind it:
 * `store/files.ts` holds the text and registers the file in the shared tree,
 * so it shows up as a desktop icon, lists inside the Desktop folder, can be
 * dragged to the Recycle Bin, and reopens here on double-click — and a reload
 * clears the lot, same as every other change a visitor can make.
 *
 * A window opened from a saved file passes that file's id; a window opened
 * from the Start menu passes nothing and starts Untitled.
 *
 * Edit/Format/View are decoration, as they are elsewhere in this desktop.
 * File is the one menu that does anything.
 */

/** Windows' own default, and the reason the caption starts "Untitled". */
const UNTITLED = "Untitled";

export function Notepad({ windowId, fileId }: { windowId: string; fileId?: string }) {
  const rich = richContent(fileId);
  const saved = useFiles((s) => (fileId ? s.files.find((f) => f.id === fileId) : undefined));
  const save = useFiles((s) => s.save);
  const setTitle = useWindowStore((s) => s.setTitle);

  const [text, setText] = useState(saved?.text ?? "");
  // The name it will save under without asking again. Empty means Untitled,
  // which is what makes File > Save open the Save As box the first time.
  const [name, setName] = useState(saved?.name ?? "");
  const [saveAs, setSaveAs] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const closeWindow = useWindowStore((s) => s.close);

  // The File menu closes on Escape or a click anywhere outside it — same
  // pattern as the Start menu and the desktop's own right-click menu.
  useEffect(() => {
    if (!menu) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!fileRef.current?.contains(e.target as Node)) setMenu(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menu]);

  // The caption follows the filename, the way Explorer's follows the folder.
  // A rich file's name never changes — there's no Save to rename it with —
  // so this leaves alone the caption `launchWindow` already set correctly;
  // without the guard, `name`'s empty-string default (nothing here is a
  // saved file) would overwrite it with "Untitled - Notepad".
  useEffect(() => {
    if (rich) return;
    setTitle(windowId, `${name || UNTITLED} - Notepad`);
  }, [windowId, name, setTitle, rich]);

  // Select-all belongs to the moment the dialog opens, not to every
  // keystroke after — depending on `saveAs` itself re-ran this (and
  // re-selected the whole field) on every character typed, which made it
  // look like only one letter at a time could ever be entered.
  const saveAsOpen = saveAs !== null;
  useEffect(() => {
    if (saveAsOpen) nameRef.current?.select();
  }, [saveAsOpen]);

  /** Ln/Col, counted from the caret's offset — Notepad's own status bar. */
  const updateCaret = () => {
    const area = areaRef.current;
    if (!area) return;
    const before = area.value.slice(0, area.selectionStart).split("\n");
    setCaret({ line: before.length, col: before[before.length - 1].length + 1 });
  };

  const commitSave = (as: string) => {
    // Notepad appends .txt when you don't type an extension.
    const filename = /\.[^.]+$/.test(as) ? as : `${as}.txt`;
    save(filename, text);
    setName(filename);
    setSaveAs(null);
    // Saving through Save As is a "name it and be done" moment — the file is
    // on the desktop now, so the editor closes. (File > Save on a file that
    // already has a name stays in place and keeps the window open.)
    closeWindow(windowId);
  };

  const onSave = () => {
    if (name) {
      save(name, text);
      return;
    }
    setSaveAs(UNTITLED);
  };

  return (
    <div className="np">
      <div className="app-menu">
        <div className="np-file" ref={fileRef}>
          <button
            type="button"
            className="app-menu-item"
            data-open={menu || undefined}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            File
          </button>

          {menu && (
            <div className="ctx-menu np-file-menu" role="menu">
              {/* A separate blank window, not this one cleared in place — a
                  rich file's window is permanently that file (its id is the
                  file's id), so there's no "blank" for it to become. Reusing
                  the one mechanism for every Notepad window, rich or plain,
                  means New always does the same obvious thing wherever it's
                  clicked from. */}
              <button
                type="button"
                role="menuitem"
                className="ctx-item"
                onClick={() => {
                  setMenu(false);
                  launchWindow(NOTEPAD_ID);
                }}
              >
                <span className="ctx-label">New</span>
              </button>
              <button type="button" role="menuitem" className="ctx-item" data-disabled disabled>
                <span className="ctx-label">Open...</span>
              </button>
              {/* A rich file — About Me, a job, a degree — has no text behind
                  it to save; `text` is only ever the plain-text fallback
                  nothing here shows. Saving it would silently create an
                  empty "Untitled" file on the desktop instead of doing
                  anything to the page you're actually looking at. */}
              <button
                type="button"
                role="menuitem"
                className="ctx-item"
                data-disabled={rich || undefined}
                disabled={!!rich}
                onClick={() => {
                  setMenu(false);
                  onSave();
                }}
              >
                <span className="ctx-label">Save</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="ctx-item"
                data-disabled={rich || undefined}
                disabled={!!rich}
                onClick={() => {
                  setMenu(false);
                  setSaveAs(name || UNTITLED);
                }}
              >
                <span className="ctx-label">Save As...</span>
              </button>
              <div className="ctx-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="ctx-item"
                onClick={() => closeWindow(windowId)}
              >
                <span className="ctx-label">Exit</span>
              </button>
            </div>
          )}
        </div>
        <button type="button" className="app-menu-item">
          Edit
        </button>
        <button type="button" className="app-menu-item">
          Format
        </button>
        <button type="button" className="app-menu-item">
          View
        </button>
        <button type="button" className="app-menu-item" data-disabled>
          Help
        </button>
      </div>

      {rich ? (
        <div className="np-project">{rich}</div>
      ) : (
        <>
          <textarea
            ref={areaRef}
            className="np-area"
            value={text}
            spellCheck={false}
            aria-label="Text"
            onChange={(e) => {
              setText(e.target.value);
              updateCaret();
            }}
            onKeyUp={updateCaret}
            onClick={updateCaret}
          />

          <div className="np-status">
            <span>
              Ln {caret.line}, Col {caret.col}
            </span>
          </div>
        </>
      )}

      {saveAs !== null && (
        <div className="win7-dialog-layer">
          <div className="win7-dialog" role="dialog" aria-modal="true" aria-label="Save As">
            <div className="win7-dialog-caption">Save As</div>
            <div className="win7-dialog-body">
              <label htmlFor={`${windowId}-filename`}>File name:</label>
              <input
                id={`${windowId}-filename`}
                ref={nameRef}
                className="win7-dialog-input"
                value={saveAs}
                onChange={(e) => setSaveAs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveAs.trim()) commitSave(saveAs.trim());
                  if (e.key === "Escape") setSaveAs(null);
                }}
              />
              <p className="win7-dialog-where">Saving to Desktop</p>
            </div>
            <div className="win7-dialog-buttons">
              <button
                type="button"
                className="win7-dialog-btn"
                disabled={!saveAs.trim()}
                onClick={() => commitSave(saveAs.trim())}
              >
                Save
              </button>
              <button type="button" className="win7-dialog-btn" onClick={() => setSaveAs(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
