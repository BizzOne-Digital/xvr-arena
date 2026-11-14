"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useAdmin, useAdminApi, roleAtLeast } from "./AdminContext";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type T = {
  _id: string;
  version: number;
  title: string;
  body: string;
  acknowledgments: string[];
  requireDob: boolean;
  minorAgeThreshold: number;
  retentionYears?: number;
  status: "draft" | "published" | "archived";
  legalApprovalNote?: string;
  publishedAt?: string;
  contentHash?: string;
};

export function WaiverTemplates() {
  const api = useAdminApi();
  const { role } = useAdmin();
  const canEdit = roleAtLeast(role, "manager");
  const [items, setItems] = useState<T[] | null>(null);
  const [sel, setSel] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [approval, setApproval] = useState({ ok: false, note: "" });

  const fetchItems = useCallback(() => api<{ items: T[] }>("/api/admin/waivers/templates"), [api]);
  const apply = (d: { items: T[] }) => {
    setItems(d.items);
    setSel((cur) => d.items.find((x) => x._id === cur?._id) ?? d.items.find((x) => x.status === "draft") ?? d.items[0] ?? null);
  };
  const load = async () => apply(await fetchItems());

  useEffect(() => {
    let alive = true;
    fetchItems()
      .then((d) => {
        if (!alive) return;
        setItems(d.items);
        setSel(d.items.find((x) => x.status === "draft") ?? d.items[0] ?? null);
      })
      .catch((e) => alive && setMsg({ kind: "err", text: e.message }));
    return () => {
      alive = false;
    };
  }, [fetchItems]);

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

  if (!items) return <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading" />;
  const editable = sel?.status === "draft" && canEdit;

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        {canEdit && (
          <button type="button" className="btn btn-cyan btn-sm w-full" disabled={busy} onClick={() => run(() => api("/api/admin/waivers/templates", { method: "POST", body: {} }), "New draft version created.")}>
            <Plus className="size-4" aria-hidden="true" /> New version
          </button>
        )}
        <ul className="space-y-1">
          {items.map((t) => (
            <li key={t._id}>
              <button
                type="button"
                onClick={() => setSel(t)}
                className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm", sel?._id === t._id ? "border-cyan bg-cyan/10" : "border-white/10 hover:border-cyan/40")}
              >
                Version {t.version}
                <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase", t.status === "published" ? "bg-cyan/20 text-cyan" : t.status === "draft" ? "bg-red/20 text-red" : "bg-white/10 text-muted")}>
                  {t.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 && <p className="text-sm text-muted">No waiver versions yet. Create the first draft.</p>}
      </div>

      {sel && (
        <div className="card-neon space-y-4 p-5">
          {msg && <p className={`rounded-lg border p-3 text-sm ${msg.kind === "ok" ? "border-cyan/40 bg-cyan/10" : "border-red/40 bg-red/10"}`}>{msg.text}</p>}
          {sel.status !== "draft" && (
            <p className="rounded-lg border border-white/10 bg-bg/50 p-3 text-sm text-muted">
              {sel.status === "published" ? `Published ${sel.publishedAt ? formatDateTime(sel.publishedAt) : ""}. ` : "Archived. "}
              Published text is locked so every signed waiver matches the exact version accepted. Create a new version to make changes.
              {sel.legalApprovalNote && <span className="mt-1 block">Approval: {sel.legalApprovalNote}</span>}
              {sel.contentHash && <span className="mt-1 block break-all font-mono text-[10px]">SHA-256 {sel.contentHash}</span>}
            </p>
          )}
          <fieldset disabled={!editable} className="space-y-4">
            <div>
              <label className="label" htmlFor="w-title">
                Title
              </label>
              <input id="w-title" className="field" value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="w-body">
                Waiver text (client-approved legal wording only)
              </label>
              <textarea id="w-body" className="field font-mono text-sm" rows={16} value={sel.body} onChange={(e) => setSel({ ...sel, body: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="w-acks">
                Required acknowledgments (one per line — each becomes a checkbox)
              </label>
              <textarea
                id="w-acks"
                className="field text-sm"
                rows={4}
                value={sel.acknowledgments.join("\n")}
                onChange={(e) => setSel({ ...sel, acknowledgments: e.target.value.split("\n") })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm">
                <input type="checkbox" className="size-5 accent-cyan" checked={sel.requireDob} onChange={(e) => setSel({ ...sel, requireDob: e.target.checked })} /> Require date of birth
              </label>
              <div>
                <label className="label" htmlFor="w-minor">
                  Guardian required under age
                </label>
                <input id="w-minor" type="number" min={1} max={25} className="field" value={sel.minorAgeThreshold} onChange={(e) => setSel({ ...sel, minorAgeThreshold: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label" htmlFor="w-ret">
                  Retention period (years)
                </label>
                <input id="w-ret" type="number" min={1} max={50} className="field" value={sel.retentionYears ?? ""} onChange={(e) => setSel({ ...sel, retentionYears: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>
            {editable && (
              <button
                type="button"
                className="btn btn-cyan btn-sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api(`/api/admin/waivers/templates/${sel._id}`, {
                        method: "PATCH",
                        body: {
                          action: "save",
                          title: sel.title,
                          body: sel.body,
                          acknowledgments: sel.acknowledgments.map((a) => a.trim()).filter(Boolean),
                          requireDob: sel.requireDob,
                          minorAgeThreshold: sel.minorAgeThreshold,
                          retentionYears: sel.retentionYears,
                        },
                      }),
                    "Draft saved.",
                  )
                }
              >
                Save draft
              </button>
            )}
          </fieldset>

          {editable && (
            <div className="space-y-3 rounded-xl border border-red/40 bg-red/5 p-4">
              <h3 className="font-display text-lg font-bold uppercase text-red">Publish this version</h3>
              <p className="text-sm text-muted">
                Publishing replaces the current live waiver for new signatures. Previously signed waivers keep their original version. A digital signature alone does not
                guarantee legal compliance — publish only wording approved by the client&apos;s legal advisor.
              </p>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-5 accent-cyan" checked={approval.ok} onChange={(e) => setApproval({ ...approval, ok: e.target.checked })} />
                I confirm this wording has been approved by XVR for publication.
              </label>
              <input className="field" placeholder="Approved by / date (e.g. Approved by owner via legal counsel, 2026-11-20)" value={approval.note} onChange={(e) => setApproval({ ...approval, note: e.target.value })} />
              <button
                type="button"
                className="btn btn-red btn-sm"
                disabled={busy || !approval.ok || approval.note.length < 3}
                onClick={() =>
                  run(() => api(`/api/admin/waivers/templates/${sel._id}`, { method: "PATCH", body: { action: "publish", legalApproval: true, legalApprovalNote: approval.note } }), "Waiver published.")
                }
              >
                Publish waiver
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
