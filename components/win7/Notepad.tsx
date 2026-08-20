"use client";

import { useEffect, useRef, useState } from "react";

import { useFiles } from "@/store/files";
import { useWindowStore } from "@/store/windows";

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
  useEffect(() => {
    setTitle(windowId, `${name || UNTITLED} - Notepad`);
  }, [windowId, name, setTitle]);

  useEffect(() => {
    if (saveAs !== null) nameRef.current?.select();
  }, [saveAs]);

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
              <button
                type="button"
                role="menuitem"
                className="ctx-item"
                onClick={() => {
                  setMenu(false);
                  setText("");
                  setName("");
                }}
              >
                <span className="ctx-label">New</span>
              </button>
              <button type="button" role="menuitem" className="ctx-item" data-disabled disabled>
                <span className="ctx-label">Open...</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="ctx-item"
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

      {saveAs !== null && (
        <div className="np-dialog-layer">
          <div className="np-dialog" role="dialog" aria-modal="true" aria-label="Save As">
            <div className="np-dialog-caption">Save As</div>
            <div className="np-dialog-body">
              <label htmlFor={`${windowId}-filename`}>File name:</label>
              <input
                id={`${windowId}-filename`}
                ref={nameRef}
                className="np-dialog-input"
                value={saveAs}
                onChange={(e) => setSaveAs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveAs.trim()) commitSave(saveAs.trim());
                  if (e.key === "Escape") setSaveAs(null);
                }}
              />
              <p className="np-dialog-where">Saving to Desktop</p>
            </div>
            <div className="np-dialog-buttons">
              <button
                type="button"
                className="np-dialog-btn"
                disabled={!saveAs.trim()}
                onClick={() => commitSave(saveAs.trim())}
              >
                Save
              </button>
              <button type="button" className="np-dialog-btn" onClick={() => setSaveAs(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
