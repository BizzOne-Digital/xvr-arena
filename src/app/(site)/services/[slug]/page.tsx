import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock, Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Gallery } from "@/components/site/Gallery";
import { GameCard } from "@/components/games/GameCard";
import { CtaBand } from "@/components/site/CtaBand";
import { getExperience, getExperiences, getPricingPlans, getPublishedGames } from "@/lib/data";
import { formatCAD } from "@/lib/utils";

export const revalidate = 3600;

export async function generateStaticParams() {
  const all = await getExperiences();
  return all.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const exp = await getExperience(slug);
  if (!exp) return {};
  return {
    title: `${exp.name} in Winnipeg`,
    description: exp.description,
    alternates: { canonical: `/services/${exp.slug}` },
    openGraph: { images: exp.image ? [{ url: exp.image.startsWith("http") ? `${exp.image}?w=1200&h=630&fit=crop` : exp.image }] : undefined },
  };
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [exp, plans, games] = await Promise.all([getExperience(slug), getPricingPlans(), getPublishedGames()]);
  if (!exp) notFound();
  const expPlans = plans.filter((p) => p.experience === exp.slug);
  const expGames = games.filter((g) => g.experience === exp.slug);
  const isParty = exp.isPrivateEvent;

  return (
    <>
      <PageHero eyebrow="Experience" title={exp.name} subtitle={exp.tagline || exp.description} image={exp.image} imageAlt={`${exp.name} at XVR`}>
        {exp.bookable && (
          <Link href={`/booking?experience=${exp.slug}`} className="btn btn-red">
            <CalendarDays className="size-5" aria-hidden="true" /> Book {exp.shortName || exp.name}
          </Link>
        )}
        {isParty && (
          <Link href="/parties#inquiry" className="btn btn-cyan">
            Plan a party
          </Link>
        )}
      </PageHero>

      <section className="container-x grid gap-10 pt-16 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <h2 className="section-title text-3xl">About this experience</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink/90">{exp.longDescription || exp.description}</p>
          {exp.highlights?.length > 0 && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {exp.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 text-muted">
                  <Check className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" /> {h}
                </li>
              ))}
            </ul>
          )}
        </Reveal>
        <Reveal delay={0.1} className="card-neon h-fit p-6">
          <h2 className="font-display text-xl font-bold uppercase">At a glance</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="flex items-center gap-2 text-muted">
                <Users className="size-4 text-cyan" aria-hidden="true" /> Players per booking
              </dt>
              <dd>
                {exp.minPlayers === exp.maxPlayers ? exp.minPlayers : `${exp.minPlayers}–${exp.maxPlayers}`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="flex items-center gap-2 text-muted">
                <Clock className="size-4 text-cyan" aria-hidden="true" /> Session length
              </dt>
              <dd>{expPlans.length ? [...new Set(expPlans.map((p) => `${p.durationMin} min`))].join(" / ") : "Shown at booking"}</dd>
            </div>
          </dl>
          {expPlans.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {expPlans.map((p) => (
                <li key={p._id} className="flex items-center justify-between rounded-lg border border-cyan/20 bg-bg/60 px-4 py-3">
                  <span>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">{p.durationMin} min</span>
                  </span>
                  <span className="font-orbitron text-lg text-cyan">
                    {formatCAD(p.priceCents)}
                    <span className="block text-right font-sans text-[10px] text-muted">per {p.unit}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted">Pricing is being finalized. Contact us for current rates.</p>
          )}
          <Link href="/pricing" className="btn btn-ghost btn-sm mt-5 w-full">
            View all pricing
          </Link>
        </Reveal>
      </section>

      {expGames.length > 0 && (
        <section className="container-x pt-20">
          <SectionHeading title={`Games in the ${exp.shortName || exp.name}`} />
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {expGames.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {exp.gallery && exp.gallery.length > 0 && (
        <section className="container-x pt-20">
          <SectionHeading title="Gallery" />
          <Gallery items={exp.gallery.map((image) => ({ image, alt: `${exp.name} at XVR` }))} />
        </section>
      )}

      <CtaBand />
    </>
  );
}
