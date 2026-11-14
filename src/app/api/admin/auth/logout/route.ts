import { handle, ok } from "@/lib/api";
import { destroySession, getAdmin } from "@/lib/auth";
import { assertSameOrigin, audit } from "@/lib/security";

export const POST = handle(async () => {
  await assertSameOrigin();
  const admin = await getAdmin();
  await destroySession();
  if (admin) await audit({ actor: admin.userId, actorEmail: admin.email, action: "auth.logout", entity: "AdminUser" });
  return ok({ ok: true });
});
