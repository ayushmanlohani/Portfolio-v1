import { inline } from "@/components/win7/folders/Doc";
import { LinkedInIcon, MailIcon } from "@/components/win7/icons";
import { CONTACT } from "@/content/contact";

/**
 * The Contact folder — a page rather than a listing, the same way About Me is.
 *
 * Two rows, one line each: the email address and the LinkedIn profile. The
 * email is deliberately a dead click — it reads as a link but opens nothing,
 * because a mailto on a portfolio mostly just launches a mail client nobody
 * configured. The LinkedIn row is the real handoff.
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

      <div className="about-body contact-rows">
        {/* A link in looks only: preventDefault keeps the click from doing
            anything, cursor and focus still say "interactive". */}
        <a
          className="contact-row"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label={`${CONTACT.email} (copy it from here)`}
        >
          <MailIcon className="contact-icon" />
          <span>{CONTACT.email}</span>
        </a>

        <a
          className="contact-row"
          href={CONTACT.linkedin.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`LinkedIn: ${CONTACT.linkedin.label}`}
        >
          <LinkedInIcon className="contact-icon" />
          <span>{CONTACT.linkedin.label}</span>
        </a>
      </div>
    </article>
  );
}
