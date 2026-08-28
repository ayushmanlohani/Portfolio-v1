"use client";

import { useCallback, useRef, useState } from "react";

import { DesktopContextMenu } from "@/components/win7/ContextMenu";
import { DesktopIcons } from "@/components/win7/DesktopIcons";

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

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRedrawing(true);
    timer.current = setTimeout(() => setRedrawing(false), 200);
  }, []);

  return (
    <div className={redrawing ? "desktop-redraw" : undefined}>
      <DesktopIcons />
      <DesktopContextMenu onRefresh={refresh} />
    </div>
  );
}
