"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

/**
 * Which shell a visitor gets.
 *
 * Both sides are `ssr: false`, so the server renders neither and a phone
 * never downloads the desktop's chunk (react-rnd, the games, the media
 * players) nor a desktop the phone's. The first paint is deliberately empty:
 * `getServerSnapshot` returns null so nothing is chosen until the client can
 * actually measure the window, which is the only place the answer exists.
 *
 * The two shells share content/, components/win7/fs.ts and the folder
 * components. Only the arrangement differs.
 */

const PHONE = "(max-width: 767px)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const Desktop = dynamic(() => import("./BootSequence").then((m) => m.BootSequence), {
  ssr: false,
});

const Phone = dynamic(() => import("./mobile/Phone").then((m) => m.Phone), {
  ssr: false,
});

export function Shell() {
  const phone = useSyncExternalStore<boolean | null>(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => null,
  );

  if (phone === null) return null;
  return phone ? <Phone /> : <Desktop />;
}
