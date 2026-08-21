import { JetBrains_Mono, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";

/**
 * Type for the Unitwise landing page rendered inside this window. Scoped
 * here rather than added to app/layout.tsx — the rest of the OS stays on
 * Segoe UI (see globals.css), this is the one window that isn't the OS.
 */
export const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "600", "700", "900"],
  display: "swap",
  variable: "--font-uw-serif",
});

export const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-uw-sans",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-uw-mono",
});
