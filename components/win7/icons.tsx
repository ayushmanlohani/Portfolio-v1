/**
 * Windows 7 style icons, hand-drawn as SVG.
 *
 * These are originals in the Aero visual language — warm gradients, a glossy
 * top highlight, a soft drop shadow — not Microsoft's actual icon files, which
 * are copyrighted and can't be shipped here. They read correctly at the 24-32px
 * the Start menu uses; don't scale them much past that.
 */

type IconProps = { className?: string };

const BASE = {
  viewBox: "0 0 32 32",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
} as const;

/** Classic Win7 manila folder — darker back flap, glossy front face. */
export function FolderIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="fld-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0c265" />
          <stop offset="1" stopColor="#d99f36" />
        </linearGradient>
        <linearGradient id="fld-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#fdd071" />
          <stop offset="0.51" stopColor="#f8c052" />
          <stop offset="1" stopColor="#e9a834" />
        </linearGradient>
      </defs>
      <path
        d="M2 8.5a2 2 0 0 1 2-2h7.6l2.6 3H28a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"
        fill="url(#fld-back)"
      />
      <path
        d="M2 13h28a2 2 0 0 1 2 2l-2.6 10.6a2 2 0 0 1-2 1.4H4.6a2 2 0 0 1-2-1.4L0 15a2 2 0 0 1 2-2z"
        fill="url(#fld-front)"
        transform="translate(1 0)"
      />
      <path
        d="M3 13h28l-.7 3H2.3z"
        fill="#fff"
        opacity="0.35"
      />
    </svg>
  );
}

/** Getting Started — the Windows flag on a pale card. */
export function FlagIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="2" y="3" width="28" height="26" rx="3" fill="#f4f8fc" stroke="#a9bed4" />
      <g transform="translate(6 7)">
        <path d="M0 3.2 L8.6 1.6 L8.6 9.2 L0 9.6 Z" fill="#e8442e" />
        <path d="M10.6 1.2 L20 0 L20 9 L10.6 9.2 Z" fill="#7cb61e" />
        <path d="M0 11.4 L8.6 11 L8.6 18.6 L0 17 Z" fill="#2e8fd8" />
        <path d="M10.6 11 L20 10.8 L20 19.6 L10.6 18.4 Z" fill="#f5a623" />
      </g>
    </svg>
  );
}

/** Calculator — grey body, dark LCD, keypad. */
export function CalculatorIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="calc-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfefe" />
          <stop offset="0.5" stopColor="#dfe6ec" />
          <stop offset="1" stopColor="#b6c2ce" />
        </linearGradient>
      </defs>
      <rect x="5" y="2" width="22" height="28" rx="2.5" fill="url(#calc-b)" stroke="#7f8d9a" />
      <rect x="8" y="5" width="16" height="6" rx="1" fill="#2b3a2f" />
      <rect x="9" y="6" width="14" height="2" fill="#5f8f66" opacity="0.5" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={8 + c * 5.4}
            y={14 + r * 4}
            width="4"
            height="3"
            rx="0.7"
            fill={c === 2 && r > 1 ? "#e88b3a" : "#8fa0b0"}
          />
        )),
      )}
    </svg>
  );
}

/** Notepad — white page, ruled lines, folded corner. */
export function NotepadIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M6 2h13l7 7v21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="#fff" stroke="#8aa0b4" />
      <path d="M19 2l7 7h-7z" fill="#dbe7f2" stroke="#8aa0b4" />
      <g stroke="#8fb4d6" strokeWidth="1.2">
        <path d="M9 14h14M9 18h14M9 22h14M9 26h9" />
      </g>
    </svg>
  );
}

/** Paint — artist's palette with wells of colour. */
export function PaintIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path
        d="M16 3c7.2 0 13 4.7 13 10.5S23.2 22 20 22c-2 0-2.6 1-2.6 2.2 0 1.4 1.1 1.9 1.1 3.1 0 1-.9 1.7-2.5 1.7C8.8 29 3 23.2 3 16S8.8 3 16 3z"
        fill="#e7eef5"
        stroke="#8298ab"
      />
      <circle cx="10" cy="10.5" r="2.2" fill="#e8442e" />
      <circle cx="16.5" cy="8" r="2.2" fill="#f5a623" />
      <circle cx="22.5" cy="11" r="2.2" fill="#7cb61e" />
      <circle cx="9" cy="17.5" r="2.2" fill="#2e8fd8" />
    </svg>
  );
}

/** Snipping Tool — scissors. */
export function ScissorsIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M10 5l13 17M22 5L9 22" stroke="#93a5b6" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8.5" cy="25" r="3.6" fill="#f4f8fc" stroke="#6f8296" strokeWidth="1.6" />
      <circle cx="23.5" cy="25" r="3.6" fill="#f4f8fc" stroke="#6f8296" strokeWidth="1.6" />
    </svg>
  );
}

/** The account picture that sits at the top of the menu's right column. */
export function UserIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="usr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc4e8" />
          <stop offset="1" stopColor="#3d7cb0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="2" fill="url(#usr-bg)" />
      <circle cx="16" cy="12" r="5.4" fill="#fdf6ec" />
      <path d="M5.5 30c1.4-6 5.6-9 10.5-9s9.1 3 10.5 9z" fill="#fdf6ec" />
    </svg>
  );
}

/** Shut down — the power glyph on the menu's bottom-right button. */
export function PowerIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path
        d="M16 4v12"
        stroke="#f2f6fa"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M9 8.5a9.5 9.5 0 1 0 14 0"
        stroke="#f2f6fa"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Explorer ───────────────────────────────────────────────────
   Smaller and flatter than the ones above. Explorer draws its
   navigation pane at 16px, where a gradient and a drop shadow just
   turn into mud — these are shaped to stay readable that small.
   ───────────────────────────────────────────────────────────── */

/** Favorites. */
export function StarIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path
        d="M16 4.5l3.6 7.3 8.1 1.2-5.9 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.9-5.7 8.1-1.2z"
        fill="#ffd24a"
        stroke="#c99612"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Computer — the beige-era tower reduced to a monitor on a stand. */
export function ComputerIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="4" y="6" width="24" height="16" rx="1.6" fill="#cfe0ef" stroke="#5d7f9e" strokeWidth="1.5" />
      <rect x="6" y="8" width="20" height="12" fill="#7fb6dd" />
      <path d="M13 22l-1.5 4h9L19 22z" fill="#b9c9d8" stroke="#5d7f9e" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 26h14" stroke="#5d7f9e" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Local disk. */
export function DriveIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="3" y="7" width="26" height="18" rx="2.4" fill="#e7edf3" stroke="#78909f" strokeWidth="1.5" />
      <path d="M4.2 16h23.6v7.6a1.2 1.2 0 0 1-1.2 1.2H5.4a1.2 1.2 0 0 1-1.2-1.2z" fill="#c3cfda" />
      <path d="M4.2 8.2h23.6v3.4H4.2z" fill="#f6f9fc" />
      <circle cx="24.5" cy="20.5" r="1.9" fill="#7ad07a" stroke="#4f9c4f" strokeWidth="0.9" />
      <path d="M7 12.5h10M7 20.5h11" stroke="#a3b3c1" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Network. */
export function NetworkIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="3" y="18" width="9" height="7" rx="1.2" fill="#cfe0ef" stroke="#5d7f9e" strokeWidth="1.4" />
      <rect x="20" y="18" width="9" height="7" rx="1.2" fill="#cfe0ef" stroke="#5d7f9e" strokeWidth="1.4" />
      <rect x="11.5" y="5" width="9" height="7" rx="1.2" fill="#cfe0ef" stroke="#5d7f9e" strokeWidth="1.4" />
      <path d="M16 12v3M7.5 18v-3h17v3" stroke="#7d94a8" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** The magnifier in the search box. */
export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="14" cy="14" r="7.5" fill="none" stroke="#6d7f90" strokeWidth="2.6" />
      <path d="M19.5 19.5L27 27" stroke="#6d7f90" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Back / forward. `flip` points it the other way. */
export function NavArrowIcon({ className, flip }: IconProps & { flip?: boolean }) {
  return (
    <svg {...BASE} className={className} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path
        d="M19 8l-8 8 8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Command Prompt. Built like the cmd.exe icon — a black console with a title
 * strip across the top — but the strip carries his name rather than a path.
 * At 24px the name is a suggestion of lettering more than readable text, which
 * is exactly how the original's tiny `C:\` behaves too.
 */
export function TerminalIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="2.5" y="5" width="27" height="22" rx="2" fill="#0b0b0b" stroke="#2f3336" strokeWidth="1.4" />
      <path d="M3.2 7a1.3 1.3 0 0 1 1.3-1.3h23a1.3 1.3 0 0 1 1.3 1.3v3.2H3.2z" fill="#c9d4de" />
      {/* `A:\>` rather than the full name. The Start menu draws this at 24px,
          which leaves about 4px per letter — five of them come out as a grey
          smudge no matter how they're set. Four wide characters resolve, and
          a drive prompt is what the real cmd icon carries anyway. The full
          name is on the caption bar, where there is room for it. */}
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontSize="11"
        fontFamily="Consolas, 'Lucida Console', monospace"
        fontWeight="700"
        fill="#eaeaea"
      >
        {"A:\\>"}
      </text>
    </svg>
  );
}

/**
 * Recycle Bin, empty and full.
 *
 * Drawn here rather than downloaded: Windows' own bin icon is Microsoft's
 * artwork and can't ship in someone else's portfolio. Same Aero language as
 * the rest of this file — translucent grey mesh, glossy rim, the arrows on the
 * front. `full` adds paper poking out of the top, which is the whole signal in
 * Windows that something is in there.
 */
export function RecycleBinIcon({ className, full }: IconProps & { full?: boolean }) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="bin-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c3cfd9" />
          <stop offset="0.28" stopColor="#eef3f7" />
          <stop offset="0.62" stopColor="#c9d5df" />
          <stop offset="1" stopColor="#94a5b3" />
        </linearGradient>
        <linearGradient id="bin-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f8fb" />
          <stop offset="1" stopColor="#b3c1cd" />
        </linearGradient>
      </defs>

      {/* Tub, tapering toward the base the way a real bin does. */}
      <path
        d="M7.6 11h16.8l-1.9 16.2a1.8 1.8 0 0 1-1.8 1.6h-9.4a1.8 1.8 0 0 1-1.8-1.6z"
        fill="url(#bin-body)"
        stroke="#7b8c99"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <g stroke="#9fb0bd" strokeWidth="1" opacity="0.85">
        <path d="M13.4 13.6l0.8 12.2M16 13.6v12.2M18.6 13.6l-0.8 12.2" />
      </g>

      {/* The opening. */}
      <ellipse cx="16" cy="11" rx="8.4" ry="2.5" fill="url(#bin-rim)" stroke="#7b8c99" strokeWidth="1.2" />

      {/* Paper. Drawn OVER the rim and carried down past y=11, so its base is
          inside the opening rather than level with it. */}
      {full && (
        <g>
          <path
            d="M9.4 12.8L11.5 2.1l5.4 1.3-2.2 10.4z"
            fill="#fdfdfb"
            stroke="#b9bdb4"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path
            d="M15.4 13.6L19.5 3.3l4.6 2.2-4 10.1z"
            fill="#e9edf3"
            stroke="#b3b9c3"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <g stroke="#c9cdd4" strokeWidth="0.7">
            <path d="M11.6 4.7l3.9 0.9M11.2 6.8l3.9 0.9" />
          </g>
        </g>
      )}

      {/* The near lip of the rim, repainted on top of the paper. This is the
          whole trick: without it the sheets sit in front of the opening and
          the bin reads as having paper stacked BEHIND it rather than in it. */}
      {full && (
        <path
          d="M7.6 11a8.4 2.5 0 0 0 16.8 0z"
          fill="url(#bin-rim)"
          stroke="#7b8c99"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}

      {/* The recycling triangle, simplified to two chasing arrows so it still
          reads at 16px in the navigation pane. */}
      <g fill="#3f9c4a" transform="translate(16 19.6) scale(0.92)">
        <path d="M-3.4 -1.6l2.1-3.4 1.5 0.9-2.1 3.4 1.6 0.2-3.3 1.9-0.9-3.6z" />
        <path d="M3.4 -1.6l-2.1-3.4-1.5 0.9 2.1 3.4-1.6 0.2 3.3 1.9 0.9-3.6z" transform="rotate(120)" />
        <path d="M0 4l0-4-1.7 0 0 4-1.4-0.8 1.7 3.4 3.1-1.7z" transform="rotate(-120)" />
      </g>
    </svg>
  );
}

/** Jump-list pin. Blue enamel head, steel needle, angled the way Windows draws it. */
export function PinIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="pin-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fd0f5" />
          <stop offset="0.45" stopColor="#3f9de0" />
          <stop offset="1" stopColor="#1b6aa8" />
        </linearGradient>
      </defs>
      <path d="M12 20 L5 28" stroke="#8d97a0" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M17.5 4.5a6.2 6.2 0 0 1 8.8 8.8l-3.1 3.1a4 4 0 0 0-1 4l.6 2.2-11.6-11.6 2.2.6a4 4 0 0 0 4-1z"
        fill="url(#pin-head)"
        stroke="#14507f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <ellipse cx="20.5" cy="9" rx="3.4" ry="2.2" fill="#fff" opacity="0.4" transform="rotate(-45 20.5 9)" />
    </svg>
  );
}

/** Close — Windows' red button with a white cross. */
export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="close-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4756a" />
          <stop offset="0.48" stopColor="#dc3b2c" />
          <stop offset="0.52" stopColor="#c62a1c" />
          <stop offset="1" stopColor="#e35848" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="24" height="24" rx="3" fill="url(#close-bg)" stroke="#8f1d12" />
      <path
        d="M11.5 11.5 20.5 20.5M20.5 11.5 11.5 20.5"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A saved .txt on the desktop — a page with a folded corner and ruled lines. */
export function TextFileIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="txt-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6ecf2" />
        </linearGradient>
      </defs>
      <path
        d="M6 2h13l7 7v21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="url(#txt-page)"
        stroke="#8fa3b6"
      />
      <path d="M19 2v7h7" fill="#cfdae5" stroke="#8fa3b6" strokeLinejoin="round" />
      <g stroke="#9fb2c4" strokeLinecap="round">
        <path d="M9 14h14M9 18h14M9 22h14M9 26h9" />
      </g>
    </svg>
  );
}

/** Windows Media Player — the orange-ringed blue orb with a white play arrow. */
export function MediaPlayerIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <radialGradient id="wmp-orb" cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#8fd3ff" />
          <stop offset="0.55" stopColor="#2b8fe0" />
          <stop offset="1" stopColor="#0b4a86" />
        </radialGradient>
        <linearGradient id="wmp-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf6b" />
          <stop offset="0.5" stopColor="#f08a1c" />
          <stop offset="1" stopColor="#c25a06" />
        </linearGradient>
        <linearGradient id="wmp-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#wmp-ring)" />
      <circle cx="16" cy="16" r="11" fill="url(#wmp-orb)" />
      <path d="M13 10.5l9.5 5.5-9.5 5.5z" fill="#ffffff" />
      <path d="M16 3.5c6 0 11 4.2 12.2 9.6C25 9.6 20.8 7.6 16 7.6S7 9.6 3.8 13.1C5 7.7 10 3.5 16 3.5z" fill="url(#wmp-gloss)" />
    </svg>
  );
}

/** Windows Photo Viewer — a framed photo of a hill under a sun. */
export function PhotoViewerIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <defs>
        <linearGradient id="pv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe6ff" />
          <stop offset="1" stopColor="#6fb6e8" />
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="26" height="20" rx="2" fill="#ffffff" stroke="#7e93a6" />
      <rect x="5.5" y="8.5" width="21" height="15" fill="url(#pv-sky)" />
      <circle cx="10.5" cy="13" r="2.6" fill="#ffd964" />
      <path d="M5.5 23.5l6-7 4.5 4.5 4-3.5 6.5 6z" fill="#5c9c4e" />
      <path d="M5.5 8.5h21v4.5c-6-2.6-15-2.6-21 0z" fill="#ffffff" opacity="0.3" />
    </svg>
  );
}

/** A PDF document — the page every resume link opens into. */
export function PdfIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path
        d="M6 2h13l7 7v21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="#ffffff"
        stroke="#8fa3b6"
      />
      <path d="M19 2v7h7" fill="#cfdae5" stroke="#8fa3b6" strokeLinejoin="round" />
      <rect x="4" y="17" width="20" height="9" rx="1.5" fill="#c8362b" />
      <text
        x="14"
        y="24"
        textAnchor="middle"
        fontFamily="Segoe UI, Tahoma, sans-serif"
        fontSize="7"
        fontWeight="700"
        fill="#ffffff"
      >
        PDF
      </text>
    </svg>
  );
}
