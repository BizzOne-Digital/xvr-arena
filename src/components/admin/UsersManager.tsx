"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useAdminApi } from "./AdminContext";
import { formatDateTime } from "@/lib/utils";

type U = { _id: string; name: string; email: string; role: string; active: boolean; lastLoginAt?: string };

export function UsersManager() {
  const api = useAdminApi();
  const [users, setUsers] = useState<U[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "staff", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const fetchUsers = useCallback(() => api<{ items: U[] }>("/api/admin/users"), [api]);
  const load = async () => setUsers((await fetchUsers()).items);
  useEffect(() => {
    let alive = true;
    fetchUsers()
      .then((d) => alive && setUsers(d.items))
      .catch((e) => alive && setMsg({ kind: "err", text: e.message }));
    return () => {
      alive = false;
    };
  }, [fetchUsers]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: ok });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg && <p className={`rounded-lg border p-3 text-sm ${msg.kind === "ok" ? "border-cyan/40 bg-cyan/10" : "border-red/40 bg-red/10"}`}>{msg.text}</p>}
      <div className="overflow-x-auto rounded-xl border border-cyan/15">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-bg-2 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Reset password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!users ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted" aria-label="Loading" />
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3">
                    {u.name}
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border border-cyan/25 bg-bg px-2 py-1 text-xs"
                      value={u.role}
                      aria-label={`Role for ${u.name}`}
                      onChange={(e) => run(() => api(`/api/admin/users/${u._id}`, { method: "PATCH", body: { role: e.target.value } }), "Role updated.")}
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-cyan"
                      checked={u.active}
                      aria-label={`${u.name} active`}
                      onChange={(e) => run(() => api(`/api/admin/users/${u._id}`, { method: "PATCH", body: { active: e.target.checked } }), "Account updated.")}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs text-cyan hover:underline"
                      onClick={() => {
                        const pw = prompt(`New password for ${u.name} (min 12 characters):`);
                        if (pw) run(() => api(`/api/admin/users/${u._id}`, { method: "PATCH", body: { password: pw } }), "Password reset. Existing sessions were signed out.");
                      }}
                    >
                      Set new password
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        className="card-neon grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => api("/api/admin/users", { method: "POST", body: form }), "Account created.").then(() => setForm({ name: "", email: "", role: "staff", password: "" }));
        }}
      >
        <h2 className="font-display text-xl font-bold uppercase sm:col-span-2">Add team member</h2>
        <div>
          <label className="label" htmlFor="u-name">
            Name
          </label>
          <input id="u-name" className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="u-email">
            Email
          </label>
          <input id="u-email" type="email" className="field" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="u-role">
            Role
          </label>
          <select id="u-role" className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff – bookings, waivers, inquiries, games, FAQs, gallery, reviews</option>
            <option value="manager">Manager – plus pricing, promotions, experiences, pages, settings, payments</option>
            <option value="owner">Owner – full access including team accounts</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="u-pw">
            Temporary password
          </label>
          <input id="u-pw" type="password" minLength={12} className="field" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-red btn-sm sm:col-span-2 sm:justify-self-start" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />} Create account
        </button>
      </form>
    </div>
  );
}
