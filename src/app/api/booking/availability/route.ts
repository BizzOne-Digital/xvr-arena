import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { getAvailableSlots, loadBookingSettings, loadExperience } from "@/lib/booking/availability";
import { resolveOffering } from "@/lib/booking/pricing";

const q = z.object({
  experience: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  players: z.coerce.number().int().min(1).max(200).default(1),
  game: z.string().max(120).optional(),
  plan: z.string().max(40).optional(),
});

export const GET = handle(async (req: Request) => {
  const params = q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const settings = await loadBookingSettings();
  const exp = await loadExperience(params.experience);
  const offering = await resolveOffering(exp, params.game || undefined, params.plan || undefined);
  const result = await getAvailableSlots({
    experience: exp,
    date: params.date,
    durationMin: offering.durationMin,
    players: params.players,
    settings,
  });
  return ok(result, { headers: { "Cache-Control": "no-store" } });
});
