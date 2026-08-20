import { inline } from "@/components/win7/folders/Doc";
import { CONTACT } from "@/content/contact";

/**
 * The Contact folder — a page rather than a listing, the same way About Me is.
 *
 * It was three text files you clicked into one at a time (GitHub, LeetCode,
 * an Email that pointed nowhere). Nothing was gained by making someone open a
 * file to find a single link, so they are buttons on one page now, borrowing
 * the same Win7 button the project pages use.
 *
 * There is no message form here on purpose. A static site cannot send mail on
 * its own — it takes a form service or a server route plus a mail provider —
 * and Ayushman decided the buttons were enough. If that changes, the form goes
 * here and the delivery decision comes back with it.
 *
 * Every word comes from content/contact.ts, never from here.
 */
export function Contact() {
  return (
    <article className="about project">
      <h1 className="about-name">Contact</h1>
      <div className="about-rule" />

      {CONTACT.intro.length > 0 && (
        <p className="project-tagline">
          {CONTACT.intro.map((line) => (
            <span key={line}>{inline(line)}</span>
          ))}
        </p>
      )}

      {CONTACT.links.length > 0 && (
        <div className="project-links">
          {CONTACT.links.map((link) => (
            <a
              className="project-link"
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Cleared to "" in the content file, this whole block drops out. */}
      {CONTACT.email && (
        <div className="about-body">
          <section className="project-section">
            <h2 className="project-heading">Email</h2>
            <p>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
