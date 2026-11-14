"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { useAdminApi } from "./AdminContext";
import { LocalImageField } from "./LocalImageField";

type S = Record<string, unknown> & { social: Record<string, string>; notifyEmails: string[] };
type Integrations = { stripe: boolean; smtp: boolean; cron: boolean; siteUrl: boolean; maps: boolean };

function Section({ title, children, desc }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card-neon p-5">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const NUM = ["taxRatePercent", "bookingFeeCents", "holdMinutes", "minLeadMinutes", "maxAdvanceDays", "slotIntervalMin", "cancellationCutoffHours", "reminderHoursBefore"];

export function SettingsForm() {
  const api = useAdminApi();
  const [s, setS] = useState<S | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api<{ settings: S; integrations: Integrations }>("/api/admin/settings")
      .then((d) => {
        setS({ ...d.settings, social: d.settings.social ?? {}, notifyEmails: d.settings.notifyEmails ?? [] });
        setIntegrations(d.integrations);
      })
      .catch((e) => setMsg({ kind: "err", text: e.message }));
  }, [api]);

  if (!s) return msg ? <p className="text-red">{msg.text}</p> : <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading" />;

  const set = (k: string, v: unknown) => setS({ ...s, [k]: v });
  const text = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`s-${k}`}>
        {label}
      </label>
      <input id={`s-${k}`} className="field" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );
  const num = (k: string, label: string, help?: string) => (
    <div>
      <label className="label" htmlFor={`s-${k}`}>
        {label}
      </label>
      <input id={`s-${k}`} type="number" className="field" value={String(s[k] ?? 0)} onChange={(e) => set(k, e.target.value)} />
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  );
  const bool = (k: string, label: string) => (
    <label className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm">
      <input type="checkbox" className="size-5 accent-cyan" checked={!!s[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
    </label>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = { ...s };
    for (const k of NUM) body[k] = Number(body[k] ?? 0);
    body.bookingFeeCents = Math.round(Number(s.bookingFeeDollars ?? Number(s.bookingFeeCents) / 100) * 100);
    delete body.bookingFeeDollars;
    for (const k of ["_id", "__v", "createdAt", "updatedAt", "key"]) delete body[k];
    try {
      await api("/api/admin/settings", { method: "PUT", body });
      setMsg({ kind: "ok", text: "Settings saved." });
    } catch (err) {
      const e2 = err as Error & { details?: Record<string, string[]> };
      setMsg({ kind: "err", text: `${e2.message}${e2.details ? " " + Object.entries(e2.details).map(([k, v]) => `${k}: ${v?.[0]}`).join("; ") : ""}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {integrations && (
        <section className="card-neon p-5">
          <h2 className="font-display text-xl font-bold uppercase">Integrations</h2>
          <p className="mt-1 text-sm text-muted">Credentials are set as server environment variables (never stored in the database). See the README for setup.</p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Stripe payments", integrations.stripe, "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET"],
              ["SMTP email", integrations.smtp, "SMTP_HOST / SMTP_USER / SMTP_PASS"],
              ["Scheduled jobs", integrations.cron, "CRON_SECRET"],
              ["Public site URL", integrations.siteUrl, "NEXT_PUBLIC_SITE_URL"],
              ["Google Maps embed key", integrations.maps, "NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY (optional)"],
            ].map(([label, ok, env]) => (
              <li key={String(label)} className="flex items-start gap-2 rounded-lg border border-white/10 p-3">
                {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan" aria-label="Configured" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-red" aria-label="Missing" />}
                <span>
                  {label}
                  <span className="block text-xs text-muted">{env}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Business information">
        {text("businessName", "Business name")}
        {text("phone", "Phone")}
        {text("email", "Email", { type: "email" })}
        {text("addressLine1", "Address")}
        {text("city", "City")}
        {text("province", "Province")}
        {text("postalCode", "Postal code")}
        {text("country", "Country")}
        {text("entranceNote", "Entrance note")}
        {text("mapsQuery", "Google Maps search query")}
        <div className="sm:col-span-2">{bool("hoursConfirmed", "Business hours are confirmed (show them publicly)")}</div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-hoursNote">
            Message shown while hours are unconfirmed
          </label>
          <input id="s-hoursNote" className="field" value={String(s.hoursNote ?? "")} onChange={(e) => set("hoursNote", e.target.value)} />
        </div>
      </Section>

      <Section title="Branding & social">
        <div className="sm:col-span-2">
          <LocalImageField label="Official logo (PNG/WEBP with transparent background)" value={String(s.logoUrl ?? "")} folder="misc" onChange={(v) => set("logoUrl", v)} help="Until a logo is uploaded, the site uses a temporary XVR wordmark." />
        </div>
        {(["facebook", "instagram", "tiktok", "youtube"] as const).map((k) => (
          <div key={k}>
            <label className="label capitalize" htmlFor={`soc-${k}`}>
              {k} URL
            </label>
            <input id={`soc-${k}`} type="url" className="field" value={s.social[k] ?? ""} onChange={(e) => setS({ ...s, social: { ...s.social, [k]: e.target.value } })} />
          </div>
        ))}
      </Section>

      <Section title="Booking rules" desc="These rules are enforced on the server for every booking.">
        {num("slotIntervalMin", "Time-slot interval (minutes)", "10, 15, 20, 30, 45 or 60")}
        {num("holdMinutes", "Checkout hold (minutes)", "Minimum 30 (Stripe requirement)")}
        {num("minLeadMinutes", "Minimum notice before a session (minutes)")}
        {num("maxAdvanceDays", "How far ahead customers can book (days)")}
        {num("taxRatePercent", "Tax rate (%)", "Set to the rate confirmed by the client's accountant (e.g. GST/PST)")}
        {text("taxLabel", "Tax label shown at checkout")}
        <div>
          <label className="label" htmlFor="s-fee">
            Booking fee (CAD)
          </label>
          <input
            id="s-fee"
            type="number"
            step="0.01"
            className="field"
            value={String(s.bookingFeeDollars ?? (Number(s.bookingFeeCents ?? 0) / 100).toFixed(2))}
            onChange={(e) => set("bookingFeeDollars", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="s-waiverTiming">
            Waiver policy
          </label>
          <select id="s-waiverTiming" className="field" value={String(s.waiverTiming)} onChange={(e) => set("waiverTiming", e.target.value)}>
            <option value="before_arrival">Sign any time before arrival (optional during checkout)</option>
            <option value="before_payment">Booker must sign before payment</option>
          </select>
        </div>
        <div className="sm:col-span-2">{bool("onlinePaymentsEnabled", "Take payment online with Stripe (when off, bookings become requests that staff approve)")}</div>
      </Section>

      <Section title="Cancellations & arrival">
        {num("cancellationCutoffHours", "Online self-cancellation closes (hours before session)")}
        {num("reminderHoursBefore", "Send reminder email (hours before session)")}
        <div className="sm:col-span-2">{bool("allowSelfReschedule", "Allow customers to request rescheduling online")}</div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-cancel">
            Cancellation policy (shown on confirmations; must be client-approved)
          </label>
          <textarea id="s-cancel" className="field" rows={4} value={String(s.cancellationPolicy ?? "")} onChange={(e) => set("cancellationPolicy", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-arrival">
            Arrival instructions (included in emails)
          </label>
          <textarea id="s-arrival" className="field" rows={3} value={String(s.arrivalInstructions ?? "")} onChange={(e) => set("arrivalInstructions", e.target.value)} />
        </div>
      </Section>

      <Section title="Notifications">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-notify">
            Admin notification emails (one per line)
          </label>
          <textarea
            id="s-notify"
            className="field"
            rows={3}
            value={s.notifyEmails.join("\n")}
            onChange={(e) => setS({ ...s, notifyEmails: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
          />
          <p className="mt-1 text-xs text-muted">New bookings, inquiries, cancellations, payment failures and completed waivers are sent here (requires SMTP).</p>
        </div>
      </Section>

      <div className="sticky bottom-4 flex items-center justify-end gap-4 rounded-xl border border-cyan/20 bg-bg-2/95 p-3 backdrop-blur">
        {msg && <p className={`text-sm ${msg.kind === "ok" ? "text-cyan" : "text-red"}`}>{msg.text}</p>}
        <button type="submit" className="btn btn-red btn-sm" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save settings
        </button>
      </div>
    </form>
  );
}
