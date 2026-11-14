import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ExperienceCard } from "@/components/home/ExperienceCard";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { getExperiences } from "@/lib/data";
import { IMG } from "@/lib/defaults";

export const metadata: Metadata = {
  title: "Experiences & Services",
  description:
    "Free-roaming VR & MR arena, 360° motion simulator, VR treadmill, golf simulator and party room — all under one roof in Winnipeg.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const experiences = await getExperiences();
  return (
    <>
      <PageHero
        eyebrow="Our Experiences"
        title="Choose Your"
        accent="Adventure"
        subtitle="Experience entertainment beyond reality — from free-roaming multiplayer VR to motion simulation and golf."
        image={IMG.gaming}
        imageAlt="Neon gaming setup"
      />
      <section className="container-x pt-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((exp, i) => (
            <Reveal as="li" key={exp.slug} delay={i * 0.06}>
              <ExperienceCard exp={exp} priority={i < 3} />
            </Reveal>
          ))}
        </ul>
      </section>
      <CtaBand />
    </>
  );
}
