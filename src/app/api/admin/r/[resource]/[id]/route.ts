import { revalidateTag } from "next/cache";
import { isValidObjectId } from "mongoose";
import { handle, ok, fail } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getResource, resourceSchema } from "@/lib/admin/registry";
import { audit } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { collectUploadUrls, deleteUploadIfUnreferenced } from "@/lib/uploads";

type Ctx = { params: Promise<{ resource: string; id: string }> };

async function load(ctx: Ctx) {
  const { resource, id } = await ctx.params;
  const r = getResource(resource);
  if (!r || !isValidObjectId(id)) return null;
  return { r, resource, id };
}

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const l = await load(ctx);
  if (!l) return fail(404, "Not found");
  await requireAdminApi(req);
  await connectDB();
  const item = await l.r.model.findById(l.id).lean();
  if (!item) return fail(404, "Not found");
  return ok({ item });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const l = await load(ctx);
  if (!l) return fail(404, "Not found");
  const admin = await requireAdminApi(req, l.r.def.minRole ?? "staff");
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return fail(400, "Invalid request body");
  const parsed = resourceSchema(l.r.def, true).parse(raw) as Record<string, unknown>;
  // Only touch fields the client actually sent, so partial updates never clear other data.
  const data = Object.fromEntries(Object.entries(parsed).filter(([k]) => k in raw));
  if ("slug" in data && l.r.def.slugFrom) {
    data.slug = slugify(String(data.slug || data[l.r.def.slugFrom] || ""));
    if (!data.slug) delete data.slug;
  }
  if (typeof data.code === "string") data.code = data.code.toUpperCase() || undefined;

  await connectDB();
  const before = await l.r.model.findById(l.id).lean();
  if (!before) return fail(404, "Not found");

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) $unset[k] = 1;
    else $set[k] = v;
  }
  const item = await l.r.model
    .findByIdAndUpdate(l.id, { ...(Object.keys($set).length && { $set }), ...(Object.keys($unset).length && { $unset }) }, { new: true, runValidators: true })
    .lean();

  // Remove replaced images that nothing else uses.
  const oldUrls = collectUploadUrls(before);
  const newUrls = collectUploadUrls(item);
  for (const url of oldUrls) if (!newUrls.has(url)) await deleteUploadIfUnreferenced(url);

  l.r.tags.forEach((t) => revalidateTag(t, { expire: 0 }));
  await audit({ actor: admin.userId, actorEmail: admin.email, action: `${l.resource}.update`, entity: l.resource, entityId: l.id, details: { fields: Object.keys(data) } });
  return ok({ item });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const l = await load(ctx);
  if (!l) return fail(404, "Not found");
  const admin = await requireAdminApi(req, l.r.def.deleteRole ?? l.r.def.minRole ?? "manager");
  await connectDB();
  const before = await l.r.model.findByIdAndDelete(l.id).lean();
  if (!before) return fail(404, "Not found");
  for (const url of collectUploadUrls(before)) await deleteUploadIfUnreferenced(url);
  l.r.tags.forEach((t) => revalidateTag(t, { expire: 0 }));
  await audit({ actor: admin.userId, actorEmail: admin.email, action: `${l.resource}.delete`, entity: l.resource, entityId: l.id });
  return ok({ ok: true });
});
