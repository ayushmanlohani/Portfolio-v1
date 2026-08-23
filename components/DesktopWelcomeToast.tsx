"use client";

import { useEffect, useRef, useState } from "react";

const VISIBLE_MS = 5000;
const HOVER_LEAVE_MS = 4000;
const EXIT_MS = 350;

export function DesktopWelcomeToast({ onDismiss }: { onDismiss: () => void }) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const close = () => {
    clearTimer();
    setClosing(true);
    setTimeout(onDismiss, EXIT_MS);
  };

  useEffect(() => {
    timerRef.current = setTimeout(close, VISIBLE_MS);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = () => clearTimer();
  const handleMouseLeave = () => {
    clearTimer();
    timerRef.current = setTimeout(close, HOVER_LEAVE_MS);
  };

  return (
    <div
      className={`desktop-toast ${closing ? "desktop-toast-exit" : "desktop-toast-enter"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="desktop-toast-close"
        onClick={close}
        aria-label="Dismiss"
      >
        ×
      </button>
      <h2 className="desktop-toast-heading">Hello stranger!</h2>
      <p className="desktop-toast-body">
        If you&apos;re short on time, just skim the .txt files. Otherwise, go
        through it all; there are plenty of small details worth finding.
      </p>
    </div>
  );
}
