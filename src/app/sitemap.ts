import type { MetadataRoute } from "next";
import { getExperiences, getPublishedGames } from "@/lib/data";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [experiences, games] = await Promise.all([getExperiences(), getPublishedGames()]);
  const now = new Date();
  const staticPages = [
    ["", 1],
    ["/about", 0.7],
    ["/games", 0.9],
    ["/services", 0.8],
    ["/pricing", 0.8],
    ["/offers", 0.7],
    ["/booking", 0.9],
    ["/parties", 0.8],
    ["/corporate-events", 0.8],
    ["/testimonials", 0.5],
    ["/faq", 0.6],
    ["/contact", 0.7],
    ["/waiver", 0.4],
    ["/privacy-policy", 0.2],
    ["/terms-and-conditions", 0.2],
  ] as const;
  return [
    ...staticPages.map(([path, priority]) => ({ url: `${base}${path}`, lastModified: now, priority })),
    ...experiences.map((e) => ({ url: `${base}/services/${e.slug}`, lastModified: now, priority: 0.7 })),
    ...games.map((g) => ({ url: `${base}/games/${g.slug}`, lastModified: now, priority: 0.6 })),
  ];
}
