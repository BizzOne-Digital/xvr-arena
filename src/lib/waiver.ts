import "server-only";
import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { connectDB } from "./db";
import { Booking, Participant, SignedWaiver, WaiverTemplate, type ISignedWaiver } from "./models";
import { HttpError, randomToken, sha256 } from "./security";
import type { z } from "zod";
import type { waiverSignSchema } from "./validation";
import { refreshWaiverStatus } from "./booking/service";
import { notifyAdmins, sendWaiverCompleted } from "./emails";
import { formatDateTime, siteUrl } from "./utils";

export async function getPublishedWaiver() {
  await connectDB();
  return WaiverTemplate.findOne({ status: "published" }).sort({ version: -1 }).lean();
}

function ageOn(dob: string, on = new Date()) {
  const [y, m, d] = dob.split("-").map(Number);
  let age = on.getUTCFullYear() - y;
  if (on.getUTCMonth() + 1 < m || (on.getUTCMonth() + 1 === m && on.getUTCDate() < d)) age--;
  return age;
}

export async function signWaiver(input: z.infer<typeof waiverSignSchema>, meta: { ip?: string; userAgent?: string }) {
  await connectDB();
  const template = await getPublishedWaiver();
  if (!template) throw new HttpError(409, "The waiver has not been published yet. Please check back soon or contact us.");

  if (input.acknowledgments.length !== template.acknowledgments.length || input.acknowledgments.some((a) => !a)) {
    throw new HttpError(400, "Please confirm every acknowledgment.");
  }
  if (template.requireDob && !input.participantDob) throw new HttpError(400, "Date of birth is required.");

  let isMinor = input.isMinor;
  if (input.participantDob) {
    const age = ageOn(input.participantDob);
    if (age < 0 || age > 120) throw new HttpError(400, "Please check the date of birth.");
    isMinor = age < template.minorAgeThreshold;
  }
  if (isMinor && !input.guardian) throw new HttpError(400, "A parent or legal guardian must sign for participants under " + template.minorAgeThreshold + ".");

  let booking = null;
  if (input.bookingId) {
    booking = await Booking.findOne({ bookingNumber: input.bookingId }).lean();
    if (!booking || booking.publicToken !== input.token) throw new HttpError(404, "Booking not found.");
    if (["cancelled", "expired"].includes(booking.status)) throw new HttpError(409, "This booking is no longer active.");
  }

  const png = Buffer.from(input.signaturePng.replace(/^data:image\/png;base64,/, ""), "base64");
  if (png.length < 200 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new HttpError(400, "Please draw your signature before submitting.");
  }

  const signedAt = new Date();
  const templateHash = template.contentHash || sha256(template.body);
  const signerName = isMinor ? input.guardian!.name : input.participantName;
  const documentHash = sha256(
    JSON.stringify({
      templateVersion: template.version,
      templateHash,
      participantName: input.participantName,
      participantDob: input.participantDob,
      email: input.email,
      guardian: isMinor ? input.guardian : undefined,
      signerName,
      signedAt: signedAt.toISOString(),
      signature: sha256(png),
      bookingNumber: booking?.bookingNumber,
    }),
  );
  const waiverNumber = "W-" + crypto.randomBytes(5).toString("hex").toUpperCase();
  const accessToken = randomToken(24);

  const participant = booking
    ? await Participant.create({
        booking: booking._id,
        fullName: input.participantName,
        dateOfBirth: input.participantDob || undefined,
        isMinor,
        email: input.email,
        phone: input.phone || undefined,
      })
    : null;

  const signed = await SignedWaiver.create({
    waiverNumber,
    booking: booking?._id,
    bookingNumber: booking?.bookingNumber,
    participant: participant?._id,
    template: template._id,
    templateVersion: template.version,
    templateTitle: template.title,
    templateBody: template.body,
    templateHash,
    acknowledgments: template.acknowledgments,
    participantName: input.participantName,
    participantDob: input.participantDob || undefined,
    isMinor,
    email: input.email,
    phone: input.phone || undefined,
    guardian: isMinor ? input.guardian : undefined,
    signerName,
    signaturePng: png,
    typedSignature: input.typedSignature,
    signedAt,
    ip: meta.ip,
    userAgent: meta.userAgent?.slice(0, 300),
    documentHash,
    accessToken,
  });
  if (participant) await Participant.updateOne({ _id: participant._id }, { $set: { signedWaiver: signed._id } });

  let refreshed = null;
  if (booking) refreshed = await refreshWaiverStatus(booking._id);

  const downloadUrl = `${siteUrl()}/api/waivers/${signed.waiverNumber}/pdf?t=${accessToken}`;
  await sendWaiverCompleted(input.email, input.participantName, waiverNumber, downloadUrl);
  if (refreshed?.waiverStatus === "complete") {
    await notifyAdmins("Waivers complete", "All waivers signed for booking", [
      ["Booking", refreshed.bookingNumber],
      ["Customer", refreshed.customer.name],
      ["Session", formatDateTime(refreshed.startAt)],
    ]);
  }

  return { waiverNumber, downloadPath: `/api/waivers/${signed.waiverNumber}/pdf?t=${accessToken}`, waiverStatus: refreshed?.waiverStatus };
}

/* ------------------------------------ PDF ------------------------------------ */

function wrap(text: string, font: { widthOfTextAtSize(t: string, s: number): number }, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

/** pdf-lib standard fonts only support WinAnsi; replace unsupported characters. */
function ansi(s: string) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

export async function renderWaiverPdf(w: ISignedWaiver) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Signed waiver ${w.waiverNumber}`);
  pdf.setProducer("XVR Waiver System");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const size = 10;
  const margin = 50;
  let page = pdf.addPage([612, 792]);
  let y = 792 - margin;
  const width = 612 - margin * 2;

  const ensure = (h: number) => {
    if (y - h < margin) {
      page = pdf.addPage([612, 792]);
      y = 792 - margin;
    }
  };
  const write = (text: string, opts: { f?: typeof font; s?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const f = opts.f ?? font;
    const s = opts.s ?? size;
    for (const line of wrap(ansi(text), f, s, width)) {
      ensure(s + 4);
      page.drawText(line, { x: margin, y: y - s, size: s, font: f, color: opts.color ?? rgb(0.1, 0.1, 0.12) });
      y -= s + 4;
    }
  };

  write("XVR - Free-Roaming VR Arena", { f: bold, s: 16 });
  write(`${w.templateTitle} (version ${w.templateVersion})`, { f: bold, s: 12 });
  write(`Waiver reference: ${w.waiverNumber}${w.bookingNumber ? `   Booking: ${w.bookingNumber}` : ""}`, { s: 9 });
  y -= 8;
  write(w.templateBody);
  y -= 8;
  if (w.acknowledgments?.length) {
    write("Acknowledgments confirmed:", { f: bold });
    for (const a of w.acknowledgments) write(`[x] ${a}`);
  }
  y -= 10;
  write("Participant", { f: bold, s: 11 });
  write(`Name: ${w.participantName}`);
  if (w.participantDob) write(`Date of birth: ${w.participantDob}`);
  write(`Email: ${w.email}${w.phone ? `   Phone: ${w.phone}` : ""}`);
  write(`Minor: ${w.isMinor ? "Yes" : "No"}`);
  if (w.isMinor && w.guardian) {
    y -= 4;
    write("Parent / legal guardian", { f: bold, s: 11 });
    write(`Name: ${w.guardian.name}   Relationship: ${w.guardian.relationship}`);
    if (w.guardian.email || w.guardian.phone) write(`Contact: ${[w.guardian.email, w.guardian.phone].filter(Boolean).join("  ")}`);
  }
  y -= 8;
  write(`Signed by: ${w.signerName}`, { f: bold });
  write(`Signed at: ${formatDateTime(w.signedAt, { second: "2-digit", timeZoneName: "short" })}`);

  if (w.signaturePng?.length) {
    const img = await pdf.embedPng(w.signaturePng);
    const scale = Math.min(220 / img.width, 80 / img.height, 1);
    ensure(img.height * scale + 20);
    page.drawRectangle({ x: margin, y: y - img.height * scale - 8, width: img.width * scale + 16, height: img.height * scale + 8, color: rgb(1, 1, 1), borderColor: rgb(0.7, 0.7, 0.75), borderWidth: 0.5 });
    page.drawImage(img, { x: margin + 8, y: y - img.height * scale - 4, width: img.width * scale, height: img.height * scale });
    y -= img.height * scale + 20;
  }
  write("Integrity", { f: bold, s: 9 });
  write(`Template hash (SHA-256): ${w.templateHash}`, { s: 7 });
  write(`Document hash (SHA-256): ${w.documentHash}`, { s: 7 });
  if (w.ip) write(`Signed from IP: ${w.ip}`, { s: 7 });
  return pdf.save();
}
