import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./security";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Wrap a route handler so thrown HttpError / ZodError become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message, err.details);
      if (err instanceof ZodError) {
        return fail(400, "Please check the highlighted fields.", err.flatten().fieldErrors);
      }
      if ((err as { code?: number })?.code === 11000) return fail(409, "A record with this value already exists.");
      if ((err as Error)?.message === "MONGODB_URI is not configured") {
        return fail(503, "The database is not configured yet. Set MONGODB_URI to enable this feature.");
      }
      console.error("[api] unhandled", err);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid request body");
  }
  return schema.parse(body);
}
