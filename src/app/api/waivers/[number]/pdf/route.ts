import { connectDB } from "@/lib/db";
import { SignedWaiver } from "@/lib/models";
import { getAdmin } from "@/lib/auth";
import { renderWaiverPdf } from "@/lib/waiver";
import { safeEqual, audit } from "@/lib/security";

/** Signed waiver PDF. Accessible to signed-in staff, or the signer via their private link token. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t") || "";
  await connectDB();
  const w = await SignedWaiver.findOne({ waiverNumber: number }).select("+signaturePng +accessToken").lean();
  if (!w) return new Response("Not found", { status: 404 });

  const admin = await getAdmin();
  const allowed = admin || (token && safeEqual(token, w.accessToken));
  if (!allowed) return new Response("Not found", { status: 404 });
  if (admin) await audit({ actor: admin.userId, actorEmail: admin.email, action: "waiver.download", entity: "SignedWaiver", entityId: number });

  const bytes = await renderWaiverPdf({ ...w, signaturePng: Buffer.from(w.signaturePng.buffer ?? w.signaturePng) } as never);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="xvr-waiver-${number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
