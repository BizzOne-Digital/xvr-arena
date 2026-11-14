import "server-only";
import { unstable_cache } from "next/cache";
import { connectDB, isDbConfigured } from "./db";
import {
  Experience,
  FAQ,
  GalleryItem,
  Game,
  PageContent,
  PricingPlan,
  Promotion,
  Review,
  SiteSettings,
  AvailabilityRule,
} from "./models";
import {
  DEFAULT_ABOUT,
  DEFAULT_CORPORATE,
  DEFAULT_EXPERIENCES,
  DEFAULT_FAQS,
  DEFAULT_HOME,
  DEFAULT_LEGAL,
  DEFAULT_PARTIES,
  DEFAULT_PROMOTIONS,
  DEFAULT_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
  type SettingsShape,
} from "./defaults";
import { toPlain } from "./utils";

export const TAGS = {
  settings: "settings",
  experiences: "experiences",
  games: "games",
  pricing: "pricing",
  promotions: "promotions",
  faqs: "faqs",
  reviews: "reviews",
  pages: "pages",
  gallery: "gallery",
  availability: "availability",
} as const;

/** Run a DB read; on missing config or DB failure, log and return the fallback so pages still render. */
async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  if (!isDbConfigured()) return fallback;
  try {
    await connectDB();
    return await fn();
  } catch (err) {
    // Warn once per outage (not console.error, which floods the dev overlay); pages use fallback content.
    const g = globalThis as unknown as { __xvrDbWarned?: number };
    if (!g.__xvrDbWarned || Date.now() - g.__xvrDbWarned > 60_000) {
      g.__xvrDbWarned = Date.now();
      console.warn(`[data] Database unavailable (${label}); showing fallback content. ${(err as Error).message}`);
    }
    return fallback;
  }
}

const REVALIDATE = 3600;

/* ---------------- Types returned to pages (plain JSON) ---------------- */
export type ExperienceDTO = {
  _id?: string;
  slug: string;
  name: string;
  shortName?: string;
  tagline?: string;
  description: string;
  longDescription?: string;
  icon: string;
  image?: string;
  gallery?: string[];
  featured: boolean;
  resourceKey: string;
  capacityMode: "players" | "private";
  capacity: number;
  minPlayers: number;
  maxPlayers: number;
  defaultDurationMin: number;
  bufferMin: number;
  bookable: boolean;
  isPrivateEvent: boolean;
  highlights: string[];
  sortOrder: number;
};
export type GameDTO = {
  _id: string;
  slug: string;
  name: string;
  description: string;
  instructions?: string;
  image?: string;
  bannerImage?: string;
  gallery: string[];
  videoUrl?: string;
  durationMin?: number;
  minPlayers?: number;
  maxPlayers?: number;
  recommendedAge?: string;
  priceCents?: number;
  provider?: string;
  providerUrl?: string;
  categories: string[];
  experience: string;
  status: "draft" | "published";
};
export type PricingPlanDTO = {
  _id: string;
  experience: string;
  name: string;
  description?: string;
  durationMin: number;
  priceCents: number;
  unit: "person" | "session";
  minPlayers: number;
  maxPlayers: number;
  extras: string[];
  kind: string;
  featured: boolean;
};
export type PromotionDTO = {
  _id?: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  terms?: string;
  image?: string;
  badge?: string;
  type: string;
  code?: string;
  startsAt?: string;
  endsAt?: string;
  configured: boolean;
};
export type FaqDTO = { _id?: string; question: string; answer: string; category?: string };
export type ReviewDTO = { _id: string; name: string; rating: number; text: string; image?: string; createdAt: string; visitDate?: string };
export type GalleryDTO = { _id: string; image: string; alt: string; caption?: string; section: string };

/* ---------------------------------- Settings ---------------------------------- */
export const getSettings = unstable_cache(
  async (): Promise<SettingsShape> =>
    safe(
      async () => {
        const doc = await SiteSettings.findOne({ key: "main" }).lean();
        return { ...DEFAULT_SETTINGS, ...(doc ? toPlain<Partial<SettingsShape>>(doc) : {}) } as SettingsShape;
      },
      DEFAULT_SETTINGS as SettingsShape,
      "settings",
    ),
  ["settings"],
  { tags: [TAGS.settings], revalidate: REVALIDATE },
);

export const getWeeklyHours = unstable_cache(
  async () =>
    safe(
      async () => {
        const doc = await AvailabilityRule.findOne({ key: "weekly" }).lean();
        return doc?.hours?.length ? toPlain<typeof DEFAULT_WEEKLY_HOURS>(doc.hours) : DEFAULT_WEEKLY_HOURS;
      },
      DEFAULT_WEEKLY_HOURS,
      "hours",
    ),
  ["weekly-hours"],
  { tags: [TAGS.availability], revalidate: REVALIDATE },
);

/* --------------------------------- Experiences -------------------------------- */
export const getExperiences = unstable_cache(
  async (): Promise<ExperienceDTO[]> =>
    safe(
      async () => {
        const docs = await Experience.find({ active: true }).sort({ sortOrder: 1 }).lean();
        return docs.length ? toPlain<ExperienceDTO[]>(docs) : (DEFAULT_EXPERIENCES as ExperienceDTO[]);
      },
      DEFAULT_EXPERIENCES as ExperienceDTO[],
      "experiences",
    ),
  ["experiences"],
  { tags: [TAGS.experiences], revalidate: REVALIDATE },
);

export async function getExperience(slug: string) {
  const all = await getExperiences();
  return all.find((e) => e.slug === slug) ?? null;
}

/* ------------------------------------ Games ----------------------------------- */
export const getPublishedGames = unstable_cache(
  async (): Promise<GameDTO[]> =>
    safe(
      async () =>
        toPlain<GameDTO[]>(
          await Game.find({ status: "published" }).sort({ sortOrder: 1, name: 1 }).select("-__v").lean(),
        ),
      [],
      "games",
    ),
  ["games-published"],
  { tags: [TAGS.games], revalidate: REVALIDATE },
);

export async function getGame(slug: string) {
  const all = await getPublishedGames();
  return all.find((g) => g.slug === slug) ?? null;
}

/* ----------------------------------- Pricing ---------------------------------- */
export const getPricingPlans = unstable_cache(
  async (): Promise<PricingPlanDTO[]> =>
    safe(
      async () => toPlain<PricingPlanDTO[]>(await PricingPlan.find({ active: true }).sort({ sortOrder: 1 }).lean()),
      [],
      "pricing",
    ),
  ["pricing-plans"],
  { tags: [TAGS.pricing], revalidate: REVALIDATE },
);

/* --------------------------------- Promotions --------------------------------- */
export const getPublicPromotions = unstable_cache(
  async (): Promise<PromotionDTO[]> =>
    safe(
      async () => {
        const now = new Date();
        const docs = await Promotion.find({
          active: true,
          $and: [
            { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
            { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
          ],
        })
          .sort({ sortOrder: 1 })
          .select("slug title subtitle description terms image badge type startsAt endsAt configured")
          .lean();
        const count = await Promotion.estimatedDocumentCount();
        return count === 0 ? (DEFAULT_PROMOTIONS as PromotionDTO[]) : toPlain<PromotionDTO[]>(docs);
      },
      DEFAULT_PROMOTIONS as PromotionDTO[],
      "promotions",
    ),
  ["promotions-public"],
  { tags: [TAGS.promotions], revalidate: 600 },
);

/* ------------------------------------ FAQs ------------------------------------ */
export const getFaqs = unstable_cache(
  async (): Promise<FaqDTO[]> =>
    safe(
      async () => {
        const count = await FAQ.estimatedDocumentCount();
        if (count === 0) return DEFAULT_FAQS.filter((f) => f.published);
        return toPlain<FaqDTO[]>(
          await FAQ.find({ published: true, isDraft: false }).sort({ sortOrder: 1 }).select("question answer category").lean(),
        );
      },
      DEFAULT_FAQS.filter((f) => f.published),
      "faqs",
    ),
  ["faqs"],
  { tags: [TAGS.faqs], revalidate: REVALIDATE },
);

/* ----------------------------------- Reviews ---------------------------------- */
export const getApprovedReviews = unstable_cache(
  async (): Promise<ReviewDTO[]> =>
    safe(
      async () =>
        toPlain<ReviewDTO[]>(
          await Review.find({ status: "approved" }).sort({ createdAt: -1 }).limit(60).select("name rating text image createdAt visitDate").lean(),
        ),
      [],
      "reviews",
    ),
  ["reviews-approved"],
  { tags: [TAGS.reviews], revalidate: REVALIDATE },
);

/* ----------------------------------- Gallery ---------------------------------- */
export const getGallery = unstable_cache(
  async (): Promise<GalleryDTO[]> =>
    safe(
      async () => toPlain<GalleryDTO[]>(await GalleryItem.find({ active: true }).sort({ sortOrder: 1 }).lean()),
      [],
      "gallery",
    ),
  ["gallery"],
  { tags: [TAGS.gallery], revalidate: REVALIDATE },
);

/* ---------------------------------- Page content ------------------------------ */
const PAGE_DEFAULTS = {
  home: DEFAULT_HOME,
  about: DEFAULT_ABOUT,
  parties: DEFAULT_PARTIES,
  corporate: DEFAULT_CORPORATE,
  legal: DEFAULT_LEGAL,
};
export type PageKey = keyof typeof PAGE_DEFAULTS;

const getAllPageContent = unstable_cache(
  async (): Promise<Record<string, Record<string, unknown>>> =>
    safe(
      async () => {
        const docs = await PageContent.find({}).select("key data").lean();
        return Object.fromEntries(docs.map((d) => [d.key, toPlain<Record<string, unknown>>(d.data ?? {})]));
      },
      {},
      "pages",
    ),
  ["page-content"],
  { tags: [TAGS.pages], revalidate: REVALIDATE },
);

export async function getPageContent<K extends PageKey>(key: K): Promise<(typeof PAGE_DEFAULTS)[K]> {
  const all = await getAllPageContent();
  const stored = all[key] ?? {};
  const merged: Record<string, unknown> = { ...PAGE_DEFAULTS[key] };
  for (const [k, v] of Object.entries(stored)) if (v !== "" && v != null) merged[k] = v;
  return merged as (typeof PAGE_DEFAULTS)[K];
}

export { PAGE_DEFAULTS };
