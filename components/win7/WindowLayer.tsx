"use client";

import { useDesk } from "@/components/win7/desk";
import { Explorer } from "@/components/win7/Explorer";
import { Terminal } from "@/components/win7/Terminal";
import { TERMINAL_ID } from "@/components/win7/apps";
import { Win7Window } from "@/components/win7/Win7Window";
import { useWindowStore } from "@/store/windows";

/**
 * Renders every open window. Sits between the desktop icons and the taskbar,
 * so windows cover the icons but never the taskbar — same order as Windows.
 *
 * Every folder opens the same Explorer chrome; what distinguishes them is
 * their contents, which don't exist yet. The console is the one window that
 * isn't a folder.
 */
export function WindowLayer() {
  const windows = useWindowStore((s) => s.windows);
  const topZ = useWindowStore((s) => s.topZ);
  const desk = useDesk();

  // Nothing renders until the desk has been measured; `bounds="parent"` in
  // react-rnd reads the container on mount, and a zero-size container clamps
  // every window to 0,0.
  if (desk.w === 0) return null;

  return (
    <div className="w7-window-layer">
      {windows.map((win) => (
        <Win7Window
          key={win.id}
          win={win}
          desk={desk}
          focused={win.z === topZ && !win.minimized}
        >
          {win.id === TERMINAL_ID ? <Terminal /> : <Explorer id={win.id} title={win.title} />}
        </Win7Window>
      ))}
    </div>
  );
}
