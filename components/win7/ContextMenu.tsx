"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { node } from "@/components/win7/fs";
import { CloseIcon, PinIcon } from "@/components/win7/icons";
import { useRecycleBin } from "@/store/recycleBin";
import { useWindowStore } from "@/store/windows";

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
 *
 * A **taskbar button** tags itself `data-task-id` and gets the jump-list menu
 * instead: pin or unpin, and close if the window is actually running. It is
 * handled here rather than in a second menu component because two listeners
 * on the same document would both fire and open two menus at once.
 */

type Entry =
  | { kind: "sep" }
  | {
      kind: "item";
      label: string;
      submenu?: boolean;
      disabled?: boolean;
      action?: Action;
      /** Jump-list rows carry an icon; desktop rows don't. */
      icon?: React.ReactNode;
    };

type Action = "refresh" | "delete" | "restore" | "open" | "pin" | "unpin" | "close";

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

/** Right-clicking a taskbar button gives the jump list; Windows drops
 *  "Close window" when there is no window open behind the button. */
const taskEntries = (pinned: boolean, running: boolean): Entry[] => [
  pinned
    ? { kind: "item", label: "Unpin from Taskbar", action: "unpin", icon: <PinIcon className="ctx-icon" /> }
    : { kind: "item", label: "Pin to Taskbar", action: "pin", icon: <PinIcon className="ctx-icon" /> },
  ...(running
    ? ([{ kind: "item", label: "Close window", action: "close", icon: <CloseIcon className="ctx-icon" /> }] as Entry[])
    : []),
];

type Target =
  | { kind: "node"; id: string; inBin: boolean }
  | { kind: "task"; id: string; running: boolean }
  | null;

/** Roughly the menu's rendered box, used to flip it away from screen edges. */
const MENU_W = 190;
const MENU_H = 264;
/** Height of one jump-list row — taller than a desktop row, it carries an icon. */
const TASK_ROW = 30;

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
  const pinned = useWindowStore((s) => s.pinned);
  const pin = useWindowStore((s) => s.pin);
  const unpin = useWindowStore((s) => s.unpin);
  const closeWindow = useWindowStore((s) => s.close);

  const close = useCallback(() => setAt(null), []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      // Only inside the simulated screen; anything outside it isn't "desktop".
      const screen = document.querySelector(".win7");
      if (!screen?.contains(e.target as Node)) return;

      e.preventDefault();

      const el = e.target as HTMLElement;
      const task = el.closest<HTMLElement>("[data-task-id]");
      const hit = task ? null : el.closest<HTMLElement>("[data-node-id]");

      // Read the store directly: this listener is registered once, so a
      // captured `windows` value would be the one from first render forever.
      const running = task
        ? useWindowStore.getState().windows.some((w) => w.id === task.dataset.taskId)
        : false;

      setTarget(
        task
          ? { kind: "task", id: task.dataset.taskId!, running }
          : hit
            ? { kind: "node", id: hit.dataset.nodeId!, inBin: hit.dataset.inBin === "true" }
            : null,
      );

      // Windows opens the menu at the cursor, and flips it back inside when
      // there isn't room to the right or below. The jump list is only ever a
      // row or two, so it gets its own height rather than the desktop menu's
      // — reusing that one would fling it far up the screen.
      const height = task ? (running ? 2 : 1) * TASK_ROW + 8 : MENU_H;
      const box = screen.getBoundingClientRect();
      const x = e.clientX + MENU_W > box.right ? e.clientX - MENU_W : e.clientX;
      const y = e.clientY + height > box.bottom ? e.clientY - height : e.clientY;
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

  const entries =
    target?.kind === "task"
      ? taskEntries(pinned.includes(target.id), target.running)
      : target
        ? itemEntries(target.inBin, !!node(target.id)?.deletable)
        : DESKTOP_ENTRIES;

  const run = (action?: Action) => {
    if (!action) return;
    if (action === "refresh") onRefresh?.();
    if (!target) return;
    if (action === "open") onOpen?.(target.id);
    if (action === "delete") remove(target.id);
    if (action === "restore") restore(target.id);
    if (action === "pin") pin(target.id);
    if (action === "unpin") unpin(target.id);
    if (action === "close") closeWindow(target.id);
  };

  return (
    <div
      className="ctx-menu"
      ref={menuRef}
      role="menu"
      data-jump={target?.kind === "task" || undefined}
      style={{ left: at.x, top: at.y }}
    >
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
            {entry.icon}
            <span className="ctx-label">{entry.label}</span>
            {entry.submenu && <span className="ctx-arrow" aria-hidden="true" />}
          </button>
        ),
      )}
    </div>
  );
}
