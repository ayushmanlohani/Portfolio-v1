import { inline } from "@/components/win7/folders/Doc";
import { TechChip } from "@/components/win7/folders/Tech";
import type { Project as ProjectData } from "@/content/projects";

/**
 * A project's page — what you see when you open its folder.
 *
 * It reuses About Me's typography (`.about`, Libre Bodoni over Public Sans) so
 * prose reads the same everywhere in the OS, and adds only what a project
 * needs on top: a centred two-line tagline, links, headed sections, and the
 * stack row.
 *
 * The stack row is the one loud thing on the page. Everything above it is
 * deliberately quiet — small letterspaced headings, a hairline, no colour
 * beyond Explorer's own link blue — so the logos are what the eye lands on.
 *
 * Every word comes from content/, never from here.
 */
export function Project({ data }: { data: ProjectData }) {
  return (
    <article className="about project">
      <h1 className="about-name">{data.name}</h1>
      <div className="about-rule" />

      <p className="project-tagline">
        {data.tagline.map((line) => (
          <span key={line}>{inline(line)}</span>
        ))}
      </p>

      {data.links.length > 0 && (
        <div className="project-links">
          {data.links.map((link) => (
            <a key={link.href} className="project-link" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      )}

      <div className="about-body">
        {data.sections.map((section) => (
          <section className="project-section" key={section.heading}>
            <h2 className="project-heading">{section.heading}</h2>

            {section.text.map((text) => (
              <p key={text}>{inline(text)}</p>
            ))}

            {section.points && (
              <ul className="project-points">
                {section.points.map((point) => (
                  <li key={point}>{inline(point)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="project-section">
          <h2 className="project-heading">Built with</h2>
          <div className="project-stack">
            {data.stack.map((tech) => (
              <TechChip key={tech.id} id={tech.id} name={tech.name} />
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
