import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { WaiverTemplates } from "@/components/admin/WaiverTemplates";
import { requireAdminPage } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking, SignedWaiver } from "@/lib/models";
import { audit } from "@/lib/security";
import { formatDateTime, hoursAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Waivers" };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function WaiversPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; tab?: string }> }) {
  const admin = await requireAdminPage();
  const sp = await searchParams;
  const tab = sp.tab ?? "signed";
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 30;
  await connectDB();

  const filter = q
    ? { $or: ["participantName", "email", "bookingNumber", "waiverNumber", "signerName"].map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } })) }
    : {};
  const [waivers, total, pending] = await Promise.all([
    tab === "signed"
      ? SignedWaiver.find(filter).sort({ signedAt: -1 }).skip((page - 1) * limit).limit(limit).select("waiverNumber bookingNumber participantName email isMinor signerName signedAt templateVersion").lean()
      : [],
    tab === "signed" ? SignedWaiver.countDocuments(filter) : 0,
    tab === "pending"
      ? Booking.find({ status: { $in: ["confirmed", "requested"] }, startAt: { $gte: hoursAgo(6) }, waiverStatus: { $in: ["pending", "partial"] } })
          .sort({ startAt: 1 })
          .limit(100)
          .select("bookingNumber customer startAt experienceName players waiversSigned waiversRequired")
          .lean()
      : [],
  ]);
  if (q) await audit({ actor: admin.userId, actorEmail: admin.email, action: "waiver.search", entity: "SignedWaiver", details: { q } });
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <AdminPageHeader title="Waivers" description="Signed waivers are private records. Access is restricted to signed-in staff and downloads are logged." />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {[
          ["signed", "Signed waivers"],
          ["pending", "Unsigned participants"],
          ["versions", "Waiver versions"],
        ].map(([k, l]) => (
          <Link key={k} role="tab" aria-selected={tab === k} href={`?tab=${k}`} className={`btn btn-sm ${tab === k ? "btn-cyan" : "btn-ghost"}`}>
            {l}
          </Link>
        ))}
      </div>

      {tab === "signed" && (
        <>
          <form className="mb-4 flex gap-2" role="search">
            <input type="hidden" name="tab" value="signed" />
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input name="q" defaultValue={q} className="field pl-9" placeholder="Search by participant, email, booking ID or waiver #" aria-label="Search waivers" />
            </div>
            <button className="btn btn-cyan btn-sm" type="submit">
              Search
            </button>
          </form>
          <div className="overflow-x-auto rounded-xl border border-cyan/15">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-bg-2 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Signed by</th>
                  <th className="px-4 py-3">Signed at</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {waivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      No signed waivers found.
                    </td>
                  </tr>
                ) : (
                  waivers.map((w) => (
                    <tr key={w.waiverNumber}>
                      <td className="px-4 py-3">
                        {w.participantName}
                        <span className="block text-xs text-muted">{w.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {w.bookingNumber ? (
                          <Link href={`/admin/bookings?q=${w.bookingNumber}`} className="font-orbitron text-cyan hover:underline">
                            {w.bookingNumber}
                          </Link>
                        ) : (
                          <span className="text-muted">Walk-in</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.signerName}
                        {w.isMinor && <span className="block text-xs text-red">Guardian for minor</span>}
                      </td>
                      <td className="px-4 py-3">{formatDateTime(w.signedAt)}</td>
                      <td className="px-4 py-3">v{w.templateVersion}</td>
                      <td className="px-4 py-3 text-right">
                        <a href={`/api/waivers/${w.waiverNumber}/pdf`} className="inline-flex items-center gap-1 text-cyan hover:underline">
                          <Download className="size-4" aria-hidden="true" /> {w.waiverNumber}
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{total} signed waivers</span>
            <span className="flex gap-3">
              {page > 1 && <Link href={`?tab=signed&q=${encodeURIComponent(q)}&page=${page - 1}`}>← Previous</Link>}
              Page {page} / {pages}
              {page < pages && <Link href={`?tab=signed&q=${encodeURIComponent(q)}&page=${page + 1}`}>Next →</Link>}
            </span>
          </div>
        </>
      )}

      {tab === "pending" && (
        <div className="overflow-x-auto rounded-xl border border-cyan/15">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-bg-2 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Signed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    All upcoming participants have signed.
                  </td>
                </tr>
              ) : (
                pending.map((b) => (
                  <tr key={b.bookingNumber}>
                    <td className="px-4 py-3">
                      {formatDateTime(b.startAt)}
                      <span className="block text-xs text-muted">{b.experienceName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings?q=${b.bookingNumber}`} className="font-orbitron text-cyan hover:underline">
                        {b.bookingNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {b.customer.name}
                      <span className="block text-xs text-muted">
                        {b.customer.email} · {b.customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red">
                      {b.waiversSigned} / {b.waiversRequired}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "versions" && <WaiverTemplates />}
    </>
  );
}
