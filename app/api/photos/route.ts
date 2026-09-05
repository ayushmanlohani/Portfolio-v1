import { getAccessToken } from "@/assistant/drive";
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

export async function GET(request: Request) {
  try {
    const fresh = new URL(request.url).searchParams.has("fresh");
    return Response.json({ photos: await fetchDrivePhotos(fresh) });
  } catch {
    return Response.json({ photos: [] });
  }
}
