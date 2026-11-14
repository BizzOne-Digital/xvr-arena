import type { Metadata } from "next";
import { ExternalLink, Gamepad2 } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { GamesCatalog } from "@/components/games/GamesCatalog";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { getPublishedGames } from "@/lib/data";
import { GAME_PROVIDERS } from "@/lib/constants";
import { IMG } from "@/lib/defaults";

export const metadata: Metadata = {
  title: "VR Games Catalog",
  description:
    "Browse free-roaming VR and Mixed Reality games at XVR Winnipeg. Filter by action, adventure, family, multiplayer, horror, racing, kids and MR.",
  alternates: { canonical: "/games" },
};

export default async function GamesPage() {
  const games = await getPublishedGames();
  return (
    <>
      <PageHero
        eyebrow="Games"
        title="Pick Your"
        accent="Mission"
        subtitle="Team adventures, action missions and mixed-reality challenges from leading VR arena studios."
        image={IMG.headset}
        imageAlt="Player in VR headset with neon lighting"
      />
      <section className="container-x pt-14">
        {games.length ? (
          <GamesCatalog games={games} />
        ) : (
          <Reveal className="card-neon mx-auto max-w-3xl p-8 text-center sm:p-12">
            <Gamepad2 className="mx-auto size-14 text-cyan" aria-hidden="true" />
            <h2 className="section-title mt-4 text-3xl sm:text-4xl">Game catalog coming soon</h2>
            <p className="mt-4 text-muted">
              We&apos;re finalizing our lineup of free-roaming VR and MR games. Our games come from these arena game studios:
            </p>
            <ul className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {GAME_PROVIDERS.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    {p.name} <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </section>
      <CtaBand />
    </>
  );
}
