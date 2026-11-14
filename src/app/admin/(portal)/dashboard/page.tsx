import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, CalendarDays, CheckCircle2, CircleDashed, CreditCard, DollarSign, FileSignature, Inbox, TrendingUp } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { SeedButton } from "@/components/admin/SeedButton";
import { getAdmin, hasRole, requireAdminPage } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  AvailabilityRule,
  Booking,
  ContactInquiry,
  EventInquiry,
  Experience,
  Game,
  Payment,
  PricingPlan,
  Review,
  SiteSettings,
  WaiverTemplate,
} from "@/lib/models";
import type { BookingStatus } from "@/lib/models/booking";
import { releaseExpiredHolds } from "@/lib/booking/availability";
import { isStripeConfigured } from "@/lib/stripe";
import { isSmtpConfigured } from "@/lib/mailer";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, WAIVER_STATUS_LABELS } from "@/lib/constants";
import { formatCAD, formatDateTime, todayInTz } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const ACTIVE: BookingStatus[] = ["confirmed", "requested", "pending_payment"];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireAdminPage();
  const admin = (await getAdmin())!;
  const { denied } = await searchParams;
  await connectDB();
  await releaseExpiredHolds(50).catch(() => 0);
  const now = new Date();
  const today = todayInTz();

  const [
    totalBookings,
    upcoming,
    todays,
    pendingPayments,
    waiverPending,
    revenueAgg,
    newEvents,
    newContacts,
    pendingReviews,
    popular,
    requested,
    // setup checklist
    plansCount,
    gamesPublished,
    waiverPublished,
    settings,
    weekly,
    expCount,
  ] = await Promise.all([
    Booking.countDocuments({ status: { $in: [...ACTIVE, "completed", "no_show"] } }),
    Booking.countDocuments({ status: { $in: ["confirmed", "requested"] }, startAt: { $gte: now } }),
    Booking.find({ date: today, status: { $in: [...ACTIVE, "completed"] } })
      .sort({ startAt: 1 })
      .select("bookingNumber customer.name experienceName gameName startAt players status paymentStatus waiverStatus waiversSigned waiversRequired")
      .lean(),
    Booking.countDocuments({ status: { $in: ACTIVE }, paymentStatus: { $in: ["unpaid", "pending", "pay_at_venue", "failed"] } }),
    Booking.countDocuments({ status: { $in: ["confirmed", "requested"] }, startAt: { $gte: now }, waiverStatus: { $in: ["pending", "partial"] } }),
    Payment.aggregate<{ total: number; refunded: number }>([
      { $match: { status: { $in: ["paid", "partially_refunded", "refunded"] } } },
      { $group: { _id: null, total: { $sum: "$amountCents" }, refunded: { $sum: "$refundedCents" } } },
    ]),
    EventInquiry.countDocuments({ status: "new" }),
    ContactInquiry.countDocuments({ status: "new" }),
    Review.countDocuments({ status: "pending" }),
    Booking.aggregate<{ _id: string; count: number; players: number }>([
      { $match: { status: { $in: ["confirmed", "completed"] } } },
      { $group: { _id: "$experienceName", count: { $sum: 1 }, players: { $sum: "$players" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Booking.countDocuments({ status: "requested" }),
    PricingPlan.countDocuments({ active: true }),
    Game.countDocuments({ status: "published" }),
    WaiverTemplate.exists({ status: "published" }),
    SiteSettings.findOne({ key: "main" }).lean(),
    AvailabilityRule.exists({ key: "weekly" }),
    Experience.estimatedDocumentCount(),
  ]);

  const revenue = (revenueAgg[0]?.total ?? 0) - (revenueAgg[0]?.refunded ?? 0);
  const waiverTotalToday = todays.reduce((s, b) => s + (b.waiversRequired || 0), 0);
  const waiverSignedToday = todays.reduce((s, b) => s + (b.waiversSigned || 0), 0);

  const cards = [
    { label: "Total bookings", value: totalBookings, icon: CalendarDays, href: "/admin/bookings" },
    { label: "Upcoming bookings", value: upcoming, icon: CalendarCheck, href: "/admin/bookings?status=active" },
    { label: "Today's sessions", value: todays.length, icon: TrendingUp, href: `/admin/bookings?from=${today}&to=${today}` },
    { label: "Pending payments", value: pendingPayments, icon: CreditCard, href: "/admin/bookings?payment=pending", warn: pendingPayments > 0 },
    { label: "Upcoming with unsigned waivers", value: waiverPending, icon: FileSignature, href: "/admin/waivers", warn: waiverPending > 0 },
    { label: "Verified revenue", value: formatCAD(revenue), icon: DollarSign, href: "/admin/payments", hidden: !hasRole(admin, "manager") },
    { label: "New inquiries", value: newEvents + newContacts, icon: Inbox, href: "/admin/inquiries", warn: newEvents + newContacts > 0 },
    { label: "Reviews to moderate", value: pendingReviews, icon: CheckCircle2, href: "/admin/reviews", warn: pendingReviews > 0 },
  ].filter((c) => !c.hidden);

  const checklist = [
    { ok: expCount > 0, label: "Starter content initialized (experiences, FAQs, offers)", href: "/admin/experiences" },
    { ok: plansCount > 0, label: "Prices published (required for online booking)", href: "/admin/pricing" },
    { ok: gamesPublished > 0, label: "Games catalog published", href: "/admin/games" },
    { ok: !!waiverPublished, label: "Legally approved waiver published", href: "/admin/waivers" },
    { ok: !!settings?.hoursConfirmed && !!weekly, label: "Business hours confirmed", href: "/admin/availability" },
    { ok: isStripeConfigured(), label: "Stripe keys configured (online payments)", href: "/admin/settings" },
    { ok: isSmtpConfigured(), label: "SMTP email configured", href: "/admin/settings" },
    { ok: !!settings?.cancellationPolicy, label: "Cancellation policy entered", href: "/admin/settings" },
  ];

  return (
    <>
      <AdminPageHeader title="Dashboard" description={`Welcome back, ${admin.name}. Here's what needs attention today.`} />
      {denied && <p className="mb-5 rounded-lg border border-red/40 bg-red/10 p-3 text-sm">You don&apos;t have permission to open that page.</p>}

      {requested > 0 && (
        <Link href="/admin/bookings?status=requested" className="mb-5 flex items-center gap-3 rounded-xl border border-red/50 bg-red/10 p-4 text-sm hover:bg-red/15">
          <AlertTriangle className="size-5 text-red" aria-hidden="true" />
          <span>
            <strong>{requested}</strong> booking request{requested > 1 ? "s" : ""} waiting for approval.
          </span>
        </Link>
      )}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Ico, href, warn }) => (
          <li key={label}>
            <Link href={href} className={`card-neon block p-4 hover:-translate-y-0.5 ${warn ? "is-red" : ""}`}>
              <Ico className={`size-5 ${warn ? "text-red" : "text-cyan"}`} aria-hidden="true" />
              <p className="font-orbitron mt-3 text-2xl">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card-neon p-5" aria-labelledby="today">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="today" className="font-display text-xl font-bold uppercase">
              Today&apos;s sessions
            </h2>
            {waiverTotalToday > 0 && (
              <span className="text-xs text-muted">
                Waivers: {waiverSignedToday}/{waiverTotalToday}
              </span>
            )}
          </div>
          {todays.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No sessions booked for today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2">Time</th>
                    <th>Customer</th>
                    <th>Experience</th>
                    <th>Players</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {todays.map((b) => (
                    <tr key={b.bookingNumber}>
                      <td className="py-2.5 font-orbitron text-cyan">{formatDateTime(b.startAt, { weekday: undefined, year: undefined, month: undefined, day: undefined })}</td>
                      <td>
                        <Link className="hover:text-cyan" href={`/admin/bookings?q=${b.bookingNumber}`}>
                          {b.customer.name}
                        </Link>
                      </td>
                      <td>
                        {b.experienceName}
                        {b.gameName && <span className="block text-xs text-muted">{b.gameName}</span>}
                      </td>
                      <td>{b.players}</td>
                      <td className="text-xs">
                        <span className="block">{BOOKING_STATUS_LABELS[b.status]}</span>
                        <span className="block text-muted">{PAYMENT_STATUS_LABELS[b.paymentStatus]}</span>
                        <span className={`block ${b.waiverStatus === "complete" ? "text-cyan" : "text-red"}`}>
                          {WAIVER_STATUS_LABELS[b.waiverStatus]} ({b.waiversSigned}/{b.waiversRequired})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="card-neon p-5" aria-labelledby="popular">
            <h2 id="popular" className="mb-4 font-display text-xl font-bold uppercase">
              Popular experiences
            </h2>
            {popular.length === 0 ? (
              <p className="text-sm text-muted">No confirmed bookings yet.</p>
            ) : (
              <ul className="space-y-3">
                {popular.map((p) => {
                  const pct = Math.round((p.count / popular[0].count) * 100);
                  return (
                    <li key={p._id}>
                      <div className="flex justify-between text-sm">
                        <span>{p._id}</span>
                        <span className="text-muted">
                          {p.count} bookings · {p.players} players
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card-neon p-5" aria-labelledby="launch">
            <h2 id="launch" className="mb-4 font-display text-xl font-bold uppercase">
              Launch checklist
            </h2>
            <ul className="space-y-2 text-sm">
              {checklist.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="flex items-start gap-2 hover:text-cyan">
                    {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan" aria-label="Done" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-red" aria-label="To do" />}
                    <span className={c.ok ? "text-muted" : ""}>{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {hasRole(admin, "owner") && expCount === 0 && (
              <div className="mt-4">
                <SeedButton />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
