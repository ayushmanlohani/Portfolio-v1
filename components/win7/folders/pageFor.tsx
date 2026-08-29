import { About } from "@/components/win7/folders/About";
import { Contact } from "@/components/win7/folders/Contact";
import { Project } from "@/components/win7/folders/Project";
import { ABOUT_TXT_ID, CONTACT_TXT_ID, SENTINEL_TXT_ID, UNITWISE_TXT_ID } from "@/components/win7/fs";
import { entryAt, isGroup } from "@/content/pages";
import { SENTINEL as SENTINEL_PAGE } from "@/content/sentinel";
import { UNITWISE as UNITWISE_PAGE } from "@/content/unitwise";

/**
 * The styled page a file id draws, if it has one.
 *
 * Every writeup that moved out of a folder and into Notepad keeps the styled
 * page it had before — headings, taglines, link buttons, whatever that page
 * drew — rather than showing as raw text. Nothing else opened gets this: it's
 * keyed on the file's own id, and every other file falls through to a plain
 * textarea (Notepad) or a Doc (the phone).
 *
 * About Me, Contact, Unitwise and RBI Sentinel are hand-built pages with no
 * entry in content/pages.ts, so they're matched by id here. Every role in
 * Experience and every qualification in Education *is* in content/pages.ts,
 * and its file's id is exactly the path `entryAt` expects — walk() in fs.ts
 * built it that way — so those are read straight back out rather than
 * hand-listed one by one.
 *
 * This lives outside Notepad because the phone shell renders the same pages
 * full-screen. One dispatch, two shells.
 */
export function pageFor(fileId: string | undefined) {
  if (fileId === ABOUT_TXT_ID) return <About />;
  if (fileId === CONTACT_TXT_ID) return <Contact />;
  if (fileId === UNITWISE_TXT_ID) return <Project data={UNITWISE_PAGE} size="file" />;
  if (fileId === SENTINEL_TXT_ID) return <Project data={SENTINEL_PAGE} size="file" />;

  const entry = fileId ? entryAt(fileId) : undefined;
  if (entry && !isGroup(entry)) return <Project data={entry} />;

  return undefined;
}
