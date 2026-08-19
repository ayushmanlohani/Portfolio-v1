"use client";

import { useCallback, useRef, useState } from "react";

import { DesktopContextMenu } from "@/components/win7/ContextMenu";
import { readDesk } from "@/components/win7/desk";
import { DesktopIcons } from "@/components/win7/DesktopIcons";
import { node } from "@/components/win7/fs";
import { useWindowStore } from "@/store/windows";

/**
 * The interactive desktop: icons plus the right-click menu.
 *
 * Exists so the menu's Refresh can reach the icons. Refresh repaints them the
 * way Windows redraws the desktop — it does NOT rearrange them, because
 * Windows doesn't either, and silently throwing away someone's layout would be
 * a nasty surprise from a button people press out of habit.
 */
export function DesktopSurface() {
  const [redrawing, setRedrawing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openWindow = useWindowStore((s) => s.open);

  // The menu's Open, for when someone right-clicks a folder rather than
  // double-clicking it.
  const open = useCallback(
    (id: string) => {
      openWindow(id, {
        title: node(id)?.label ?? id,
        width: 900,
        height: 600,
        desk: readDesk(),
      });
    },
    [openWindow],
  );

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRedrawing(true);
    timer.current = setTimeout(() => setRedrawing(false), 200);
  }, []);

  return (
    <div className={redrawing ? "desktop-redraw" : undefined}>
      <DesktopIcons />
      <DesktopContextMenu onRefresh={refresh} onOpen={open} />
    </div>
  );
}
