import { handle, ok, parseJson } from "@/lib/api";
import { loadBookingSettings, loadExperience } from "@/lib/booking/availability";
import { buildQuote } from "@/lib/booking/pricing";
import { quoteSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const input = await parseJson(req, quoteSchema);
  const settings = await loadBookingSettings();
  const exp = await loadExperience(input.experience);
  const quote = await buildQuote({
    exp,
    settings,
    players: input.players,
    gameSlug: input.game || undefined,
    planId: input.pricingPlan || undefined,
    isBirthday: input.isBirthday,
    promoCode: input.promoCode || undefined,
  });
  return ok(quote, { headers: { "Cache-Control": "no-store" } });
});
