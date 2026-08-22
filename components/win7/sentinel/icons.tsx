type IconProps = { className?: string };

/**
 * Icons for the RBI Sentinel page. Drawn here rather than pulled from a
 * library so the whole page shares one stroke weight (1.6 on a 24 grid) —
 * the Unitwise page's icons.tsx does the same for its own window.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * The Sentinel mark: the dial from the dashboard, reduced to two arcs and a
 * needle. The page's one recurring shape — it reappears full size as the
 * shock-probability gauge, which is the point of using it as the logo.
 */
export function SentinelMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M4 22a12 12 0 0 1 24 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.28}
      />
      <path
        d="M4 22A12 12 0 0 1 9.5 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path d="M16 22 11 14.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="16" cy="22" r="2.1" fill="currentColor" />
    </svg>
  );
}

/** A stack of pages — the PDF corpus. */
export function CorpusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...S} d="M7 3h7l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path {...S} d="M14 3v4h4" />
      <path {...S} d="M8.5 12h7M8.5 15.5h4.5" />
    </svg>
  );
}

/** A sliding window over a line of tokens. */
export function WindowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...S} d="M3 12h18" />
      <path {...S} d="M3 9v6M21 9v6" />
      <rect {...S} x="7.5" y="6.5" width="9" height="11" rx="1.5" />
      <path {...S} d="M10 10.5h4M10 13.5h2.5" />
    </svg>
  );
}

/** A sentiment scale: a beam with a marker off centre. */
export function ScoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...S} d="M3 15h18" />
      <path {...S} d="M6 12.5v5M12 11v8M18 12.5v5" />
      <path {...S} d="m5 8 5-3 4 2 5-3.5" />
    </svg>
  );
}

/** Two series meeting — the join of text scores to market data. */
export function JoinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...S} cx="9" cy="12" r="5.5" />
      <circle {...S} cx="15" cy="12" r="5.5" />
    </svg>
  );
}

/** A decision tree. */
export function ForestIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...S} cx="12" cy="5" r="2" />
      <circle {...S} cx="6.5" cy="12" r="2" />
      <circle {...S} cx="17.5" cy="12" r="2" />
      <circle {...S} cx="4" cy="19" r="1.8" />
      <circle {...S} cx="10" cy="19" r="1.8" />
      <path {...S} d="M10.7 6.6 7.8 10.4M13.3 6.6l2.9 3.8M5.7 13.9 4.6 17.2M7.4 13.9 9.3 17.2" />
    </svg>
  );
}

/** A volatility spike. */
export function ShockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...S} d="M3 17h3l2.5-3 2.5 8 3-14 2.5 9H21" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...S} d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function GithubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.23c0 4.51 2.87 8.34 6.84 9.69.5.09.68-.22.68-.49l-.01-1.72c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5.01 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.59.69.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}
