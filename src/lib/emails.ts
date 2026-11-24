import "server-only";
import { getSettings } from "./data";
import { adminRecipients, queueEmail } from "./mailer";
import type { IBooking } from "./models";
import { formatCAD, formatDateTime, siteUrl, totalLabel } from "./utils";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, WAIVER_STATUS_LABELS } from "./constants";

type BookingLike = IBooking & { _id: unknown };

function esc(s: string | undefined | null) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#03070D;font-family:Inter,Arial,sans-serif;color:#F7FBFF">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#03070D;padding:24px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#071421;border:1px solid #0b3b4d;border-radius:14px;overflow:hidden">
<tr><td style="padding:22px 28px;border-bottom:1px solid #0b3b4d"><span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#00DFFF">XVR</span>
<span style="display:block;font-size:11px;letter-spacing:3px;color:#9FB4C5">FREE-ROAMING VR ARENA</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:22px;color:#F7FBFF">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #0b3b4d;font-size:12px;color:#9FB4C5">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#9FB4C5;font-size:14px;width:42%">${esc(label)}</td><td style="padding:6px 0;font-size:14px;color:#F7FBFF">${esc(value)}</td></tr>`;
}

function button(href: string, label: string, color = "#FF254A") {
  return `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;border:1.5px solid ${color};border-radius:10px;color:#fff;text-decoration:none;font-weight:700">${esc(label)}</a></p>`;
}

async function footer() {
  const s = await getSettings();
  return `${esc(s.businessName)} · ${esc(s.addressLine1)}, ${esc(s.city)}, ${esc(s.province)}<br>${esc(s.entranceNote ?? "")}<br>${esc(s.phone)} · ${esc(s.email)}`;
}

function bookingRows(b: BookingLike) {
  return `<table width="100%" cellpadding="0" cellspacing="0">
${row("Booking number", b.bookingNumber)}
${row("Name", b.customer.name)}
${row("Experience", b.experienceName)}
${b.gameName ? row("Game", b.gameName) : ""}
${row("Date & time", formatDateTime(b.startAt))}
${row("Duration", `${b.durationMin} minutes`)}
${row("Players", String(b.players))}
${row("Total", totalLabel(b.pricing))}
${row("Booking status", BOOKING_STATUS_LABELS[b.status] ?? b.status)}
${row("Payment status", PAYMENT_STATUS_LABELS[b.paymentStatus] ?? b.paymentStatus)}
${row("Waiver status", WAIVER_STATUS_LABELS[b.waiverStatus] ?? b.waiverStatus)}
</table>`;
}

function bookingText(b: BookingLike) {
  return [
    `Booking number: ${b.bookingNumber}`,
    `Experience: ${b.experienceName}${b.gameName ? ` – ${b.gameName}` : ""}`,
    `Date & time: ${formatDateTime(b.startAt)}`,
    `Players: ${b.players}`,
    `Total: ${totalLabel(b.pricing)}`,
    `Payment: ${PAYMENT_STATUS_LABELS[b.paymentStatus] ?? b.paymentStatus}`,
  ].join("\n");
}

export function confirmationUrl(b: BookingLike) {
  return `${siteUrl()}/booking/confirmation/${b.bookingNumber}?t=${b.publicToken}`;
}
export function waiverUrl(b: BookingLike) {
  return `${siteUrl()}/waiver/${b.bookingNumber}?t=${b.publicToken}`;
}

type CustomerTemplate = "confirmed" | "requested" | "pending_payment" | "cancelled" | "rescheduled" | "reminder";

const CUSTOMER_COPY: Record<CustomerTemplate, { subject: string; title: string; intro: string }> = {
  confirmed: {
    subject: "Your XVR booking is confirmed",
    title: "You're booked! Get ready to enter the arena.",
    intro: "Thanks for booking with XVR. Your payment has been received and your session is confirmed.",
  },
  requested: {
    subject: "We received your XVR booking request",
    title: "Booking request received",
    intro: "Thanks for choosing XVR. Our team will review your request and confirm your session shortly. Your spot is held while we review it.",
  },
  pending_payment: {
    subject: "Complete your XVR booking payment",
    title: "Your booking is waiting for payment",
    intro: "Your session is not confirmed until payment is completed.",
  },
  cancelled: {
    subject: "Your XVR booking has been cancelled",
    title: "Booking cancelled",
    intro: "Your booking has been cancelled. If you have questions about refunds, please contact us.",
  },
  rescheduled: {
    subject: "Your XVR booking has been rescheduled",
    title: "New date and time confirmed",
    intro: "Your booking has been moved. Here are your updated details.",
  },
  reminder: {
    subject: "Reminder: your XVR session is coming up",
    title: "See you soon at XVR",
    intro: "This is a friendly reminder about your upcoming session.",
  },
};

export async function sendCustomerBookingEmail(b: BookingLike, template: CustomerTemplate, opts: { dedupe?: boolean } = {}) {
  const s = await getSettings();
  const copy = CUSTOMER_COPY[template];
  const waiverNeeded = ["pending", "partial"].includes(b.waiverStatus) && template !== "cancelled";
  const html = layout(
    copy.title,
    `<p style="color:#9FB4C5;line-height:1.6">Hi ${esc(b.customer.name)},</p>
<p style="color:#9FB4C5;line-height:1.6">${esc(copy.intro)}</p>
${bookingRows(b)}
${template !== "cancelled" ? `<p style="color:#9FB4C5;line-height:1.6;margin-top:18px"><strong style="color:#F7FBFF">Arrival:</strong> ${esc(s.arrivalInstructions ?? "")}</p>` : ""}
${button(confirmationUrl(b), "View booking", "#00DFFF")}
${waiverNeeded ? `<p style="color:#9FB4C5">Every participant needs a signed waiver before playing.</p>${button(waiverUrl(b), "Sign waivers online")}` : ""}`,
    await footer(),
  );
  const text = `${copy.title}\n\n${copy.intro}\n\n${bookingText(b)}\n\nView booking: ${confirmationUrl(b)}${waiverNeeded ? `\nSign waivers: ${waiverUrl(b)}` : ""}`;
  await queueEmail({
    to: b.customer.email,
    subject: copy.subject,
    template: `booking.${template}`,
    html,
    text,
    relatedBooking: b._id as string,
    dedupeKey: opts.dedupe ? `booking.${template}:${b.bookingNumber}` : undefined,
  });
}

export async function sendPaymentReceipt(b: BookingLike, receiptUrl?: string) {
  const html = layout(
    "Payment received",
    `<p style="color:#9FB4C5">We received your payment of <strong style="color:#F7FBFF">${formatCAD(b.pricing.totalCents)}</strong> for booking ${esc(b.bookingNumber)}.</p>
${bookingRows(b)}${receiptUrl ? button(receiptUrl, "View Stripe receipt", "#00DFFF") : ""}`,
    await footer(),
  );
  await queueEmail({
    to: b.customer.email,
    subject: `Payment received – ${b.bookingNumber}`,
    template: "payment.receipt",
    html,
    text: `Payment received: ${formatCAD(b.pricing.totalCents)}\n\n${bookingText(b)}`,
    relatedBooking: b._id as string,
    dedupeKey: `payment.receipt:${b.bookingNumber}`,
  });
}

export async function sendWaiverCompleted(to: string, participant: string, waiverNumber: string, downloadUrl: string) {
  const html = layout(
    "Waiver signed",
    `<p style="color:#9FB4C5">Thank you. The waiver for <strong style="color:#F7FBFF">${esc(participant)}</strong> was signed successfully.</p>
<p style="color:#9FB4C5">Reference: ${esc(waiverNumber)}</p>${button(downloadUrl, "Download signed copy (PDF)", "#00DFFF")}`,
    await footer(),
  );
  await queueEmail({
    to,
    subject: "Your XVR waiver is signed",
    template: "waiver.completed",
    html,
    text: `Waiver for ${participant} signed. Reference ${waiverNumber}. Download: ${downloadUrl}`,
  });
}

export async function notifyAdmins(subject: string, title: string, lines: [string, string][], link?: string) {
  const s = await getSettings();
  const to = await adminRecipients(s.notifyEmails);
  if (!to.length) return;
  const html = layout(
    title,
    `<table width="100%" cellpadding="0" cellspacing="0">${lines.map(([k, v]) => row(k, v)).join("")}</table>${link ? button(link, "Open in Admin Portal", "#00DFFF") : ""}`,
    "Internal notification – XVR Admin Portal",
  );
  await queueEmail({
    to,
    subject: `[XVR Admin] ${subject}`,
    template: "admin.notification",
    html,
    text: `${title}\n\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}${link ? `\n\n${link}` : ""}`,
  });
}

export function bookingAdminLines(b: BookingLike): [string, string][] {
  return [
    ["Booking", b.bookingNumber],
    ["Customer", `${b.customer.name} (${b.customer.email}, ${b.customer.phone})`],
    ["Experience", `${b.experienceName}${b.gameName ? ` – ${b.gameName}` : ""}`],
    ["When", formatDateTime(b.startAt)],
    ["Players", String(b.players)],
    ["Total", totalLabel(b.pricing)],
    ["Status", `${BOOKING_STATUS_LABELS[b.status]} / ${PAYMENT_STATUS_LABELS[b.paymentStatus]}`],
  ];
}
