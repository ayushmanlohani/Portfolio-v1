import { createSign } from "node:crypto";

/**
 * The Google Drive half of the assistant, and the one JWT flow the whole site
 * shares — `app/api/photos/route.ts` imports `getAccessToken` from here rather
 * than keeping a second copy.
 *
 * The knowledge doc is a Google Doc named "knowledge" sitting in the same
 * Drive folder the Photography gallery reads, so there is no second folder and
 * no second env var to keep in sync: `GDRIVE_PHOTOS_FOLDER_ID` locates both.
 * It cannot leak into the gallery — the photos query filters
 * `mimeType contains 'image/'`, which a Doc is not.
 *
 * Editing the Doc is the whole update mechanism. No redeploy, no ingest step;
 * the text is live within CACHE_SECONDS, or immediately via `/refresh`.
 */

/** Short on purpose: an edit to the Doc should show up in well under a
 *  minute. Drive is still hit at most twice per interval no matter how many
 *  visitors are asking, so the cost of shortening it is Drive calls, not
 *  latency. `fetchNotes(true)` skips it entirely — see the /refresh command. */
const CACHE_SECONDS = 30;

/** The Doc's name in that folder. Hardcoded on purpose — one blessed file. */
const DOC_NAME = "knowledge";

/** A self-signed JWT, exchanged for a Drive-scoped access token — the
 *  service-account flow, with no `googleapis` dependency. */
export async function getAccessToken(): Promise<string | null> {
  const email = process.env.GDRIVE_SA_EMAIL;
  const rawKey = process.env.GDRIVE_SA_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.replace(/\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = b64({ alg: "RS256", typ: "JWT" });
  const claims = b64({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(key)
    .toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/**
 * The live notes, as plain text. Empty string on any failure — a missing env
 * var, a Drive outage, a renamed file — because the assistant still has the
 * compiled-in site content to answer from. Same rule the photos and scores
 * routes follow: degrade, never 500.
 */
export async function fetchNotes(fresh = false): Promise<string> {
  const folderId = process.env.GDRIVE_PHOTOS_FOLDER_ID;
  if (!folderId) return "";

  const token = await getAccessToken();
  if (!token) return "";

  const auth = { Authorization: `Bearer ${token}` };
  const cache = fresh
    ? { cache: "no-store" as const }
    : { next: { revalidate: CACHE_SECONDS } };

  /* `name =` is exact and case-sensitive, which is what "one blessed file"
     wants: a "Knowledge copy" left in the folder is ignored rather than
     silently picked up. */
  const q = `'${folderId}' in parents and name = '${DOC_NAME}' and trashed = false`;
  const list = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: auth, ...cache },
  );
  if (!list.ok) return "";

  const found = ((await list.json()) as { files?: { id: string }[] }).files?.[0];
  if (!found) return "";

  /* A Google Doc has no bytes to download — `export` is the only way to read
     one, and text/plain is the only shape worth feeding a model. */
  const doc = await fetch(
    `https://www.googleapis.com/drive/v3/files/${found.id}/export?mimeType=text/plain`,
    { headers: auth, ...cache },
  );
  /* Google's text/plain export leads with a UTF-8 BOM. Strip it, or the notes
     section of the prompt starts with a stray character. */
  return doc.ok ? (await doc.text()).replace(/^﻿/, "").trim() : "";
}
