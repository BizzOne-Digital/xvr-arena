import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { getOpenDates, loadBookingSettings } from "@/lib/booking/availability";
import { addDays, todayInTz } from "@/lib/utils";

const q = z.object({ resource: z.string().max(80).optional() });

/** Returns which upcoming dates are open, so the date picker can disable closed days. */
export const GET = handle(async (req: Request) => {
  const { resource } = q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const settings = await loadBookingSettings();
  const today = todayInTz();
  const days = Math.min(settings.maxAdvanceDays, 180);
  const dates = await getOpenDates(
    Array.from({ length: days + 1 }, (_, i) => addDays(today, i)),
    resource,
  );
  return ok({ today, maxDate: addDays(today, days), dates }, { headers: { "Cache-Control": "no-store" } });
});
