import Link from "next/link";
import { CalendarDays, Clock, Users, ShieldCheck } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import type { GameDTO } from "@/lib/data";
import { formatCAD } from "@/lib/utils";

export function playersLabel(g: Pick<GameDTO, "minPlayers" | "maxPlayers">) {
  if (g.minPlayers && g.maxPlayers) return g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`;
  if (g.maxPlayers) return `Up to ${g.maxPlayers}`;
  if (g.minPlayers) return `${g.minPlayers}+`;
  return "Ask us";
}

export function GameCard({ game }: { game: GameDTO }) {
  return (
    <article className="card-neon group relative flex h-full flex-col overflow-hidden hover:-translate-y-1.5">
      <div className="relative aspect-[16/10] overflow-hidden">
        <SmartImage
          src={game.image}
          alt={`${game.name} VR game`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {game.categories.slice(0, 2).map((c) => (
            <span key={c} className="rounded-md border border-cyan/40 bg-bg/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan backdrop-blur">
              {c}
            </span>
          ))}
        </div>
        {game.priceCents != null && (
          <span className="font-orbitron absolute right-3 top-3 rounded-md border border-red/60 bg-bg/85 px-2 py-1 text-sm font-semibold text-ink shadow-[0_0_14px_rgba(255,37,74,0.35)]">
            {formatCAD(game.priceCents)}
          </span>
        )}
        {/* Hover overlay with extra info */}
        <div className="absolute inset-0 flex items-end bg-bg/80 p-4 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
          <p className="line-clamp-5 text-sm text-ink/90">{game.description}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight">
          <Link href={`/games/${game.slug}`} className="after:absolute after:inset-0 hover:text-cyan focus-visible:outline-none">
            {game.name}
          </Link>
        </h3>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-white/5 bg-bg/60 p-2">
            <Clock className="mx-auto mb-1 size-4 text-cyan" aria-hidden="true" />
            <dt className="sr-only">Duration</dt>
            <dd>{game.durationLabel || (game.durationMin ? `${game.durationMin} min` : "Ask us")}</dd>
          </div>
          <div className="rounded-lg border border-white/5 bg-bg/60 p-2">
            <Users className="mx-auto mb-1 size-4 text-cyan" aria-hidden="true" />
            <dt className="sr-only">Players</dt>
            <dd>{playersLabel(game)}</dd>
          </div>
          <div className="rounded-lg border border-white/5 bg-bg/60 p-2">
            <ShieldCheck className="mx-auto mb-1 size-4 text-cyan" aria-hidden="true" />
            <dt className="sr-only">Recommended age</dt>
            <dd>{game.recommendedAge || "Ask us"}</dd>
          </div>
        </dl>
        <div className="mt-auto pt-5">
          <Link href={`/booking?experience=${game.experience}&game=${game.slug}`} className="btn btn-red btn-sm relative z-10 w-full">
            <CalendarDays className="size-4" aria-hidden="true" /> Book Now
          </Link>
        </div>
      </div>
    </article>
  );
}
