"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CHROME_ID, PROGRAMS } from "@/components/win7/apps";
import { DESKTOP_FOLDERS, node } from "@/components/win7/fs";
import { StartOrbFace } from "@/components/win7/StartOrbFace";
import { WallpaperBg } from "@/components/win7/WallpaperBg";
import { Clock } from "@/components/mobile/Clock";
import { Screen } from "@/components/mobile/Screen";

import "./mobile.css";

/**
 * The phone shell.
 *
 * The wallpaper and every icon come from the same places the desktop reads —
 * `WallpaperBg`, the file tree, and PROGRAMS in apps.ts — so adding a folder in
 * content/ or a program in apps.ts puts it on the phone without anything here
 * changing.
 *
 * Two home pages, swiped between the way a phone's are: the clock and what
 * works on a touch screen, then what doesn't. The second page is not a dead
 * end — every icon on it opens and says why it needs a computer.
 *
 * Navigation is a stack of node ids, kept in lockstep with browser history so
 * that the phone's own Back button walks back through folders instead of
 * leaving the site. Nothing persists, icon order included — a reload puts the
 * home screen back the way every other visitor finds it.
 */

/** Page one: the six desktop folders, then the browser. */
const WORKS = [...DESKTOP_FOLDERS, CHROME_ID];

/** Page two: every other program. They open to explain themselves. */
const DESKTOP_ONLY = PROGRAMS.filter((p) => p.id !== CHROME_ID).map((p) => p.id);

/** How long a finger has to rest on an icon before the grid starts to jiggle. */
const LONG_PRESS_MS = 400;

/** How far a finger may wander in that time and still count as holding still. */
const SLOP_PX = 10;

/**
 * An icon's picture and name. Most come from the file tree; the programs that
 * are only ever windows — Calculator, Command Prompt — come from PROGRAMS.
 * Chrome is in both and the tree wins, which is the same icon either way.
 */
function meta(id: string) {
  const item = node(id);
  if (item) return { Icon: item.Icon, label: item.label };
  const app = PROGRAMS.find((p) => p.id === id)!;
  return { Icon: app.Icon, label: app.label };
}

export function Phone() {
  const [stack, setStack] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState<string[][]>([WORKS, DESKTOP_ONLY]);
  const [edit, setEdit] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const pressTimer = useRef<number | null>(null);
  /** What is being carried, read by a listener registered once — hence a ref. */
  const drag = useRef<{ id: string; page: number } | null>(null);
  /** Where the finger went down, to tell a hold from the start of a swipe. */
  const origin = useRef<{ x: number; y: number } | null>(null);

  /**
   * History is the source of truth for how deep we are, and the stack follows
   * it. Opening a screen pushes an entry; closing one — the ✕, the orb, or the
   * phone's own Back button — is always a history move, and this listener is
   * the single place the stack shrinks.
   */
  useEffect(() => {
    // The entry we start on has to mean "home". A reload restores whatever
    // state that entry was last given, so without this the depth we came back
    // to was still counted and Back stopped one screen short of the desktop.
    // Next keeps its own router state on the same entry — spread, don't replace.
    window.history.replaceState({ ...window.history.state, d: 0 }, "");

    const onPop = (e: PopStateEvent) => {
      const depth = (e.state as { d?: number } | null)?.d ?? 0;
      setStack((s) => s.slice(0, depth));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Pushing history inside the state updater looked tidier and was wrong:
  // React runs updaters twice in development, so every open pushed two
  // entries and Back had to be pressed twice to close one screen.
  const open = useCallback(
    (id: string) => {
      window.history.pushState({ ...window.history.state, d: stack.length + 1 }, "");
      setStack([...stack, id]);
    },
    [stack],
  );

  const back = useCallback(() => window.history.back(), []);
  const home = useCallback(() => window.history.go(-stack.length), [stack.length]);

  const cancelPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  /** Put whatever is being carried into the slot under (x, y). */
  const moveOver = useCallback((x: number, y: number) => {
    const held = drag.current;
    if (!held) return;

    // Touch captures the pointer to the icon it started on, so the icon under
    // the finger has to be asked for rather than read off the event's target.
    const over = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>(".ph-icon")?.dataset.id;
    if (!over || over === held.id) return;

    setPages((all) =>
      all.map((ids, i) => {
        if (i !== held.page) return ids;
        const from = ids.indexOf(held.id);
        const to = ids.indexOf(over);
        if (from < 0 || to < 0) return ids;
        const next = [...ids];
        next.splice(from, 1);
        next.splice(to, 0, held.id);
        return next;
      }),
    );
  }, []);

  const endDrag = useCallback(() => {
    cancelPress();
    origin.current = null;
    drag.current = null;
    setDragging(null);
  }, [cancelPress]);

  /**
   * Dragging an icon, on a real finger.
   *
   * Two things here are deliberate and both were learned the hard way.
   *
   * It is a raw non-passive `touchmove` rather than React's `onPointerMove`,
   * because a phone decides at *touch start* whether a gesture may scroll.
   * `preventDefault()` on the first move after the hold takes the gesture back
   * from the pager — it works because the hold only fires if the finger stayed
   * put, so no scroll has begun yet to be too late for.
   *
   * And it never changes `touch-action` while a finger is down. Doing that
   * made Chrome cancel the whole touch sequence the instant the grid started
   * jiggling, which is why the icon lifted and then refused to move.
   *
   * It listens on the document, not the pager, so a finger that wanders off
   * the grid keeps dragging instead of silently dropping.
   */
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      if (drag.current) {
        // A move Chrome has already committed to scrolling can't be cancelled.
        // Move the icon anyway — a page that slides a little is worse than an
        // icon that is stuck.
        if (e.cancelable) e.preventDefault();
        moveOver(touch.clientX, touch.clientY);
        return;
      }

      // Still waiting on the hold: a finger that wandered is a swipe.
      const from = origin.current;
      if (from && Math.hypot(touch.clientX - from.x, touch.clientY - from.y) > SLOP_PX) {
        cancelPress();
      }
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", endDrag);
    document.addEventListener("touchcancel", endDrag);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", endDrag);
      document.removeEventListener("touchcancel", endDrag);
    };
  }, [moveOver, cancelPress, endDrag]);

  const onIconDown = (e: React.PointerEvent, id: string, pageIndex: number) => {
    origin.current = { x: e.clientX, y: e.clientY };

    // Already jiggling: this press picks the icon straight up.
    if (edit) {
      drag.current = { id, page: pageIndex };
      setDragging(id);
      return;
    }

    cancelPress();
    // The hold both turns the mode on and picks the icon up, so the same
    // finger carries straight on into the drag rather than having to lift.
    pressTimer.current = window.setTimeout(() => {
      setEdit(true);
      drag.current = { id, page: pageIndex };
      setDragging(id);
    }, LONG_PRESS_MS);
  };

  /** The mouse path. Touch is handled by the listener above. */
  const onGridPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (drag.current) moveOver(e.clientX, e.clientY);
    else cancelPress();
  };

  const top = stack[stack.length - 1];

  return (
    <div className="phone">
      <WallpaperBg />

      <div
        className="ph-pager"
        data-edit={edit || undefined}
        onScroll={(e) => {
          const el = e.currentTarget;
          // Fires on every frame of a swipe. React bails out of a re-render
          // when the value is unchanged, so the grid and the pager are only
          // rebuilt on the frame the page actually flips.
          const next = Math.round(el.scrollLeft / el.clientWidth);
          setPage((p) => (p === next ? p : next));
        }}
      >
        {pages.map((ids, pageIndex) => (
          <div key={pageIndex} className="ph-page">
            {/* The clock belongs to the first page, and slides away with it. */}
            {pageIndex === 0 && <Clock />}

            <div
              className="ph-page-grid"
              onPointerMove={onGridPointerMove}
              onPointerUp={endDrag}
            >
              {ids.map((id) => {
                const { Icon, label } = meta(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="ph-icon"
                    data-id={id}
                    data-drag={dragging === id || undefined}
                    onPointerDown={(e) => onIconDown(e, id, pageIndex)}
                    onClick={() => {
                      if (!edit) open(id);
                    }}
                  >
                    <span className="ph-tile">
                      <Icon className="ph-icon-img" />
                    </span>
                    <span className="ph-icon-label">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Which page you're on, and that there is another one. */}
      <div className="ph-dots" aria-hidden="true">
        {pages.map((_, i) => (
          <span key={i} data-on={page === i || undefined} />
        ))}
      </div>

      {top && <Screen id={top} onOpen={open} onBack={back} />}

      {/* The orb goes home from anywhere. While the grid is being rearranged it
          becomes the way out of that instead — one button, whichever job is in
          front of you. */}
      <nav className="ph-bar">
        {edit ? (
          <button type="button" className="ph-done" onClick={() => setEdit(false)}>
            Done
          </button>
        ) : (
          <button
            type="button"
            className="start-orb ph-orb"
            onClick={home}
            aria-label="Home"
            disabled={stack.length === 0}
          >
            <StartOrbFace />
          </button>
        )}
      </nav>
    </div>
  );
}
