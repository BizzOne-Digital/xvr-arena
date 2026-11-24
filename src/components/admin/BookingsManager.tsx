"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Search, X } from "lucide-react";
import { useAdminApi } from "./AdminContext";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, WAIVER_STATUS_LABELS } from "@/lib/constants";
import { cn, formatCAD, formatDateTime, totalLabel } from "@/lib/utils";

type Booking = {
  _id: string;
  bookingNumber: string;
  experienceName: string;
  gameName?: string;
  date: string;
  startMinutes: number;
  startAt: string;
  durationMin: number;
  players: number;
  customer: { name: string; email: string; phone: string };
  notes?: string;
  event?: { type?: string; occasion?: string; birthdayName?: string; company?: string };
  isBirthday: boolean;
  pricing: { priceTbc?: boolean; subtotalCents: number; discountCents: number; taxCents: number; feeCents: number; totalCents: number; promotions: { title: string; discountCents: number }[] };
  status: string;
  paymentStatus: string;
  waiverStatus: string;
  waiversSigned: number;
  waiversRequired: number;
  adminNotes?: string;
  cancelReason?: string;
  rescheduledFrom?: { date: string; startMinutes: number }[];
  createdAt: string;
};
type Detail = {
  booking: Booking;
  payments: { _id: string; provider: string; amountCents: number; status: string; refundedCents: number; createdAt: string; receiptUrl?: string; stripePaymentIntentId?: string }[];
  waivers: { _id: string; waiverNumber: string; participantName: string; isMinor: boolean; signerName: string; signedAt: string; templateVersion: number }[];
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-cyan/50 text-cyan",
  requested: "border-red/60 text-red",
  pending_payment: "border-yellow-400/50 text-yellow-300",
  cancelled: "border-white/15 text-muted",
  expired: "border-white/15 text-muted",
  completed: "border-blue/50 text-blue",
  no_show: "border-white/20 text-muted",
};

export function BookingsManager() {
  const api = useAdminApi();
  const sp = useSearchParams();
  const [filters, setFilters] = useState({
    q: sp.get("q") ?? "",
    status: sp.get("status") ?? "",
    payment: sp.get("payment") ?? "",
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Booking[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ ...filters, page: String(page) });
      if (filters.payment === "pending") qs.set("payment", "pending");
      setData(await api(`/api/admin/bookings?${qs}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, filters, page]);

  useEffect(() => {
    const t = setTimeout(load, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);

  const set = (k: keyof typeof filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Booking", "Date/time", "Experience", "Game", "Players", "Customer", "Email", "Phone", "Total", "Status", "Payment", "Waivers"],
      ...data.items.map((b) => [
        b.bookingNumber,
        formatDateTime(b.startAt),
        b.experienceName,
        b.gameName ?? "",
        String(b.players),
        b.customer.name,
        b.customer.email,
        b.customer.phone,
        (b.pricing.totalCents / 100).toFixed(2),
        b.status,
        b.paymentStatus,
        `${b.waiversSigned}/${b.waiversRequired}`,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `xvr-bookings-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="field pl-9" type="search" placeholder="Booking #, name, email, phone" aria-label="Search bookings" value={filters.q} onChange={(e) => set("q", e.target.value)} />
        </div>
        <select className="field" aria-label="Booking status" value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active (upcoming)</option>
          {Object.entries(BOOKING_STATUS_LABELS)
            .filter(([k]) => k !== "held")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </select>
        <select className="field" aria-label="Payment status" value={filters.payment} onChange={(e) => set("payment", e.target.value)}>
          <option value="">All payments</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input className="field" type="date" aria-label="From date" value={filters.from} onChange={(e) => set("from", e.target.value)} />
        <input className="field" type="date" aria-label="To date" value={filters.to} onChange={(e) => set("to", e.target.value)} />
      </div>
      {error && <p className="mb-4 rounded-lg border border-red/40 bg-red/10 p-3 text-sm">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-cyan/15">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-bg-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Experience</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Players</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Waivers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && !data ? (
              <tr>
                <td colSpan={8} className="py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted" aria-label="Loading" />
                </td>
              </tr>
            ) : data?.items.length ? (
              data.items.map((b) => (
                <tr key={b._id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setOpenId(b._id)}>
                  <td className="px-4 py-3">
                    <button type="button" className="whitespace-nowrap font-orbitron text-cyan hover:underline" onClick={() => setOpenId(b._id)}>
                      {b.bookingNumber}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(b.startAt)}</td>
                  <td className="px-4 py-3">
                    {b.experienceName}
                    {b.gameName && <span className="block text-xs text-muted">{b.gameName}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {b.customer.name}
                    <span className="block text-xs text-muted">{b.customer.phone}</span>
                  </td>
                  <td className="px-4 py-3">{b.players}</td>
                  <td className="px-4 py-3 font-orbitron">{totalLabel(b.pricing)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block rounded border px-2 py-0.5 text-xs", STATUS_STYLE[b.status])}>{BOOKING_STATUS_LABELS[b.status]}</span>
                    <span className="mt-1 block text-xs text-muted">{PAYMENT_STATUS_LABELS[b.paymentStatus]}</span>
                  </td>
                  <td className={cn("px-4 py-3 text-xs", b.waiverStatus === "complete" ? "text-cyan" : "text-muted")}>
                    {b.waiversSigned}/{b.waiversRequired}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-10 text-center text-muted">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>{data?.total ?? 0} bookings</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!data?.items.length}>
            <Download className="size-4" aria-hidden="true" /> Export page (CSV)
          </button>
          <button type="button" className="rounded-md border border-white/10 p-2 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          <span>
            {page} / {data?.pages ?? 1}
          </span>
          <button type="button" className="rounded-md border border-white/10 p-2 disabled:opacity-30" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {openId && <BookingDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function BookingDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const api = useAdminApi();
  const [d, setD] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [panel, setPanel] = useState<"" | "cancel" | "reschedule" | "paid">("");
  const [form, setForm] = useState({ reason: "", date: "", time: "", method: "Card at venue", amount: "", notify: true });
  const [notes, setNotes] = useState("");

  const fetchDetail = useCallback(() => api<Detail>(`/api/admin/bookings/${id}`), [api, id]);
  const apply = (r: Detail) => {
    setD(r);
    setNotes(r.booking.adminNotes ?? "");
    setForm((f) => ({ ...f, date: r.booking.date, amount: (r.booking.pricing.totalCents / 100).toFixed(2) }));
  };
  const load = async () => apply(await fetchDetail());

  useEffect(() => {
    let alive = true;
    fetchDetail()
      .then((r) => {
        if (!alive) return;
        setD(r);
        setNotes(r.booking.adminNotes ?? "");
        setForm((f) => ({ ...f, date: r.booking.date, amount: (r.booking.pricing.totalCents / 100).toFixed(2) }));
      })
      .catch((e) => alive && setMsg({ kind: "err", text: e.message }));
    return () => {
      alive = false;
    };
  }, [fetchDetail]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/bookings/${id}`, { method: "PATCH", body });
      setMsg({ kind: "ok", text: success });
      setPanel("");
      await load();
      onChanged();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const b = d?.booking;
  const active = b && ["confirmed", "requested", "pending_payment"].includes(b.status);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Booking details">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-cyan/25 bg-bg-2">
        <div className="flex items-center justify-between border-b border-cyan/15 px-6 py-4">
          <h2 className="font-display text-2xl font-bold uppercase">
            Booking <span className="font-orbitron text-cyan">{b?.bookingNumber}</span>
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {!b ? (
          <div className="grid flex-1 place-items-center">
            <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading" />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm">
            {msg && <p className={cn("rounded-lg border p-3", msg.kind === "ok" ? "border-cyan/40 bg-cyan/10" : "border-red/40 bg-red/10")}>{msg.text}</p>}

            <div className="flex flex-wrap gap-2 text-xs">
              <span className={cn("rounded border px-2 py-1", STATUS_STYLE[b.status])}>{BOOKING_STATUS_LABELS[b.status]}</span>
              <span className="rounded border border-white/15 px-2 py-1">{PAYMENT_STATUS_LABELS[b.paymentStatus]}</span>
              <span className="rounded border border-white/15 px-2 py-1">
                Waivers: {WAIVER_STATUS_LABELS[b.waiverStatus]} ({b.waiversSigned}/{b.waiversRequired})
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ["Experience", `${b.experienceName}${b.gameName ? ` – ${b.gameName}` : ""}`],
                ["When", formatDateTime(b.startAt)],
                ["Duration", `${b.durationMin} min`],
                ["Players", b.players],
                ["Customer", b.customer.name],
                ["Email", b.customer.email],
                ["Phone", b.customer.phone],
                ["Booked", formatDateTime(b.createdAt)],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-xs uppercase text-muted">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {(b.notes || b.isBirthday || b.event?.occasion || b.event?.company) && (
              <div className="rounded-lg border border-white/10 p-3">
                {b.isBirthday && <p className="font-semibold text-cyan">Birthday booking{b.event?.birthdayName ? ` – ${b.event.birthdayName}` : ""}</p>}
                {b.event?.occasion && <p>Occasion: {b.event.occasion}</p>}
                {b.event?.company && <p>Company: {b.event.company}</p>}
                {b.notes && <p className="mt-1 whitespace-pre-line text-muted">Customer notes: {b.notes}</p>}
              </div>
            )}

            <div className="rounded-lg border border-white/10 p-3">
              <p className="flex justify-between">
                <span className="text-muted">Subtotal</span> {formatCAD(b.pricing.subtotalCents)}
              </p>
              {b.pricing.promotions.map((p) => (
                <p key={p.title} className="flex justify-between text-cyan">
                  <span>{p.title}</span> − {formatCAD(p.discountCents)}
                </p>
              ))}
              {b.pricing.feeCents > 0 && (
                <p className="flex justify-between">
                  <span className="text-muted">Fee</span> {formatCAD(b.pricing.feeCents)}
                </p>
              )}
              {b.pricing.taxCents > 0 && (
                <p className="flex justify-between">
                  <span className="text-muted">Tax</span> {formatCAD(b.pricing.taxCents)}
                </p>
              )}
              <p className="mt-1 flex justify-between font-semibold">
                <span>Total</span> <span className="font-orbitron">{totalLabel(b.pricing)}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {b.status === "requested" && (
                <button type="button" className="btn btn-cyan btn-sm" disabled={busy} onClick={() => act({ action: "approve" }, "Booking approved and customer notified.")}>
                  Approve booking
                </button>
              )}
              {active && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(panel === "reschedule" ? "" : "reschedule")}>
                    Reschedule
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(panel === "cancel" ? "" : "cancel")}>
                    Cancel
                  </button>
                </>
              )}
              {active && b.paymentStatus !== "paid" && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(panel === "paid" ? "" : "paid")}>
                  Record payment
                </button>
              )}
              {["confirmed", "requested"].includes(b.status) && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act({ action: "complete" }, "Marked as completed.")}>
                    Mark completed
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act({ action: "no_show" }, "Marked as no-show.")}>
                    No-show
                  </button>
                </>
              )}
            </div>

            {panel === "cancel" && (
              <div className="space-y-3 rounded-lg border border-red/40 p-4">
                <label className="label" htmlFor="cancel-reason">
                  Cancellation reason
                </label>
                <input id="cancel-reason" className="field" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-cyan" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} /> Email the customer
                </label>
                <p className="text-xs text-muted">Refunds must be issued in the Stripe dashboard. The payment status updates automatically from Stripe.</p>
                <button type="button" className="btn btn-red btn-sm" disabled={busy || form.reason.length < 2} onClick={() => act({ action: "cancel", reason: form.reason, notify: form.notify }, "Booking cancelled and capacity released.")}>
                  Confirm cancellation
                </button>
              </div>
            )}
            {panel === "reschedule" && (
              <div className="grid gap-3 rounded-lg border border-cyan/30 p-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="rs-date">
                    New date
                  </label>
                  <input id="rs-date" type="date" className="field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="rs-time">
                    New start time
                  </label>
                  <input id="rs-time" type="time" step={300} className="field" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" className="accent-cyan" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} /> Email the customer
                </label>
                <p className="text-xs text-muted sm:col-span-2">The time must match the booking slot grid and have capacity. The system checks this before moving the booking.</p>
                <button
                  type="button"
                  className="btn btn-cyan btn-sm sm:col-span-2"
                  disabled={busy || !form.date || !form.time}
                  onClick={() => {
                    const [h, m] = form.time.split(":").map(Number);
                    act({ action: "reschedule", date: form.date, startMinutes: h * 60 + m, notify: form.notify }, "Booking rescheduled.");
                  }}
                >
                  Move booking
                </button>
              </div>
            )}
            {panel === "paid" && (
              <div className="grid gap-3 rounded-lg border border-cyan/30 p-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="pm-method">
                    Method
                  </label>
                  <input id="pm-method" className="field" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="pm-amount">
                    Amount (CAD)
                  </label>
                  <input id="pm-amount" type="number" step="0.01" className="field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <button
                  type="button"
                  className="btn btn-cyan btn-sm sm:col-span-2"
                  disabled={busy}
                  onClick={() => act({ action: "mark_paid", method: form.method, amountCents: Math.round(Number(form.amount) * 100) }, "Payment recorded.")}
                >
                  Record payment received
                </button>
              </div>
            )}

            <div>
              <h3 className="mb-2 font-display text-lg font-bold uppercase">Payments</h3>
              {d.payments.length ? (
                <ul className="space-y-2">
                  {d.payments.map((p) => (
                    <li key={p._id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 p-3">
                      <span>
                        {p.provider === "stripe" ? "Stripe" : "Manual"} · {p.status}
                        {p.refundedCents > 0 && ` (refunded ${formatCAD(p.refundedCents)})`}
                        <span className="block text-xs text-muted">{formatDateTime(p.createdAt)}</span>
                      </span>
                      <span className="font-orbitron">{formatCAD(p.amountCents)}</span>
                      {p.receiptUrl && (
                        <a className="w-full text-xs text-cyan underline" href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                          Stripe receipt
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No payment records.</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold uppercase">Waivers</h3>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    className="accent-cyan"
                    checked={b.waiverStatus === "not_required"}
                    onChange={(e) => act({ action: "waiver_not_required", value: e.target.checked }, "Waiver requirement updated.")}
                  />
                  Not required for this booking
                </label>
              </div>
              {d.waivers.length ? (
                <ul className="space-y-2">
                  {d.waivers.map((w) => (
                    <li key={w._id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                      <span>
                        {w.participantName} {w.isMinor && <span className="text-xs text-red">(minor – signed by {w.signerName})</span>}
                        <span className="block text-xs text-muted">
                          {w.waiverNumber} · v{w.templateVersion} · {formatDateTime(w.signedAt)}
                        </span>
                      </span>
                      <a href={`/api/waivers/${w.waiverNumber}/pdf`} className="text-cyan" aria-label={`Download waiver for ${w.participantName}`}>
                        <Download className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No signed waivers yet.</p>
              )}
            </div>

            <div>
              <label htmlFor="admin-notes" className="mb-2 block font-display text-lg font-bold uppercase">
                Internal notes
              </label>
              <textarea id="admin-notes" className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={busy} onClick={() => act({ action: "notes", adminNotes: notes }, "Notes saved.")}>
                Save notes
              </button>
            </div>
            {b.cancelReason && <p className="text-xs text-muted">Cancellation reason: {b.cancelReason}</p>}
            {b.rescheduledFrom && b.rescheduledFrom.length > 0 && <p className="text-xs text-muted">Rescheduled {b.rescheduledFrom.length} time(s).</p>}
          </div>
        )}
      </div>
    </div>
  );
}
