import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, DollarSign, Info, ShieldCheck, Users } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Gallery } from "@/components/site/Gallery";
import { GameCard, playersLabel } from "@/components/games/GameCard";
import { getGame, getPublishedGames } from "@/lib/data";
import { formatCAD } from "@/lib/utils";

export const revalidate = 3600;

export async function generateStaticParams() {
  const games = await getPublishedGames();
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGame(slug);
  if (!g) return {};
  const img = g.bannerImage || g.image;
  return {
    title: `${g.name} – VR Game`,
    description: g.description?.slice(0, 160),
    alternates: { canonical: `/games/${g.slug}` },
    openGraph: { images: img ? [{ url: img }] : undefined },
  };
}

function embedUrl(url: string) {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  if (url.startsWith("https://player.vimeo.com/video/")) return `${url}${url.includes("?") ? "&" : "?"}title=0&byline=0&portrait=0&dnt=1`;
  return null;
}

export default async function GameDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [game, all] = await Promise.all([getGame(slug), getPublishedGames()]);
  if (!game) notFound();
  const related = all.filter((g) => g.slug !== game.slug && g.categories.some((c) => game.categories.includes(c))).slice(0, 4);
  const yt = game.videoUrl ? embedUrl(game.videoUrl) : null;
  const bookHref = `/booking?experience=${game.experience}&game=${game.slug}`;

  const stats = [
    { icon: Clock, label: "Duration", value: game.durationLabel || (game.durationMin ? `${game.durationMin} min` : "Ask us") },
    { icon: Users, label: "Players", value: playersLabel(game) },
    { icon: ShieldCheck, label: "Recommended age", value: game.recommendedAge || "Ask us" },
    { icon: DollarSign, label: "Price", value: game.priceCents != null ? `${formatCAD(game.priceCents)} / player` : "See pricing" },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden pb-14 pt-32 sm:pt-40">
        <div className="absolute inset-0 -z-20">
          <SmartImage src={game.bannerImage || game.image} alt={`${game.name} banner`} fill priority sizes="100vw" className="object-cover opacity-50" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/80 to-bg/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-transparent to-bg/60" />
        <div className="container-x">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
              <Link href="/games" className="hover:text-cyan">
                Games
              </Link>{" "}
              / <span className="text-ink">{game.name}</span>
            </nav>
            <div className="flex flex-wrap gap-2">
              {game.categories.map((c) => (
                <span key={c} className="rounded-md border border-cyan/40 bg-bg/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan">
                  {c}
                </span>
              ))}
            </div>
            <h1 className="section-title mt-4 max-w-4xl text-5xl sm:text-6xl lg:text-7xl">{game.name}</h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={bookHref} className="btn btn-red">
                <CalendarDays className="size-5" aria-hidden="true" /> Book This Game
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-x">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ icon: Ico, label, value }) => (
            <div key={label} className="card-neon p-5">
              <Ico className="size-6 text-cyan" aria-hidden="true" />
              <dt className="mt-3 text-xs uppercase tracking-widest text-muted">{label}</dt>
              <dd className="font-orbitron mt-1 text-lg">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-x grid gap-10 pt-14 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <h2 className="section-title text-3xl">About the game</h2>
          <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ink/90">{game.description}</p>
          {(yt || game.videoUrl) && (
            <div className="card-neon mt-8 overflow-hidden">
              {yt ? (
                <iframe
                  src={yt}
                  title={`${game.name} gameplay preview`}
                  className="aspect-video w-full"
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={game.videoUrl} controls preload="none" className="aspect-video w-full" />
              )}
            </div>
          )}
        </Reveal>
        <Reveal delay={0.1} className="space-y-5">
          {game.instructions && (
            <div className="card-neon is-red p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                <Info className="size-5 text-red" aria-hidden="true" /> Important instructions
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{game.instructions}</p>
            </div>
          )}
          <div className="card-neon p-6">
            <h2 className="font-display text-xl font-bold uppercase">Ready to play?</h2>
            <p className="mt-2 text-sm text-muted">Choose a date and time and lock in your session online.</p>
            <Link href={bookHref} className="btn btn-red mt-5 w-full">
              <CalendarDays className="size-5" aria-hidden="true" /> Book This Game
            </Link>
          </div>
        </Reveal>
      </section>

      {game.gallery?.length > 0 && (
        <section className="container-x pt-16">
          <SectionHeading title="Gallery" />
          <Gallery items={game.gallery.map((image) => ({ image, alt: `${game.name} screenshot` }))} />
        </section>
      )}

      {related.length > 0 && (
        <section className="container-x pt-16">
          <SectionHeading title="Related Games" />
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
