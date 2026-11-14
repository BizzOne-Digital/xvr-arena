import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, FileSignature, MapPin, Navigation } from "lucide-react";
import { findBookingForCustomer, markPaidFromSession } from "@/lib/booking/service";
import { getSettings } from "@/lib/data";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isDbConfigured } from "@/lib/db";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, WAIVER_STATUS_LABELS } from "@/lib/constants";
import { formatCAD, formatDateTime, msUntil } from "@/lib/utils";
import { CancelBooking, ResumePayment } from "@/components/booking/BookingActions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Confirmation", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  if (!isDbConfigured()) notFound();

  let booking = await findBookingForCustomer(id, token);
  if (!booking) notFound();

  // Verify payment directly with Stripe on return (webhook remains the source of truth too).
  if (sessionId && booking.stripeSessionId === sessionId && booking.paymentStatus !== "paid" && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        await markPaidFromSession(session);
        booking = (await findBookingForCustomer(id, token))!;
      }
    } catch (err) {
      console.error("[confirmation] stripe verify failed", (err as Error).message);
    }
  }

  const s = await getSettings();
  const confirmed = booking.status === "confirmed" && booking.paymentStatus === "paid";
  const requested = booking.status === "requested";
  const awaitingPayment = ["held", "pending_payment"].includes(booking.status) && booking.paymentStatus !== "paid";
  const inactive = ["cancelled", "expired"].includes(booking.status);
  const paymentProcessing = sessionId && awaitingPayment;
  const waiverLink = `/waiver/${booking.bookingNumber}?t=${booking.publicToken}`;
  const canCancel = ["confirmed", "requested", "held", "pending_payment"].includes(booking.status) && msUntil(booking.startAt) > 0;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.mapsQuery)}`;

  const header = (() => {
    if (confirmed)
      return (
        <>
          <CheckCircle2 className="size-16 text-cyan drop-shadow-[0_0_20px_#00dfff]" aria-hidden="true" />
          <h1 className="section-title mt-4 text-4xl sm:text-5xl">You&apos;re booked!</h1>
          <p className="mt-2 text-muted">Payment received. A confirmation email is on its way to {booking!.customer.email}.</p>
        </>
      );
    if (requested)
      return (
        <>
          <Clock className="size-16 text-cyan" aria-hidden="true" />
          <h1 className="section-title mt-4 text-4xl sm:text-5xl">Request received</h1>
          <p className="mt-2 text-muted">Our team will review and confirm your booking shortly. We&apos;ll email {booking!.customer.email}.</p>
        </>
      );
    if (inactive)
      return (
        <>
          <AlertTriangle className="size-16 text-red" aria-hidden="true" />
          <h1 className="section-title mt-4 text-4xl sm:text-5xl">Booking {booking!.status === "expired" ? "expired" : "cancelled"}</h1>
          <p className="mt-2 text-muted">
            {booking!.status === "expired" ? "The checkout time ran out before payment was completed. No payment was taken." : "This booking has been cancelled."}
          </p>
        </>
      );
    return (
      <>
        <Clock className="size-16 text-red" aria-hidden="true" />
        <h1 className="section-title mt-4 text-4xl sm:text-5xl">{paymentProcessing ? "Confirming payment…" : "Payment not completed"}</h1>
        <p className="mt-2 text-muted">
          {paymentProcessing
            ? "We're waiting for confirmation from our payment provider. Refresh this page in a moment."
            : sp.cancelled
              ? "Checkout was cancelled. Your time is held for a short while — complete payment to confirm."
              : "Your booking is not confirmed until payment is completed."}
        </p>
      </>
    );
  })();

  const rows: [string, string][] = [
    ["Booking number", booking.bookingNumber],
    ["Name", booking.customer.name],
    ["Experience", booking.experienceName],
    ...(booking.gameName ? ([["Game", booking.gameName]] as [string, string][]) : []),
    ["Date & time", `${formatDateTime(booking.startAt)} (Winnipeg time)`],
    ["Duration", `${booking.durationMin} minutes`],
    ["Players", String(booking.players)],
    ["Total", formatCAD(booking.pricing?.totalCents)],
  ];

  return (
    <section className="container-x max-w-4xl pb-8 pt-28 sm:pt-36">
      <div className="flex flex-col items-center text-center">
        {header}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="card-neon p-6">
          <dl className="divide-y divide-white/5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className={cn("text-right font-medium", k === "Booking number" && "font-orbitron text-cyan")}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge label="Booking" value={BOOKING_STATUS_LABELS[booking.status]} ok={booking.status === "confirmed"} />
            <Badge label="Payment" value={PAYMENT_STATUS_LABELS[booking.paymentStatus]} ok={booking.paymentStatus === "paid"} />
            <Badge label="Waivers" value={`${WAIVER_STATUS_LABELS[booking.waiverStatus]} (${booking.waiversSigned}/${booking.waiversRequired})`} ok={booking.waiverStatus === "complete"} />
          </div>
          {awaitingPayment && !paymentProcessing && (
            <div className="mt-6">
              <ResumePayment bookingNumber={booking.bookingNumber} token={booking.publicToken} />
            </div>
          )}
        </div>

        <div className="space-y-5">
          {!inactive && ["pending", "partial"].includes(booking.waiverStatus) && (
            <div className="card-neon is-red p-6">
              <FileSignature className="size-8 text-red" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-bold uppercase">Sign your waivers</h2>
              <p className="mt-1 text-sm text-muted">
                {booking.waiversSigned}/{booking.waiversRequired} signed. Every participant must have a signed waiver before playing.
              </p>
              <Link href={waiverLink} className="btn btn-red btn-sm mt-4 w-full">
                Sign waivers online
              </Link>
              <p className="mt-3 text-xs text-muted">Share this page link with your group so each participant can sign.</p>
            </div>
          )}
          <div className="card-neon p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
              <MapPin className="size-5 text-cyan" aria-hidden="true" /> Location
            </h2>
            <p className="mt-2 text-sm text-muted">
              {s.addressLine1}, {s.city}, {s.province}
              {s.entranceNote && <strong className="mt-1 block text-ink">{s.entranceNote}</strong>}
            </p>
            {s.arrivalInstructions && <p className="mt-3 text-sm text-muted">{s.arrivalInstructions}</p>}
            <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-cyan btn-sm mt-4 w-full">
              <Navigation className="size-4" aria-hidden="true" /> Get directions
            </a>
          </div>
          {canCancel && <CancelBooking bookingNumber={booking.bookingNumber} token={booking.publicToken} />}
          {s.cancellationPolicy && <p className="whitespace-pre-line text-xs text-muted">{s.cancellationPolicy}</p>}
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-muted">Keep this page private — its link gives access to your booking.</p>
    </section>
  );
}

function Badge({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <span className={cn("rounded-md border px-2.5 py-1", ok ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/15 text-muted")}>
      {label}: <strong className="font-semibold">{value}</strong>
    </span>
  );
}
