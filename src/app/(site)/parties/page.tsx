import type { Metadata } from "next";
import Link from "next/link";
import { Cake, Gamepad2, Gift, PartyPopper } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { EventInquiryForm } from "@/components/forms/EventInquiryForm";
import { ExperienceCard } from "@/components/home/ExperienceCard";
import { Gallery } from "@/components/site/Gallery";
import { getExperiences, getGallery, getPageContent, getPricingPlans, getPublicPromotions } from "@/lib/data";
import { formatCAD } from "@/lib/utils";

export const metadata: Metadata = {
  title: "VR Birthday Parties in Winnipeg",
  description:
    "Host an unforgettable VR birthday party in Winnipeg with free-roaming VR, simulators and a dedicated party room at XVR.",
  alternates: { canonical: "/parties" },
};

export default async function PartiesPage() {
  const [content, experiences, plans, promos, gallery] = await Promise.all([
    getPageContent("parties"),
    getExperiences(),
    getPricingPlans(),
    getPublicPromotions(),
    getGallery(),
  ]);
  const birthdayPromo = promos.find((p) => p.type === "birthday_free");
  const packages = plans.filter((p) => p.kind === "birthday");
  const partyRoom = experiences.find((e) => e.slug === "party-room");

  return (
    <>
      <PageHero eyebrow="Birthday Parties" title={content.heroTitle} subtitle={content.heroSubtitle} image={content.heroImage} imageAlt="Birthday balloons">
        <a href="#inquiry" className="btn btn-red">
          <PartyPopper className="size-5" aria-hidden="true" /> Plan a Party
        </a>
        <Link href="/booking?experience=party-room" className="btn btn-cyan">
          Book the Party Room
        </Link>
      </PageHero>

      <section className="container-x grid gap-5 pt-16 md:grid-cols-3">
        {[
          { icon: Gamepad2, title: "Epic VR adventures", text: content.intro },
          { icon: Cake, title: "Party room", text: partyRoom?.description ?? "A dedicated space for your celebration." },
          {
            icon: Gift,
            title: birthdayPromo?.title ?? "Birthday perks",
            text: birthdayPromo ? `${birthdayPromo.subtitle ?? ""} ${birthdayPromo.terms ?? ""}`.trim() : "Ask us about current birthday offers.",
          },
        ].map(({ icon: Ico, title, text }, i) => (
          <Reveal key={title} delay={i * 0.08} className={`card-neon p-7 ${i === 2 ? "is-red" : ""}`}>
            <Ico className={`size-10 ${i === 2 ? "text-red" : "text-cyan"}`} aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl font-bold uppercase">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </section>

      {packages.length > 0 && (
        <section className="container-x pt-20">
          <SectionHeading title="Birthday Packages" />
          <ul className="grid gap-5 md:grid-cols-3">
            {packages.map((p) => (
              <li key={p._id} className="card-neon p-6">
                <h3 className="font-display text-2xl font-bold uppercase">{p.name}</h3>
                <p className="font-orbitron mt-2 text-3xl text-cyan">{formatCAD(p.priceCents)}</p>
                <p className="text-xs text-muted">per {p.unit} · {p.durationMin} min · {p.minPlayers}–{p.maxPlayers} guests</p>
                {p.description && <p className="mt-3 text-sm text-muted">{p.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pt-20">
        <SectionHeading title="Party Experiences" subtitle="Mix and match experiences for your group." />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {experiences.map((e) => (
            <li key={e.slug}>
              <ExperienceCard exp={e} />
            </li>
          ))}
        </ul>
      </section>

      {gallery.some((g) => g.section === "parties") && (
        <section className="container-x pt-20">
          <SectionHeading title="Party Gallery" />
          <Gallery items={gallery.filter((g) => g.section === "parties")} />
        </section>
      )}

      <section id="inquiry" className="container-x scroll-mt-28 pt-20">
        <div className="card-neon is-red grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="section-title text-4xl">Plan Your Party</h2>
            <p className="mt-4 text-muted">
              Tell us about your celebration and our team will help you choose experiences, timing and the party room. We&apos;ll get back to you with availability and pricing.
            </p>
          </div>
          <EventInquiryForm defaultType="Birthday Party" />
        </div>
      </section>
    </>
  );
}
