import { createSign } from "node:crypto";

import type { DrivePhoto } from "@/components/win7/fs";

/**
 * The Photography folder's contents, read live from a private Google Drive
 * folder. See docs/superpowers/specs/2026-09-03-photography-drive-gallery-design.md
 * for why this needs a service account rather than a plain API key: Drive's
 * `files.list` can't resolve "does this caller have access" from an API key
 * alone, even on a folder shared "Anyone with the link" — confirmed 401
 * during design review.
 *
 * Cached for 30 minutes via the route segment config below, so Drive is
 * called at most once per interval regardless of visitor traffic. Any
 * failure — missing env vars, a Drive error, a token-exchange failure —
 * falls back to an empty list rather than a broken response, the same rule
 * app/api/scores/route.ts already follows for Upstash.
 */

export const dynamic = "force-static";
export const revalidate = 1800;

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A self-signed JWT, exchanged for a Drive-scoped access token — the
 *  service-account flow, with no `googleapis` dependency. */
async function getAccessToken(): Promise<string | null> {
  const email = process.env.GDRIVE_SA_EMAIL;
  const rawKey = process.env.GDRIVE_SA_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64url(createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key));
  const jwt = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Drive's thumbnailLink ends `=s<n>` — swap the number to ask for a
 *  different render size instead of generating our own. */
function resized(thumbnailLink: string, size: number): string {
  return thumbnailLink.replace(/=s\d+$/, `=s${size}`);
}

type DriveFile = {
  id: string;
  name: string;
  thumbnailLink?: string;
  imageMediaMetadata?: { width?: number; height?: number };
};

async function fetchDrivePhotos(): Promise<DrivePhoto[]> {
  const folderId = process.env.GDRIVE_PHOTOS_FOLDER_ID;
  if (!folderId) return [];

  const token = await getAccessToken();
  if (!token) return [];

  const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const fields = "files(id,name,thumbnailLink,imageMediaMetadata)";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];

  const data = (await res.json()) as { files?: DriveFile[] };

  return (data.files ?? [])
    .filter((file): file is DriveFile & { thumbnailLink: string } => !!file.thumbnailLink)
    .map((file) => ({
      id: file.id,
      name: file.name,
      width: file.imageMediaMetadata?.width ?? 0,
      height: file.imageMediaMetadata?.height ?? 0,
      thumbUrl: resized(file.thumbnailLink, 400),
      fullUrl: resized(file.thumbnailLink, 1920),
    }));
}

export async function GET() {
  try {
    const photos = await fetchDrivePhotos();
    return Response.json({ photos });
  } catch {
    return Response.json({ photos: [] });
  }
}
