import type { Metadata } from "next";
import Link from "next/link";
import { Eye, HeartHandshake, Rocket, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { Gallery } from "@/components/site/Gallery";
import { CtaBand } from "@/components/site/CtaBand";
import { getExperiences, getGallery, getPageContent } from "@/lib/data";
import { IMG } from "@/lib/defaults";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet XVR and the X-Team: more than two decades of entertainment expertise behind Winnipeg's free-roaming VR and Mixed Reality arena.",
  alternates: { canonical: "/about" },
};

const WHY = [
  { icon: Sparkles, title: "20+ years of entertainment", text: "The X-Team brings more than two decades of experience creating fun, well-run entertainment." },
  { icon: Users, title: "Made for groups", text: "Bond with family, energize your team or hang out with friends in the same virtual world." },
  { icon: HeartHandshake, title: "Family-friendly", text: "An immersive experience designed for nearly every age." },
  { icon: Rocket, title: "Advanced VR & MR", text: "Wireless, free-roaming Virtual Reality and Mixed Reality — no cables holding you back." },
];

export default async function AboutPage() {
  const [about, gallery, experiences] = await Promise.all([getPageContent("about"), getGallery(), getExperiences()]);
  const aboutGallery = gallery.filter((g) => g.section === "about" || g.section === "general");
  const fallbackGallery = experiences.filter((e) => e.image).map((e) => ({ image: e.image!, alt: `${e.name} at XVR`, caption: e.name }));

  return (
    <>
      <PageHero eyebrow="About XVR" title={about.heroTitle} subtitle={about.heroSubtitle} image={about.heroImage} imageAlt="Neon-lit XVR gaming space" />

      <section className="container-x grid items-center gap-12 pt-20 lg:grid-cols-2">
        <Reveal>
          <SectionHeading title="Who We Are" className="mb-6" />
          <p className="text-lg leading-relaxed text-ink/90">{about.intro}</p>
          <p className="mt-5 leading-relaxed text-muted">{about.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/booking" className="btn btn-red">
              Book an Adventure
            </Link>
            <Link href="/services" className="btn btn-cyan">
              Our Experiences
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="card-neon relative aspect-[4/3] overflow-hidden">
          <SmartImage src={IMG.event} alt="Team celebrating a VR win at XVR" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
          <p className="font-orbitron absolute bottom-6 left-6 text-4xl font-extrabold text-cyan text-glow-cyan sm:text-5xl">
            20+ <span className="block font-display text-base font-bold uppercase tracking-widest text-ink">years of entertainment expertise</span>
          </p>
        </Reveal>
      </section>

      <section className="container-x grid gap-5 pt-20 md:grid-cols-2">
        {[
          { icon: Eye, title: "Our Vision", text: about.vision },
          { icon: ShieldCheck, title: "Our Mission", text: about.mission },
        ].map(({ icon: Ico, title, text }, i) => (
          <Reveal key={title} delay={i * 0.1} className={`card-neon p-8 ${i === 1 ? "is-red" : ""}`}>
            <Ico className={`size-10 ${i === 1 ? "text-red" : "text-cyan"}`} aria-hidden="true" />
            <h2 className="section-title mt-4 text-3xl">{title}</h2>
            <p className="mt-3 leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </section>

      <section className="container-x pt-20">
        <SectionHeading title="Why Choose XVR" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Ico, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.07} className="card-neon p-6">
              <Ico className="size-9 text-cyan" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold uppercase">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="container-x pt-20">
        <SectionHeading title="Inside the Arena" subtitle="A look at the experiences waiting for you." />
        <Gallery items={aboutGallery.length ? aboutGallery : fallbackGallery} />
      </section>

      <CtaBand />
    </>
  );
}
