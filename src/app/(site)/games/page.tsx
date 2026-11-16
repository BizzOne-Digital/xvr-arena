import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { GamesCatalog } from "@/components/games/GamesCatalog";
import { CtaBand } from "@/components/site/CtaBand";
import { getPublishedGames } from "@/lib/data";
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
        subtitle="Team adventures, action missions and mixed-reality challenges in our free-roaming VR arena."
        image={IMG.headset}
        imageAlt="Player in VR headset with neon lighting"
      />
      <section className="container-x pt-14">
        {games.length ? (
          <GamesCatalog games={games} />
        ) : (
          <p className="py-10 text-center text-muted">Our game list is being updated. Check back soon or book a session in the arena.</p>
        )}
      </section>
      <CtaBand />
    </>
  );
}
