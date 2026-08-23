"use client";

import { useEffect, useState } from "react";
import SparkleButton from "./SparkleButton";

const LOCK_WALLPAPER = "/letterbox/wp8729274-windows-7-lock-screen-wallpapers.jpg";

type Props = {
  onSignIn: () => void;
  /** Bump to reset the component (e.g. after shutdown returns to login). */
  resetKey?: number;
};

export function WelcomeScreen({ onSignIn, resetKey }: Props) {
  const [signingIn, setSigningIn] = useState(false);

  // Reset signing-in state when the key changes (shutdown → login).
  useEffect(() => {
    setSigningIn(false);
  }, [resetKey]);

  const handleSignIn = () => {
    setSigningIn(true);
    setTimeout(() => onSignIn(), 800);
  };

  return (
    <div className="win7-login">
      <div
        className="win7-login-bg"
        style={{ backgroundImage: `url(${LOCK_WALLPAPER})` }}
      />

      {/* Center content */}
      <div className="win7-login-center">
        {/* The tile, name and button — pinned to true screen centre no
            matter how big the tagline below grows. */}
        <div className="win7-login-core">
          <div className="win7-login-avatar">
            <div className="win7-login-avatar-inner">
              <img src="/letterbox/photo-1.png" alt="" className="win7-login-avatar-photo" />
            </div>
          </div>

          <div className="win7-login-name">Ayushman</div>

          {signingIn ? (
            <div className="win7-login-welcome">
              <div className="win7-login-spinner" />
              <span>Welcome</span>
            </div>
          ) : (
            <button
              className="win7-login-btn"
              onClick={handleSignIn}
            >
              ENTER
            </button>
          )}
        </div>

        {/* Tagline — the old title's sparkle now lives on just the name,
            inline in a sentence instead of shouting from a giant headline.
            Sits at a fixed offset below the centred core so its own size
            never drags the avatar off centre. */}
        <p className="win7-login-tagline">
          Welcome to <SparkleButton
            text="Ayushman Lohani"
            fontFamily="'Segoe UI', Tahoma, sans-serif"
            fontWeight={700}
            fontSize={27}
            textColor="#8fd2ff"
            shadowColor="#1742F5"
            glareColor="#FFFFFFCC"
            glareSpeed={4}
          />&rsquo;s portfolio, made to look and work like Windows 7.
        </p>
      </div>
    </div>
  );
}
