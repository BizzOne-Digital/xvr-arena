import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Types } from "mongoose";
import { connectDB } from "./db";
import { Notification } from "./models";

let transporter: Transporter | null = null;

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const MAX_ATTEMPTS = 5;

async function deliver(id: Types.ObjectId | string) {
  const n = await Notification.findById(id);
  if (!n || n.status === "sent") return;
  if (!isSmtpConfigured()) {
    n.status = "skipped";
    n.lastError = "SMTP not configured";
    await n.save();
    return;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: n.to,
      subject: n.subject,
      html: n.html,
      text: n.text,
    });
    n.status = "sent";
    n.sentAt = new Date();
    n.lastError = undefined;
  } catch (err) {
    n.attempts += 1;
    n.lastError = (err as Error).message.slice(0, 500);
    n.status = n.attempts >= MAX_ATTEMPTS ? "failed" : "queued";
    // exponential backoff: 2, 4, 8, 16 minutes
    n.nextAttemptAt = new Date(Date.now() + 2 ** n.attempts * 60_000);
  }
  await n.save();
}

/**
 * Records the email, then attempts delivery. Never throws: email problems must not
 * break bookings, payments or form submissions.
 */
export async function queueEmail(input: {
  to: string | string[];
  subject: string;
  template: string;
  html: string;
  text: string;
  relatedBooking?: Types.ObjectId | string;
  dedupeKey?: string;
}) {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter(Boolean);
  for (const to of recipients) {
    try {
      await connectDB();
      const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:${to}` : undefined;
      if (dedupeKey && (await Notification.exists({ dedupeKey }))) continue;
      const n = await Notification.create({ ...input, to, dedupeKey, status: "queued", nextAttemptAt: new Date() });
      await deliver(n._id);
    } catch (err) {
      console.error("[mail] queue failed", (err as Error).message);
    }
  }
}

/** Retries queued emails whose backoff has elapsed. Called by the cron endpoint. */
export async function processEmailQueue(limit = 25) {
  await connectDB();
  const due = await Notification.find({ status: "queued", nextAttemptAt: { $lte: new Date() } })
    .sort({ nextAttemptAt: 1 })
    .limit(limit)
    .select("_id");
  for (const n of due) await deliver(n._id);
  return due.length;
}

export async function adminRecipients(extra: string[] = []) {
  const fromEnv = (process.env.ADMIN_NOTIFY_EMAILS || "").split(",").map((s) => s.trim());
  return Array.from(new Set([...fromEnv, ...extra].filter(Boolean)));
}
