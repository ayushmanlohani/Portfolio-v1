/** The orb's drawing — sphere plus flag. The button around it differs
 *  between the taskbar and the phone bar; what's inside it doesn't. */
export function StartOrbFace() {
  return (
    <>
      <span className="start-orb-sphere" />
      <svg className="start-orb-flag" viewBox="0 0 100 100" aria-hidden="true">
        <g fill="#ffffff" fillOpacity="0.92">
          <path d="M30 40 L47 36.5 L47 49.5 L30 50 Z" />
          <path d="M51 35.5 L70 31.5 L70 48.5 L51 49 Z" />
          <path d="M30 54 L47 53.5 L47 66.5 L30 63.5 Z" />
          <path d="M51 53 L70 52.5 L70 69 L51 65.5 Z" />
        </g>
      </svg>
    </>
  );
}
