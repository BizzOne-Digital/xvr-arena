import Link from "next/link";
import { ArrowRight, Briefcase, CalendarDays, Cake, Gift, Star } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { ExperienceCard } from "@/components/home/ExperienceCard";
import { GameCard } from "@/components/games/GameCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { CtaBand } from "@/components/site/CtaBand";
import { getApprovedReviews, getExperiences, getFaqs, getPageContent, getPublicPromotions, getPublishedGames, getSettings } from "@/lib/data";
import { FaqAndVisit, HowItWorks, PerfectFor, WhyXvr } from "@/components/home/HomeSections";
import { IMG } from "@/lib/defaults";

export const revalidate = 3600;

export default async function HomePage() {
  const [home, experiences, games, promos, reviews, faqs, settings] = await Promise.all([
    getPageContent("home"),
    getExperiences(),
    getPublishedGames(),
    getPublicPromotions(),
    getApprovedReviews(),
    getFaqs(),
    getSettings(),
  ]);

  return (
    <>
      <Hero {...home} />
      <FeatureStrip />

      {/* Experiences */}
      <section className="container-x pt-20" aria-labelledby="experiences">
        <SectionHeading title={home.experiencesTitle} subtitle={home.experiencesSubtitle} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {experiences.map((exp, i) => (
            <Reveal as="li" key={exp.slug} delay={i * 0.07}>
              <ExperienceCard exp={exp} />
            </Reveal>
          ))}
        </ul>
      </section>

      <WhyXvr />

      {/* Offers */}
      {promos.length > 0 && (
        <section className="container-x pt-24" aria-label="Special offers">
          <SectionHeading title="Special Offers" subtitle="More players, more fun. Ask about eligibility when you book." />
          <div className="grid gap-5 md:grid-cols-2">
            {promos.slice(0, 2).map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.1} className="h-full">
                <article className={`card-neon group relative flex h-full flex-col overflow-hidden ${i === 0 ? "is-red" : ""}`}>
                  {p.image && (
                    <div className="relative aspect-[8/3] overflow-hidden">
                      <SmartImage src={p.image} alt={p.title} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="relative flex flex-1 items-start gap-5 p-7 sm:p-9">
                    <span className={`grid size-14 shrink-0 place-items-center rounded-xl border ${i === 0 ? "border-red/60 text-red" : "border-cyan/60 text-cyan"}`}>
                      {p.type === "birthday_free" ? <Cake className="size-7" aria-hidden="true" /> : <Gift className="size-7" aria-hidden="true" />}
                    </span>
                    <div className="flex h-full min-w-0 flex-1 flex-col">
                      {p.badge && <p className="eyebrow text-xs">{p.badge}</p>}
                      <h3 className="section-title mt-1 text-3xl sm:text-4xl">{p.title}</h3>
                      {p.subtitle && <p className="mt-3 text-ink/90">{p.subtitle}</p>}
                      {p.description && <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>}
                      {p.terms && (
                        <p className="mt-4 rounded-lg border border-white/10 bg-bg/60 px-3 py-2 text-xs text-muted">
                          <strong className="text-ink">Terms: </strong>
                          {p.terms}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
                        <Link href="/booking" className={`btn btn-sm ${i === 0 ? "btn-red" : "btn-cyan"}`}>
                          <CalendarDays className="size-4" aria-hidden="true" /> Book Now
                        </Link>
                        <Link href="/offers" className="inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider text-cyan hover:text-ink">
                          View offer <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <HowItWorks />

      {/* Games teaser */}
      {games.length > 0 && (
      <section className="container-x pt-24" aria-label="Featured games">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title="Featured Games" subtitle="Team missions, adventures and mixed-reality challenges in our free-roaming VR arena." className="mb-0" />
          <Link href="/games" className="btn btn-cyan btn-sm mb-2">
            View all games <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {games.length ? (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {games.slice(0, 4).map((g, i) => (
              <Reveal as="li" key={g.slug} delay={i * 0.07}>
                <GameCard game={g} />
              </Reveal>
            ))}
          </ul>
        ) : null}
      </section>
      )}

      <PerfectFor />

      {/* Parties & corporate */}
      <section className="container-x grid gap-6 pt-24 lg:grid-cols-2" aria-label="Group events">
        {[
          { href: "/parties", title: "Birthday Parties", text: "Celebrate with VR adventures, simulators and our dedicated party room.", icon: Cake, img: IMG.party, red: true },
          { href: "/corporate-events", title: "Team Building", text: "Collaborative multiplayer missions your team will actually look forward to.", icon: Briefcase, img: IMG.event, red: false },
        ].map(({ href, title, text, icon: Ico, img, red }, i) => (
          <Reveal key={href} delay={i * 0.1}>
            <Link href={href} className={`card-neon group relative block min-h-[320px] overflow-hidden ${red ? "is-red" : ""}`}>
              <SmartImage src={img} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-50 transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
              <div className="relative flex h-full min-h-[320px] max-w-md flex-col justify-end p-8">
                <Ico className={`size-10 ${red ? "text-red" : "text-cyan"}`} aria-hidden="true" />
                <h2 className="section-title mt-3 text-4xl">{title}</h2>
                <p className="mt-3 text-muted">{text}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider text-cyan">
                  Plan your event <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* Reviews (only real, approved reviews) */}
      {reviews.length > 0 && (
        <section className="container-x pt-24" aria-label="Customer reviews">
          <SectionHeading title="What Players Say" />
          <ul className="grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r, i) => (
              <Reveal as="li" key={r._id} delay={i * 0.08} className="card-neon p-6">
                <div className="flex gap-1 text-cyan" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, k) => (
                    <Star key={k} className={`size-4 ${k < r.rating ? "fill-cyan" : "opacity-30"}`} aria-hidden="true" />
                  ))}
                </div>
                <p className="mt-4 line-clamp-5 text-ink/90">&ldquo;{r.text}&rdquo;</p>
                <p className="mt-4 font-display font-bold">{r.name}</p>
              </Reveal>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link href="/testimonials" className="btn btn-ghost btn-sm">
              Read all reviews
            </Link>
          </div>
        </section>
      )}

      <FaqAndVisit faqs={faqs} settings={settings} />

      <CtaBand title={home.ctaTitle} text={home.ctaText} />
    </>
  );
}
