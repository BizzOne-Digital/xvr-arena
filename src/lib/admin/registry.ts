import "server-only";
import { z, type ZodTypeAny } from "zod";
import type { Model } from "mongoose";
import {
  ContactInquiry,
  EventInquiry,
  Experience,
  FAQ,
  GalleryItem,
  Game,
  PricingPlan,
  Promotion,
  Review,
} from "../models";
import { TAGS } from "../data";
import { RESOURCES, type FieldDef, type ResourceDef } from "./resource-config";

export const RESOURCE_MODELS: Record<string, { model: Model<unknown>; tags: string[] }> = {
  games: { model: Game as unknown as Model<unknown>, tags: [TAGS.games] },
  experiences: { model: Experience as unknown as Model<unknown>, tags: [TAGS.experiences] },
  pricing: { model: PricingPlan as unknown as Model<unknown>, tags: [TAGS.pricing] },
  promotions: { model: Promotion as unknown as Model<unknown>, tags: [TAGS.promotions] },
  faqs: { model: FAQ as unknown as Model<unknown>, tags: [TAGS.faqs] },
  gallery: { model: GalleryItem as unknown as Model<unknown>, tags: [TAGS.gallery] },
  reviews: { model: Review as unknown as Model<unknown>, tags: [TAGS.reviews] },
  "contact-inquiries": { model: ContactInquiry as unknown as Model<unknown>, tags: [] },
  "event-inquiries": { model: EventInquiry as unknown as Model<unknown>, tags: [] },
};

const uploadOrHttps = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/api/uploads/") || v.startsWith("/images/") || /^https:\/\//.test(v), "Must be an uploaded image or https URL");

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

function fieldSchema(f: FieldDef): ZodTypeAny {
  let s: ZodTypeAny;
  switch (f.type) {
    case "text":
      s = z.string().trim().max(300);
      break;
    case "email":
      s = z.string().trim().toLowerCase().email().max(160);
      break;
    case "url":
      s = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\//.test(v), "Must start with http(s)://");
      break;
    case "textarea":
      s = z.string().trim().max(20000);
      break;
    case "number": {
      let n = z.coerce.number();
      if (f.min != null) n = n.min(f.min);
      if (f.max != null) n = n.max(f.max);
      s = n;
      break;
    }
    case "money":
      s = z.coerce.number().int().min(0).max(10_000_00);
      break;
    case "select": {
      const values = (f.options ?? []).map((o) => (typeof o === "string" ? o : o.value));
      s = values.length && !f.optionsFrom ? z.enum(values as [string, ...string[]]) : z.string().trim().max(120);
      break;
    }
    case "multiselect":
      s = z.array(z.string().max(120)).max(50);
      break;
    case "tags":
      s = z.array(z.string().trim().max(300)).max(50);
      break;
    case "boolean":
      s = z.boolean();
      break;
    case "image":
      s = uploadOrHttps;
      break;
    case "images":
      s = z.array(uploadOrHttps).max(40);
      break;
    case "date":
      s = z.string().regex(/^\d{4}-\d{2}-\d{2}/).transform((v) => new Date(v));
      break;
    case "datetime":
      s = z.string().min(10).transform((v) => new Date(v)).refine((d) => !Number.isNaN(d.getTime()), "Invalid date");
      break;
    default:
      s = z.any();
  }
  if (f.required && !["boolean", "multiselect", "tags", "images"].includes(f.type)) return z.preprocess(emptyToUndef, s);
  return z.preprocess(emptyToUndef, s.optional().nullable());
}

export function resourceSchema(def: ResourceDef, partial = false) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of def.fields) shape[f.name] = fieldSchema(f);
  const obj = z.object(shape).strip();
  return partial ? obj.partial() : obj;
}

export function getResource(key: string) {
  const def = RESOURCES[key];
  const reg = RESOURCE_MODELS[key];
  if (!def || !reg) return null;
  return { def, ...reg };
}
