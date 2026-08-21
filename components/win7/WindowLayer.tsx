"use client";

import { Calculator } from "@/components/win7/Calculator";
import { useDesk } from "@/components/win7/desk";
import { Explorer } from "@/components/win7/Explorer";
import { node } from "@/components/win7/fs";
import { MediaPlayer } from "@/components/win7/MediaPlayer";
import { Notepad } from "@/components/win7/Notepad";
import { PdfViewer } from "@/components/win7/PdfViewer";
import { PhotoViewer } from "@/components/win7/PhotoViewer";
import { Terminal } from "@/components/win7/Terminal";
import {
  CALC_ID,
  mediaSrc,
  NOTEPAD_ID,
  PDF_ID,
  PDF_PREFIX,
  PHOTOS_PREFIX,
  TERMINAL_ID,
  WMP_ID,
} from "@/components/win7/apps";
import { Win7Window } from "@/components/win7/Win7Window";
import { useWindowStore, type OpenWindow } from "@/store/windows";

/**
 * Renders every open window. Sits between the desktop icons and the taskbar,
 * so windows cover the icons but never the taskbar — same order as Windows.
 *
 * Every folder opens the same Explorer chrome; what distinguishes them is
 * their contents. The apps are the exceptions, picked out by id — plus saved
 * text files, which are picked out by their node's kind so that every file
 * Notepad ever writes opens in Notepad without being listed here.
 */

/** What fills a window, decided by its id. */
function contentFor(win: OpenWindow) {
  const { id } = win;
  if (id === TERMINAL_ID) return <Terminal />;
  if (id === CALC_ID) return <Calculator />;
  if (id === NOTEPAD_ID) return <Notepad windowId={id} />;
  if (id === WMP_ID) return <MediaPlayer />;
  if (id === PDF_ID) return <PdfViewer />;
  if (id.startsWith(PHOTOS_PREFIX)) return <PhotoViewer windowId={id} src={mediaSrc(id)} />;
  if (id.startsWith(PDF_PREFIX)) return <PdfViewer src={mediaSrc(id)} />;
  if (node(id)?.kind === "file") return <Notepad windowId={id} fileId={id} />;
  return <Explorer id={id} title={win.title} />;
}
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
          {contentFor(win)}
        </Win7Window>
      ))}
    </div>
  );
}
