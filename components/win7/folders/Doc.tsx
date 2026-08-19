/**
 * A written page inside a folder window.
 *
 * About Me and every item in content/folders.ts render through this, so there
 * is one set of typography for prose in this OS rather than one per folder.
 * The words never live here — they live in content/, which is the point.
 *
 * `size="file"` is the only variant: an item opened from a listing gets a
 * smaller heading than About Me, because About Me's 50px name is deliberately
 * too big for its window and a file called "Unitwise" is not.
 */

/** `[words people see](address)` — the one bit of markup the content files have. */
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Splits a paragraph into text and links.
 *
 * An address of "#" renders bold rather than as an anchor: the content files
 * use it to mean "named, but I haven't got the URL yet", and a link that goes
 * nowhere is worse than no link.
 */
export function inline(text: string) {
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

export function Doc({
  title,
  body,
  size,
}: {
  title: string;
  body: readonly string[];
  size?: "file";
}) {
  return (
    <article className="about" data-doc={size}>
      <h1 className="about-name">{title}</h1>
      <div className="about-rule" />

      <div className="about-body">
        {body.map((text) => (
          <p key={text}>{inline(text)}</p>
        ))}
      </div>
    </article>
  );
}
