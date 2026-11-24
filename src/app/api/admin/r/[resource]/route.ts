import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseJson } from "@/lib/api";
import { hasRole, requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getResource, resourceSchema } from "@/lib/admin/registry";
import { audit } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { CATALOG_GAMES } from "@/lib/games-catalog";

type Ctx = { params: Promise<{ resource: string }> };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { resource } = await ctx.params;
  const r = getResource(resource);
  if (!r) return fail(404, "Unknown resource");
  const admin = await requireAdminApi(req);
  if (r.def.minRole && !hasRole(admin, r.def.minRole) && req.method !== "GET") return fail(403, "Not allowed");
  await connectDB();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const status = url.searchParams.get("status") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(5, Number(url.searchParams.get("limit")) || 25));

  const filter: Record<string, unknown> = {};
  if (q) filter.$or = r.def.searchFields.map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } }));
  if (status && r.def.statusFilter && r.def.statusFilter.options.includes(status)) filter[r.def.statusFilter.field] = status;

  const [items, total] = await Promise.all([
    r.model.find(filter).sort(r.def.sort).skip((page - 1) * limit).limit(limit).lean(),
    r.model.countDocuments(filter),
  ]);
  return ok({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { resource } = await ctx.params;
  const r = getResource(resource);
  if (!r) return fail(404, "Unknown resource");
  if (r.def.allowCreate === false) return fail(405, "Records of this type are created by customers.");
  const admin = await requireAdminApi(req, r.def.minRole ?? "staff");
  const data = (await parseJson(req, resourceSchema(r.def))) as Record<string, unknown>;
  if (r.def.slugFrom && r.def.fields.some((f) => f.name === "slug")) {
    data.slug = slugify(String(data.slug || data[r.def.slugFrom] || ""));
    if (!data.slug) return fail(400, "A name is required to create the URL slug.");
  }
  if (typeof data.code === "string") data.code = data.code.toUpperCase() || undefined;
  await connectDB();
  if (resource === "games" && (await r.model.estimatedDocumentCount()) === 0) {
    await r.model.insertMany(CATALOG_GAMES); // keep the starter catalog alongside the first game added by hand
  }
  const doc = await r.model.create(data);
  r.tags.forEach((t) => revalidateTag(t, { expire: 0 }));
  await audit({ actor: admin.userId, actorEmail: admin.email, action: `${resource}.create`, entity: resource, entityId: String(doc._id) });
  return ok({ item: doc.toObject() }, { status: 201 });
});
