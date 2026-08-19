"use client";

import { useEffect, useState } from "react";

type Reading = { label: string; value: string; flag?: boolean };

/**
 * Diagnostic overlay, off unless the URL has `?debug`.
 *
 * Reports the numbers that decide how the monitor is laid out, measured from
 * the real elements rather than recomputed from the CSS — so it can be trusted
 * to settle "is it actually doing what I think" without reading any code.
 * These labels intentionally match the readouts in the Lavish size tuner, so
 * the two can be compared line for line.
 */
export function DebugOverlay() {
  const [readings, setReadings] = useState<Reading[] | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;

    const read = () => {
      const crt = document.querySelector(".crt");
      const glass = document.querySelector(".crt-screen");
      const bar = document.querySelector(".taskbar");

      if (!crt || !glass) {
        setReadings([{ label: "monitor", value: "not found" }]);
        return;
      }

      const styles = getComputedStyle(crt);
      const g = glass.getBoundingClientRect();
      const t = bar?.getBoundingClientRect();
      const dpr = Math.round(devicePixelRatio * 100) / 100;

      setReadings([
        { label: "window", value: `${innerWidth} x ${innerHeight} css px` },
        { label: "shape", value: `${(innerWidth / innerHeight).toFixed(3)}:1` },
        {
          label: "pixel ratio",
          // Browsers report values like 0.99999996 at 100%, so compare with a
          // tolerance rather than testing for exactly 1.
          value: `${dpr}${Math.abs(dpr - 1) < 0.02 ? "  (no scaling)" : "  <-- zoom or display scaling is ON"}`,
          flag: Math.abs(dpr - 1) >= 0.02,
        },
        {
          label: "desktop",
          value: `${Math.round(g.width)} x ${Math.round(g.height)}  (${(g.width / g.height).toFixed(3)}:1)`,
        },
        {
          label: "bezel / chin",
          value: `${styles.getPropertyValue("--bezel").trim()} / ${styles.getPropertyValue("--chin").trim()}`,
        },
        {
          label: "taskbar",
          value: t ? `${Math.round(t.height)} px` : "none",
        },
      ]);
    };

    read();
    addEventListener("resize", read);
    return () => removeEventListener("resize", read);
  }, []);

  if (!readings) return null;

  return (
    <>
      {/* True centre of the window. */}
      <div className="pointer-events-none fixed inset-0 z-[600]">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-red-500/70" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-red-500/70" />
      </div>

      <div className="pointer-events-none fixed left-1/2 top-4 z-[601] -translate-x-1/2 rounded-lg bg-black/85 px-3.5 py-2.5 font-mono text-[11px] leading-[1.7] text-white">
        {readings.map((r) => (
          <div key={r.label}>
            <span className="inline-block w-28 text-white/50">{r.label}</span>
            <span className={r.flag ? "text-amber-300" : undefined}>{r.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
