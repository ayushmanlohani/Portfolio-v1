"use client";

import { useDisplayScale } from "@/store/displayScale";

/**
 * The beige CRT the whole site lives inside. Children render into the glass;
 * this component owns nothing but the plastic.
 *
 * The monitor fills the viewport, so the glass takes the viewer's own screen
 * shape — no fixed aspect ratio, no stand, nothing to gap or clip. See the
 * --bezel / --chin / --px notes in globals.css.
 *
 * `data-frame="off"` strips the plastic entirely — Windows edge to edge.
 * Switch it to "on" to bring the bezel and chin back.
 *
 * `--os-px` is overridden here from the DPI scaling picked in Screen
 * Resolution — the one real, visible effect its Apply button has.
 */
export function Monitor({ children }: { children: React.ReactNode }) {
  const scale = useDisplayScale((s) => s.scale);
  return (
    <div className="crt" data-frame="off" style={{ "--os-px": `${scale}px` } as React.CSSProperties}>
      <div className="crt-body">
        <div className="crt-screen">
          {children}
          <div className="crt-glass" />
          {/* Driven by the brightness slider in the battery flyout. It sits
              above everything, taskbar included, the way real dimming does. */}
          <div className="crt-dim" />
        </div>

        <div className="crt-chin">
          <div className="crt-brand">MULTISYNC</div>
          <div className="crt-controls">
            <div className="crt-button" />
            <div className="crt-button" />
            <div className="crt-button" />
            <div className="crt-led" />
          </div>
        </div>
      </div>
    </div>
  );
}
