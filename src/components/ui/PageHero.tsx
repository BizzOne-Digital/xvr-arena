import type { ReactNode } from "react";
import { SmartImage } from "./SmartImage";
import { Reveal } from "./Reveal";

export function PageHero({
  eyebrow,
  title,
  accent,
  subtitle,
  image,
  imageAlt = "",
  children,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-cyan/20 pb-14 pt-32 sm:pb-20 sm:pt-40">
      {image && (
        <div className="absolute inset-0 -z-20">
          <SmartImage src={image} alt={imageAlt} fill priority sizes="100vw" className="object-cover opacity-45" />
        </div>
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/85 to-bg/40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-transparent to-bg/60" />
      <div className="grid-bg absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute -left-20 top-1/3 -z-10 h-64 w-64 rounded-full bg-blue/20 blur-3xl" aria-hidden="true" />
      <div className="container-x">
        <Reveal>
          {eyebrow && <p className="eyebrow mb-3 text-sm sm:text-base">{eyebrow}</p>}
          <h1 className="section-title max-w-4xl text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">
            {title} {accent && <span className="text-glow-cyan block text-cyan">{accent}</span>}
          </h1>
          {subtitle && <p className="mt-5 max-w-2xl text-base text-muted sm:text-lg">{subtitle}</p>}
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
