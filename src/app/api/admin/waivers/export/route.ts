import { handle } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SignedWaiver } from "@/lib/models";
import { audit } from "@/lib/security";
import { waiverSearchFilter } from "@/lib/admin/waiver-search";
import { formatDateTime } from "@/lib/utils";

function csvCell(v: unknown) {
  let s = String(v ?? "");
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV export of signed waivers (all, a search, or mailing-list opt-ins). Staff only; logged. */
export const GET = handle(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const mailing = url.searchParams.get("mailing") === "1";
  await connectDB();

  const filter: Record<string, unknown> = q ? waiverSearchFilter(q) : {};
  if (mailing) filter.mailingList = true;
  const rows = await SignedWaiver.find(filter)
    .sort({ signedAt: -1 })
    .limit(20000)
    .select("waiverNumber bookingNumber firstName lastName participantName participantDob phone email emergencyPhone address mailingList medicalNotes isMinor guardian signerName signedAt templateVersion")
    .lean();

  const header = mailing
    ? ["First name", "Last name", "Email", "Phone", "City", "Last signed"]
    : [
        "Waiver #",
        "Signed at",
        "First name",
        "Last name",
        "Date of birth",
        "Phone",
        "Email",
        "Emergency contact",
        "Address",
        "City",
        "Province",
        "Postal code",
        "Medical / allergies",
        "Mailing list",
        "Minor",
        "Parent/guardian",
        "Signed by",
        "Booking #",
        "Waiver version",
      ];

  let lines: unknown[][];
  if (mailing) {
    // One row per email address (most recent waiver).
    const seen = new Set<string>();
    lines = rows
      .filter((w) => !seen.has(w.email) && seen.add(w.email))
      .map((w) => [w.firstName ?? w.participantName, w.lastName ?? "", w.email, w.phone, w.address?.city, formatDateTime(w.signedAt)]);
  } else {
    lines = rows.map((w) => [
      w.waiverNumber,
      formatDateTime(w.signedAt),
      w.firstName ?? w.participantName,
      w.lastName ?? "",
      w.participantDob,
      w.phone,
      w.email,
      w.emergencyPhone,
      w.address?.line1,
      w.address?.city,
      w.address?.province,
      w.address?.postalCode,
      w.medicalNotes,
      w.mailingList ? "Yes" : "No",
      w.isMinor ? "Yes" : "No",
      w.guardian?.name,
      w.signerName,
      w.bookingNumber,
      w.templateVersion,
    ]);
  }

  await audit({ actor: admin.userId, actorEmail: admin.email, action: mailing ? "waiver.export_mailing" : "waiver.export", entity: "SignedWaiver", details: { q, rows: lines.length } });
  const csv = "﻿" + [header, ...lines].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const name = mailing ? "xvr-mailing-list" : "xvr-waivers";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
});
