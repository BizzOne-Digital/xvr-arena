import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Briefcase,
  CalendarCheck,
  Cake,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  Gamepad2,
  Heart,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { Accordion } from "@/components/ui/Accordion";
import { IMG } from "@/lib/defaults";
import type { SettingsShape } from "@/lib/defaults";
import type { FaqDTO } from "@/lib/data";

/* ------------------------------- Why XVR ------------------------------- */
export function WhyXvr() {
  const points = [
    { icon: Wifi, title: "100% wireless", text: "No cables, no consoles. Move freely through the arena." },
    { icon: Users, title: "Play together", text: "Share the same virtual world with your whole group." },
    { icon: Sparkles, title: "VR + Mixed Reality", text: "Next-level immersive and mixed-reality adventures." },
    { icon: Trophy, title: "20+ years of fun", text: "Built by the X-Team's decades of entertainment experience." },
  ];
  return (
    <section className="container-x grid items-center gap-12 pt-24 lg:grid-cols-2" aria-labelledby="why-xvr">
      <Reveal className="card-neon relative aspect-[4/3] overflow-hidden">
        <SmartImage src={IMG.family} alt="Family and friends playing free-roaming VR together at XVR" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/10 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-3">
          <span className="glass rounded-lg px-4 py-2 font-display text-sm font-bold uppercase tracking-wider">
            <span className="font-orbitron text-cyan">20+</span> years experience
          </span>
          <span className="glass rounded-lg px-4 py-2 font-display text-sm font-bold uppercase tracking-wider">
            <span className="font-orbitron text-cyan">5</span> experiences
          </span>
        </div>
      </Reveal>
      <div>
        <Reveal>
          <p className="eyebrow mb-3 text-sm">Why XVR</p>
          <h2 id="why-xvr" className="section-title text-4xl sm:text-5xl">
            Not just a game. <span className="text-glow-cyan block text-cyan">A whole new world.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Step inside Manitoba&apos;s largest free-roaming VR arena. Walk, run, duck and team up in a wireless virtual world designed for nearly every age — no gaming experience needed.
          </p>
        </Reveal>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {points.map(({ icon: Ico, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.06} className="flex gap-4 rounded-xl border border-cyan/15 bg-bg-2/50 p-4">
              <Ico className="mt-0.5 size-7 shrink-0 text-cyan" aria-hidden="true" />
              <div>
                <p className="font-display text-lg font-bold uppercase">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-8 flex flex-wrap gap-3">
          <Link href="/about" className="btn btn-cyan btn-sm">
            About XVR <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- How it works ---------------------------- */
export function HowItWorks() {
  const steps = [
    { icon: Gamepad2, title: "Choose", text: "Pick your experience or game." },
    { icon: CalendarCheck, title: "Book", text: "Select a date, time and number of players." },
    { icon: CreditCard, title: "Pay securely", text: "Lock in your spot with secure online checkout." },
    { icon: FileSignature, title: "Sign & play", text: "Sign waivers online, arrive and enter the arena." },
  ];
  return (
    <section className="relative mt-24 overflow-hidden border-y border-cyan/15 bg-bg-2/60 py-20" aria-labelledby="how-it-works">
      <div className="grid-bg absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="container-x relative">
        <SectionHeading title="How It Works" subtitle="From booking to blast-off in four simple steps." align="center" />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Ico, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="card-neon relative p-6 text-center">
              <span className="font-orbitron absolute right-4 top-3 text-4xl font-extrabold text-cyan/15">0{i + 1}</span>
              <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-cyan/40 bg-cyan/5 shadow-[0_0_20px_rgba(0,223,255,0.2)]">
                <Ico className="size-8 text-cyan" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold uppercase">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Link href="/booking" className="btn btn-red">
            <CalendarCheck className="size-5" aria-hidden="true" /> Start Booking
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Perfect for ----------------------------- */
export function PerfectFor() {
  const items = [
    { icon: Users, title: "Families", text: "Bond across generations in one shared adventure.", href: "/booking" },
    { icon: Cake, title: "Birthdays", text: "Party room + VR = the birthday they'll never forget.", href: "/parties" },
    { icon: Briefcase, title: "Team Building", text: "Collaborative missions your team will actually enjoy.", href: "/corporate-events" },
    { icon: Heart, title: "Date Nights", text: "Swap dinner-and-a-movie for something epic.", href: "/booking" },
    { icon: Gamepad2, title: "Friends & Groups", text: "Squad up, compete and celebrate the win.", href: "/booking" },
    { icon: Baby, title: "Kids & Teens", text: "Family-friendly adventures designed for younger players.", href: "/games" },
  ];
  return (
    <section className="container-x pt-24" aria-labelledby="perfect-for">
      <SectionHeading title="Perfect For" subtitle="Whatever the occasion, there's an adventure waiting." />
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {items.map(({ icon: Ico, title, text, href }, i) => (
          <Reveal as="li" key={title} delay={(i % 3) * 0.06}>
            <Link href={href} className="card-neon group flex h-full flex-col p-5 hover:-translate-y-1 sm:p-6">
              <Ico className="size-9 text-cyan transition-transform group-hover:scale-110" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold uppercase sm:text-2xl">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------- Safety / visit ---------------------------- */
export function FaqAndVisit({ faqs, settings }: { faqs: FaqDTO[]; settings: SettingsShape }) {
  const tel = settings.phone.replace(/[^\d+]/g, "");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.mapsQuery)}`;
  return (
    <section className="container-x grid gap-8 pt-24 lg:grid-cols-[1.4fr_1fr]" aria-label="Questions and location">
      <div>
        <SectionHeading title="Quick Answers" className="mb-6" />
        {faqs.length > 0 && <Accordion items={faqs.slice(0, 5)} />}
        <Link href="/faq" className="mt-5 inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider text-cyan hover:text-ink">
          View all FAQs <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <Reveal className="card-neon is-red h-fit overflow-hidden">
        <div className="relative aspect-[16/9]">
          <SmartImage src={IMG.arcade} alt="XVR neon VR arena in Winnipeg" fill sizes="(min-width:1024px) 35vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
        <div className="p-6 sm:p-7">
          <h2 className="section-title text-3xl">Visit The Arena</h2>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
              <span>
                {settings.addressLine1}, {settings.city}, {settings.province}
                {settings.entranceNote && <strong className="block text-ink">{settings.entranceNote}</strong>}
              </span>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
              {settings.hoursConfirmed ? "Open daily — see hours on our Contact page" : settings.hoursNote}
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
              Sign your waiver online before you arrive
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
              Arrive 15 minutes early for your briefing
            </li>
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-cyan btn-sm">
              <Navigation className="size-4" aria-hidden="true" /> Directions
            </a>
            <a href={`tel:${tel}`} className="btn btn-red btn-sm">
              <Phone className="size-4" aria-hidden="true" /> Call Us
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
