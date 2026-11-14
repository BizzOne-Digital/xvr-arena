import { connectDB, isDbConfigured } from "@/lib/db";
import { StoredUpload } from "@/lib/models";
import { isUploadFolder } from "@/lib/uploads";

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#071421"/><text x="50%" y="50%" fill="#00DFFF" font-family="sans-serif" font-size="56" font-weight="700" text-anchor="middle" dominant-baseline="middle" opacity="0.45">XVR</text></svg>`;

function fallback() {
  return new Response(FALLBACK_SVG, {
    status: 404,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
  });
}

/** Serves an uploaded image from MongoDB. Filenames are unique and never overwritten → immutable cache. */
export async function GET(_req: Request, ctx: { params: Promise<{ folder: string; filename: string }> }) {
  const { folder, filename } = await ctx.params;
  if (!isUploadFolder(folder) || !/^[a-z0-9-]+\.(png|jpg|gif|webp)$/i.test(filename) || !isDbConfigured()) return fallback();
  await connectDB();
  const doc = await StoredUpload.findOne({ folder, filename }).lean();
  if (!doc) return fallback();
  const data = Buffer.from((doc.data as unknown as { buffer: ArrayBuffer }).buffer ?? doc.data);
  return new Response(data, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
