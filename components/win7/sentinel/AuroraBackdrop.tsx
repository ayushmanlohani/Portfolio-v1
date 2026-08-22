"use client";

/**
 * The animated backdrop behind the masthead — adapted from Vengeance UI's
 * Aurora Hero (https://www.vengenceui.com/r/aurora-hero.json), the same move
 * CloudShader made for Unitwise: borrow one registry component's atmosphere,
 * drop the parts that duplicate what this page already draws itself.
 *
 * What's kept: the two-layer repeating-gradient stripe stack and its slow
 * drift. What's dropped: the component's own `<h1>` and the fluted-glass
 * backdrop-filter that distorts it — Sentinel already has a masthead with
 * its own title, and layering a second shader-distorted one over it would
 * just fight for the same space.
 *
 * Retinted from the stock blue/fuchsia/teal to this page's own mint, red and
 * green — enough that it reads as this page's aurora rather than a stock
 * one, not so much that it stops looking like the reference. Fixed to the
 * dark variant only (`--stripe-color` matches the page background instead of
 * switching on a `.dark` class): this window has no light mode.
 *
 * The drift is a translated, doubled strip rather than an animated
 * `background-position`, which is the one thing worth explaining twice.
 * Both `--stripes` and `--rainbow` use background-size values that are
 * whole multiples of 100% (300%/200%, 200%/100%), so each is already
 * seamless when tiled at its own box edge — that's what makes two identical
 * copies placed side by side line up with no visible seam. Sliding that
 * pair by exactly one copy's width is then a `transform`, which the
 * compositor can animate by moving an already-painted texture; the original
 * animated `background-position` instead, which forces the browser to
 * repaint those pixels on every single frame. Same drift, one paint instead
 * of sixty a second.
 */
export function AuroraBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`sn-aurora ${className}`} aria-hidden="true">
      <style>{`
        .sn-aurora {
          position: absolute;
          inset: 0;
          overflow: hidden;
          --stripe-color: #0A0E13;
          --bg-filter: blur(8px) opacity(55%) saturate(165%);
          --stripes: repeating-linear-gradient(
            100deg,
            var(--stripe-color) 0%,
            var(--stripe-color) 7%,
            transparent 10%,
            transparent 12%,
            var(--stripe-color) 16%
          );
          --rainbow: repeating-linear-gradient(
            100deg,
            #00e0a4 10%,
            #e5484d 15%,
            #00e0a4 20%,
            #3ce07c 25%,
            #00e0a4 30%
          );
          /* One filter pass over the whole flattened layer, not one each on
             a static base plus an animated overlay — filter is the priciest
             property here, so it only runs once. */
          filter: var(--bg-filter);
        }
        /* Painted once and never touched again: nothing here animates. */
        .sn-aurora-base {
          position: absolute;
          inset: 0;
          background-image: var(--stripes), var(--rainbow);
          background-size: 300%, 200%;
          background-position: 50% 50%, 50% 50%;
        }
        /* Two identical, already-seamless copies in a track twice the
           container's width; translating the track by one copy's width
           loops with no visible join. */
        .sn-aurora-track {
          position: absolute;
          inset: 0;
          width: 200%;
          display: flex;
          mix-blend-mode: difference;
          animation: sn-aurora-drift 60s linear infinite;
          will-change: transform;
        }
        .sn-aurora-track > span {
          flex: 0 0 50%;
          background-image: var(--stripes), var(--rainbow);
          background-size: 200%, 100%;
          background-position: 50% 50%, 50% 50%;
        }
        @keyframes sn-aurora-drift {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sn-aurora-track { animation: none; }
        }
      `}</style>
      <div className="sn-aurora-base" />
      <div className="sn-aurora-track">
        <span />
        <span />
      </div>
    </div>
  );
}
