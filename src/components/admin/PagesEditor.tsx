"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminApi } from "./AdminContext";
import { LocalImageField } from "./LocalImageField";
import { cn } from "@/lib/utils";

const PAGE_LABELS: Record<string, string> = {
  home: "Homepage",
  about: "About Us",
  parties: "Birthday Parties",
  corporate: "Corporate Events",
  legal: "Privacy & Terms",
};

function labelFor(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace("Cta", "CTA");
}

export function PagesEditor() {
  const api = useAdminApi();
  const [defaults, setDefaults] = useState<Record<string, Record<string, string>> | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [tab, setTab] = useState("home");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api<{ defaults: Record<string, Record<string, string>>; stored: Record<string, Record<string, string>> }>("/api/admin/pages")
      .then((d) => {
        setDefaults(d.defaults);
        const v: Record<string, Record<string, string>> = {};
        for (const [k, def] of Object.entries(d.defaults)) v[k] = { ...def, ...(d.stored[k] ?? {}) };
        setValues(v);
      })
      .catch((e) => setMsg({ kind: "err", text: e.message }));
  }, [api]);

  if (!defaults) return <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading" />;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/pages", { method: "PUT", body: { key: tab, data: values[tab] } });
      setMsg({ kind: "ok", text: "Saved. The live page updates immediately." });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {Object.keys(defaults).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMsg(null); }} className={cn("btn btn-sm", tab === k ? "btn-cyan" : "btn-ghost")}>
            {PAGE_LABELS[k] ?? k}
          </button>
        ))}
      </div>
      <div className="card-neon grid gap-5 p-5 sm:grid-cols-2">
        {tab === "legal" && (
          <p className="rounded-lg border border-red/40 bg-red/10 p-3 text-sm sm:col-span-2">
            Paste only privacy and terms wording approved by the client or their legal advisor. Leave empty to show a &quot;being finalized&quot; notice.
          </p>
        )}
        {Object.keys(defaults[tab]).map((field) => {
          const v = values[tab]?.[field] ?? "";
          const set = (nv: string) => setValues({ ...values, [tab]: { ...values[tab], [field]: nv } });
          if (/image$/i.test(field)) {
            return (
              <div key={field} className="sm:col-span-2">
                <LocalImageField label={labelFor(field)} value={v} folder="pages" onChange={set} />
              </div>
            );
          }
          const long = v.length > 90 || ["description", "body", "intro", "privacy", "terms", "vision", "mission", "ctaText"].includes(field);
          return (
            <div key={field} className={long ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={`pg-${field}`}>
                {labelFor(field)}
              </label>
              {long ? (
                <textarea id={`pg-${field}`} className="field" rows={field === "privacy" || field === "terms" ? 14 : 4} value={v} onChange={(e) => set(e.target.value)} />
              ) : (
                <input id={`pg-${field}`} className="field" value={v} onChange={(e) => set(e.target.value)} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-4">
        {msg && <p className={`text-sm ${msg.kind === "ok" ? "text-cyan" : "text-red"}`}>{msg.text}</p>}
        <button type="button" className="btn btn-red btn-sm" disabled={busy} onClick={save}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save {PAGE_LABELS[tab]}
        </button>
      </div>
    </div>
  );
}
