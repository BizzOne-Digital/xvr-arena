import { defineModel, S, ObjectId } from "./_helpers";

/* ---------------------------------- Experience ---------------------------------- */
export interface IExperience {
  slug: string;
  name: string;
  shortName?: string;
  tagline?: string;
  description: string;
  longDescription?: string;
  icon: string;
  image?: string;
  gallery: string[];
  featured: boolean;
  /** Bookings sharing a resourceKey share capacity (e.g. arena games all use "arena"). */
  resourceKey: string;
  /** players = capacity counts people, private = one group occupies the whole resource. */
  capacityMode: "players" | "private";
  capacity: number;
  minPlayers: number;
  maxPlayers: number;
  defaultDurationMin: number;
  bufferMin: number;
  bookable: boolean;
  /** Party/corporate bookings show event fields and may be excluded from promos. */
  isPrivateEvent: boolean;
  highlights: string[];
  sortOrder: number;
  active: boolean;
}
const ExperienceSchema = new S<IExperience>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    shortName: String,
    tagline: String,
    description: { type: String, required: true },
    longDescription: String,
    icon: { type: String, default: "Sparkles" },
    image: String,
    gallery: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    resourceKey: { type: String, required: true },
    capacityMode: { type: String, enum: ["players", "private"], default: "players" },
    capacity: { type: Number, default: 8, min: 1 },
    minPlayers: { type: Number, default: 1, min: 1 },
    maxPlayers: { type: Number, default: 8, min: 1 },
    defaultDurationMin: { type: Number, default: 30, min: 5 },
    bufferMin: { type: Number, default: 10, min: 0 },
    bookable: { type: Boolean, default: true },
    isPrivateEvent: { type: Boolean, default: false },
    highlights: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
ExperienceSchema.index({ active: 1, sortOrder: 1 });
export const Experience = defineModel("Experience", ExperienceSchema);

/* ------------------------------------- Game ------------------------------------- */
export interface IGame {
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
  experience: string; // experience slug the game is played in
  status: "draft" | "published";
  sortOrder: number;
}
const GameSchema = new S<IGame>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    instructions: String,
    image: String,
    bannerImage: String,
    gallery: { type: [String], default: [] },
    videoUrl: String,
    durationMin: Number,
    minPlayers: Number,
    maxPlayers: Number,
    recommendedAge: String,
    priceCents: Number,
    provider: String,
    providerUrl: String,
    categories: { type: [String], default: [] },
    experience: { type: String, default: "vr-arena" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
GameSchema.index({ status: 1, sortOrder: 1 });
GameSchema.index({ categories: 1 });
export const Game = defineModel("Game", GameSchema);

/* ---------------------------------- PricingPlan --------------------------------- */
export interface IPricingPlan {
  experience: string; // experience slug
  name: string;
  description?: string;
  durationMin: number;
  priceCents: number;
  unit: "person" | "session";
  minPlayers: number;
  maxPlayers: number;
  extras: string[];
  kind: "standard" | "group" | "birthday" | "seasonal";
  featured: boolean;
  active: boolean;
  sortOrder: number;
}
const PricingPlanSchema = new S<IPricingPlan>(
  {
    experience: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    durationMin: { type: Number, required: true, min: 5 },
    priceCents: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ["person", "session"], default: "person" },
    minPlayers: { type: Number, default: 1 },
    maxPlayers: { type: Number, default: 8 },
    extras: { type: [String], default: [] },
    kind: { type: String, enum: ["standard", "group", "birthday", "seasonal"], default: "standard" },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
PricingPlanSchema.index({ experience: 1, active: 1 });
export const PricingPlan = defineModel("PricingPlan", PricingPlanSchema);

/* ----------------------------------- Promotion ---------------------------------- */
export interface IPromotion {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  terms?: string;
  image?: string;
  badge?: string;
  type: "percent" | "fixed" | "buy_x_get_y" | "birthday_free";
  percentOff?: number;
  amountOffCents?: number;
  buyQty?: number;
  freeQty?: number;
  code?: string;
  autoApply: boolean;
  appliesTo: string[]; // experience slugs, empty = all bookable
  excludePrivateEvents: boolean;
  minPlayers?: number;
  stackable: boolean;
  startsAt?: Date;
  endsAt?: Date;
  maxRedemptions?: number;
  redemptions: number;
  active: boolean;
  configured: boolean; // admin confirmed rules; unconfigured offers are never applied
  sortOrder: number;
}
const PromotionSchema = new S<IPromotion>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: String,
    description: String,
    terms: String,
    image: String,
    badge: String,
    type: { type: String, enum: ["percent", "fixed", "buy_x_get_y", "birthday_free"], required: true },
    percentOff: Number,
    amountOffCents: Number,
    buyQty: Number,
    freeQty: Number,
    code: { type: String, uppercase: true, trim: true, sparse: true },
    autoApply: { type: Boolean, default: false },
    appliesTo: { type: [String], default: [] },
    excludePrivateEvents: { type: Boolean, default: true },
    minPlayers: Number,
    stackable: { type: Boolean, default: false },
    startsAt: Date,
    endsAt: Date,
    maxRedemptions: Number,
    redemptions: { type: Number, default: 0 },
    active: { type: Boolean, default: false },
    configured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
PromotionSchema.index({ code: 1 });
export const Promotion = defineModel("Promotion", PromotionSchema);

/* -------------------------------------- FAQ ------------------------------------- */
export interface IFAQ {
  question: string;
  answer: string;
  category?: string;
  isDraft: boolean;
  published: boolean;
  sortOrder: number;
}
const FAQSchema = new S<IFAQ>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: String,
    isDraft: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const FAQ = defineModel("FAQ", FAQSchema);

/* ------------------------------------ Review ------------------------------------ */
export interface IReview {
  name: string;
  email?: string;
  rating: number;
  text: string;
  experience?: string;
  image?: string;
  status: "pending" | "approved" | "rejected";
  visitDate?: Date;
}
const ReviewSchema = new S<IReview>(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, maxlength: 160 },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true, maxlength: 2000 },
    experience: String,
    image: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    visitDate: Date,
  },
  { timestamps: true },
);
ReviewSchema.index({ status: 1, createdAt: -1 });
export const Review = defineModel("Review", ReviewSchema);

/* ---------------------------------- PageContent --------------------------------- */
export interface IPageContent {
  key: string;
  data: Record<string, unknown>;
  updatedBy?: unknown;
}
const PageContentSchema = new S<IPageContent>(
  {
    key: { type: String, required: true, unique: true },
    data: { type: S.Types.Mixed, default: {} },
    updatedBy: { type: ObjectId, ref: "AdminUser" },
  },
  { timestamps: true, minimize: false },
);
export const PageContent = defineModel("PageContent", PageContentSchema);

/* ---------------------------------- GalleryItem --------------------------------- */
export interface IGalleryItem {
  image: string;
  alt: string;
  caption?: string;
  section: "about" | "parties" | "corporate" | "general";
  sortOrder: number;
  active: boolean;
}
const GalleryItemSchema = new S<IGalleryItem>(
  {
    image: { type: String, required: true },
    alt: { type: String, required: true },
    caption: String,
    section: { type: String, enum: ["about", "parties", "corporate", "general"], default: "general" },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const GalleryItem = defineModel("GalleryItem", GalleryItemSchema);

/* --------------------------------- SiteSettings --------------------------------- */
export interface IDayHours {
  day: number; // 0 = Sunday
  open: boolean;
  openTime: string; // "HH:MM"
  closeTime: string;
}
export interface ISiteSettings {
  key: "main";
  businessName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
  entranceNote?: string;
  mapsQuery: string;
  hoursConfirmed: boolean;
  hoursNote?: string;
  social: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string };
  logoUrl?: string;
  notifyEmails: string[];
  // booking rules
  taxRatePercent: number;
  taxLabel: string;
  bookingFeeCents: number;
  holdMinutes: number;
  minLeadMinutes: number;
  maxAdvanceDays: number;
  slotIntervalMin: number;
  onlinePaymentsEnabled: boolean;
  waiverTiming: "before_payment" | "before_arrival";
  cancellationPolicy?: string;
  cancellationCutoffHours: number;
  allowSelfReschedule: boolean;
  arrivalInstructions?: string;
  reminderHoursBefore: number;
}
const SiteSettingsSchema = new S<ISiteSettings>(
  {
    key: { type: String, default: "main", unique: true },
    businessName: String,
    phone: String,
    email: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
    entranceNote: String,
    mapsQuery: String,
    hoursConfirmed: { type: Boolean, default: false },
    hoursNote: String,
    social: { facebook: String, instagram: String, tiktok: String, youtube: String },
    logoUrl: String,
    notifyEmails: { type: [String], default: [] },
    taxRatePercent: { type: Number, default: 0 },
    taxLabel: { type: String, default: "Taxes" },
    bookingFeeCents: { type: Number, default: 0 },
    holdMinutes: { type: Number, default: 30 },
    minLeadMinutes: { type: Number, default: 60 },
    maxAdvanceDays: { type: Number, default: 60 },
    slotIntervalMin: { type: Number, default: 30 },
    onlinePaymentsEnabled: { type: Boolean, default: true },
    waiverTiming: { type: String, enum: ["before_payment", "before_arrival"], default: "before_arrival" },
    cancellationPolicy: String,
    cancellationCutoffHours: { type: Number, default: 24 },
    allowSelfReschedule: { type: Boolean, default: false },
    arrivalInstructions: String,
    reminderHoursBefore: { type: Number, default: 24 },
  },
  { timestamps: true },
);
export const SiteSettings = defineModel("SiteSettings", SiteSettingsSchema);

/* ------------------------------- AvailabilityRule ------------------------------- */
export interface IAvailabilityRule {
  key: "weekly" | "closure" | "override";
  /** weekly: one doc holds the 7-day schedule */
  hours?: IDayHours[];
  /** closure / override */
  date?: string; // YYYY-MM-DD
  endDate?: string;
  reason?: string;
  openTime?: string;
  closeTime?: string;
  resourceKey?: string; // optional: closure for one resource only
}
const AvailabilityRuleSchema = new S<IAvailabilityRule>(
  {
    key: { type: String, enum: ["weekly", "closure", "override"], required: true },
    hours: [{ day: Number, open: Boolean, openTime: String, closeTime: String, _id: false }],
    date: String,
    endDate: String,
    reason: String,
    openTime: String,
    closeTime: String,
    resourceKey: String,
  },
  { timestamps: true },
);
AvailabilityRuleSchema.index({ key: 1, date: 1 });
export const AvailabilityRule = defineModel("AvailabilityRule", AvailabilityRuleSchema);
