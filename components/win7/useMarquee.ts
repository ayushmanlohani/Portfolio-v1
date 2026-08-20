"use client";

import { useState } from "react";

export type Band = { x0: number; y0: number; x1: number; y1: number; left: number; top: number };

/**
 * The rubber-band marquee: press on bare space inside a container and drag,
 * and every element matching `itemSelector` the band overlaps gets selected,
 * live as the drag moves. The desktop and every Explorer window's file grid
 * share this exact behaviour, so it lives here once rather than twice.
 *
 * Scoped to `containerRef`'s own subtree rather than `document` — with
 * several Explorer windows open at once, a global query would pick up tiles
 * in windows that never saw the drag.
 *
 * Coordinates stay in client space so the hit test can compare directly
 * against each item's own bounding box.
 */
export function useMarquee(
  containerRef: React.RefObject<HTMLElement | null>,
  itemSelector: string,
  selected: string[],
  setSelected: (ids: string[] | ((prev: string[]) => string[])) => void,
) {
  const [band, setBand] = useState<Band | null>(null);

  const startBand = (e: React.PointerEvent<HTMLElement>) => {
    // Only a press on the container itself starts a band — a press that
    // bubbled up from an item inside it means "pick this up", not "drag a
    // selection", and the item's own handler is what should run.
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const root = containerRef.current;
    if (!root) return;

    if (!e.ctrlKey && !e.metaKey) setSelected([]);
    const start = { x: e.clientX, y: e.clientY };
    const keep = e.ctrlKey || e.metaKey ? selected : [];
    const origin = root.getBoundingClientRect();
    setBand({ x0: start.x, y0: start.y, x1: start.x, y1: start.y, left: origin.left, top: origin.top });

    const move = (ev: PointerEvent) => {
      // No button still down means the release happened somewhere this page
      // never heard about. Without this the band stays painted forever.
      if (ev.buttons === 0) {
        up();
        return;
      }

      const box = {
        left: Math.min(start.x, ev.clientX),
        right: Math.max(start.x, ev.clientX),
        top: Math.min(start.y, ev.clientY),
        bottom: Math.max(start.y, ev.clientY),
      };
      setBand({ x0: start.x, y0: start.y, x1: ev.clientX, y1: ev.clientY, left: origin.left, top: origin.top });

      const hit = [...root.querySelectorAll<HTMLElement>(itemSelector)]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
        })
        .map((el) => el.dataset.nodeId!)
        .filter(Boolean);

      setSelected([...new Set([...keep, ...hit])]);
    };

    const up = () => {
      setBand(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    // pointercancel fires when the browser takes the gesture over; blur covers
    // releasing the button after tabbing or dragging out of the window.
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };

  return { band, startBand };
}
