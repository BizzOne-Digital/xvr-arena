import { z } from "zod";
import { handle, ok, parseJson } from "@/lib/api";
import { hashPassword, requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AdminUser } from "@/lib/models";
import { audit } from "@/lib/security";

export const GET = handle(async (req: Request) => {
  await requireAdminApi(req, "owner");
  await connectDB();
  const items = await AdminUser.find({}).sort({ createdAt: 1 }).lean();
  return ok({ items });
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["owner", "manager", "staff"]),
  password: z.string().min(12, "Use at least 12 characters").max(200),
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdminApi(req, "owner");
  const input = await parseJson(req, schema);
  await connectDB();
  const user = await AdminUser.create({ name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "user.create", entity: "AdminUser", entityId: String(user._id), details: { role: input.role } });
  return ok({ ok: true }, { status: 201 });
});
