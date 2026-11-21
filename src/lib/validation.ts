import { z } from "zod";

const name = z.string().trim().min(2, "Please enter a full name").max(100);
const email = z.string().trim().toLowerCase().email("Please enter a valid email").max(160);
const phone = z
  .string()
  .trim()
  .min(7, "Please enter a valid phone number")
  .max(30)
  .regex(/^[0-9+()\-.\s]+$/, "Please enter a valid phone number");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const contactSchema = z.object({
  name,
  email,
  phone: phone.optional().or(z.literal("")),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Please add a little more detail").max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export const eventInquirySchema = z.object({
  name,
  email,
  phone,
  eventType: z.string().trim().min(2).max(80),
  preferredDate: dateStr.optional().or(z.literal("")),
  groupSize: z.coerce.number().int().min(1).max(500).optional(),
  company: z.string().trim().max(120).optional(),
  requirements: z.string().trim().max(4000).optional(),
  website: z.string().max(0).optional(),
});

export const reviewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: email.optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Please write at least a sentence").max(2000),
  experience: z.string().trim().max(80).optional(),
  website: z.string().max(0).optional(),
});

export const holdSchema = z.object({
  experience: z.string().min(1).max(80),
  game: z.string().max(120).optional().or(z.literal("")),
  pricingPlan: z.string().max(40).optional().or(z.literal("")),
  date: dateStr,
  startMinutes: z.number().int().min(0).max(24 * 60),
  players: z.number().int().min(1).max(200),
  customer: z.object({ name, email, phone }),
  notes: z.string().trim().max(2000).optional(),
  isBirthday: z.boolean().optional(),
  event: z
    .object({
      type: z.string().max(80).optional(),
      occasion: z.string().max(120).optional(),
      birthdayName: z.string().max(100).optional(),
      company: z.string().max(120).optional(),
    })
    .optional(),
  promoCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
});
export type HoldInput = z.infer<typeof holdSchema>;

export const quoteSchema = holdSchema.pick({
  experience: true,
  game: true,
  pricingPlan: true,
  players: true,
  isBirthday: true,
  promoCode: true,
});

const shortText = (label: string, max = 120) => z.string().trim().min(1, `${label} is required`).max(max);

export const waiverSignSchema = z
  .object({
    bookingId: z.string().max(40).optional(),
    token: z.string().max(100).optional(),
    firstName: shortText("First name", 60),
    lastName: shortText("Last name", 60),
    participantDob: dateStr.optional().or(z.literal("")),
    email,
    phone,
    emergencyPhone: phone,
    address: z.object({
      line1: shortText("Home address", 160),
      city: shortText("City", 80),
      province: shortText("Province", 80),
      postalCode: z
        .string()
        .trim()
        .max(12)
        .regex(/^[A-Za-z0-9 -]{3,12}$/, "Please enter a valid postal code"),
    }),
    mailingList: z.boolean().default(false),
    medicalNotes: z.string().trim().max(1000).optional(),
    isMinor: z.boolean(),
    guardian: z
      .object({
        name,
        relationship: z.string().trim().max(60).optional().or(z.literal("")),
        email: email.optional().or(z.literal("")),
        phone: phone.optional().or(z.literal("")),
      })
      .optional(),
    acknowledgments: z.array(z.boolean()),
    accepted: z.literal(true, { message: "You must accept the waiver" }),
    signaturePng: z
      .string()
      .startsWith("data:image/png;base64,", "Signature is required")
      .max(600_000, "Signature image is too large"),
    typedSignature: z.string().trim().max(100).optional(),
  })
  .refine((v) => !v.isMinor || !!v.guardian, { message: "Parent or guardian details are required", path: ["guardian"] });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const setupSchema = z.object({
  setupToken: z.string().min(1),
  name,
  email,
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(200)
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[0-9]/, "Include a number"),
});
