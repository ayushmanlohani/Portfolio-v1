"use client";

import { useState } from "react";

/**
 * The date-and-time flyout — what Windows 7 opens when you click the clock.
 *
 * A month grid on the left, an analog clock on the right, the long-form date
 * across the top and the settings link along the foot.
 *
 * Everything reads the visitor's own locale: the weekday initials, the month
 * name and the long date all come from `Intl`, so an American sees
 * "Thursday, August 20, 2026" where Ayushman sees "Thursday, 20 August 2026".
 * The week starts on Sunday, which is the grid Windows draws in en-US and
 * en-IN alike.
 */

/** Sunday-first initials, taken from the locale rather than hardcoded. */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  // 2024-01-07 was a Sunday, so this walks Sun→Sat.
  new Date(2024, 0, 7 + i).toLocaleDateString(undefined, { weekday: "narrow" }),
);

const sameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

/**
 * The 42 cells of a month grid: the month itself, padded at both ends with
 * the neighbouring months' days. Always six rows, so the panel never changes
 * height as you page through.
 */
function monthGrid(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/** Win7's silver-bezelled wall clock. */
function AnalogClock({ now }: { now: Date }) {
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  return (
    <svg className="cal-clock" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="cal-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfdfd" />
          <stop offset="0.45" stopColor="#c9ced4" />
          <stop offset="0.55" stopColor="#eef1f4" />
          <stop offset="1" stopColor="#a8aeb5" />
        </linearGradient>
        <radialGradient id="cal-face" cx="0.5" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#f4f6f8" />
          <stop offset="1" stopColor="#e4e8ec" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="47" fill="url(#cal-bezel)" />
      <circle cx="50" cy="50" r="41.5" fill="url(#cal-face)" stroke="#b6bcc3" strokeWidth="0.8" />

      {/* Twelve hour marks. The quarters are drawn longer, same as the real one. */}
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1={i % 3 === 0 ? 11 : 12.5}
          x2="50"
          y2="17"
          stroke="#5a636d"
          strokeWidth={i % 3 === 0 ? 2 : 1.2}
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}

      <line
        x1="50"
        y1="54"
        x2="50"
        y2="28"
        stroke="#3f4852"
        strokeWidth="3.4"
        strokeLinecap="round"
        transform={`rotate(${hours * 30} 50 50)`}
      />
      <line
        x1="50"
        y1="56"
        x2="50"
        y2="17"
        stroke="#3f4852"
        strokeWidth="2.4"
        strokeLinecap="round"
        transform={`rotate(${minutes * 6} 50 50)`}
      />
      <line
        x1="50"
        y1="60"
        x2="50"
        y2="15"
        stroke="#6b737c"
        strokeWidth="1"
        strokeLinecap="round"
        transform={`rotate(${seconds * 6} 50 50)`}
      />
      <circle cx="50" cy="50" r="3" fill="#3f4852" />
    </svg>
  );
}

export function CalendarFlyout({ now }: { now: Date }) {
  // Which month the grid is showing. Paging never moves "today".
  const [view, setView] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const page = (delta: number) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  return (
    <div className="cal">
      <div className="cal-today">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>

      <div className="cal-body">
        <div className="cal-month">
          <div className="cal-head">
            <button
              type="button"
              className="cal-page"
              onClick={() => page(-1)}
              aria-label="Previous month"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10.5 2.5 5 8l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>

            <span className="cal-title">
              {view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>

            <button
              type="button"
              className="cal-page"
              onClick={() => page(1)}
              aria-label="Next month"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5.5 2.5 11 8l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="cal-dow">
                {d}
              </span>
            ))}

            {monthGrid(view).map((day) => (
              <span
                key={day.getTime()}
                className="cal-day"
                data-outside={day.getMonth() !== view.getMonth() || undefined}
                data-today={sameDay(day, now) || undefined}
              >
                {day.getDate()}
              </span>
            ))}
          </div>
        </div>

        <div className="cal-side">
          <AnalogClock now={now} />
          <span className="cal-digital">{now.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Dead on purpose — there is nothing behind it to change. */}
      <div className="cal-foot">
        <span className="cal-link">Change date and time settings...</span>
      </div>
    </div>
  );
}
