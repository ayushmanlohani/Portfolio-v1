import { launchWindow, PDF_PREFIX } from "@/components/win7/apps";
import { inline } from "@/components/win7/folders/Doc";
import { RESUME } from "@/content/resume";

/**
 * The resume, as text rather than as an embedded PDF.
 *
 * It is written in LaTeX and set in Computer Modern, so this reproduces that
 * document's layout in HTML: centred name over a contact line, small-caps
 * section headings each under a full-width rule, and entries whose title sits
 * left with its date right and its employer italic beneath. The real CMU Serif
 * webfont does the rest — see `--cmu` in globals.css.
 *
 * Showing the PDF itself was the first attempt and it was wrong: browsers hand
 * a PDF to a plugin viewer or, as here, straight to the downloads folder, so
 * the resume left the window instead of living in it. Text stays selectable,
 * searchable, themable and readable on a phone. The PDF is still one click
 * away above it, which is what a recruiter actually wants to keep.
 *
 * Every word comes from content/resume.ts, never from here.
 */
export function Resume() {
  return (
    <article className="cv">
      <header className="cv-head">
        <h1 className="cv-name">{RESUME.name}</h1>
        <p className="cv-tagline">{RESUME.tagline}</p>

        <p className="cv-contact">
          {RESUME.contact.map((item, i) => (
            <span key={item.text}>
              {i > 0 && <span className="cv-pipe">|</span>}
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.text}
                </a>
              ) : (
                item.text
              )}
            </span>
          ))}
        </p>
      </header>

      {RESUME.sections.map((section, s) => {
        const isLast = s === RESUME.sections.length - 1;

        const entries = section.entries.map((entry, i) => (
          <div className="cv-entry" key={entry.title || i}>
            {/* Technical Skills and Certifications are bare lists in the
                original — no title row, so none is drawn. */}
            {entry.title && (
              <div className="cv-row">
                <span className="cv-title">
                  {entry.title}
                  {entry.links?.map((link) => (
                    <a
                      className="cv-link"
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  ))}
                </span>
                {entry.right && <span className="cv-right">{entry.right}</span>}
              </div>
            )}

            {entry.subtitle && (
              <div className="cv-row cv-sub">
                <span>{entry.subtitle}</span>
                {entry.subright && <span className="cv-right">{entry.subright}</span>}
              </div>
            )}

            {entry.points && (
              <ul className="cv-points">
                {entry.points.map((point) => (
                  <li key={point}>{inline(point)}</li>
                ))}
              </ul>
            )}
          </div>
        ));

        return (
          <section className="cv-section" key={section.heading}>
            <h2 className="cv-heading">{section.heading}</h2>

            {/* The last section is short and leaves room beside it, so the
                download sits there as a real flex sibling — not a float, which
                only nudges text aside and leaves its own box (and every
                element after it, like these bullets) painting on top and
                catching the click that was meant for the button underneath. */}
            {isLast ? (
              <div className="cv-last-row">
                <div className="cv-last-entries">{entries}</div>
                <div className="cv-actions">
                  {/* Reading it shouldn't cost a download. This opens the same
                      file in the desktop's own PDF viewer instead. */}
                  <button
                    type="button"
                    className="project-link cv-download"
                    onClick={() => launchWindow(PDF_PREFIX + RESUME.pdf)}
                  >
                    Open the PDF
                  </button>
                  <a className="project-link cv-download" href={RESUME.pdf} download>
                    Download
                  </a>
                </div>
              </div>
            ) : (
              entries
            )}
          </section>
        );
      })}
    </article>
  );
}
