"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { node } from "@/components/win7/fs";
import { useRecycleBin } from "@/store/recycleBin";

/**
 * The Windows 7 right-click menu.
 *
 * Two menus behind one listener, chosen by what was actually clicked — same as
 * Windows, where right-clicking a folder and right-clicking bare desktop give
 * different things.
 *
 * A folder gets Open and **Delete**. The same folder seen inside the Recycle
 * Bin gets **Restore** instead, because nothing here can be destroyed: Delete
 * moves an item, Restore moves it back, and a reload undoes the lot.
 *
 * Anything that wants an item menu tags itself `data-node-id`, and adds
 * `data-in-bin` when it is drawn inside the bin. Desktop icons and folder rows
 * both do, which is why the menu works in both places without knowing either
 * of them exists.
 */

type Entry =
  | { kind: "sep" }
  | {
      kind: "item";
      label: string;
      submenu?: boolean;
      disabled?: boolean;
      action?: "refresh" | "delete" | "restore" | "open";
    };

/** Bare desktop. Gadgets was removed on request. */
const DESKTOP_ENTRIES: Entry[] = [
  { kind: "item", label: "View", submenu: true },
  { kind: "item", label: "Sort by", submenu: true },
  { kind: "item", label: "Refresh", action: "refresh" },
  { kind: "sep" },
  { kind: "item", label: "Paste", disabled: true },
  { kind: "item", label: "Paste shortcut", disabled: true },
  { kind: "sep" },
  { kind: "item", label: "New", submenu: true },
  { kind: "sep" },
  { kind: "item", label: "Screen resolution" },
  { kind: "item", label: "Personalize" },
];

const itemEntries = (inBin: boolean, deletable: boolean): Entry[] =>
  inBin
    ? [
        { kind: "item", label: "Restore", action: "restore" },
        { kind: "sep" },
        { kind: "item", label: "Cut", disabled: true },
        { kind: "item", label: "Properties", disabled: true },
      ]
    : [
        { kind: "item", label: "Open", action: "open" },
        { kind: "sep" },
        { kind: "item", label: "Cut", disabled: true },
        { kind: "item", label: "Copy", disabled: true },
        { kind: "sep" },
        // The Recycle Bin itself can't go in the Recycle Bin.
        { kind: "item", label: "Delete", action: "delete", disabled: !deletable },
        { kind: "item", label: "Rename", disabled: true },
        { kind: "sep" },
        { kind: "item", label: "Properties", disabled: true },
      ];

type Target = { id: string; inBin: boolean } | null;

/** Roughly the menu's rendered box, used to flip it away from screen edges. */
const MENU_W = 190;
const MENU_H = 264;

export function DesktopContextMenu({
  onRefresh,
  onOpen,
}: {
  onRefresh?: () => void;
  onOpen?: (id: string) => void;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const remove = useRecycleBin((s) => s.remove);
  const restore = useRecycleBin((s) => s.restore);

  const close = useCallback(() => setAt(null), []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      // Only inside the simulated screen; anything outside it isn't "desktop".
      const screen = document.querySelector(".win7");
      if (!screen?.contains(e.target as Node)) return;

      e.preventDefault();

      const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
      setTarget(
        hit
          ? { id: hit.dataset.nodeId!, inBin: hit.dataset.inBin === "true" }
          : null,
      );

      // Windows opens the menu at the cursor, and flips it back inside when
      // there isn't room to the right or below.
      const box = screen.getBoundingClientRect();
      const x = e.clientX + MENU_W > box.right ? e.clientX - MENU_W : e.clientX;
      const y = e.clientY + MENU_H > box.bottom ? e.clientY - MENU_H : e.clientY;
      setAt({ x: Math.max(0, x), y: Math.max(0, y) });
    };

    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [at, close]);

  if (!at) return null;

  const entries = target
    ? itemEntries(target.inBin, !!node(target.id)?.deletable)
    : DESKTOP_ENTRIES;

  const run = (action?: "refresh" | "delete" | "restore" | "open") => {
    if (!action) return;
    if (action === "refresh") onRefresh?.();
    if (action === "open" && target) onOpen?.(target.id);
    if (action === "delete" && target) remove(target.id);
    if (action === "restore" && target) restore(target.id);
  };

  return (
    <div className="ctx-menu" ref={menuRef} role="menu" style={{ left: at.x, top: at.y }}>
      {entries.map((entry, i) =>
        entry.kind === "sep" ? (
          <div key={`sep-${i}`} className="ctx-sep" role="separator" />
        ) : (
          <button
            key={entry.label}
            type="button"
            role="menuitem"
            className="ctx-item"
            data-disabled={entry.disabled || undefined}
            disabled={entry.disabled}
            onClick={() => {
              run(entry.action);
              close();
            }}
          >
            <span className="ctx-label">{entry.label}</span>
            {entry.submenu && <span className="ctx-arrow" aria-hidden="true" />}
          </button>
        ),
      )}
    </div>
  );
}
