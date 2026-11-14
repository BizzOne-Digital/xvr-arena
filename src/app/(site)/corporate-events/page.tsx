import type { Metadata } from "next";
import { Briefcase, MessageSquare, Puzzle, Trophy, Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { EventInquiryForm } from "@/components/forms/EventInquiryForm";
import { Gallery } from "@/components/site/Gallery";
import { getGallery, getPageContent, getPricingPlans } from "@/lib/data";
import { formatCAD } from "@/lib/utils";

export const metadata: Metadata = {
  title: "VR Team Building & Corporate Events in Winnipeg",
  description:
    "Energize your team with collaborative free-roaming VR adventures. Private group and corporate team-building events at XVR Winnipeg.",
  alternates: { canonical: "/corporate-events" },
};

const BENEFITS = [
  { icon: MessageSquare, title: "Communication", text: "Players call out, coordinate and react together in real time." },
  { icon: Puzzle, title: "Problem solving", text: "Missions reward teams that plan, adapt and think on their feet." },
  { icon: Users, title: "Inclusive fun", text: "No gaming experience needed — everyone can jump in and contribute." },
  { icon: Trophy, title: "Friendly competition", text: "Celebrate wins together and build energy that carries back to work." },
];

export default async function CorporatePage() {
  const [content, plans, gallery] = await Promise.all([getPageContent("corporate"), getPricingPlans(), getGallery()]);
  const groupPlans = plans.filter((p) => p.kind === "group");
  return (
    <>
      <PageHero eyebrow="Corporate Events" title={content.heroTitle} subtitle={content.heroSubtitle} image={content.heroImage} imageAlt="Group event with lights">
        <a href="#inquiry" className="btn btn-red">
          <Briefcase className="size-5" aria-hidden="true" /> Request a Quote
        </a>
      </PageHero>

      <section className="container-x pt-16">
        <Reveal className="max-w-3xl text-lg leading-relaxed text-ink/90">{content.intro}</Reveal>
      </section>

      <section className="container-x pt-14">
        <SectionHeading title="Team-Building Benefits" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Ico, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.07} className="card-neon p-6">
              <Ico className="size-9 text-cyan" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold uppercase">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      {groupPlans.length > 0 && (
        <section className="container-x pt-20">
          <SectionHeading title="Group Packages" />
          <ul className="grid gap-5 md:grid-cols-3">
            {groupPlans.map((p) => (
              <li key={p._id} className="card-neon p-6">
                <h3 className="font-display text-2xl font-bold uppercase">{p.name}</h3>
                <p className="font-orbitron mt-2 text-3xl text-cyan">{formatCAD(p.priceCents)}</p>
                <p className="text-xs text-muted">per {p.unit} · {p.durationMin} min · {p.minPlayers}–{p.maxPlayers} people</p>
                {p.description && <p className="mt-3 text-sm text-muted">{p.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gallery.some((g) => g.section === "corporate") && (
        <section className="container-x pt-20">
          <SectionHeading title="Events at XVR" />
          <Gallery items={gallery.filter((g) => g.section === "corporate")} />
        </section>
      )}

      <section id="inquiry" className="container-x scroll-mt-28 pt-20">
        <div className="card-neon grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="section-title text-4xl">Private Group Inquiry</h2>
            <p className="mt-4 text-muted">
              Share your group size, preferred date and goals. We&apos;ll recommend the right mix of experiences and send availability and pricing.
            </p>
          </div>
          <EventInquiryForm defaultType="Corporate Team Building" />
        </div>
      </section>
    </>
  );
}
