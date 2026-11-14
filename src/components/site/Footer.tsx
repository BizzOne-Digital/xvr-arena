import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { SettingsShape } from "@/lib/defaults";
import { minutesToLabel, hhmmToMinutes } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Footer({
  settings,
  hours,
}: {
  settings: SettingsShape;
  hours: { day: number; open: boolean; openTime: string; closeTime: string }[];
}) {
  const tel = settings.phone.replace(/[^\d+]/g, "");
  return (
    <footer className="relative mt-24 border-t border-cyan/20 bg-bg-2/60">
      <div className="neon-divider absolute inset-x-0 top-0" />
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo logoUrl={settings.logoUrl || undefined} />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Manitoba&apos;s largest free-roaming virtual reality arena. Family-friendly VR &amp; MR adventures in Winnipeg.
          </p>
          <Link href="/booking" className="btn btn-red btn-sm">
            Book an Adventure
          </Link>
        </div>

        <div>
          <h2 className="eyebrow mb-4 text-sm">Explore</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted sm:grid-cols-1">
            {[
              ["/games", "Games"],
              ["/services", "Experiences"],
              ["/pricing", "Pricing"],
              ["/offers", "Special Offers"],
              ["/parties", "Birthday Parties"],
              ["/corporate-events", "Corporate Events"],
              ["/testimonials", "Testimonials"],
              ["/waiver", "Sign Waiver"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link className="transition-colors hover:text-cyan" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-4 text-sm">Visit Us</h2>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
              <span>
                {settings.addressLine1}
                <br />
                {settings.city}, {settings.province}, {settings.country}
                {settings.entranceNote && (
                  <>
                    <br />
                    <span className="text-ink/80">{settings.entranceNote}</span>
                  </>
                )}
              </span>
            </li>
            <li>
              <a href={`tel:${tel}`} className="flex gap-3 hover:text-cyan">
                <Phone className="size-4 shrink-0 text-cyan" aria-hidden="true" /> {settings.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.email}`} className="flex gap-3 break-all hover:text-cyan">
                <Mail className="size-4 shrink-0 text-cyan" aria-hidden="true" /> {settings.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-4 text-sm">Hours</h2>
          {settings.hoursConfirmed ? (
            <ul className="space-y-1.5 text-sm text-muted">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span>{DAYS[h.day]}</span>
                  <span className="text-ink/90">
                    {h.open ? `${minutesToLabel(hhmmToMinutes(h.openTime))} – ${minutesToLabel(hhmmToMinutes(h.closeTime))}` : "Closed"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex gap-3 text-sm text-muted">
              <Clock className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
              {settings.hoursNote || "Business hours awaiting confirmation."}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.businessName}. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="hover:text-cyan">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-cyan">
              Terms &amp; Conditions
            </Link>
            <Link href="/faq" className="hover:text-cyan">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
