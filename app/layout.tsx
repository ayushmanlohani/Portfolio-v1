import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Libre_Bodoni, Public_Sans } from "next/font/google";

import "./globals.css";

// The OS chrome stays on Segoe UI, which Windows already has — see globals.css.
// These two are only for the About pane, and next/font self-hosts them at build
// time, so nothing is fetched from Google when someone visits and there is no
// layout shift while they load.
const display = Libre_Bodoni({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-display",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-body",
});

// Bebas Neue only ships one weight — used by the login screen's SparkleButton.
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  title: "Ayushman Lohani — Portfolio",
  description: "A portfolio you browse like a desktop.",
};

export const viewport: Viewport = {
  themeColor: "#0e0f11",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${display.variable} ${body.variable} ${bebas.variable}`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
