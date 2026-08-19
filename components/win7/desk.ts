"use client";

import { useEffect, useState } from "react";

import type { Desk } from "@/store/windows";

/**
 * Size of the desktop — the glass inside the CRT, not the browser viewport.
 * Windows are positioned against this, so the bezel and the chin never end up
 * counted as usable screen.
 */
export function readDesk(): Desk {
  if (typeof document === "undefined") return { w: 1280, h: 800 };
  const box = document.querySelector(".win7")?.getBoundingClientRect();
  return {
    w: box?.width || window.innerWidth,
    h: box?.height || window.innerHeight,
  };
}

/** Live desk size. Maximised windows follow it when the browser is resized. */
export function useDesk(): Desk {
  // Starts at zero rather than a guess: a guessed size would render every
  // window once in the wrong place before the first measurement corrects it.
  const [desk, setDesk] = useState<Desk>({ w: 0, h: 0 });

  useEffect(() => {
    const el = document.querySelector(".win7");
    if (!el) return;
    const update = () => setDesk(readDesk());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return desk;
}
