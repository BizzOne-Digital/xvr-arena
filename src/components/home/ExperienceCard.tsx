import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import type { ExperienceDTO } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ExperienceCard({ exp, priority = false }: { exp: ExperienceDTO; priority?: boolean }) {
  return (
    <article className={cn("card-neon group flex h-full flex-col overflow-hidden hover:-translate-y-1.5", exp.featured && "is-red")}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage
          src={exp.image}
          alt={`${exp.name} at XVR Winnipeg`}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 20vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
        <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100", exp.featured ? "bg-red/10" : "bg-cyan/10")} />
      </div>
      <div className="relative -mt-12 flex flex-1 flex-col px-5 pb-5">
        <div className="flex items-start gap-3">
          <Icon name={exp.icon} className={cn("mt-1 size-9 shrink-0", exp.featured ? "text-red" : "text-cyan")} strokeWidth={1.6} />
          <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-wide">{exp.name}</h3>
        </div>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{exp.description}</p>
        <Link
          href={`/services/${exp.slug}`}
          className={cn(
            "mt-5 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider transition-colors after:absolute after:inset-0",
            exp.featured ? "text-red hover:text-ink" : "text-cyan hover:text-ink",
          )}
          aria-label={`Explore ${exp.name}`}
        >
          Explore Experience <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
