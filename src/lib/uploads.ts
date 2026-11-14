import "server-only";
import crypto from "node:crypto";
import { connectDB } from "./db";
import {
  Experience,
  GalleryItem,
  Game,
  PageContent,
  Promotion,
  Review,
  SiteSettings,
  StoredUpload,
} from "./models";
import { UPLOAD_FOLDERS, type UploadFolder } from "./constants";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/gif", ext: "gif", test: (b) => ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii")) },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** Detect the real image type from file bytes; MIME headers alone are not trusted. */
export function sniffImage(buf: Buffer, declaredMime: string) {
  const match = SIGNATURES.find((s) => s.test(buf));
  if (!match) return null;
  const declared = declaredMime === "image/jpg" ? "image/jpeg" : declaredMime;
  if (declared && declared !== match.mime) return null;
  return match;
}

export function isUploadFolder(v: unknown): v is UploadFolder {
  return typeof v === "string" && (UPLOAD_FOLDERS as readonly string[]).includes(v);
}

export function uniqueFilename(ext: string) {
  return `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
}

export function uploadUrl(folder: string, filename: string) {
  return `/api/uploads/${folder}/${filename}`;
}

export function parseUploadUrl(url: string) {
  const m = /^\/api\/uploads\/([a-z]+)\/([a-z0-9-]+\.(?:png|jpg|gif|webp))$/i.exec(url.trim());
  return m ? { folder: m[1], filename: m[2] } : null;
}

/** Returns true if any content document still references the upload URL. */
export async function isUploadReferenced(url: string) {
  await connectDB();
  const checks = await Promise.all([
    Experience.exists({ $or: [{ image: url }, { gallery: url }] }),
    Game.exists({ $or: [{ image: url }, { bannerImage: url }, { gallery: url }] }),
    GalleryItem.exists({ image: url }),
    Promotion.exists({ image: url }),
    Review.exists({ image: url }),
    SiteSettings.exists({ logoUrl: url }),
  ]);
  if (checks.some(Boolean)) return true;
  // Page content is free-form JSON; search its serialized form.
  const pages = await PageContent.find({}).select("data").lean();
  return pages.some((p) => JSON.stringify(p.data ?? {}).includes(url));
}

/** Delete old upload only if nothing references it anymore. */
export async function deleteUploadIfUnreferenced(url?: string | null) {
  if (!url) return false;
  const parsed = parseUploadUrl(url);
  if (!parsed) return false;
  if (await isUploadReferenced(url)) return false;
  await StoredUpload.deleteOne(parsed);
  return true;
}

/** Collect upload URLs present in a record, to clean up after replacement. */
export function collectUploadUrls(value: unknown, out = new Set<string>()) {
  if (typeof value === "string") {
    if (parseUploadUrl(value)) out.add(value);
  } else if (Array.isArray(value)) value.forEach((v) => collectUploadUrls(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectUploadUrls(v, out));
  return out;
}
