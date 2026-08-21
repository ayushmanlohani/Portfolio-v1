"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clock, VIDEOS } from "@/components/win7/media";

/**
 * Windows Media Player 12.
 *
 * Two views behind one set of transport controls, the way the real player
 * works: the library lists what you can play, Now Playing shows the video, and
 * the bar along the bottom drives whichever is loaded. Switching views never
 * touches playback — the <video> element stays mounted and is only hidden, so
 * walking back to the library while something plays keeps it playing, same as
 * Windows.
 *
 * Every button does what WMP 12's does:
 *   Shuffle  picks the next item at random instead of in order
 *   Repeat   wraps the playlist instead of stopping at the end
 *   Stop     halts playback and returns the position to the start
 *   Previous goes back an item — in shuffle, to the last item actually played
 *   Play     toggles to Pause, which holds the position rather than resetting
 *   Next     skips forward as if the item had reached its end
 *   Mute     silences without stopping; the slider sets the level
 *
 * The library is deliberately not empty, unlike the stock first-run player:
 * public/letterbox is the library, and content/media.ts is its index.
 */

const ICON = { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true } as const;

const LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* Drawn as outlines rather than solids: WMP's transport glyphs are hairline
   strokes, and a filled set reads as a phone player, not as Windows 7. */

const Shuffle = () => (
  <svg {...ICON}>
    <path d="M3.5 6.5h3c1.4 0 2.2.7 3 1.8l4.2 5.9c.8 1.1 1.6 1.8 3 1.8h3" {...LINE} />
    <path d="M3.5 17.5h3c1.4 0 2.2-.7 3-1.8l4.2-5.9c.8-1.1 1.6-1.8 3-1.8h3" {...LINE} />
    <path d="M17.8 4.4 20.9 6.5l-3.1 2.1M17.8 13.4l3.1 2.1-3.1 2.1" {...LINE} />
  </svg>
);

const Repeat = () => (
  <svg {...ICON}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7" {...LINE} />
    <path d="M12.9 6.1h4.4V1.9" {...LINE} />
  </svg>
);

const Stop = () => (
  <svg {...ICON}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1" {...LINE} />
  </svg>
);

const Skip = ({ back }: { back?: boolean }) => (
  <svg {...ICON} style={back ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M4.5 6.2 11 12l-6.5 5.8z" {...LINE} />
    <path d="M11 6.2 17.5 12 11 17.8z" {...LINE} />
    <path d="M19.6 6.2v11.6" {...LINE} />
  </svg>
);

const Speaker = ({ muted }: { muted: boolean }) => (
  <svg {...ICON}>
    <path d="M4.5 9.5h3L12 5.8v12.4L7.5 14.5h-3z" {...LINE} />
    {muted ? (
      <path d="M15.5 9.5l5 5m0-5-5 5" {...LINE} />
    ) : (
      <path d="M15.2 9.2c1.2 1.6 1.2 4 0 5.6M17.9 7c2.2 2.8 2.2 7.2 0 10" {...LINE} />
    )}
  </svg>
);

/** What the address bar reads in each of the three views. */
const CRUMBS: Record<string, (title: string) => string[]> = {
  music: () => ["Library", "Music"],
  video: () => ["Library", "Video"],
  playing: (title) => ["Now Playing", title],
};

export function MediaPlayer() {
  const video = useRef<HTMLVideoElement>(null);
  /** Items played this session, newest last — what Previous walks in shuffle. */
  const history = useRef<number[]>([]);

  const [index, setIndex] = useState(0);
  // Opens where WMP opens: an empty Music library. Video is a click away
  // under Organize, exactly as the empty library's own text instructs.
  const [view, setView] = useState<"music" | "video" | "playing">("music");
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lengths, setLengths] = useState<Record<string, number>>({});
  const [organize, setOrganize] = useState(false);
  const [sort, setSort] = useState<"title" | "album">("title");

  const current = VIDEOS[index];

  // The Length column. Metadata only — the browser reads the header, not the
  // 18MB of video behind it.
  useEffect(() => {
    const probes = VIDEOS.map((item) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.src = item.src;
      el.onloadedmetadata = () =>
        setLengths((prev) => ({ ...prev, [item.src]: el.duration }));
      return el;
    });
    // Detach rather than blanking the src: `el.src = ""` re-points the element
    // at the page URL and Chrome logs a failed request for it.
    return () =>
      probes.forEach((el) => {
        el.onloadedmetadata = null;
        el.removeAttribute("src");
        el.load();
      });
  }, []);

  // The element owns volume and mute; React only mirrors them.
  useEffect(() => {
    const el = video.current;
    if (el) {
      el.volume = volume;
      el.muted = muted;
    }
  }, [volume, muted]);

  /** play() rejects if the browser blocks it — swallow it, never throw. */
  const start = useCallback(() => {
    video.current?.play().catch(() => setPlaying(false));
  }, []);

  /** Set when a new item is queued, read once the swapped src has rendered. */
  const autoplay = useRef(false);

  const load = useCallback(
    (next: number) => {
      setStarted(true);
      setView("playing");
      setTime(0);

      // Re-selecting what is already loaded doesn't change `index`, so the
      // effect below never runs — play it here instead.
      if (next === index) {
        start();
        return;
      }

      history.current.push(index);
      autoplay.current = true;
      setIndex(next);
    },
    [index, start],
  );

  // The src only swaps once React has re-rendered with the new index, so the
  // play call has to wait for that rather than follow load() immediately.
  useEffect(() => {
    if (!autoplay.current) return;
    autoplay.current = false;
    start();
  }, [index, start]);

  /** Where Next goes: a random other item under Shuffle, otherwise the next. */
  const step = useCallback(
    (delta: 1 | -1) => {
      if (VIDEOS.length < 2) return repeat ? index : null;

      if (shuffle) {
        if (delta === -1 && history.current.length > 0) return history.current.pop()!;
        let pick = index;
        while (pick === index) pick = Math.floor(Math.random() * VIDEOS.length);
        return pick;
      }

      const next = index + delta;
      if (next >= 0 && next < VIDEOS.length) return next;
      return repeat ? (next + VIDEOS.length) % VIDEOS.length : null;
    },
    [index, repeat, shuffle],
  );

  const skip = (delta: 1 | -1) => {
    const next = step(delta);
    if (next === null) {
      // End of the playlist with Repeat off: WMP stops on the last item.
      video.current?.pause();
      setPlaying(false);
      return;
    }
    load(next);
  };

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      setStarted(true);
      setView("playing");
      start();
    } else {
      el.pause();
    }
  };

  const stop = () => {
    const el = video.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setTime(0);
  };

  const seek = (to: number) => {
    const el = video.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = to;
    setTime(to);
  };

  const order = [...VIDEOS].sort((a, b) =>
    sort === "title" ? a.title.localeCompare(b.title) : a.album.localeCompare(b.album),
  );

  return (
    <div className="wmp" onClick={() => organize && setOrganize(false)}>
      <div className="wmp-address">
        <div className="wmp-nav">
          <button
            type="button"
            className="wmp-nav-btn"
            aria-label="Back"
            disabled={view === "music"}
            onClick={() => setView(view === "playing" ? "video" : "music")}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="wmp-nav-btn"
            aria-label="Forward"
            disabled={view === "playing" || (view === "video" && !started)}
            onClick={() => setView(view === "music" ? "video" : "playing")}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="wmp-crumbs" aria-label="Location">
          {CRUMBS[view](current.title).map(
            (crumb) => (
              <span className="wmp-crumb" key={crumb}>
                {crumb}
                <span className="wmp-crumb-arrow" aria-hidden="true" />
              </span>
            ),
          )}
        </nav>
      </div>

      <div className="wmp-menu">
        <div className="wmp-menu-wrap">
          <button
            type="button"
            className="wmp-menu-btn"
            aria-haspopup="menu"
            aria-expanded={organize}
            onClick={(e) => {
              e.stopPropagation();
              setOrganize((o) => !o);
            }}
          >
            Organize
            <span className="wmp-menu-caret" aria-hidden="true" />
          </button>

          {organize && (
            <ul className="wmp-dropdown" role="menu">
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={sort === "title"}
                  onClick={() => {
                    setSort("title");
                    setOrganize(false);
                  }}
                >
                  Sort by title
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={sort === "album"}
                  onClick={() => {
                    setSort("album");
                    setOrganize(false);
                  }}
                >
                  Sort by album
                </button>
              </li>
              <li className="wmp-dropdown-div">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setView("video");
                    setOrganize(false);
                  }}
                >
                  Manage libraries
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* Streaming needs a home network. Windows greys it out rather than
            offering a button that fails, and so does this. */}
        <span className="wmp-menu-btn wmp-menu-off" title="Streaming requires a home network">
          Stream
          <span className="wmp-menu-caret" aria-hidden="true" />
        </span>
      </div>

      <div className="wmp-content">
        {/* The first-run library: Windows' own words, and its own instruction
            — Organize ▸ Manage libraries is a real route to the video list. */}
        <div className="wmp-empty" hidden={view !== "music"}>
          <p>There are no items in your library.</p>
          <p>Click Organize, then click Manage libraries to include items.</p>
        </div>

        <div className="wmp-library" hidden={view !== "video"}>
          <div className="wmp-cols">
            <span>Title</span>
            <span>Album</span>
            <span className="wmp-col-len">Length</span>
          </div>
          <ul className="wmp-list">
            {order.map((item) => {
              const at = VIDEOS.indexOf(item);
              return (
                <li key={item.src}>
                  <button
                    type="button"
                    className="wmp-row"
                    aria-current={at === index && started ? "true" : undefined}
                    onDoubleClick={() => load(at)}
                    onClick={(e) => e.detail === 0 && load(at)}
                  >
                    <span className="wmp-row-title">
                      {item.poster && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="wmp-thumb" src={item.poster} alt="" />
                      )}
                      {item.title}
                    </span>
                    <span className="wmp-row-album">{item.album}</span>
                    <span className="wmp-col-len">
                      {lengths[item.src] ? clock(lengths[item.src]) : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="wmp-hint">Double-click an item to play it.</p>
        </div>

        <div className="wmp-stage" hidden={view !== "playing"}>
          <video
            ref={video}
            className="wmp-video"
            src={current.src}
            poster={current.poster}
            playsInline
            preload="metadata"
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={() => skip(1)}
          />
        </div>
      </div>

      <div className="wmp-transport">
        <input
          className="wmp-seek"
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={time}
          aria-label="Seek"
          disabled={!started}
          aria-valuetext={`${clock(time)} of ${clock(duration)}`}
          onChange={(e) => seek(Number(e.target.value))}
        />

        <div className="wmp-controls">
          {started && <span className="wmp-time">{clock(time)}</span>}

          <button
            type="button"
            className="wmp-btn"
            aria-label="Shuffle"
            aria-pressed={shuffle}
            onClick={() => setShuffle((s) => !s)}
          >
            <Shuffle />
          </button>
          <button
            type="button"
            className="wmp-btn"
            aria-label="Repeat"
            aria-pressed={repeat}
            onClick={() => setRepeat((r) => !r)}
          >
            <Repeat />
          </button>
          <button
            type="button"
            className="wmp-btn"
            aria-label="Stop"
            disabled={!started}
            onClick={stop}
          >
            <Stop />
          </button>

          <div className="wmp-pill">
            <button
              type="button"
              className="wmp-btn"
              aria-label="Previous"
              disabled={!started}
              onClick={() => skip(-1)}
            >
              <Skip back />
            </button>

            <button
              type="button"
              className="wmp-play"
              aria-label={playing ? "Pause" : "Play"}
              onClick={toggle}
            >
              <svg viewBox="0 0 40 40" aria-hidden="true">
                {playing ? (
                  <g fill="#ffffff">
                    <rect x="14" y="12" width="4.5" height="16" rx="1" />
                    <rect x="21.5" y="12" width="4.5" height="16" rx="1" />
                  </g>
                ) : (
                  <path d="M15.5 11.5 28 20l-12.5 8.5z" fill="#ffffff" />
                )}
              </svg>
            </button>

            <button
              type="button"
              className="wmp-btn"
              aria-label="Next"
              disabled={!started}
              onClick={() => skip(1)}
            >
              <Skip />
            </button>
          </div>

          <button
            type="button"
            className="wmp-btn"
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            onClick={() => setMuted((m) => !m)}
          >
            <Speaker muted={muted} />
          </button>

          <input
            className="wmp-volume"
            style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            aria-label="Volume"
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
            onChange={(e) => {
              // Moving the slider is also how you come off mute, same as WMP.
              setVolume(Number(e.target.value));
              setMuted(false);
            }}
          />

          {started && <span className="wmp-time wmp-time-total">{clock(duration)}</span>}
        </div>
      </div>
    </div>
  );
}
