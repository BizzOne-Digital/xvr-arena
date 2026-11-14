import { defineModel, S, ObjectId } from "./_helpers";
import type { Types } from "mongoose";

export const BOOKING_STATUSES = [
  "held", // checkout in progress, capacity reserved temporarily
  "pending_payment", // sent to Stripe, awaiting verified payment
  "requested", // online payment off: awaiting admin approval
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded", "partially_refunded", "expired", "pay_at_venue"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/* ------------------------------------ Booking ----------------------------------- */
export interface IBooking {
  bookingNumber: string;
  publicToken: string;
  experience: string;
  experienceName: string;
  game?: string;
  gameName?: string;
  pricingPlan?: Types.ObjectId;
  resourceKey: string;
  date: string; // YYYY-MM-DD (business tz)
  startMinutes: number;
  startAt: Date;
  endAt: Date;
  durationMin: number;
  players: number;
  units: number; // capacity units consumed
  slotKeys: string[];
  customer: { name: string; email: string; phone: string };
  notes?: string;
  event?: { type?: string; occasion?: string; birthdayName?: string; company?: string };
  isBirthday: boolean;
  pricing: {
    unitPriceCents: number;
    unit: "person" | "session";
    subtotalCents: number;
    discountCents: number;
    feeCents: number;
    taxCents: number;
    taxRatePercent: number;
    totalCents: number;
    promotions: { slug: string; title: string; discountCents: number }[];
  };
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  waiverStatus: "not_required" | "pending" | "partial" | "complete" | "unavailable";
  waiversRequired: number;
  waiversSigned: number;
  holdExpiresAt?: Date;
  stripeSessionId?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  rescheduledFrom?: { date: string; startMinutes: number }[];
  reminderSentAt?: Date;
  adminNotes?: string;
  source: "web" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}
const BookingSchema = new S<IBooking>(
  {
    bookingNumber: { type: String, required: true, unique: true },
    publicToken: { type: String, required: true },
    experience: { type: String, required: true },
    experienceName: String,
    game: String,
    gameName: String,
    pricingPlan: { type: ObjectId, ref: "PricingPlan" },
    resourceKey: { type: String, required: true },
    date: { type: String, required: true },
    startMinutes: { type: Number, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationMin: { type: Number, required: true },
    players: { type: Number, required: true, min: 1 },
    units: { type: Number, required: true, min: 1 },
    slotKeys: { type: [String], default: [] },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    notes: String,
    event: { type: { type: String }, occasion: String, birthdayName: String, company: String },
    isBirthday: { type: Boolean, default: false },
    pricing: {
      unitPriceCents: Number,
      unit: String,
      subtotalCents: Number,
      discountCents: Number,
      feeCents: Number,
      taxCents: Number,
      taxRatePercent: Number,
      totalCents: Number,
      promotions: [{ slug: String, title: String, discountCents: Number, _id: false }],
    },
    status: { type: String, enum: BOOKING_STATUSES, default: "held" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    waiverStatus: { type: String, default: "pending" },
    waiversRequired: { type: Number, default: 0 },
    waiversSigned: { type: Number, default: 0 },
    holdExpiresAt: Date,
    stripeSessionId: String,
    cancelledAt: Date,
    cancelReason: String,
    rescheduledFrom: [{ date: String, startMinutes: Number, _id: false }],
    reminderSentAt: Date,
    adminNotes: String,
    source: { type: String, enum: ["web", "admin"], default: "web" },
  },
  { timestamps: true },
);
BookingSchema.index({ date: 1, resourceKey: 1 });
BookingSchema.index({ status: 1, startAt: 1 });
BookingSchema.index({ "customer.email": 1 });
BookingSchema.index({ stripeSessionId: 1 }, { sparse: true });
BookingSchema.index({ status: 1, holdExpiresAt: 1 });
export const Booking = defineModel("Booking", BookingSchema);

/* ---------------------------------- SlotLedger ---------------------------------- */
/** One document per resource+slot start. `used` is incremented atomically to enforce capacity. */
export interface ISlotLedger {
  key: string; // `${resourceKey}|${YYYY-MM-DD}|${minutes}`
  resourceKey: string;
  date: string;
  minutes: number;
  used: number;
  capacity: number;
}
const SlotLedgerSchema = new S<ISlotLedger>(
  {
    key: { type: String, required: true, unique: true },
    resourceKey: String,
    date: String,
    minutes: Number,
    used: { type: Number, default: 0, min: 0 },
    capacity: Number,
  },
  { timestamps: true },
);
SlotLedgerSchema.index({ resourceKey: 1, date: 1 });
export const SlotLedger = defineModel("SlotLedger", SlotLedgerSchema);

/* ---------------------------------- BookingHold --------------------------------- */
export interface IBookingHold {
  booking: Types.ObjectId;
  slotKeys: string[];
  units: number;
  expiresAt: Date;
  status: "active" | "converted" | "released";
}
const BookingHoldSchema = new S<IBookingHold>(
  {
    booking: { type: ObjectId, ref: "Booking", required: true, index: true },
    slotKeys: [String],
    units: Number,
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["active", "converted", "released"], default: "active" },
  },
  { timestamps: true },
);
BookingHoldSchema.index({ status: 1, expiresAt: 1 });
export const BookingHold = defineModel("BookingHold", BookingHoldSchema);

/* ---------------------------------- Participant --------------------------------- */
export interface IParticipant {
  booking: Types.ObjectId;
  fullName: string;
  dateOfBirth?: string;
  isMinor: boolean;
  email?: string;
  phone?: string;
  signedWaiver?: Types.ObjectId;
}
const ParticipantSchema = new S<IParticipant>(
  {
    booking: { type: ObjectId, ref: "Booking", required: true, index: true },
    fullName: { type: String, required: true },
    dateOfBirth: String,
    isMinor: { type: Boolean, default: false },
    email: String,
    phone: String,
    signedWaiver: { type: ObjectId, ref: "SignedWaiver" },
  },
  { timestamps: true },
);
export const Participant = defineModel("Participant", ParticipantSchema);

/* -------------------------------- WaiverTemplate -------------------------------- */
export interface IWaiverTemplate {
  version: number;
  title: string;
  body: string;
  acknowledgments: string[];
  requireDob: boolean;
  minorAgeThreshold: number;
  status: "draft" | "published" | "archived";
  legalApprovalNote?: string;
  contentHash?: string;
  publishedAt?: Date;
  retentionYears?: number;
}
const WaiverTemplateSchema = new S<IWaiverTemplate>(
  {
    version: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    acknowledgments: { type: [String], default: [] },
    requireDob: { type: Boolean, default: true },
    minorAgeThreshold: { type: Number, default: 18 },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    legalApprovalNote: String,
    contentHash: String,
    publishedAt: Date,
    retentionYears: Number,
  },
  { timestamps: true },
);
export const WaiverTemplate = defineModel("WaiverTemplate", WaiverTemplateSchema);

/* --------------------------------- SignedWaiver --------------------------------- */
export interface ISignedWaiver {
  waiverNumber: string;
  booking?: Types.ObjectId;
  bookingNumber?: string;
  participant?: Types.ObjectId;
  template: Types.ObjectId;
  templateVersion: number;
  templateTitle: string;
  templateBody: string;
  templateHash: string;
  acknowledgments: string[];
  participantName: string;
  participantDob?: string;
  isMinor: boolean;
  email: string;
  phone?: string;
  guardian?: { name: string; relationship: string; email?: string; phone?: string };
  signerName: string;
  signaturePng: Buffer;
  typedSignature?: string;
  signedAt: Date;
  ip?: string;
  userAgent?: string;
  documentHash: string;
  accessToken: string;
}
const SignedWaiverSchema = new S<ISignedWaiver>(
  {
    waiverNumber: { type: String, required: true, unique: true },
    booking: { type: ObjectId, ref: "Booking", index: true },
    bookingNumber: { type: String, index: true },
    participant: { type: ObjectId, ref: "Participant" },
    template: { type: ObjectId, ref: "WaiverTemplate", required: true },
    templateVersion: { type: Number, required: true },
    templateTitle: String,
    templateBody: { type: String, required: true },
    templateHash: { type: String, required: true },
    acknowledgments: [String],
    participantName: { type: String, required: true },
    participantDob: String,
    isMinor: { type: Boolean, default: false },
    email: { type: String, required: true, lowercase: true },
    phone: String,
    guardian: { name: String, relationship: String, email: String, phone: String },
    signerName: { type: String, required: true },
    signaturePng: { type: Buffer, required: true, select: false },
    typedSignature: String,
    signedAt: { type: Date, required: true },
    ip: String,
    userAgent: String,
    documentHash: { type: String, required: true },
    accessToken: { type: String, required: true, select: false },
  },
  { timestamps: true },
);
SignedWaiverSchema.index({ participantName: "text", email: "text", bookingNumber: "text" });
export const SignedWaiver = defineModel("SignedWaiver", SignedWaiverSchema);

/* ------------------------------------ Payment ----------------------------------- */
export interface IPayment {
  booking: Types.ObjectId;
  bookingNumber: string;
  provider: "stripe" | "manual";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amountCents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded";
  refundedCents: number;
  receiptUrl?: string;
  failureReason?: string;
  rawEventIds: string[];
}
const PaymentSchema = new S<IPayment>(
  {
    booking: { type: ObjectId, ref: "Booking", required: true, index: true },
    bookingNumber: String,
    provider: { type: String, enum: ["stripe", "manual"], default: "stripe" },
    stripeSessionId: { type: String, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, sparse: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "cad" },
    status: { type: String, enum: ["pending", "paid", "failed", "expired", "refunded", "partially_refunded"], default: "pending" },
    refundedCents: { type: Number, default: 0 },
    receiptUrl: String,
    failureReason: String,
    rawEventIds: { type: [String], default: [] },
  },
  { timestamps: true },
);
export const Payment = defineModel("Payment", PaymentSchema);

/** Stripe webhook events already processed (idempotency). */
export interface IWebhookEvent {
  eventId: string;
  type: string;
  processedAt: Date;
}
const WebhookEventSchema = new S<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: String,
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);
export const WebhookEvent = defineModel("WebhookEvent", WebhookEventSchema);
