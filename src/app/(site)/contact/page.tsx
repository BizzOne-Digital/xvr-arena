import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, HelpCircle, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSettings, getWeeklyHours } from "@/lib/data";
import { IMG } from "@/lib/defaults";
import { hhmmToMinutes, minutesToLabel } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact XVR – 551 Ferry Road, Unit 2, Winnipeg, Manitoba. Rear entrance from St. Matthews Avenue. Call 204-774-4303.",
  alternates: { canonical: "/contact" },
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ContactPage() {
  const [s, hours] = await Promise.all([getSettings(), getWeeklyHours()]);
  const tel = s.phone.replace(/[^\d+]/g, "");
  const q = encodeURIComponent(s.mapsQuery);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const mapSrc = key
    ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}`
    : `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  return (
    <>
      <PageHero eyebrow="Contact" title="Get in" accent="Touch" subtitle="Questions, group bookings or directions — we're here to help." image={IMG.arcade} imageAlt="XVR neon VR arena" />
      <section className="container-x grid gap-8 pt-16 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="space-y-5">
          <div className="card-neon space-y-5 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold uppercase">{s.businessName}</h2>
            <p className="flex gap-3 text-muted">
              <MapPin className="mt-1 size-5 shrink-0 text-cyan" aria-hidden="true" />
              <span>
                {s.addressLine1}
                <br />
                {s.city}, {s.province}, {s.country}
                {s.entranceNote && (
                  <strong className="mt-1 block font-semibold text-ink">{s.entranceNote}</strong>
                )}
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href={`tel:${tel}`} className="btn btn-cyan btn-sm">
                <Phone className="size-4" aria-hidden="true" /> Call {s.phone}
              </a>
              <a href={`mailto:${s.email}`} className="btn btn-cyan btn-sm">
                <Mail className="size-4" aria-hidden="true" /> Email Us
              </a>
              <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                <Navigation className="size-4" aria-hidden="true" /> Get Directions
              </a>
              <Link href="/booking" className="btn btn-red btn-sm">
                <CalendarDays className="size-4" aria-hidden="true" /> Book Now
              </Link>
            </div>
            <p className="break-all text-sm text-muted">{s.email}</p>
          </div>
          <div className="card-neon p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
              <Clock className="size-5 text-cyan" aria-hidden="true" /> Business Hours
            </h2>
            {s.hoursConfirmed ? (
              <ul className="mt-4 space-y-1.5 text-sm">
                {hours.map((h) => (
                  <li key={h.day} className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-muted">{DAYS[h.day]}</span>
                    <span>{h.open ? `${minutesToLabel(hhmmToMinutes(h.openTime))} – ${minutesToLabel(hhmmToMinutes(h.closeTime))}` : "Closed"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{s.hoursNote || "Awaiting confirmation."}</p>
            )}
          </div>
          <Link href="/faq" className="card-neon flex items-center gap-4 p-5 hover:-translate-y-1">
            <HelpCircle className="size-8 text-cyan" aria-hidden="true" />
            <span>
              <span className="block font-display text-lg font-bold uppercase">Check our FAQ</span>
              <span className="text-sm text-muted">Quick answers about bookings, waivers and visits.</span>
            </span>
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="space-y-5">
          <div className="card-neon p-6 sm:p-8">
            <h2 className="section-title mb-6 text-3xl">Send a Message</h2>
            <ContactForm />
          </div>
          <div className="card-neon overflow-hidden">
            <iframe
              title={`Map showing ${s.businessName}`}
              src={mapSrc}
              className="h-[340px] w-full border-0 [filter:invert(90%)_hue-rotate(180deg)_saturate(0.8)]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </Reveal>
      </section>
    </>
  );
}
