import { NAME, PARAGRAPHS } from "@/content/about";

/**
 * What's inside the About Me folder.
 *
 * The words live in content/about.ts and nothing about them is decided here —
 * that file is meant to be edited by hand without opening a component.
 *
 * The only text in the OS set in faces Windows never shipped. Everything around
 * it stays Explorer's own Segoe UI at Explorer's own sizes, so the name reads as
 * a person overflowing the chrome rather than as a web page pasted inside it.
 */

/** `[words people see](address)` — the one bit of markup the content file has. */
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Splits a paragraph into text and links.
 *
 * An address of "#" renders bold rather than as an anchor: the content file
 * uses it to mean "named, but I haven't got the URL yet", and a link that goes
 * nowhere is worse than no link.
 */
function inline(text: string) {
  const out: React.ReactNode[] = [];
  let cut = 0;

  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match;
    if (match.index > cut) out.push(text.slice(cut, match.index));

    out.push(
      href === "#" ? (
        <strong key={match.index}>{label}</strong>
      ) : (
        <a key={match.index} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      ),
    );

    cut = match.index + whole.length;
  }

  out.push(text.slice(cut));
  return out;
}

export function About() {
  return (
    <article className="about">
      <h1 className="about-name">{NAME}</h1>
      <div className="about-rule" />

      <div className="about-body">
        {PARAGRAPHS.map((text) => (
          <p key={text}>{inline(text)}</p>
        ))}
      </div>
    </article>
  );
}
