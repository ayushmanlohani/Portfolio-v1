"use client";

import { useSyncExternalStore } from "react";

/**
 * The home screen's clock.
 *
 * Its own component on purpose: it changes every second, and if that lived in
 * Phone the whole icon grid and the pager would re-render with it — exactly
 * the kind of thing that makes a swipe feel sticky.
 *
 * The tick is a subscription rather than state set from an effect, so there is
 * no render-then-correct on mount. The snapshot is whole seconds because it has
 * to be stable between renders — `Date.now()` never is.
 */
const subscribe = (onTick: () => void) => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
};

export function Clock() {
  const second = useSyncExternalStore<number | null>(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );

  // The server has no idea what time it is where you are.
  if (second === null) return <div className="ph-clock" aria-hidden="true" />;

  const now = new Date(second * 1000);

  // "4:36 PM" splits into the number and the suffix so the suffix can sit
  // small beside a big time instead of being 68px of "PM". A 24-hour locale
  // has no suffix and simply gets nothing.
  const [time, suffix] = now
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .split(" ");

  return (
    <div className="ph-clock">
      <div className="ph-clock-date">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>
      <div className="ph-clock-time">
        {time}
        {suffix && <span className="ph-clock-suffix">{suffix}</span>}
      </div>
    </div>
  );
}
