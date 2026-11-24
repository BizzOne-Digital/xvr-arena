import data from "./games-data.json";

/** Starter game catalog compiled from the supplier pages XVR provided. Used until games exist in the database. */
export type CatalogGame = {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  recommendedAge?: string;
  durationLabel?: string;
  durationMin?: number;
  minPlayers?: number;
  maxPlayers?: number;
  videoUrl?: string;
  provider?: string;
  providerUrl?: string;
  image?: string;
};

export const CATALOG_GAMES = (data as CatalogGame[]).map((g, i) => ({
  ...g,
  gallery: [] as string[],
  experience: "vr-arena",
  status: "published" as const,
  sortOrder: i,
}));
