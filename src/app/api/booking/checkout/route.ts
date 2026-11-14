import { z } from "zod";
import { handle, ok, parseJson } from "@/lib/api";
import { startCheckout } from "@/lib/booking/service";

const schema = z.object({ bookingNumber: z.string().min(4).max(20), token: z.string().min(10).max(100) });

export const POST = handle(async (req: Request) => {
  const { bookingNumber, token } = await parseJson(req, schema);
  const result = await startCheckout(bookingNumber, token);
  return ok(result);
});
