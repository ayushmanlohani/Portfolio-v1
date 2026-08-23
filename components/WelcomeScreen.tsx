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
        {/* Title block */}
        <div className="win7-login-title">
          <SparkleButton text="Ayushman Lohani's Portfolio" fontSize={100} />
        </div>

        {/* User avatar */}
        <div className="win7-login-avatar">
          <div className="win7-login-avatar-inner">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="login-usr-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#8fc4e8" />
                  <stop offset="1" stopColor="#3d7cb0" />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="30" height="30" rx="2" fill="url(#login-usr-bg)" />
              <circle cx="16" cy="12" r="5.4" fill="#fdf6ec" />
              <path d="M5.5 30c1.4-6 5.6-9 10.5-9s9.1 3 10.5 9z" fill="#fdf6ec" />
            </svg>
          </div>
        </div>

        {/* Username */}
        <div className="win7-login-name">Ayushman</div>

        {/* Sign in button / status */}
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
    </div>
  );
}
