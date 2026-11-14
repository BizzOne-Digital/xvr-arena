import { handle, ok, parseJson } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AdminUser } from "@/lib/models";
import { assertSameOrigin, audit, clientIp, HttpError, rateLimit, resetRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

// Constant hash used to keep timing similar when the email does not exist.
const DUMMY_HASH = "$2b$12$JSdmJTdPelkheWweQWAV7u/0D5dw8VQfFR4lYBcqCDonqYRVIuWUG";

export const POST = handle(async (req: Request) => {
  await assertSameOrigin();
  const { email, password } = await parseJson(req, loginSchema);
  await connectDB();
  const ip = await clientIp();
  const ipOk = await rateLimit(`login-ip:${ip}`, 20, 900);
  const userOk = await rateLimit(`login-user:${email}`, 8, 900);
  if (!ipOk || !userOk) throw new HttpError(429, "Too many sign-in attempts. Please wait 15 minutes and try again.");

  const user = await AdminUser.findOne({ email }).select("+passwordHash");
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.active) {
    await audit({ actorEmail: email, action: "auth.login_failed", entity: "AdminUser" });
    throw new HttpError(401, "Incorrect email or password.");
  }
  await resetRateLimit(`login-user:${email}`);
  user.lastLoginAt = new Date();
  await user.save();
  await createSession(String(user._id));
  await audit({ actor: String(user._id), actorEmail: email, action: "auth.login", entity: "AdminUser", entityId: String(user._id) });
  return ok({ ok: true });
});
