/**
 * True when the thing pointing at the screen is a finger.
 *
 * The landing pages tilt on `onMouseMove` and trail a cursor effect behind
 * the pointer. Neither does anything on touch, so both are skipped rather
 * than left attached — one test, read wherever a mouse-only effect is set up,
 * instead of a `mobile` prop threaded down from the shell (the desktop shell
 * can be opened on a touchscreen laptop too).
 *
 * Both shells are client-only, so `window` is always there by the time this
 * is read; the guard is for safety, not for a real server render.
 */
export const coarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
