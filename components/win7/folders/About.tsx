import { Doc } from "@/components/win7/folders/Doc";
import { NAME, PARAGRAPHS } from "@/content/about";

/**
 * What's inside the About Me folder.
 *
 * The words live in content/about.ts and the typography lives in Doc — nothing
 * is decided here. That content file is meant to be edited by hand without
 * opening a component.
 *
 * About Me keeps Doc's full-size heading: the only text in the OS set in faces
 * Windows never shipped, at 50px in a pane whose interface text is 12px. It is
 * meant to be too big for the window — a person overflowing the chrome rather
 * than a web page pasted inside it.
 */
export function About() {
  return <Doc title={NAME} body={PARAGRAPHS} />;
}
