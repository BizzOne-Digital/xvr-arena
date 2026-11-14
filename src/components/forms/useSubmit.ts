"use client";

import { useState } from "react";

export type FieldErrors = Record<string, string[] | undefined>;

export async function postJson<T = unknown>(url: string, body: unknown, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || "Something went wrong. Please try again.") as Error & { details?: FieldErrors; status?: number };
    err.details = data?.details;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export function useSubmit<T>(url: string) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(body: unknown): Promise<T | null> {
    setStatus("loading");
    setError(null);
    setFieldErrors({});
    try {
      const data = await postJson<T>(url, body);
      setStatus("success");
      return data;
    } catch (e) {
      const err = e as Error & { details?: FieldErrors };
      setError(err.message);
      setFieldErrors(err.details ?? {});
      setStatus("error");
      return null;
    }
  }
  return { status, error, fieldErrors, submit, reset: () => setStatus("idle") };
}
