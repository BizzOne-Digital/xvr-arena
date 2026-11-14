import { handle, ok, parseJson } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AdminUser } from "@/lib/models";
import { assertSameOrigin, audit, clientIp, HttpError, rateLimit, safeEqual } from "@/lib/security";
import { setupSchema } from "@/lib/validation";

/**
 * Creates the first owner account. Only works while no admin exists AND the caller knows
 * ADMIN_SETUP_TOKEN from the server environment.
 */
export const POST = handle(async (req: Request) => {
  await assertSameOrigin();
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || expected.length < 16) throw new HttpError(503, "Set ADMIN_SETUP_TOKEN (16+ characters) in the server environment first.");
  const input = await parseJson(req, setupSchema);
  await connectDB();
  if (!(await rateLimit(`setup:${await clientIp()}`, 10, 900))) throw new HttpError(429, "Too many attempts.");
  if (!safeEqual(input.setupToken, expected)) throw new HttpError(403, "Invalid setup token.");
  if (await AdminUser.exists({})) throw new HttpError(409, "Setup is already complete. Please sign in.");

  const user = await AdminUser.create({
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
    role: "owner",
  });
  await createSession(String(user._id));
  await audit({ actor: String(user._id), actorEmail: user.email, action: "auth.setup_owner", entity: "AdminUser", entityId: String(user._id) });
  return ok({ ok: true });
});
