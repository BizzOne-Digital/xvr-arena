import type { Metadata } from "next";
import { Phone, ShieldCheck, Timer, CreditCard } from "lucide-react";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getExperiences, getPricingPlans, getPublishedGames, getSettings } from "@/lib/data";
import { isDbConfigured } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Book Online",
  description: "Book your free-roaming VR adventure, motion simulator, VR treadmill, golf simulator or party room at XVR Winnipeg.",
  alternates: { canonical: "/booking" },
};

export default async function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const [experiences, games, plans, settings] = await Promise.all([getExperiences(), getPublishedGames(), getPricingPlans(), getSettings()]);
  const tel = settings.phone.replace(/[^\d+]/g, "");

  return (
    <section className="container-x pb-8 pt-28 sm:pt-36">
      <div className="mb-10 max-w-3xl">
        <p className="eyebrow mb-3 text-sm">Online Booking</p>
        <h1 className="section-title text-4xl sm:text-5xl lg:text-6xl">
          Book Your <span className="text-glow-cyan text-cyan">Adventure</span>
        </h1>
        <p className="mt-4 text-muted">Choose your experience, pick a time and secure your spot in a few quick steps.</p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Timer className="size-4 text-cyan" aria-hidden="true" /> Live availability
          </li>
          <li className="flex items-center gap-2">
            <CreditCard className="size-4 text-cyan" aria-hidden="true" /> Secure checkout
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-cyan" aria-hidden="true" /> Online waivers
          </li>
          <li>
            <a href={`tel:${tel}`} className="flex items-center gap-2 hover:text-cyan">
              <Phone className="size-4 text-cyan" aria-hidden="true" /> Need help? {settings.phone}
            </a>
          </li>
        </ul>
      </div>
      <div className="glass rounded-2xl p-4 sm:p-8">
        <BookingWizard
          experiences={experiences.map((e) => ({
            slug: e.slug,
            name: e.name,
            shortName: e.shortName,
            icon: e.icon,
            image: e.image,
            description: e.description,
            minPlayers: e.minPlayers,
            maxPlayers: e.maxPlayers,
            bookable: e.bookable,
            isPrivateEvent: e.isPrivateEvent,
            capacityMode: e.capacityMode,
            resourceKey: e.resourceKey,
            defaultDurationMin: e.defaultDurationMin,
          }))}
          games={games.map((g) => ({
            slug: g.slug,
            name: g.name,
            experience: g.experience,
            image: g.image,
            durationMin: g.durationMin,
            minPlayers: g.minPlayers,
            maxPlayers: g.maxPlayers,
            priceCents: g.priceCents,
            recommendedAge: g.recommendedAge,
          }))}
          plans={plans}
          initial={{ experience: one(sp.experience), game: one(sp.game), plan: one(sp.plan) }}
          waiverTiming={settings.waiverTiming}
          payOnline={settings.onlinePaymentsEnabled && isStripeConfigured()}
          dbReady={isDbConfigured()}
        />
      </div>
    </section>
  );
}
