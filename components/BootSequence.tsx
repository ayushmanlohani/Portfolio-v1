"use client";

import { useRef, useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { Monitor } from "./Monitor";
import { Taskbar } from "./Taskbar";
import { DesktopSurface } from "./win7/DesktopSurface";
import { WindowLayer } from "./win7/WindowLayer";
import { DebugOverlay } from "./DebugOverlay";
import { WallpaperBg } from "./win7/WallpaperBg";
import { DesktopWelcomeToast } from "./DesktopWelcomeToast";
import { useWindowStore } from "@/store/windows";

export function BootSequence() {
  const [loginVisible, setLoginVisible] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeShownRef = useRef(false);
  const closeAll = useWindowStore((s) => s.closeAll);

  const handleSignIn = () => {
    setLoginVisible(false);
    setTimeout(() => {
      if (!welcomeShownRef.current) {
        welcomeShownRef.current = true;
        setShowWelcome(true);
      }
    }, 700);
  };

  const handleShutdown = () => {
    closeAll();
    setResetKey((k) => k + 1);
    setLoginVisible(true);
  };

  return (
    <div className="room" style={{ position: "relative", height: "100%" }}>
      <Monitor>
        <div className="win7">
          <WallpaperBg />
          <DesktopSurface />
          <WindowLayer />
          <Taskbar onShutdown={handleShutdown} />
          {showWelcome && (
            <DesktopWelcomeToast onDismiss={() => setShowWelcome(false)} />
          )}
        </div>
      </Monitor>

      {/* Login screen — overlays the desktop, fades out on sign-in */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 200,
          opacity: loginVisible ? 1 : 0,
          pointerEvents: loginVisible ? "auto" : "none",
          transition: "opacity 600ms ease-in-out",
        }}
      >
        <WelcomeScreen onSignIn={handleSignIn} resetKey={resetKey} />
      </div>

      <DebugOverlay />
    </div>
  );
}
