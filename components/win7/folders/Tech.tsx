import { TECH_LOGOS } from "@/components/win7/folders/techLogos";

/**
 * One technology in a project's stack row: a logo that names itself when you
 * point at it.
 *
 * Two things this deliberately does not do:
 *
 * 1. **It doesn't rely on hover alone.** The chip is focusable and the name
 *    shows on keyboard focus as well, because a mark that only identifies
 *    itself to a mouse identifies itself to about half the people reading.
 *    The name is also on `aria-label`, so a screen reader gets it without any
 *    pointing at all.
 * 2. **It doesn't use the browser's `title` tooltip.** That would sit on a
 *    delay, in the host OS's styling, on top of an OS of our own. The tooltip
 *    below is Win7's — white-to-pale gradient, hairline border, 3px radius —
 *    so it belongs to the desktop it appears on.
 *
 * A missing logo is a normal case, not an error: `TECH_LOGOS` only has the
 * marks Simple Icons publishes, so anything else draws its first two letters.
 */
export function TechChip({ id, name }: { id: string; name: string }) {
  const path = TECH_LOGOS[id];

  return (
    <span className="tech" tabIndex={0} aria-label={name}>
      {path ? (
        <svg className="tech-logo" viewBox="0 0 24 24" aria-hidden="true">
          <path d={path} fill="currentColor" />
        </svg>
      ) : (
        <span className="tech-letters" aria-hidden="true">
          {name.slice(0, 2)}
        </span>
      )}

      <span className="tech-name" role="tooltip">
        {name}
      </span>
    </span>
  );
}
