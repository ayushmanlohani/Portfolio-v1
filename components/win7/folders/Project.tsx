import Image from "next/image";

import { inline } from "@/components/win7/folders/Doc";
import { TechChip } from "@/components/win7/folders/Tech";
import type { Page } from "@/content/pages";

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
export function Project({ data }: { data: Page }) {
  return (
    <article className="about project">
      {/* An empty string means "the crest is coming" — the box holds its size
          so adding the file later doesn't move anything below it. */}
      {data.logo !== undefined &&
        (data.logo ? (
          // A sized crest grows upward: the negative top margin cancels the
          // extra height, so the name and everything below stay put. Only
          // ~34px of padding sits above — past that the crest would clip.
          <Image
            className="project-crest"
            src={data.logo}
            alt={`${data.name} logo`}
            width={data.logoSize ?? 72}
            height={data.logoSize ?? 72}
            style={{
              width: `calc(${data.logoSize ?? 72} * var(--px))`,
              height: `calc(${data.logoSize ?? 72} * var(--px))`,
              ...(data.logoSize && {
                margin: `calc(${110 - data.logoSize} * var(--px)) auto calc(18 * var(--px))`,
              }),
            }}
          />
        ) : (
          <div className="project-crest" aria-hidden="true" />
        ))}

      <h1
        className="about-name"
        style={
          data.nameSize
            ? {
                fontSize: `calc(${data.nameSize} * var(--px))`,
              }
            : undefined
        }
      >
        {data.name}
      </h1>
      <div className="about-rule" />

      {data.meta && (
        <p className="project-meta">
          {data.meta.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      )}

      <p
        className="project-tagline"
        style={
          data.taglineSize
            ? {
                fontSize: `calc(${data.taglineSize} * var(--px))`,
                lineHeight: 2,
              }
            : undefined
        }
      >
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

        {/* No technologies, no heading. An education page has nothing to put
            here and an empty "Built with" rule would just be a loose line. */}
        {data.stack.length > 0 && (
          <section className="project-section">
            <h2 className="project-heading">{data.stackHeading ?? "Built with"}</h2>
            <div className="project-stack">
              {data.stack.map((tech) => (
                <TechChip key={tech.id} id={tech.id} name={tech.name} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
