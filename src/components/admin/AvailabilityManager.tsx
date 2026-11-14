"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useAdmin, useAdminApi, roleAtLeast } from "./AdminContext";
import { minutesToLabel } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Hours = { day: number; open: boolean; openTime: string; closeTime: string };
type Rule = { _id: string; key: "closure" | "override"; date: string; endDate?: string; reason?: string; openTime?: string; closeTime?: string; resourceKey?: string };
type Usage = { _id: string; resourceKey: string; minutes: number; used: number; capacity: number };

export function AvailabilityManager() {
  const api = useAdminApi();
  const { role } = useAdmin();
  const canEdit = roleAtLeast(role, "manager");
  const [hours, setHours] = useState<Hours[] | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [closure, setClosure] = useState({ date: "", endDate: "", reason: "", resourceKey: "" });
  const [override, setOverride] = useState({ date: "", openTime: "12:00", closeTime: "20:00", reason: "" });

  const fetchData = useCallback(() => api<{ hours: Hours[]; rules: Rule[]; todayUsage: Usage[] }>("/api/admin/availability"), [api]);
  const apply = (d: { hours: Hours[]; rules: Rule[]; todayUsage: Usage[] }) => {
    setHours([...d.hours].sort((a, b) => a.day - b.day));
    setRules(d.rules);
    setUsage(d.todayUsage);
  };
  const load = async () => apply(await fetchData());

  useEffect(() => {
    let alive = true;
    fetchData()
      .then((d) => {
        if (!alive) return;
        setHours([...d.hours].sort((a, b) => a.day - b.day));
        setRules(d.rules);
        setUsage(d.todayUsage);
      })
      .catch((e) => alive && setMsg({ kind: "err", text: e.message }));
    return () => {
      alive = false;
    };
  }, [fetchData]);

  async function post(body: unknown, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/availability", { method: "POST", body });
      setMsg({ kind: "ok", text: ok });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!hours) return <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading" />;

  return (
    <div className="space-y-8">
      {msg && <p className={`rounded-lg border p-3 text-sm ${msg.kind === "ok" ? "border-cyan/40 bg-cyan/10" : "border-red/40 bg-red/10"}`}>{msg.text}</p>}

      <section className="card-neon p-5" aria-labelledby="weekly">
        <h2 id="weekly" className="mb-1 font-display text-xl font-bold uppercase">
          Weekly operating hours
        </h2>
        <p className="mb-4 text-sm text-muted">Bookable time slots are generated from these hours. Mark hours as confirmed in Settings once the client approves them.</p>
        <fieldset disabled={!canEdit} className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.day} className="grid grid-cols-[110px_auto_1fr_1fr] items-center gap-3 text-sm">
              <span className="font-semibold">{DAYS[h.day]}</span>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-cyan" checked={h.open} onChange={(e) => setHours(hours.map((x, k) => (k === i ? { ...x, open: e.target.checked } : x)))} />
                Open
              </label>
              <input type="time" className="field min-h-10 py-1" aria-label={`${DAYS[h.day]} opening time`} disabled={!h.open} value={h.openTime} onChange={(e) => setHours(hours.map((x, k) => (k === i ? { ...x, openTime: e.target.value } : x)))} />
              <input type="time" className="field min-h-10 py-1" aria-label={`${DAYS[h.day]} closing time`} disabled={!h.open} value={h.closeTime} onChange={(e) => setHours(hours.map((x, k) => (k === i ? { ...x, closeTime: e.target.value } : x)))} />
            </div>
          ))}
          <button type="button" className="btn btn-red btn-sm mt-3" disabled={busy} onClick={() => post({ action: "weekly", hours }, "Weekly hours saved.")}>
            Save hours
          </button>
        </fieldset>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-neon p-5" aria-labelledby="closures">
          <h2 id="closures" className="mb-4 font-display text-xl font-bold uppercase">
            Holiday closures &amp; blackout dates
          </h2>
          <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-date">
                Start date
              </label>
              <input id="c-date" type="date" className="field" value={closure.date} onChange={(e) => setClosure({ ...closure, date: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="c-end">
                End date (optional)
              </label>
              <input id="c-end" type="date" className="field" value={closure.endDate} onChange={(e) => setClosure({ ...closure, endDate: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="c-reason">
                Reason
              </label>
              <input id="c-reason" className="field" value={closure.reason} onChange={(e) => setClosure({ ...closure, reason: e.target.value })} placeholder="e.g. Christmas Day" />
            </div>
            <div>
              <label className="label" htmlFor="c-res">
                Only for resource (optional)
              </label>
              <input id="c-res" className="field" value={closure.resourceKey} onChange={(e) => setClosure({ ...closure, resourceKey: e.target.value })} placeholder="e.g. golf-simulator" />
            </div>
            <button
              type="button"
              className="btn btn-cyan btn-sm sm:col-span-2"
              disabled={busy || !closure.date}
              onClick={() => post({ action: "closure", ...closure }, "Closure added.").then(() => setClosure({ date: "", endDate: "", reason: "", resourceKey: "" }))}
            >
              Add closure
            </button>
          </fieldset>
        </section>

        <section className="card-neon p-5" aria-labelledby="overrides">
          <h2 id="overrides" className="mb-4 font-display text-xl font-bold uppercase">
            Special hours for a date
          </h2>
          <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="o-date">
                Date
              </label>
              <input id="o-date" type="date" className="field" value={override.date} onChange={(e) => setOverride({ ...override, date: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="o-open">
                Opens
              </label>
              <input id="o-open" type="time" className="field" value={override.openTime} onChange={(e) => setOverride({ ...override, openTime: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="o-close">
                Closes
              </label>
              <input id="o-close" type="time" className="field" value={override.closeTime} onChange={(e) => setOverride({ ...override, closeTime: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="o-reason">
                Note
              </label>
              <input id="o-reason" className="field" value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} />
            </div>
            <button type="button" className="btn btn-cyan btn-sm sm:col-span-3" disabled={busy || !override.date} onClick={() => post({ action: "override", ...override }, "Special hours saved.")}>
              Save special hours
            </button>
          </fieldset>
        </section>
      </div>

      <section className="card-neon p-5" aria-labelledby="upcoming-rules">
        <h2 id="upcoming-rules" className="mb-4 font-display text-xl font-bold uppercase">
          Upcoming closures &amp; special hours
        </h2>
        {rules.length === 0 ? (
          <p className="text-sm text-muted">None scheduled.</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {rules.map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <strong className={r.key === "closure" ? "text-red" : "text-cyan"}>{r.key === "closure" ? "Closed" : "Special hours"}</strong> · {r.date}
                  {r.endDate && ` → ${r.endDate}`}
                  {r.key === "override" && ` · ${r.openTime}–${r.closeTime}`}
                  {r.resourceKey && ` · ${r.resourceKey} only`}
                  {r.reason && <span className="text-muted"> · {r.reason}</span>}
                </span>
                {canEdit && (
                  <button type="button" className="rounded p-2 text-red hover:bg-red/10" aria-label="Delete rule" onClick={() => post({ action: "delete", id: r._id }, "Removed.")}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-neon p-5" aria-labelledby="usage">
        <h2 id="usage" className="mb-1 font-display text-xl font-bold uppercase">
          Today&apos;s capacity usage
        </h2>
        <p className="mb-4 text-sm text-muted">Live capacity reserved per resource and time slot (includes temporary checkout holds). Session length, buffers and max capacity are set per experience.</p>
        {usage.length === 0 ? (
          <p className="text-sm text-muted">No capacity reserved today.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {usage.map((u) => (
              <li key={u._id} className="rounded-lg border border-white/10 p-3 text-sm">
                <span className="font-semibold">{u.resourceKey}</span> · {minutesToLabel(u.minutes)}
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan" style={{ width: `${Math.min(100, (u.used / u.capacity) * 100)}%` }} />
                </div>
                <span className="text-xs text-muted">
                  {u.used}/{u.capacity} used
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
