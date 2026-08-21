"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFPageProxy } from "pdfjs-dist";

import { fileName } from "@/components/win7/media";

/**
 * A PDF reader, and only a reader.
 *
 * pdf.js draws every page to its own canvas and they stack in one scrolling
 * column, so a document reads top to bottom the way a document should — no
 * page-at-a-time flipping, no plugin viewer, no handing the file to the
 * downloads folder. Chrome's own viewer would have been one <iframe>, but it
 * brings its own grey toolbar and its own idea of what a window looks like,
 * which is exactly the thing this desktop is trying not to be.
 *
 * The toolbar is deliberately short: page, zoom, download. Editing tools were
 * not asked for and would be the wrong instinct here — nothing about a resume
 * wants annotating.
 *
 * The worker is copied into public/ rather than bundled, so it stays a plain
 * static file regardless of what the bundler does with ESM workers. If
 * pdfjs-dist is ever upgraded, re-copy it:
 *   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
 */

const WORKER = "/pdf.worker.min.mjs";

/** Zoom stops, in the order the +/- buttons walk them. */
const STOPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** One page, drawn at whatever scale the toolbar is currently asking for. */
function Page({ page, scale, label }: { page: PDFPageProxy; scale: number; label: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;

    const viewport = page.getViewport({ scale });
    // Draw at device resolution and let CSS size it down, or the text is soft
    // on a high-DPI screen — Ayushman's runs at about 1.22.
    const ratio = window.devicePixelRatio || 1;
    el.width = Math.floor(viewport.width * ratio);
    el.height = Math.floor(viewport.height * ratio);
    el.style.width = `${Math.floor(viewport.width)}px`;
    el.style.height = `${Math.floor(viewport.height)}px`;

    const context = el.getContext("2d");
    if (!context) return;

    const task = page.render({
      canvas: el,
      canvasContext: context,
      viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
    });

    // Cancelling is the normal path, not an error: every zoom change replaces
    // a render that may still be running. Anything else is worth surfacing.
    task.promise.catch((err: unknown) => {
      if ((err as { name?: string })?.name !== "RenderingCancelledException") {
        console.error("PDF page failed to render", err);
      }
    });

    return () => task.cancel();
  }, [page, scale]);

  return (
    <div className="pdf-page" data-page={label}>
      <canvas ref={canvas} aria-label={`Page ${label}`} />
    </div>
  );
}

export function PdfViewer({ src }: { src: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    // Closing the window has to tear the worker down with it, and it is the
    // loading task — not the document — that owns the worker.
    let task: PDFDocumentLoadingTask | null = null;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER;

        task = pdfjs.getDocument({ url: src });
        const doc = await task.promise;
        if (cancelled) return;

        const all = await Promise.all(
          Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)),
        );
        if (!cancelled) setPages(all);
      } catch (err) {
        console.error("PDF failed to open", err);
        if (!cancelled) setError("This document could not be opened.");
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy().catch(() => {});
    };
  }, [src]);

  /** Fit width: the page fills the frame minus its margins, and follows a
   *  window resize, which is what makes the default feel like a reader. */
  const measure = useCallback(() => {
    const el = scroller.current;
    const first = pages[0];
    if (!el || !first) return;
    const room = el.clientWidth - 48;
    setScale(Math.max(0.2, room / first.getViewport({ scale: 1 }).width));
  }, [pages]);

  useEffect(() => {
    if (!fitWidth) return;
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWidth, measure]);

  /** Which page the reader is looking at: the one crossing the frame's top. */
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const marks = Array.from(el.querySelectorAll<HTMLElement>(".pdf-page"));
    const top = el.scrollTop + 40;
    const at = marks.findIndex((m) => m.offsetTop + m.offsetHeight > top);
    setPage(at < 0 ? marks.length : at + 1);
  };

  const scrollToPage = (n: number) => {
    const el = scroller.current;
    if (!el || pages.length === 0) return;
    const target = Math.min(Math.max(1, n), pages.length);
    const mark = el.querySelectorAll<HTMLElement>(".pdf-page")[target - 1];
    if (mark) el.scrollTo({ top: mark.offsetTop - 16, behavior: "smooth" });
    setPage(target);
  };

  const stepZoom = (delta: 1 | -1) => {
    setFitWidth(false);
    setScale((s) => {
      const next =
        delta === 1 ? STOPS.find((v) => v > s + 0.01) : [...STOPS].reverse().find((v) => v < s - 0.01);
      return next ?? s;
    });
  };

  return (
    <div className="pdf">
      <div className="pdf-bar">
        <div className="pdf-group">
          <button
            type="button"
            className="pdf-btn"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => scrollToPage(page - 1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 10.5 8 6l4 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <label className="pdf-page-field">
            <input
              type="number"
              min={1}
              max={Math.max(1, pages.length)}
              value={page}
              aria-label="Page number"
              onChange={(e) => scrollToPage(Number(e.target.value))}
            />
            <span>of {pages.length || "—"}</span>
          </label>

          <button
            type="button"
            className="pdf-btn"
            aria-label="Next page"
            disabled={page >= pages.length}
            onClick={() => scrollToPage(page + 1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6 8 10.5 12 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="pdf-title">{fileName(src)}</div>

        <div className="pdf-group">
          <button type="button" className="pdf-btn" aria-label="Zoom out" onClick={() => stepZoom(-1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 8h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            className="pdf-zoom"
            aria-label="Fit to width"
            aria-pressed={fitWidth}
            onClick={() => setFitWidth(true)}
          >
            {Math.round(scale * 100)}%
          </button>

          <button type="button" className="pdf-btn" aria-label="Zoom in" onClick={() => stepZoom(1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 4v8M4 8h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <a className="pdf-btn pdf-download" href={src} download aria-label="Download">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2.5v7m0 0L5 6.8M8 9.5l3-2.7M3.5 12.5h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      <div className="pdf-scroll" ref={scroller} onScroll={onScroll}>
        {error && (
          <p className="pdf-status">
            {error}
            {/* A download manager extension can swallow a .pdf request before
                the page ever sees it, so the dead end gets an exit. */}
            <a href={src} download>
              Download it instead
            </a>
          </p>
        )}
        {!error && pages.length === 0 && <p className="pdf-status">Opening {fileName(src)}…</p>}
        {pages.map((p, i) => (
          <Page key={p.pageNumber} page={p} scale={scale} label={i + 1} />
        ))}
      </div>
    </div>
  );
}
