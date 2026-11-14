import { z } from "zod";
import { handle, ok, fail, parseJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { StoredUpload } from "@/lib/models";
import { audit } from "@/lib/security";
import {
  deleteUploadIfUnreferenced,
  isUploadFolder,
  MAX_UPLOAD_BYTES,
  sniffImage,
  uniqueFilename,
  uploadUrl,
} from "@/lib/uploads";

/** POST /api/upload — FormData { file, folder }. Stores the image in MongoDB. */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Expected multipart form data.");
  const file = form.get("file");
  const folder = form.get("folder");
  if (!isUploadFolder(folder)) return fail(400, "Invalid upload folder.");
  if (!(file instanceof File)) return fail(400, "No file was uploaded.");
  if (file.size === 0) return fail(400, "The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Images must be 8 MB or smaller.");

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf, file.type);
  if (!kind) return fail(415, "Only PNG, JPEG, WEBP or GIF images are allowed, and the file must match its type.");

  await connectDB();
  const filename = uniqueFilename(kind.ext);
  await StoredUpload.create({ folder, filename, mimeType: kind.mime, size: buf.length, data: buf });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "upload.create", entity: "StoredUpload", entityId: `${folder}/${filename}` });
  return ok({ url: uploadUrl(folder, filename), folder, filename, size: buf.length, mimeType: kind.mime });
});

/** DELETE /api/upload { url } — deletes only when no content references the image. */
export const DELETE = handle(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const { url } = await parseJson(req, z.object({ url: z.string().max(300) }));
  const deleted = await deleteUploadIfUnreferenced(url);
  if (deleted) await audit({ actor: admin.userId, actorEmail: admin.email, action: "upload.delete", entity: "StoredUpload", entityId: url });
  return ok({ deleted, reason: deleted ? undefined : "Image is still in use or not a stored upload." });
});
