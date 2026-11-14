import { handle, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Experience } from "@/lib/models";
import { DEFAULT_EXPERIENCES } from "@/lib/defaults";

/** Dynamic select options for admin forms. */
export const GET = handle(async (req: Request) => {
  await requireAdminApi(req);
  await connectDB();
  const docs = await Experience.find({}).sort({ sortOrder: 1 }).select("slug name").lean();
  const experiences = (docs.length ? docs : DEFAULT_EXPERIENCES).map((e) => ({ value: e.slug, label: e.name }));
  return ok({ experiences });
});
