import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Check, Clock, Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { getExperiences, getPricingPlans, getSettings } from "@/lib/data";
import { IMG } from "@/lib/defaults";
import { formatCAD } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "XVR pricing in Canadian dollars for free-roaming VR, motion simulator, VR treadmill, golf simulator, party and group packages.",
  alternates: { canonical: "/pricing" },
};

const KIND_LABEL: Record<string, string> = { group: "Group Packages", birthday: "Birthday Packages", seasonal: "Seasonal Offers" };

export default async function PricingPage() {
  const [plans, experiences, settings] = await Promise.all([getPricingPlans(), getExperiences(), getSettings()]);
  const standard = plans.filter((p) => p.kind === "standard");
  const extraKinds = ["group", "birthday", "seasonal"].filter((k) => plans.some((p) => p.kind === k));

  return (
    <>
      <PageHero eyebrow="Pricing" title="Simple" accent="Pricing" subtitle="All prices in Canadian dollars (CAD)." image={IMG.action} imageAlt="VR players in action at XVR" />

      {plans.length === 0 ? (
        <section className="container-x pt-16">
          <Reveal className="card-neon mx-auto max-w-3xl p-8 text-center sm:p-12">
            <p className="eyebrow text-sm">Coming soon</p>
            <h2 className="section-title mt-2 text-3xl sm:text-4xl">Pricing is being finalized</h2>
            <p className="mt-4 text-muted">
              We&apos;re confirming final prices for each experience and game. Expect sessions to range from approximately{" "}
              <strong className="text-ink">CAD $20 to $40 per person</strong>, depending on the experience. Contact us for current rates and group pricing.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/contact" className="btn btn-cyan">
                Contact Us
              </Link>
              <Link href="/corporate-events#inquiry" className="btn btn-red">
                Group Inquiry
              </Link>
            </div>
          </Reveal>
        </section>
      ) : (
        <>
          <section className="container-x pt-16">
            <div className="space-y-12">
              {experiences
                .filter((e) => standard.some((p) => p.experience === e.slug))
                .map((exp) => (
                  <div key={exp.slug}>
                    <div className="mb-5 flex items-center gap-3">
                      <Icon name={exp.icon} className="size-8 text-cyan" />
                      <h2 className="font-display text-3xl font-bold uppercase">{exp.name}</h2>
                    </div>
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {standard
                        .filter((p) => p.experience === exp.slug)
                        .map((p, i) => (
                          <Reveal as="li" key={p._id} delay={i * 0.06}>
                            <PlanCard plan={p} featured={p.featured} />
                          </Reveal>
                        ))}
                    </ul>
                  </div>
                ))}
            </div>
          </section>
          {extraKinds.map((kind) => (
            <section key={kind} className="container-x pt-20">
              <SectionHeading title={KIND_LABEL[kind]} />
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {plans
                  .filter((p) => p.kind === kind)
                  .map((p) => (
                    <li key={p._id}>
                      <PlanCard plan={p} featured={p.featured} experienceName={experiences.find((e) => e.slug === p.experience)?.name} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          <section className="container-x pt-12">
            <p className="text-sm text-muted">
              {settings.taxRatePercent > 0 ? `${settings.taxLabel} (${settings.taxRatePercent}%) are added at checkout.` : "Applicable taxes, if any, are shown at checkout."}
              {settings.bookingFeeCents > 0 && ` A booking fee of ${formatCAD(settings.bookingFeeCents)} applies.`}
            </p>
          </section>
        </>
      )}
    </>
  );
}

function PlanCard({
  plan,
  featured,
  experienceName,
}: {
  plan: Awaited<ReturnType<typeof getPricingPlans>>[number];
  featured?: boolean;
  experienceName?: string;
}) {
  return (
    <article className={`card-neon flex h-full flex-col p-6 hover:-translate-y-1 ${featured ? "is-red" : ""}`}>
      {experienceName && <p className="text-xs font-semibold uppercase tracking-widest text-muted">{experienceName}</p>}
      <h3 className="font-display text-2xl font-bold uppercase">{plan.name}</h3>
      <p className="mt-3">
        <span className="font-orbitron text-4xl font-semibold text-cyan text-glow-cyan">{formatCAD(plan.priceCents)}</span>
        <span className="ml-2 text-sm text-muted">/ {plan.unit === "person" ? "person" : "session"}</span>
      </p>
      <ul className="mt-5 space-y-2 text-sm text-muted">
        <li className="flex items-center gap-2">
          <Clock className="size-4 text-cyan" aria-hidden="true" /> {plan.durationMin} minute session
        </li>
        <li className="flex items-center gap-2">
          <Users className="size-4 text-cyan" aria-hidden="true" />
          {plan.minPlayers === plan.maxPlayers ? `${plan.minPlayers} player(s)` : `${plan.minPlayers}–${plan.maxPlayers} players`}
        </li>
        {plan.extras.map((x) => (
          <li key={x} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" /> {x}
          </li>
        ))}
      </ul>
      {plan.description && <p className="mt-4 text-sm text-muted">{plan.description}</p>}
      <div className="mt-auto pt-6">
        <Link href={`/booking?experience=${plan.experience}&plan=${plan._id}`} className={`btn btn-sm w-full ${featured ? "btn-red" : "btn-cyan"}`}>
          <CalendarDays className="size-4" aria-hidden="true" /> Book Now
        </Link>
      </div>
    </article>
  );
}
