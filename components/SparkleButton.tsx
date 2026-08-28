"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";

/**
 * The name in the login tagline: a glare sweeps across it and five sparkles
 * pop, on hover.
 *
 * Two custom properties do the whole effect and `motion` is here only to
 * spring them: `--hover` drives the blue drop-shadow's depth and the lift,
 * `--pos` slides the glare gradient across the text. The look itself is CSS
 * (`.sparkle-button` in globals.css) — this component owns the two numbers.
 */

/** The blue glow's spring. Stiff and heavily damped: it arrives, it doesn't wobble. */
const SPRING = { type: "spring", stiffness: 800, damping: 60, mass: 1 } as const;

/** Seconds for the glare to cross once. */
const GLARE_SWEEP = 1 / 4;

const VARIANTS: Variants = {
  rest: {
    "--hover": 0.4,
    "--pos": 0,
    transition: { "--hover": SPRING, "--pos": { duration: 0 } },
  },
  hover: {
    "--hover": 1,
    "--pos": 1,
    transition: { "--hover": SPRING, "--pos": { duration: GLARE_SWEEP, ease: "linear" } },
  },
  tap: { "--hover": 0 },
};

export default function SparkleButton({ text }: { text: string }) {
  return (
    <motion.span
      className="sparkle-button"
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      variants={VARIANTS}
    >
      <Sparkle />
      <Sparkle />
      <Sparkle />
      <Sparkle />
      <Sparkle />

      {/* Twice over: the first copy carries the drop-shadow, the second is
          the glare gradient clipped to the same glyphs on top of it. */}
      <span>{text}</span>
      <span aria-hidden="true">{text}</span>
    </motion.span>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M93.781 51.578C95 50.969 96 49.359 96 48c0-1.375-1-2.969-2.219-3.578 0 0-22.868-1.514-31.781-10.422-8.915-8.91-10.438-31.781-10.438-31.781C50.969 1 49.375 0 48 0s-2.969 1-3.594 2.219c0 0-1.5 22.87-10.406 31.781-8.908 8.913-31.781 10.422-31.781 10.422C1 45.031 0 46.625 0 48c0 1.359 1 2.969 2.219 3.578 0 0 22.873 1.51 31.781 10.422 8.906 8.911 10.406 31.781 10.406 31.781C45.031 95 46.625 96 48 96s2.969-1 3.562-2.219c0 0 1.523-22.871 10.438-31.781 8.913-8.908 31.781-10.422 31.781-10.422Z" />
    </svg>
  );
}
