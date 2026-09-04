import { createSign } from "node:crypto";

import type { DrivePhoto } from "@/store/photography";

/**
 * The Photography folder's contents, read live from a private Google Drive
 * folder. This needs a service account rather than a plain API key: Drive's
 * `files.list` can't resolve "does this caller have access" from an API key
 * alone, even on a folder shared "Anyone with the link" — confirmed 401.
 *
 * The Drive call itself is cached for 30 minutes, so Drive is hit at most
 * once per interval regardless of visitor traffic; `?fresh=1` skips that
 * cache, which is what an expired thumbnail and Explorer's Refresh use.
 * Any failure — missing env vars, a Drive error, a token-exchange failure —
 * falls back to an empty list rather than a broken response, the same rule
 * app/api/scores/route.ts already follows for Upstash.
 */

const CACHE_SECONDS = 1800;

/** A self-signed JWT, exchanged for a Drive-scoped access token — the
 *  service-account flow, with no `googleapis` dependency. */
async function getAccessToken(): Promise<string | null> {
  const email = process.env.GDRIVE_SA_EMAIL;
  const rawKey = process.env.GDRIVE_SA_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.replace(/\\n/g, "\n");

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

/** Drive's thumbnailLink ends in a size/parameter suffix after the last
 *  `=` — usually `=s<n>`, but real links also show up as `=s220-p-k` or
 *  `=w220-h150`. Match any trailing run of word/hyphen characters, not just
 *  a bare `=s<digits>`, so the swap actually lands instead of silently
 *  no-opping and leaving thumbUrl and fullUrl on the same small render. */
const resized = (thumbnailLink: string, size: number) =>
  thumbnailLink.replace(/=[-\w]+$/, `=s${size}`);

type DriveFile = { id: string; name: string; thumbnailLink?: string };

async function fetchDrivePhotos(fresh: boolean): Promise<DrivePhoto[]> {
  const folderId = process.env.GDRIVE_PHOTOS_FOLDER_ID;
  if (!folderId) return [];

  const token = await getAccessToken();
  if (!token) return [];

  const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const fields = "files(id,name,thumbnailLink)";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: CACHE_SECONDS } }),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { files?: DriveFile[] };

  return (data.files ?? [])
    .filter((file): file is DriveFile & { thumbnailLink: string } => !!file.thumbnailLink)
    .map((file) => ({
      id: file.id,
      name: file.name,
      thumbUrl: resized(file.thumbnailLink, 400),
      fullUrl: resized(file.thumbnailLink, 1920),
    }));
}

/**
 * TEMPORARY — delete once the Photography folder is live in production.
 *
 * Every failure above collapses into the same empty list, which is right
 * for visitors and useless for debugging. This walks the same three stages
 * and says which one gives out, in booleans, lengths and HTTP statuses.
 * It never echoes a secret: not the key, not the token, not the folder id.
 */
async function diagnose() {
  const folderId = process.env.GDRIVE_PHOTOS_FOLDER_ID;
  const email = process.env.GDRIVE_SA_EMAIL;
  const rawKey = process.env.GDRIVE_SA_PRIVATE_KEY;

  const out: Record<string, unknown> = {
    hasFolderId: !!folderId,
    folderIdLength: folderId?.length ?? 0,
    hasEmail: !!email,
    emailIsServiceAccount: !!email?.endsWith(".gserviceaccount.com"),
    hasKey: !!rawKey,
    keyLength: rawKey?.length ?? 0,
    keyStartsWithPem: !!rawKey?.trimStart().startsWith("-----BEGIN"),
    keyIsQuoted: !!rawKey?.trimStart().startsWith('"'),
    keyHasEscapedNewlines: !!rawKey?.includes("\\n"),
    keyHasRealNewlines: !!rawKey?.includes("\n"),
  };
  if (!folderId || !email || !rawKey) return out;

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

  let signature: string;
  try {
    signature = createSign("RSA-SHA256")
      .update(`${header}.${claims}`)
      .sign(rawKey.replace(/\\n/g, "\n"))
      .toString("base64url");
  } catch (error) {
    out.stage = "sign";
    out.signError = String(error).slice(0, 200);
    return out;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    cache: "no-store",
  });
  out.tokenStatus = tokenRes.status;
  const tokenBody = await tokenRes.text();
  if (!tokenRes.ok) {
    out.stage = "token";
    out.tokenError = tokenBody.slice(0, 300);
    return out;
  }
  const token = (JSON.parse(tokenBody) as { access_token?: string }).access_token;
  out.gotToken = !!token;

  const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const fields = "files(id,name,thumbnailLink)";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000`;
  const driveRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  out.driveStatus = driveRes.status;
  const driveBody = await driveRes.text();
  if (!driveRes.ok) {
    out.stage = "drive";
    out.driveError = driveBody.slice(0, 400);
    return out;
  }

  const files = (JSON.parse(driveBody) as { files?: DriveFile[] }).files ?? [];
  out.stage = "ok";
  out.fileCount = files.length;
  out.withThumbnailLink = files.filter((file) => file.thumbnailLink).length;
  out.firstFileName = files[0]?.name;
  return out;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("debug")) return Response.json(await diagnose());
    return Response.json({ photos: await fetchDrivePhotos(params.has("fresh")) });
  } catch (error) {
    return Response.json({ photos: [], error: String(error).slice(0, 200) });
  }
}
