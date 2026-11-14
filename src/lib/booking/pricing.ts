import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "../db";
import { Game, PricingPlan, Promotion, type IExperience, type IGame, type IPricingPlan, type IPromotion } from "../models";
import { HttpError } from "../security";
import type { BookingSettings } from "./availability";

export type Quote = {
  unitPriceCents: number;
  unit: "person" | "session";
  durationMin: number;
  minPlayers: number;
  maxPlayers: number;
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  taxCents: number;
  taxRatePercent: number;
  taxLabel: string;
  totalCents: number;
  promotions: { slug: string; title: string; discountCents: number }[];
  promoMessage?: string;
  planId?: string;
  game?: { slug: string; name: string };
};

export async function resolveOffering(exp: IExperience, gameSlug?: string, planId?: string) {
  await connectDB();
  let game: (IGame & { _id: unknown }) | null = null;
  if (gameSlug) {
    game = await Game.findOne({ slug: gameSlug, status: "published" }).lean();
    if (!game) throw new HttpError(404, "This game is not available.");
    if (game.experience !== exp.slug) throw new HttpError(400, "This game is not played in the selected experience.");
  }
  let plan: (IPricingPlan & { _id: unknown }) | null = null;
  if (planId) {
    if (!isValidObjectId(planId)) throw new HttpError(400, "Invalid pricing option.");
    plan = await PricingPlan.findOne({ _id: planId, experience: exp.slug, active: true }).lean();
    if (!plan) throw new HttpError(404, "This pricing option is no longer available.");
  }
  if (!plan && !(game?.priceCents != null)) {
    // Fall back to the first active plan for the experience.
    plan = await PricingPlan.findOne({ experience: exp.slug, active: true, kind: "standard" }).sort({ sortOrder: 1 }).lean();
  }

  const unitPriceCents = game?.priceCents ?? plan?.priceCents;
  if (unitPriceCents == null) {
    throw new HttpError(422, "Online pricing for this experience has not been published yet. Please contact us to book.");
  }
  const unit: "person" | "session" = game?.priceCents != null ? "person" : (plan?.unit ?? "person");
  const durationMin = game?.durationMin ?? plan?.durationMin ?? exp.defaultDurationMin;
  const minPlayers = Math.max(exp.minPlayers, game?.minPlayers ?? 1, plan?.minPlayers ?? 1);
  const maxPlayers = Math.min(exp.maxPlayers, game?.maxPlayers ?? Infinity, plan?.maxPlayers ?? Infinity);
  return { game, plan, unitPriceCents, unit, durationMin, minPlayers, maxPlayers };
}

function promoDiscount(p: IPromotion, ctx: { unitPriceCents: number; unit: string; players: number; subtotal: number; isBirthday: boolean }) {
  switch (p.type) {
    case "percent":
      return Math.round((ctx.subtotal * Math.min(100, Math.max(0, p.percentOff ?? 0))) / 100);
    case "fixed":
      return Math.max(0, p.amountOffCents ?? 0);
    case "buy_x_get_y": {
      if (ctx.unit !== "person") return 0;
      const buy = p.buyQty ?? 0;
      const free = p.freeQty ?? 0;
      if (buy < 1 || free < 1) return 0;
      const groups = Math.floor(ctx.players / (buy + free));
      return groups * free * ctx.unitPriceCents;
    }
    case "birthday_free":
      return ctx.isBirthday && ctx.unit === "person" ? ctx.unitPriceCents : 0;
    default:
      return 0;
  }
}

/** Server-side price calculation. Never trust totals sent by the browser. */
export async function buildQuote(opts: {
  exp: IExperience;
  settings: BookingSettings;
  players: number;
  gameSlug?: string;
  planId?: string;
  isBirthday?: boolean;
  promoCode?: string;
  date?: string;
}): Promise<Quote> {
  const { exp, settings, players } = opts;
  const o = await resolveOffering(exp, opts.gameSlug, opts.planId);
  if (players < o.minPlayers) throw new HttpError(400, `This option requires at least ${o.minPlayers} player(s).`);
  if (players > o.maxPlayers) throw new HttpError(400, `This option allows up to ${o.maxPlayers} player(s).`);

  const subtotal = o.unit === "person" ? o.unitPriceCents * players : o.unitPriceCents;
  const now = new Date();
  const code = opts.promoCode?.trim().toUpperCase() || undefined;
  const candidates = await Promotion.find({
    active: true,
    configured: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      { $or: [{ autoApply: true }, ...(code ? [{ code }] : [])] },
    ],
  }).lean();

  let promoMessage: string | undefined;
  if (code && !candidates.some((c) => c.code === code)) promoMessage = "That promo code is not valid or has expired.";

  const ctx = { unitPriceCents: o.unitPriceCents, unit: o.unit, players, subtotal, isBirthday: !!opts.isBirthday };
  const eligible = candidates
    .filter((p) => (p.maxRedemptions == null || p.redemptions < p.maxRedemptions))
    .filter((p) => !p.appliesTo?.length || p.appliesTo.includes(exp.slug))
    .filter((p) => !(p.excludePrivateEvents && exp.isPrivateEvent))
    .filter((p) => !p.minPlayers || players >= p.minPlayers)
    .map((p) => ({ p, amount: promoDiscount(p, ctx) }))
    .filter((x) => x.amount > 0);

  if (code && !promoMessage && !eligible.some((x) => x.p.code === code)) {
    promoMessage = "That promo code does not apply to this booking.";
  }

  let applied: typeof eligible = [];
  if (eligible.length) {
    const stackable = eligible.filter((x) => x.p.stackable);
    const best = [...eligible].sort((a, b) => b.amount - a.amount)[0];
    const stackTotal = stackable.reduce((s, x) => s + x.amount, 0);
    applied = stackable.length > 1 && stackTotal > best.amount ? stackable : [best];
  }

  const discount = Math.min(subtotal, applied.reduce((s, x) => s + x.amount, 0));
  const fee = settings.bookingFeeCents || 0;
  const taxable = subtotal - discount + fee;
  const tax = Math.round((taxable * (settings.taxRatePercent || 0)) / 100);

  return {
    unitPriceCents: o.unitPriceCents,
    unit: o.unit,
    durationMin: o.durationMin,
    minPlayers: o.minPlayers,
    maxPlayers: o.maxPlayers,
    subtotalCents: subtotal,
    discountCents: discount,
    feeCents: fee,
    taxCents: tax,
    taxRatePercent: settings.taxRatePercent || 0,
    taxLabel: settings.taxLabel || "Taxes",
    totalCents: taxable + tax,
    promotions: applied.map((x) => ({ slug: x.p.slug, title: x.p.title, discountCents: x.amount })),
    promoMessage,
    planId: o.plan ? String(o.plan._id) : undefined,
    game: o.game ? { slug: o.game.slug, name: o.game.name } : undefined,
  };
}
