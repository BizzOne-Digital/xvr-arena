import "server-only";
import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null; failedAt?: number; lastError?: string };

/** After a failed connection, skip new attempts for this long so pages fall back instantly. */
const RETRY_AFTER_MS = 30_000;
const g = globalThis as unknown as { __xvrMongo?: Cache };
const cache: Cache = g.__xvrMongo ?? (g.__xvrMongo = { conn: null, promise: null });

export function isDbConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectDB() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (cache.failedAt && Date.now() - cache.failedAt < RETRY_AFTER_MS) {
    throw new Error(cache.lastError || "Database unavailable");
  }
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { bufferCommands: false, maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
      .then((m) => {
        cache.failedAt = undefined;
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        cache.failedAt = Date.now();
        cache.lastError = (err as Error).message;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
