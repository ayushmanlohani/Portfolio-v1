/**
 * Hand-drawn line icons for the Unitwise landing page, plus three brand
 * marks not already in components/win7/folders/techLogos.ts (that file is
 * the real Unitwise project page's stack — this mockup shows a different,
 * simplified stack, so Next.js/TypeScript/MongoDB are added here instead of
 * editing a file that belongs to another page). Paths are Simple Icons
 * (CC0), same convention as techLogos.ts: fetched once, inlined, currentColor.
 */

type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 13h6M9 16.5h6" />
    </svg>
  );
}

export function BookmarkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M6.5 3.5h11V21l-5.5-3.6L6.5 21Z" />
    </svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5Z" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m19.5 19.5-4.3-4.3" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13 2 4.5 13.5h5.7L11 22l8.5-11.5h-5.7Z" />
    </svg>
  );
}

export function HamburgerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M3.5 12 20 4.5l-4.2 15L11 14l-2.6 2.6-.7-4Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="8.5" r="3.2" />
      <path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 17 17 7M17 7H9M17 7v8" />
    </svg>
  );
}
