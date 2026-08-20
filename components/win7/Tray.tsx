"use client";

import { useEffect, useState } from "react";

import { CalendarFlyout } from "@/components/win7/Calendar";
import { useWindowStore } from "@/store/windows";

/**
 * The Windows 7 notification area — the right end of the taskbar.
 *
 * Action Center flag, network, battery, volume, the clock, and the Show
 * Desktop sliver at the very edge. Three of them are live readings rather
 * than decoration:
 *
 * - **Battery** comes from the Battery Status API, so unplugging the laptop
 *   really does swap the plug glyph back to a plain battery and the fill
 *   tracks the charge. Firefox and Safari both removed that API and a desktop
 *   has no battery at all, so the fallback is "plugged in, full" — see
 *   `useBattery`.
 * - **Network** is `navigator.onLine`. Signal strength and the network's name
 *   are not exposed to a web page on any platform, so the bars are always
 *   full and the flyout says only whether there is a connection.
 * - **Clock** is the real time in the visitor's own locale and format.
 *
 * **Volume is the one dial that isn't real.** No browser can read or set the
 * system volume, so the slider is a faithful-looking control over local
 * state. It is wired the way a real one would be, so if anything on this
 * desktop ever plays a sound, `volume`/`muted` are already here to drive it.
 */

/** Dimmest the screen goes. Low enough to read as "power saving", high
 *  enough that the desktop is still usable. */
const MIN_BRIGHTNESS = 40;

/** Which popup the taskbar is showing. One at a time, Start menu included. */
export type Panel = "start" | "network" | "battery" | "volume" | "clock" | null;

type TrayProps = {
  panel: Panel;
  setPanel: (panel: Panel) => void;
};

/* ── live readings ─────────────────────────────────────────── */

/** The slice of BatteryManager we use. It isn't in TypeScript's DOM lib. */
type BatteryLike = EventTarget & { charging: boolean; level: number };

function useBattery() {
  // Plugged in and full is the fallback, not a placeholder: it is what
  // Firefox, Safari and every desktop PC will keep showing.
  const [battery, setBattery] = useState({ charging: true, level: 1 });

  useEffect(() => {
    const getBattery = (
      navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }
    ).getBattery;
    if (!getBattery) return;

    let source: BatteryLike | null = null;
    const read = () => {
      if (source) setBattery({ charging: source.charging, level: source.level });
    };

    getBattery
      .call(navigator)
      .then((b) => {
        source = b;
        read();
        b.addEventListener("chargingchange", read);
        b.addEventListener("levelchange", read);
      })
      // A rejected promise means the browser has the method but withholds the
      // reading. The fallback already on screen is the right answer.
      .catch(() => {});

    return () => {
      source?.removeEventListener("chargingchange", read);
      source?.removeEventListener("levelchange", read);
    };
  }, []);

  return battery;
}

function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

function useNow() {
  // null until mounted: the server has no clock, and rendering one time on the
  // server and a different one on the client is a hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Read once on mount and then every second — the clock is an external
    // source, same shape as the online/offline subscription above.
    const tick = () => setNow(new Date());
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/* ── glyphs ────────────────────────────────────────────────────
   Tray icons are their own visual language: flat white 16px
   silhouettes, not the gradient Aero icons in icons.tsx. They
   only appear here, so they live here.
   ───────────────────────────────────────────────────────────── */

const GLYPH = {
  viewBox: "0 0 16 16",
  className: "tray-glyph",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
} as const;

/** Action Center. */
function FlagGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M3.2 1.5v13.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M4.6 2.6h8.6l-2 3.2 2 3.2H4.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Signal bars. Full when there is a connection, struck through when not. */
function SignalGlyph({ online }: { online: boolean }) {
  return (
    <svg {...GLYPH}>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={0.6 + i * 3.1}
          y={13.4 - (i + 1) * 2.3}
          width="2.1"
          height={(i + 1) * 2.3}
          rx="0.4"
          fill="currentColor"
          opacity={online ? 1 : 0.32}
        />
      ))}
      {!online && (
        <path
          d="M3 3.4 13 13.4M13 3.4 3 13.4"
          stroke="#e8452c"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * Battery. Charging shifts the cell left to make room for the plug, so the
 * icon visibly changes shape the moment the cable comes out.
 */
function BatteryGlyph({ charging, level }: { charging: boolean; level: number }) {
  const width = charging ? 8.4 : 12;

  return (
    <svg {...GLYPH}>
      <rect
        x="0.9"
        y="4.6"
        width={width}
        height="6.8"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect x={0.9 + width} y="6.6" width="1.4" height="2.8" rx="0.5" fill="currentColor" />
      <rect
        x="2.1"
        y="5.8"
        width={Math.max(0.6, (width - 2.4) * level)}
        height="4.4"
        rx="0.4"
        fill="currentColor"
      />

      {charging && (
        <g fill="currentColor">
          {/* Plug: a body, two pins, and the lead running back to the cell. */}
          <rect x="12.1" y="5.6" width="2.9" height="4.8" rx="0.8" />
          <rect x="10.6" y="6.3" width="1.7" height="1" rx="0.5" />
          <rect x="10.6" y="8.7" width="1.7" height="1" rx="0.5" />
          <rect x="14.9" y="7.5" width="1.1" height="1" rx="0.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * The 32px battery for the flyout's headline — Aero, not a tray silhouette:
 * a grey mains plug beside a green cell that empties as the charge drops.
 */
function BatteryLargeGlyph({ charging, level }: { charging: boolean; level: number }) {
  const top = 27 - 20 * level;

  return (
    <svg viewBox="0 0 32 32" className="bat-fly-icon" aria-hidden="true">
      <defs>
        <linearGradient id="bat-cell" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8fd94a" />
          <stop offset="0.35" stopColor="#63bf22" />
          <stop offset="0.55" stopColor="#4da115" />
          <stop offset="1" stopColor="#75cc33" />
        </linearGradient>
        <linearGradient id="bat-shell" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fbfcfd" />
          <stop offset="0.45" stopColor="#dfe5ea" />
          <stop offset="1" stopColor="#b7c0c8" />
        </linearGradient>
        <linearGradient id="bat-plug" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9edf1" />
          <stop offset="0.5" stopColor="#aab4bd" />
          <stop offset="1" stopColor="#7d8790" />
        </linearGradient>
      </defs>

      {charging && (
        <g>
          {/* Prongs first, so the body caps them. */}
          <rect x="11.5" y="10.5" width="5" height="2.2" rx="1" fill="#8d97a0" />
          <rect x="11.5" y="17.3" width="5" height="2.2" rx="1" fill="#8d97a0" />
          <rect x="3.5" y="8" width="9" height="14" rx="2.4" fill="url(#bat-plug)" stroke="#6b757e" />
          <path
            d="M8 22v4.5a2.5 2.5 0 0 0 2.5 2.5H14"
            fill="none"
            stroke="#6b757e"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      )}

      <g transform={charging ? "translate(2 0)" : "translate(-4 0)"}>
        <rect x="21.5" y="3" width="5" height="3" rx="1" fill="#9aa4ad" />
        <rect
          x="17.5"
          y="5.5"
          width="13"
          height="23"
          rx="2"
          fill="url(#bat-shell)"
          stroke="#6b757e"
        />
        <rect x="19" y={top} width="10" height={29 - top - 2} rx="1" fill="url(#bat-cell)" />
        <rect x="19" y="7" width="3.2" height="20" rx="1.4" fill="#fff" opacity="0.45" />
      </g>
    </svg>
  );
}

function SpeakerGlyph({ muted }: { muted: boolean }) {
  return (
    <svg {...GLYPH}>
      <path d="M1.4 6.1h2.7L7.5 3v10L4.1 9.9H1.4z" fill="currentColor" />
      {muted ? (
        <path
          d="M9.6 6 14 10M14 6 9.6 10"
          stroke="#e8452c"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M9.5 6.1a3.4 3.4 0 0 1 0 3.8" />
          <path d="M11.7 4.3a6.4 6.4 0 0 1 0 7.4" />
        </g>
      )}
    </svg>
  );
}

/* ── the tray ──────────────────────────────────────────────── */

export function Tray({ panel, setPanel }: TrayProps) {
  const { charging, level } = useBattery();
  const online = useOnline();
  const now = useNow();
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [plan, setPlan] = useState("Balanced");
  const [brightness, setBrightness] = useState(100);
  const toggleShowDesktop = useWindowStore((s) => s.toggleShowDesktop);

  // The dimming layer lives on the CRT glass, well outside this component, so
  // the value is handed over as a custom property rather than a prop drilled
  // back up through Taskbar and page.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--screen-dim",
      String(((100 - brightness) / 100) * 0.8),
    );
  }, [brightness]);

  // Clicking the open panel's own icon closes it, the way Windows toggles.
  const toggle = (next: Panel) => () => setPanel(panel === next ? null : next);

  const silent = muted || volume === 0;
  const percent = Math.round(level * 100);
  const batteryLabel = charging
    ? `${percent}% available (plugged in, charging)`
    : `${percent}% remaining`;

  return (
    <div className="tray">
      <button type="button" className="tray-btn" title="Action Center" aria-label="Action Center">
        <FlagGlyph />
      </button>

      <span className="tray-slot">
        <button
          type="button"
          className="tray-btn"
          data-open={panel === "network" || undefined}
          onClick={toggle("network")}
          title={online ? "Internet access" : "No network access"}
          aria-label="Network"
          aria-expanded={panel === "network"}
        >
          <SignalGlyph online={online} />
        </button>
      </span>

      <span className="tray-slot">
        <button
          type="button"
          className="tray-btn"
          data-open={panel === "battery" || undefined}
          onClick={toggle("battery")}
          title={batteryLabel}
          aria-label={batteryLabel}
          aria-expanded={panel === "battery"}
        >
          <BatteryGlyph charging={charging} level={level} />
        </button>
      </span>

      <span className="tray-slot">
        <button
          type="button"
          className="tray-btn"
          data-open={panel === "volume" || undefined}
          onClick={toggle("volume")}
          title={silent ? "Speakers: Muted" : `Speakers: ${volume}%`}
          aria-label="Volume"
          aria-expanded={panel === "volume"}
        >
          <SpeakerGlyph muted={silent} />
        </button>

        {panel === "volume" && (
          <div className="flyout vol-fly">
            <div className="vol">
              <input
                className="vol-range"
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                aria-label="Speaker volume"
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
              />
              <button
                type="button"
                className="vol-mute"
                onClick={() => setMuted((m) => !m)}
                title={silent ? "Unmute" : "Mute"}
                aria-label={silent ? "Unmute" : "Mute"}
                aria-pressed={silent}
              >
                <SpeakerGlyph muted={silent} />
              </button>
            </div>
          </div>
        )}
      </span>

      <button
        type="button"
        className="tray-clock"
        data-open={panel === "clock" || undefined}
        onClick={toggle("clock")}
        aria-label={now ? `${now.toLocaleTimeString()}, ${now.toLocaleDateString()}` : "Clock"}
        aria-expanded={panel === "clock"}
      >
        <span className="tray-time">
          {now?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
        <span className="tray-date">{now?.toLocaleDateString()}</span>
      </button>

      <button
        type="button"
        className="show-desktop"
        title="Show desktop"
        aria-label="Show desktop"
        onClick={toggleShowDesktop}
      />

      {panel === "battery" && (
        <div className="flyout">
          <div className="bat-fly">
            <div className="bat-fly-top">
              <BatteryLargeGlyph charging={charging} level={level} />
              <div>
                <div className="bat-fly-pct">{percent}% remaining</div>
                <div className="bat-fly-sub">
                  {charging ? "(plugged in, charging)" : "(on battery)"}
                </div>
              </div>
            </div>

            {/* A power plan is a Windows setting with no web equivalent, but
                dimming the display is the part of it we can actually do — so
                Power saver drops the brightness to its floor and Balanced
                puts it back, and the radio does something real. */}
            <fieldset className="bat-fly-plans">
              <legend>Select a power plan:</legend>
              {["Balanced", "Power saver"].map((name) => (
                <label key={name}>
                  <input
                    type="radio"
                    name="power-plan"
                    checked={plan === name}
                    onChange={() => {
                      setPlan(name);
                      setBrightness(name === "Power saver" ? MIN_BRIGHTNESS : 100);
                    }}
                  />
                  {name}
                </label>
              ))}
            </fieldset>

            {/* This one is real: it dims the glass, same as a monitor would. */}
            <div className="bat-fly-bright">
              <label htmlFor="screen-brightness">Adjust screen brightness</label>
              <input
                id="screen-brightness"
                className="bright-range"
                type="range"
                min={MIN_BRIGHTNESS}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {panel === "network" && (
        <div className="flyout">
          <div className="net-fly">
            <div className="net-fly-head">Currently connected to:</div>
            <div className="net-fly-row">
              <SignalGlyph online={online} />
              <div>
                <div className="net-fly-name">Network</div>
                <div className="net-fly-state">
                  {online ? "Internet access" : "No network access"}
                </div>
              </div>
            </div>
            {/* Dead on purpose — there is no sharing centre behind it. */}
            <div className="net-fly-foot">
              <span className="cal-link">Open Network and Sharing Center</span>
            </div>
          </div>
        </div>
      )}

      {panel === "clock" && now && (
        <div className="flyout">
          <CalendarFlyout now={now} />
        </div>
      )}
    </div>
  );
}
