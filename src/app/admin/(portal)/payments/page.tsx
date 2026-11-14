import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Payment } from "@/lib/models";
import { isStripeConfigured } from "@/lib/stripe";
import { formatCAD, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

const STATUS = ["pending", "paid", "failed", "expired", "refunded", "partially_refunded"] as const;
type PStatus = (typeof STATUS)[number];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdminPage("manager");
  const sp = await searchParams;
  const status = (STATUS as readonly string[]).includes(sp.status ?? "") ? (sp.status as PStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 30;
  await connectDB();
  const filter = status ? { status } : {};
  const [items, total, totals] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Payment.countDocuments(filter),
    Payment.aggregate<{ _id: string; amount: number; refunded: number; count: number }>([
      { $group: { _id: "$status", amount: { $sum: "$amountCents" }, refunded: { $sum: "$refundedCents" }, count: { $sum: 1 } } },
    ]),
  ]);
  const by = Object.fromEntries(totals.map((t) => [t._id, t]));
  const verified = ["paid", "partially_refunded", "refunded"].reduce((s, k) => s + (by[k]?.amount ?? 0) - (by[k]?.refunded ?? 0), 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <AdminPageHeader
        title="Payments"
        description="Stripe payments are recorded only after Stripe verifies them (webhook or server-side session check). Refunds are issued in the Stripe dashboard and sync automatically."
      />
      {!isStripeConfigured() && (
        <p className="mb-5 rounded-lg border border-red/40 bg-red/10 p-3 text-sm">
          Stripe is not configured. Bookings are taken as requests and payments can be recorded manually from a booking.
        </p>
      )}
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li className="card-neon p-4">
          <p className="font-orbitron text-2xl">{formatCAD(verified)}</p>
          <p className="text-xs text-muted">Verified revenue (net of refunds)</p>
        </li>
        <li className="card-neon p-4">
          <p className="font-orbitron text-2xl">{by.paid?.count ?? 0}</p>
          <p className="text-xs text-muted">Paid</p>
        </li>
        <li className="card-neon p-4">
          <p className="font-orbitron text-2xl">{by.pending?.count ?? 0}</p>
          <p className="text-xs text-muted">Pending checkouts</p>
        </li>
        <li className="card-neon is-red p-4">
          <p className="font-orbitron text-2xl">{(by.failed?.count ?? 0) + (by.expired?.count ?? 0)}</p>
          <p className="text-xs text-muted">Failed / expired</p>
        </li>
      </ul>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="?" className={`btn btn-sm ${!status ? "btn-cyan" : "btn-ghost"}`}>
          All
        </Link>
        {STATUS.map((s) => (
          <Link key={s} href={`?status=${s}`} className={`btn btn-sm capitalize ${status === s ? "btn-cyan" : "btn-ghost"}`}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-cyan/15">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-bg-2 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No payments yet.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={String(p._id)}>
                  <td className="px-4 py-3">{formatDateTime((p as unknown as { createdAt: Date }).createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link className="font-orbitron text-cyan hover:underline" href={`/admin/bookings?q=${p.bookingNumber}`}>
                      {p.bookingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.provider}</td>
                  <td className="px-4 py-3 capitalize">
                    {p.status.replace("_", " ")}
                    {p.refundedCents > 0 && <span className="block text-xs text-muted">Refunded {formatCAD(p.refundedCents)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-orbitron">{formatCAD(p.amountCents)}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {p.receiptUrl ? (
                      <a className="text-cyan underline" href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                        Receipt
                      </a>
                    ) : (
                      p.stripePaymentIntentId ?? "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 flex justify-end gap-3 text-sm text-muted">
        {page > 1 && <Link href={`?${status ? `status=${status}&` : ""}page=${page - 1}`}>← Previous</Link>}
        Page {page} / {pages}
        {page < pages && <Link href={`?${status ? `status=${status}&` : ""}page=${page + 1}`}>Next →</Link>}
      </p>
    </>
  );
}
