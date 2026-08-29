import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the desktop wallpaper.
  devIndicators: false,

  /**
   * Opening the dev server from a phone on the same wifi.
   *
   * Next blocks cross-origin requests to its own dev resources, and a phone
   * hitting http://<PC's LAN IP>:3000 counts as cross-origin. These are the
   * three private IPv4 ranges a home router hands out; the matcher splits on
   * dots, so one `*` per octet. Development only — production never reads it.
   */
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
