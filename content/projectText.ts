import { SENTINEL } from "@/content/sentinel";
import { UNITWISE } from "@/content/unitwise";

/**
 * Turns a project page (content/unitwise.ts, content/sentinel.ts) into the
 * plain text that sits in its Notepad file — same words as the page used to
 * show, reflowed for a text file instead of a styled layout.
 *
 * Markdown links ([words](address)) get unwrapped: a real address becomes
 * "words (address)"; "#" (content/pages.ts's "no link yet" marker) becomes
 * just the words, since a text file has no bold to fall back on.
 */
const stripLinks = (s: string) =>
  s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, words, href) => (href === "#" ? words : `${words} (${href})`));

type ProjectPage = {
  name: string;
  tagline: string[];
  links: { label: string; href: string }[];
  sections: { heading: string; text: string[]; points?: string[] }[];
  stack: { id: string; name: string }[];
};

function projectText(page: ProjectPage): string {
  const lines: string[] = [page.name, "=".repeat(page.name.length), "", page.tagline.map(stripLinks).join(" "), ""];

  for (const link of page.links) lines.push(`${link.label}: ${link.href}`);
  if (page.links.length) lines.push("");

  for (const section of page.sections) {
    lines.push(section.heading.toUpperCase(), "-".repeat(section.heading.length));
    for (const p of section.text) lines.push(stripLinks(p), "");
    for (const point of section.points ?? []) lines.push(`  - ${stripLinks(point)}`);
    if (section.points) lines.push("");
  }

  lines.push("BUILT WITH", "----------", page.stack.map((t) => t.name).join(", "));

  return lines.join("\n");
}

export const UNITWISE_TEXT = projectText(UNITWISE);
export const SENTINEL_TEXT = projectText(SENTINEL);
