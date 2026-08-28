/**
 * Toolbar glyphs for the Chrome mock, drawn the way Chrome drew them in
 * 2011: small solid grey shapes, not the thin Material strokes Chrome
 * switched to years later. Nothing here is a brand asset — it's cosmetic,
 * same as the rest of this window.
 */

type IconProps = { className?: string };

const BASE = { viewBox: "0 0 16 16", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true } as const;

/** Back: the fat filled arrow with a flat tail old Chrome used. */
export function BackIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M7.6 2.6 2.2 8l5.4 5.4v-3.1h2.9a3.3 3.3 0 0 1 3.3 3.3V11a4.6 4.6 0 0 0-4.6-4.6H7.6z" />
    </svg>
  );
}

export function ForwardIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M8.4 2.6 13.8 8l-5.4 5.4v-3.1H5.5a3.3 3.3 0 0 0-3.3 3.3V11a4.6 4.6 0 0 1 4.6-4.6h1.6z" />
    </svg>
  );
}

/** Reload: a thick circular arrow, open at the top right. */
export function ReloadIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M8 2.2a5.8 5.8 0 1 0 5.6 7.3h-2a3.9 3.9 0 1 1-.7-3.8L9 7.6h5V2.6l-1.6 1.6A5.77 5.77 0 0 0 8 2.2z" />
    </svg>
  );
}

/** Stop: the X that replaces reload while a page loads. */
export function StopIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M4.2 2.9 8 6.7l3.8-3.8 1.3 1.3L9.3 8l3.8 3.8-1.3 1.3L8 9.3l-3.8 3.8-1.3-1.3L6.7 8 2.9 4.2z" />
    </svg>
  );
}

/** The omnibox star, hollow until a page is bookmarked. */
export function StarIcon({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg {...BASE} className={className}>
      <path
        d="M8 1.9 9.9 5.7l4.2.6-3 3 .7 4.2L8 11.5l-3.8 2 .7-4.2-3-3 4.2-.6z"
        fill={filled ? "#f2c231" : "none"}
        stroke={filled ? "#c99a1e" : "currentColor"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The wrench — Chrome's only menu button in 2011, before the three dots. */
export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M10.6 1.5a4.3 4.3 0 0 0-3.9 6.1L1.9 12.4a1.4 1.4 0 0 0 0 2l.7.7a1.4 1.4 0 0 0 2 0l4.8-4.8a4.3 4.3 0 0 0 5.3-5.6l-2.3 2.3-2-.5-.5-2z" />
    </svg>
  );
}

/** Padlock for an https page — Chrome tinted it gold, not green. */
export function LockIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M5.2 7V5.4a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="#a98322" strokeWidth="1.5" />
      <rect x="3.6" y="6.9" width="8.8" height="6.6" rx="1" fill="#f5cd5a" stroke="#a98322" strokeWidth="1" />
      <circle cx="8" cy="10.2" r="1.2" fill="#7d6017" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M4.6 3.8 8 7.2l3.4-3.4.8.8L8.8 8l3.4 3.4-.8.8L8 8.8l-3.4 3.4-.8-.8L7.2 8 3.8 4.6z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="currentColor">
      <path d="M7.2 3.4h1.6v3.8h3.8v1.6H8.8v3.8H7.2V8.8H3.4V7.2h3.8z" />
    </svg>
  );
}

/** The magnifier in the new tab page's search box. */
export function SearchGlassIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="7" r="4.6" />
      <path d="m10.4 10.4 3.4 3.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The Chrome wheel at favicon size. The full-size one lives in
 * components/win7/icons.tsx, where the desktop and taskbar read it from.
 */
export function ChromeMarkIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="8" cy="8" r="7" fill="#dd4b39" />
      <path d="M14.1 4.6A7 7 0 0 1 8 15l3-5.3z" fill="#3aa757" />
      <path d="M8 15A7 7 0 0 1 1.9 4.6L5 9.7z" fill="#f0c020" />
      <circle cx="8" cy="8" r="3.3" fill="#f1f1f1" />
      <circle cx="8" cy="8" r="2.6" fill="#4587ed" />
    </svg>
  );
}
