import { handle, ok } from "@/lib/api";
import { getPublishedWaiver } from "@/lib/waiver";

export const GET = handle(async () => {
  const t = await getPublishedWaiver();
  if (!t) return ok({ published: false }, { headers: { "Cache-Control": "no-store" } });
  return ok(
    {
      published: true,
      version: t.version,
      title: t.title,
      body: t.body,
      acknowledgments: t.acknowledgments,
      requireDob: t.requireDob,
      minorAgeThreshold: t.minorAgeThreshold,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
