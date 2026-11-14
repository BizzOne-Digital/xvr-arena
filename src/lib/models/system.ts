import { defineModel, S, ObjectId } from "./_helpers";
import type { Types } from "mongoose";

/* ----------------------------------- AdminUser ---------------------------------- */
export const ADMIN_ROLES = ["owner", "manager", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export interface IAdminUser {
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt?: Date;
}
const AdminUserSchema = new S<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: "staff" },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export const AdminUser = defineModel("AdminUser", AdminUserSchema);

/* --------------------------------- AdminSession --------------------------------- */
export interface IAdminSession {
  tokenHash: string;
  user: Types.ObjectId;
  csrfToken: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}
const AdminSessionSchema = new S<IAdminSession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: "AdminUser", required: true, index: true },
    csrfToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    ip: String,
    userAgent: String,
  },
  { timestamps: true },
);
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AdminSession = defineModel("AdminSession", AdminSessionSchema);

/* ----------------------------------- RateLimit ---------------------------------- */
export interface IRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
}
const RateLimitSchema = new S<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = defineModel("RateLimit", RateLimitSchema);

/* ----------------------------------- AuditLog ----------------------------------- */
export interface IAuditLog {
  actor?: Types.ObjectId;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}
const AuditLogSchema = new S<IAuditLog>(
  {
    actor: { type: ObjectId, ref: "AdminUser" },
    actorEmail: String,
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    details: S.Types.Mixed,
    ip: String,
  },
  { timestamps: true },
);
AuditLogSchema.index({ createdAt: -1 });
export const AuditLog = defineModel("AuditLog", AuditLogSchema);

/* --------------------------------- StoredUpload --------------------------------- */
export interface IStoredUpload {
  folder: string;
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
}
const StoredUploadSchema = new S<IStoredUpload>(
  {
    folder: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);
StoredUploadSchema.index({ folder: 1, filename: 1 }, { unique: true });
export const StoredUpload = defineModel("StoredUpload", StoredUploadSchema);

/* -------------------------------- ContactInquiry -------------------------------- */
export interface IContactInquiry {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: "new" | "in_progress" | "resolved" | "spam";
  internalNotes?: string;
}
const ContactInquirySchema = new S<IContactInquiry>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    subject: String,
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "in_progress", "resolved", "spam"], default: "new" },
    internalNotes: String,
  },
  { timestamps: true },
);
ContactInquirySchema.index({ status: 1, createdAt: -1 });
export const ContactInquiry = defineModel("ContactInquiry", ContactInquirySchema);

/* --------------------------------- EventInquiry --------------------------------- */
export interface IEventInquiry {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  preferredDate?: string;
  groupSize?: number;
  requirements?: string;
  company?: string;
  status: "new" | "contacted" | "quoted" | "booked" | "closed";
  internalNotes?: string;
}
const EventInquirySchema = new S<IEventInquiry>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    eventType: { type: String, required: true },
    preferredDate: String,
    groupSize: Number,
    requirements: String,
    company: String,
    status: { type: String, enum: ["new", "contacted", "quoted", "booked", "closed"], default: "new" },
    internalNotes: String,
  },
  { timestamps: true },
);
EventInquirySchema.index({ status: 1, createdAt: -1 });
export const EventInquiry = defineModel("EventInquiry", EventInquirySchema);

/* --------------------------------- Notification --------------------------------- */
export interface INotification {
  to: string;
  subject: string;
  template: string;
  html: string;
  text: string;
  status: "queued" | "sent" | "failed" | "skipped";
  attempts: number;
  lastError?: string;
  sentAt?: Date;
  nextAttemptAt?: Date;
  relatedBooking?: Types.ObjectId;
  dedupeKey?: string;
}
const NotificationSchema = new S<INotification>(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    template: { type: String, required: true },
    html: String,
    text: String,
    status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued" },
    attempts: { type: Number, default: 0 },
    lastError: String,
    sentAt: Date,
    nextAttemptAt: Date,
    relatedBooking: { type: ObjectId, ref: "Booking" },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);
NotificationSchema.index({ status: 1, nextAttemptAt: 1 });
export const Notification = defineModel("Notification", NotificationSchema);
