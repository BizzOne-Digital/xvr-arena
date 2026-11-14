"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Ctx = { csrfToken: string; role: "owner" | "manager" | "staff"; name: string; email: string };
const AdminCtx = createContext<Ctx | null>(null);

export function AdminProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdmin() {
  const v = useContext(AdminCtx);
  if (!v) throw new Error("useAdmin must be used inside AdminProvider");
  return v;
}

export type ApiError = Error & { status?: number; details?: Record<string, string[] | undefined> };

/** fetch wrapper for admin APIs: JSON, CSRF header, consistent errors. */
export function useAdminApi() {
  const { csrfToken } = useAdmin();
  const router = useRouter();
  return useCallback(
    async <T,>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> => {
      const res = await fetch(url, {
        method: opts.method ?? (opts.body ? "POST" : "GET"),
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/admin");
      }
      if (!res.ok) {
        const err = new Error(data?.error || `Request failed (${res.status})`) as ApiError;
        err.status = res.status;
        err.details = data?.details;
        throw err;
      }
      return data as T;
    },
    [csrfToken, router],
  );
}

export function roleAtLeast(role: Ctx["role"], min: Ctx["role"]) {
  const rank = { staff: 1, manager: 2, owner: 3 };
  return rank[role] >= rank[min];
}
