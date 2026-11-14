import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { connectDB } from "./db";
import { AuditLog, RateLimit } from "./models";

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

/**
 * Fixed-window rate limiter backed by MongoDB (works across serverless instances).
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  await connectDB();
  const now = new Date();
  try {
    const doc = await RateLimit.findOneAndUpdate(
      { key, expiresAt: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true },
    ).lean();
    if (doc) return doc.count <= limit;
    await RateLimit.findOneAndUpdate(
      { key },
      { $set: { count: 1, expiresAt: new Date(now.getTime() + windowSec * 1000) } },
      { upsert: true },
    );
    return true;
  } catch {
    // Duplicate key race on first insert: allow, the next request will count.
    return true;
  }
}

export async function resetRateLimit(key: string) {
  await connectDB();
  await RateLimit.deleteOne({ key });
}

export async function audit(entry: {
  actor?: string;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await connectDB();
    await AuditLog.create({ ...entry, ip: await clientIp().catch(() => undefined) });
  } catch (err) {
    console.error("[audit] failed", (err as Error).message);
  }
}

/** Reject cross-site requests for state-changing operations. */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!origin) return; // same-origin fetches from older browsers / server calls
  try {
    if (new URL(origin).host !== host) throw new Error("Cross-origin request rejected");
  } catch {
    throw new HttpError(403, "Cross-origin request rejected");
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
