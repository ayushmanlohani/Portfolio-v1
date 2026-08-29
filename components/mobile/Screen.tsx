"use client";

import { useEffect, useRef } from "react";

import { CHROME_ID, launchWindow, mediaSrc, PDF_PREFIX, PROGRAMS } from "@/components/win7/apps";
import { Chrome } from "@/components/win7/chrome/Chrome";
import { Doc } from "@/components/win7/folders/Doc";
import { pageFor } from "@/components/win7/folders/pageFor";
import { contents, node } from "@/components/win7/fs";
import { NavArrowIcon } from "@/components/win7/icons";
import { SITE_FOR, useChrome } from "@/store/chrome";
import { useWindowStore } from "@/store/windows";

/**
 * One node, full screen.
 *
 * Every branch here reads the same tree and renders the same components the
 * desktop does — `contents()` for a listing, `pageFor()` for a writeup, `Doc`
 * for plain words. Nothing about the content is decided in this file; it only
 * decides the arrangement. That is the whole reason the phone exists as a
 * shell and not as a second site.
 */

/**
 * The only caption button this shell has.
 *
 * Windows would put minimise and maximise beside it, but neither means
 * anything when one screen is the whole screen — so this shuts the screen and
 * shows whatever was under it. The look is the desktop's own close button
 * (.w7-cap-btn / .w7-cap-close in globals.css), only bigger.
 */
function CloseButton({ onClick, float }: { onClick: () => void; float?: boolean }) {
  return (
    <button
      type="button"
      className={`w7-cap-btn w7-cap-close ph-close${float ? " ph-close--float" : ""}`}
      onClick={onClick}
      aria-label="Close"
    >
      <svg viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" fill="none" strokeWidth="1.4" />
      </svg>
    </button>
  );
}

/** Anything that wants a mouse, a keyboard, or a window it can be dragged
 *  around in. Reachable only if a phone icon is ever pointed at one. */
function NotOnPhone({ label }: { label: string }) {
  return (
    <div className="ph-blocked">
      <p className="ph-blocked-title">{label}</p>
      <p>Open this on a computer to use it.</p>
    </div>
  );
}

/**
 * Chrome, full-screen, with its own tab strip.
 *
 * It opens a real window in the store on mount so that closing its last tab
 * — which calls `close(windowId)` — still works, and closes this screen with
 * it. Nothing renders that window; the store is just the bookkeeping Chrome
 * already expects, rather than a mobile-only branch inside Chrome.
 */
function ChromeScreen({ onBack }: { onBack: () => void }) {
  const live = useWindowStore((s) => s.windows.some((w) => w.id === CHROME_ID));
  const wasLive = useRef(false);

  useEffect(() => {
    launchWindow(CHROME_ID);
    return () => useWindowStore.getState().close(CHROME_ID);
  }, []);

  // Only a window that existed and then stopped means "Chrome closed itself".
  // On the very first render it hasn't been opened yet, and treating that as a
  // close sent the screen straight back home.
  useEffect(() => {
    if (live) wasLive.current = true;
    else if (wasLive.current) onBack();
  }, [live, onBack]);

  return (
    <section className="ph-screen ph-screen--bleed">
      <Chrome windowId={CHROME_ID} />
      {/* Chrome has no title bar of its own here, so the button sits where
          Windows would have drawn it: the top-right corner of the tab strip,
          which mobile.css keeps clear for it. Closing the last tab still
          exits too — both paths end up at the same place. */}
      <CloseButton onClick={onBack} float />
    </section>
  );
}

/** A program from apps.ts, for the ids that have no node in the file tree —
 *  Calculator, Command Prompt and the rest only exist as windows. */
const program = (id: string) => PROGRAMS.find((p) => p.id === id);

/** What the title bar reads: the tree first, then the program list. */
function labelOf(id: string) {
  return node(id)?.label ?? program(id)?.label ?? id;
}

function Body({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const here = node(id);

  // Everything on the phone's second home page. They open — they just open
  // onto an explanation, which beats a game that can't be steered.
  const app = program(id);
  if (app && app.id !== CHROME_ID) return <NotOnPhone label={app.label} />;

  // The resume. The phone's own PDF viewer is better than anything drawn
  // here, so it gets handed the file rather than a viewer.
  if (id.startsWith(PDF_PREFIX)) {
    return (
      <div className="ph-blocked">
        <p className="ph-blocked-title">{here?.label ?? "Resume"}</p>
        <a className="ph-open-pdf" href={mediaSrc(id)} target="_blank" rel="noreferrer">
          Open the PDF
        </a>
      </div>
    );
  }

  if (here?.kind === "app") return <NotOnPhone label={here.label} />;

  const rich = pageFor(id);
  if (rich) return <div className="ph-page">{rich}</div>;

  if (here?.body) {
    return (
      <div className="ph-page">
        <Doc title={here.label} body={here.body} size="file" />
      </div>
    );
  }

  const items = contents(id, []);
  if (items.length === 0) return <p className="ph-empty">This folder is empty.</p>;

  return (
    <ul className="ph-list">
      {items.map((childId) => {
        const child = node(childId);
        if (!child) return null;
        return (
          <li key={childId}>
            <button type="button" className="ph-row" onClick={() => onOpen(childId)}>
              <child.Icon className="ph-row-icon" />
              <span className="ph-row-label">{child.label}</span>
              <NavArrowIcon className="ph-row-chevron" flip />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Screen({
  id,
  onOpen,
  onBack,
}: {
  id: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  // A page that lives in the browser opens the browser, exactly as
  // double-clicking it on the desktop does — same map, from store/chrome.ts.
  const site = SITE_FOR[id];
  useEffect(() => {
    if (site) useChrome.getState().visit(site);
  }, [site]);

  if (id === CHROME_ID || site) return <ChromeScreen onBack={onBack} />;

  return (
    <section className="ph-screen">
      <header className="ph-titlebar">
        <h1>{labelOf(id)}</h1>
        <CloseButton onClick={onBack} />
      </header>
      <div className="ph-body">
        <Body id={id} onOpen={onOpen} />
      </div>
    </section>
  );
}
