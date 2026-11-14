import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDB, isDbConfigured } from "./db";
import { AdminSession, AdminUser, type AdminRole } from "./models";
import { HttpError, randomToken, safeEqual, sha256 } from "./security";

export const SESSION_COOKIE = "xvr_admin";
const SESSION_DAYS = 7;

export type AdminContext = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  csrfToken: string;
};

const ROLE_RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  await connectDB();
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await AdminSession.create({
    tokenHash: sha256(token),
    user: userId,
    csrfToken,
    expiresAt,
    ip: h.get("x-forwarded-for")?.split(",")[0],
    userAgent: h.get("user-agent")?.slice(0, 300),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && isDbConfigured()) {
    await connectDB();
    await AdminSession.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** Validates the session cookie server-side on every call (deduped per request). */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  if (!isDbConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await AdminSession.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await AdminUser.findById(session.user).lean();
  if (!user || !user.active) return null;
  return {
    userId: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    csrfToken: session.csrfToken,
  };
});

/** For admin pages (server components). */
export async function requireAdminPage(minRole: AdminRole = "staff") {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  if (ROLE_RANK[admin.role] < ROLE_RANK[minRole]) redirect("/admin/dashboard?denied=1");
  return admin;
}

/**
 * For admin API route handlers. Validates session, role and (for mutations) the CSRF token
 * sent in the `x-csrf-token` header.
 */
export async function requireAdminApi(req: Request, minRole: AdminRole = "staff") {
  const admin = await getAdmin();
  if (!admin) throw new HttpError(401, "Not signed in");
  if (ROLE_RANK[admin.role] < ROLE_RANK[minRole]) throw new HttpError(403, "You do not have permission for this action");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const sent = req.headers.get("x-csrf-token") || "";
    if (!sent || !safeEqual(sent, admin.csrfToken)) throw new HttpError(403, "Invalid security token. Refresh the page and try again.");
  }
  return admin;
}

export function hasRole(admin: AdminContext, minRole: AdminRole) {
  return ROLE_RANK[admin.role] >= ROLE_RANK[minRole];
}
