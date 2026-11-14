import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Cake, Gift, Percent, Tag } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { getPublicPromotions } from "@/lib/data";
import { IMG } from "@/lib/defaults";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Special Offers",
  description: "Current XVR deals — including Buy Two, Get One Free and Birthday Person Plays Free.",
  alternates: { canonical: "/offers" },
};

const ICON = { buy_x_get_y: Gift, birthday_free: Cake, percent: Percent, fixed: Tag } as const;

export default async function OffersPage() {
  const promos = await getPublicPromotions();
  return (
    <>
      <PageHero eyebrow="Special Offers" title="Deals Worth" accent="Playing For" subtitle="More players, more fun, better value." image={IMG.partyBanner} imageAlt="Friends celebrating with VR at XVR" />
      <section className="container-x pt-16">
        {promos.length ? (
          <ul className="grid gap-6 lg:grid-cols-2">
            {promos.map((p, i) => {
              const Ico = ICON[p.type as keyof typeof ICON] ?? Gift;
              const red = i % 2 === 0;
              return (
                <Reveal as="li" key={p.slug} delay={i * 0.08}>
                  <article className={`card-neon relative flex h-full flex-col overflow-hidden ${red ? "is-red" : ""}`}>
                    <div className="relative aspect-[8/3] overflow-hidden">
                      <SmartImage src={p.image || (p.type === "birthday_free" ? IMG.offerBirthday : IMG.offerBuyTwo)} alt={p.title} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
                      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-card to-transparent" />
                      {p.badge && (
                        <span className={`absolute left-5 top-5 rounded-md border px-3 py-1 font-display text-sm font-bold uppercase tracking-widest ${red ? "border-red text-red" : "border-cyan text-cyan"} bg-bg/80`}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="relative flex flex-1 flex-col p-7">
                      <Ico className={`size-11 ${red ? "text-red" : "text-cyan"}`} aria-hidden="true" />
                      <h2 className={`section-title mt-3 text-4xl sm:text-5xl ${red ? "text-glow-red" : "text-glow-cyan"}`}>{p.title}</h2>
                      {p.subtitle && <p className="mt-3 text-lg text-ink/90">{p.subtitle}</p>}
                      {p.description && <p className="mt-3 text-muted">{p.description}</p>}
                      {p.terms && (
                        <p className="mt-4 rounded-lg border border-white/10 bg-bg/60 p-3 text-xs leading-relaxed text-muted">
                          <strong className="text-ink">Terms: </strong>
                          {p.terms}
                        </p>
                      )}
                      {(p.startsAt || p.endsAt) && (
                        <p className="mt-3 text-xs text-muted">
                          {p.startsAt && `Valid from ${formatDate(p.startsAt)}`} {p.endsAt && `until ${formatDate(p.endsAt)}`}
                        </p>
                      )}
                      {!p.configured && <p className="mt-3 text-xs text-muted">Ask our team about eligibility when booking.</p>}
                      <div className="mt-auto pt-6">
                        <Link href="/booking" className={`btn ${red ? "btn-red" : "btn-cyan"}`}>
                          <CalendarDays className="size-5" aria-hidden="true" /> Book Now
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </ul>
        ) : (
          <div className="card-neon p-12 text-center">
            <p className="font-display text-2xl font-bold uppercase">No active offers right now</p>
            <p className="mt-2 text-muted">Check back soon or follow us for upcoming deals.</p>
          </div>
        )}
      </section>
    </>
  );
}
