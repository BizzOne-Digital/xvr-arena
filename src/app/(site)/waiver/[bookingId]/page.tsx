import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WaiverForm } from "@/components/waiver/WaiverForm";
import { FormAlert } from "@/components/forms/Field";
import { findBookingForCustomer } from "@/lib/booking/service";
import { getPublishedWaiver } from "@/lib/waiver";
import { isDbConfigured } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Waivers", robots: { index: false, follow: false } };

export default async function BookingWaiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { bookingId } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  if (!isDbConfigured()) notFound();
  const booking = await findBookingForCustomer(bookingId, token);
  if (!booking) notFound();
  const template = await getPublishedWaiver();
  const inactive = ["cancelled", "expired"].includes(booking.status);
  const pct = booking.waiversRequired ? Math.min(100, Math.round((booking.waiversSigned / booking.waiversRequired) * 100)) : 0;

  return (
    <section className="container-x max-w-3xl pb-8 pt-28 sm:pt-36">
      <p className="eyebrow mb-3 text-sm">Booking {booking.bookingNumber}</p>
      <h1 className="section-title text-4xl sm:text-5xl">
        Group <span className="text-glow-cyan text-cyan">Waivers</span>
      </h1>
      <p className="mt-3 text-muted">
        {booking.experienceName} · {formatDateTime(booking.startAt)} · {booking.players} player(s)
      </p>

      <div className="card-neon mt-6 p-5">
        <div className="flex items-center justify-between text-sm">
          <span>Waivers signed</span>
          <span className="font-orbitron text-cyan">
            {booking.waiversSigned} / {booking.waiversRequired}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-cyan shadow-[0_0_12px_#00dfff]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted">Each participant (or their parent/guardian) completes one waiver. Share this page link with your group.</p>
      </div>

      <div className="card-neon mt-6 p-5 sm:p-8">
        {inactive ? (
          <FormAlert kind="info">This booking is no longer active.</FormAlert>
        ) : template ? (
          <WaiverForm
            bookingNumber={booking.bookingNumber}
            token={token}
            template={{
              version: template.version,
              title: template.title,
              body: template.body,
              acknowledgments: template.acknowledgments,
              requireDob: template.requireDob,
              minorAgeThreshold: template.minorAgeThreshold,
            }}
          />
        ) : (
          <FormAlert kind="info">Our online waiver is being finalized. You will be able to sign on arrival.</FormAlert>
        )}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href={`/booking/confirmation/${booking.bookingNumber}?t=${token}`} className="text-cyan hover:underline">
          Back to booking details
        </Link>
      </p>
    </section>
  );
}
