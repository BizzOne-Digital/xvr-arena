import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { handle, ok, parseJson, fail } from "@/lib/api";
import { hashPassword, requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AdminSession, AdminUser } from "@/lib/models";
import { audit, HttpError } from "@/lib/security";

const schema = z.object({
  role: z.enum(["owner", "manager", "staff"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(12).max(200).optional(),
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail(404, "Not found");
  const admin = await requireAdminApi(req, "owner");
  const input = await parseJson(req, schema);
  await connectDB();
  if (id === admin.userId && (input.active === false || (input.role && input.role !== "owner"))) {
    throw new HttpError(400, "You cannot deactivate or demote your own account.");
  }
  const update: Record<string, unknown> = {};
  if (input.role) update.role = input.role;
  if (input.active !== undefined) update.active = input.active;
  if (input.password) update.passwordHash = await hashPassword(input.password);
  await AdminUser.updateOne({ _id: id }, { $set: update });
  if (input.active === false || input.password) await AdminSession.deleteMany({ user: id });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "user.update", entity: "AdminUser", entityId: id, details: { fields: Object.keys(update).filter((k) => k !== "passwordHash") } });
  return ok({ ok: true });
});
