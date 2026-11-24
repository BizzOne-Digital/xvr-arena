import { GAME_CATEGORIES } from "../constants";
import type { UploadFolder } from "../constants";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "select"
  | "multiselect"
  | "boolean"
  | "image"
  | "images"
  | "tags"
  | "date"
  | "datetime"
  | "url"
  | "email";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: readonly string[] | { value: string; label: string }[];
  /** options loaded at runtime from experiences */
  optionsFrom?: "experiences";
  min?: number;
  max?: number;
  folder?: UploadFolder;
  default?: unknown;
  wide?: boolean;
  /** shown in list table */
  list?: boolean;
};

export type ResourceDef = {
  key: string;
  title: string;
  singular: string;
  description: string;
  fields: FieldDef[];
  titleField: string;
  slugFrom?: string;
  searchFields: string[];
  sort: Record<string, 1 | -1>;
  statusFilter?: { field: string; options: string[] };
  allowCreate?: boolean;
  minRole?: "staff" | "manager" | "owner";
  deleteRole?: "staff" | "manager" | "owner";
};

const statusPublish = ["draft", "published"] as const;

export const RESOURCES: Record<string, ResourceDef> = {
  games: {
    key: "games",
    title: "Games",
    singular: "Game",
    description:
      "Games from VR Arena Games, VEX Play and Hero Zone VR. Only add titles, durations, player limits and ages confirmed from the provider or XVR. Drafts are never shown publicly.",
    titleField: "name",
    slugFrom: "name",
    searchFields: ["name", "provider", "slug"],
    sort: { sortOrder: 1, name: 1 },
    statusFilter: { field: "status", options: [...statusPublish] },
    fields: [
      { name: "name", label: "Game name", type: "text", required: true, list: true },
      { name: "slug", label: "URL slug", type: "text", help: "Leave blank to generate from the name." },
      { name: "status", label: "Status", type: "select", options: statusPublish, default: "draft", list: true },
      { name: "provider", label: "Provider", type: "select", options: ["VR Arena Games", "VEX Play", "Hero Zone VR", "Spawnpoint", "Other"], list: true },
      { name: "providerUrl", label: "Provider page URL", type: "url" },
      { name: "experience", label: "Played in", type: "select", optionsFrom: "experiences", default: "vr-arena", list: true },
      { name: "categories", label: "Categories", type: "multiselect", options: GAME_CATEGORIES, wide: true },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "instructions", label: "Important game instructions", type: "textarea", wide: true },
      { name: "durationMin", label: "Booking length (minutes)", type: "number", min: 1, list: true, help: "Time reserved per booking." },
      { name: "durationLabel", label: "Duration shown to customers", type: "text", help: "e.g. 15-30 min" },
      { name: "minPlayers", label: "Minimum players", type: "number", min: 1 },
      { name: "maxPlayers", label: "Maximum players", type: "number", min: 1 },
      { name: "recommendedAge", label: "Recommended age", type: "text", help: "e.g. 10+" },
      { name: "priceCents", label: "Price per player (CAD)", type: "money", list: true, help: "Leave blank to use the experience pricing plan." },
      { name: "image", label: "Card image", type: "image", folder: "products" },
      { name: "bannerImage", label: "Banner image", type: "image", folder: "products" },
      { name: "gallery", label: "Gallery images", type: "images", folder: "products", wide: true },
      { name: "videoUrl", label: "Gameplay video URL (YouTube or MP4)", type: "url", wide: true },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  experiences: {
    key: "experiences",
    title: "Experiences & Services",
    singular: "Experience",
    description:
      "Experiences power the homepage cards, service pages and booking wizard. Capacity settings control how many bookings can share a time slot.",
    titleField: "name",
    slugFrom: "name",
    searchFields: ["name", "slug"],
    sort: { sortOrder: 1 },
    minRole: "manager",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "slug", label: "URL slug", type: "text" },
      { name: "shortName", label: "Short name", type: "text" },
      { name: "icon", label: "Icon", type: "select", options: ["Gamepad2", "Rotate3d", "Footprints", "Flag", "PartyPopper", "Users", "Glasses", "Sparkles", "Trophy"] },
      { name: "tagline", label: "Card tagline", type: "text", wide: true },
      { name: "description", label: "Short description", type: "textarea", required: true, wide: true },
      { name: "longDescription", label: "Service page description", type: "textarea", wide: true },
      { name: "highlights", label: "Highlights", type: "tags", wide: true, help: "One per line." },
      { name: "image", label: "Image", type: "image", folder: "pages" },
      { name: "gallery", label: "Gallery", type: "images", folder: "gallery", wide: true },
      { name: "resourceKey", label: "Capacity resource key", type: "text", required: true, help: "Experiences with the same key share capacity." },
      { name: "capacityMode", label: "Capacity mode", type: "select", options: [{ value: "players", label: "Shared – counts players" }, { value: "private", label: "Private – one group per slot" }], list: true },
      { name: "capacity", label: "Max players per slot (shared mode)", type: "number", min: 1, list: true },
      { name: "minPlayers", label: "Min players per booking", type: "number", min: 1 },
      { name: "maxPlayers", label: "Max players per booking", type: "number", min: 1 },
      { name: "defaultDurationMin", label: "Default session length (min)", type: "number", min: 5 },
      { name: "bufferMin", label: "Buffer after session (min)", type: "number", min: 0 },
      { name: "bookable", label: "Bookable online", type: "boolean", default: true, list: true },
      { name: "isPrivateEvent", label: "Private event (excluded from most promos)", type: "boolean" },
      { name: "featured", label: "Highlight card in red", type: "boolean" },
      { name: "active", label: "Active", type: "boolean", default: true, list: true },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  pricing: {
    key: "pricing",
    title: "Pricing",
    singular: "Pricing plan",
    description:
      "All prices shown on the website and charged at checkout come from these plans (in CAD). The client indicated roughly $20–$40; enter the confirmed amounts.",
    titleField: "name",
    searchFields: ["name", "experience"],
    sort: { experience: 1, sortOrder: 1 },
    minRole: "manager",
    fields: [
      { name: "name", label: "Plan name", type: "text", required: true, list: true },
      { name: "experience", label: "Experience", type: "select", optionsFrom: "experiences", required: true, list: true },
      { name: "kind", label: "Type", type: "select", options: ["standard", "group", "birthday", "seasonal"], default: "standard", list: true },
      { name: "priceCents", label: "Price (CAD)", type: "money", required: true, list: true },
      { name: "unit", label: "Charged per", type: "select", options: [{ value: "person", label: "Person" }, { value: "session", label: "Session / group" }], default: "person", list: true },
      { name: "durationMin", label: "Session duration (min)", type: "number", required: true, min: 5, list: true },
      { name: "minPlayers", label: "Min players", type: "number", min: 1, default: 1 },
      { name: "maxPlayers", label: "Max players", type: "number", min: 1, default: 8 },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "extras", label: "Additional charges / inclusions", type: "tags", wide: true, help: "One per line." },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "active", label: "Active", type: "boolean", default: true, list: true },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  promotions: {
    key: "promotions",
    title: "Promotions",
    singular: "Promotion",
    description:
      "Offers are displayed when Active. Discounts are only applied at checkout when 'Rules confirmed' is ticked. All discounts are calculated on the server.",
    titleField: "title",
    slugFrom: "title",
    searchFields: ["title", "code", "slug"],
    sort: { sortOrder: 1 },
    minRole: "manager",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, list: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "subtitle", label: "Subtitle", type: "text", wide: true },
      { name: "badge", label: "Badge label", type: "text" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "terms", label: "Terms & eligibility (shown publicly)", type: "textarea", wide: true },
      { name: "image", label: "Banner image", type: "image", folder: "pages" },
      {
        name: "type",
        label: "Discount rule",
        type: "select",
        required: true,
        list: true,
        options: [
          { value: "buy_x_get_y", label: "Buy X players, get Y free" },
          { value: "birthday_free", label: "Birthday person plays free" },
          { value: "percent", label: "Percent off" },
          { value: "fixed", label: "Fixed amount off" },
        ],
      },
      { name: "buyQty", label: "Buy quantity (X)", type: "number", min: 1 },
      { name: "freeQty", label: "Free quantity (Y)", type: "number", min: 1 },
      { name: "percentOff", label: "Percent off", type: "number", min: 0, max: 100 },
      { name: "amountOffCents", label: "Amount off (CAD)", type: "money" },
      { name: "code", label: "Promo code (optional)", type: "text", list: true },
      { name: "autoApply", label: "Apply automatically (no code)", type: "boolean" },
      { name: "appliesTo", label: "Valid for experiences (none = all)", type: "multiselect", optionsFrom: "experiences", wide: true },
      { name: "excludePrivateEvents", label: "Not valid for private events", type: "boolean", default: true },
      { name: "minPlayers", label: "Minimum players", type: "number", min: 1 },
      { name: "stackable", label: "Can combine with other stackable offers", type: "boolean" },
      { name: "startsAt", label: "Starts", type: "datetime" },
      { name: "endsAt", label: "Expires", type: "datetime" },
      { name: "maxRedemptions", label: "Max redemptions", type: "number", min: 1 },
      { name: "active", label: "Active (shown publicly)", type: "boolean", list: true },
      { name: "configured", label: "Rules confirmed (apply at checkout)", type: "boolean", list: true },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  faqs: {
    key: "faqs",
    title: "FAQs",
    singular: "FAQ",
    description: "Answers marked as draft are hidden from the public FAQ page until confirmed.",
    titleField: "question",
    searchFields: ["question", "answer"],
    sort: { sortOrder: 1 },
    fields: [
      { name: "question", label: "Question", type: "text", required: true, wide: true, list: true },
      { name: "answer", label: "Answer", type: "textarea", required: true, wide: true },
      { name: "category", label: "Category", type: "text", list: true },
      { name: "isDraft", label: "Draft – awaiting client confirmation", type: "boolean", list: true },
      { name: "published", label: "Published", type: "boolean", default: true, list: true },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  gallery: {
    key: "gallery",
    title: "Gallery",
    singular: "Gallery image",
    description: "Images shown in the About, Parties and Corporate galleries. Use real arena photos where possible.",
    titleField: "alt",
    searchFields: ["alt", "caption"],
    sort: { section: 1, sortOrder: 1 },
    statusFilter: { field: "section", options: ["about", "parties", "corporate", "general"] },
    fields: [
      { name: "image", label: "Image", type: "image", folder: "gallery", required: true, list: true },
      { name: "alt", label: "Alt text (describe the photo)", type: "text", required: true, list: true },
      { name: "caption", label: "Caption", type: "text" },
      { name: "section", label: "Section", type: "select", options: ["about", "parties", "corporate", "general"], default: "general", list: true },
      { name: "active", label: "Active", type: "boolean", default: true, list: true },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  reviews: {
    key: "reviews",
    title: "Reviews",
    singular: "Review",
    description: "Customer reviews appear publicly only after approval. Edit only to fix formatting or remove personal details.",
    titleField: "name",
    searchFields: ["name", "text", "email"],
    sort: { createdAt: -1 },
    statusFilter: { field: "status", options: ["pending", "approved", "rejected"] },
    allowCreate: false,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "email", label: "Email (private)", type: "email" },
      { name: "rating", label: "Rating", type: "number", min: 1, max: 5, required: true, list: true },
      { name: "text", label: "Review", type: "textarea", required: true, wide: true, list: true },
      { name: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected"], list: true },
      { name: "image", label: "Profile image (optional)", type: "image", folder: "misc" },
      { name: "visitDate", label: "Visit date", type: "date" },
    ],
  },
  "contact-inquiries": {
    key: "contact-inquiries",
    title: "Contact messages",
    singular: "Contact message",
    description: "Messages from the contact form.",
    titleField: "name",
    searchFields: ["name", "email", "subject", "message"],
    sort: { createdAt: -1 },
    statusFilter: { field: "status", options: ["new", "in_progress", "resolved", "spam"] },
    allowCreate: false,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "email", label: "Email", type: "email", required: true, list: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "subject", label: "Subject", type: "text", list: true },
      { name: "message", label: "Message", type: "textarea", required: true, wide: true },
      { name: "status", label: "Status", type: "select", options: ["new", "in_progress", "resolved", "spam"], list: true },
      { name: "internalNotes", label: "Internal notes", type: "textarea", wide: true },
    ],
  },
  "event-inquiries": {
    key: "event-inquiries",
    title: "Event inquiries",
    singular: "Event inquiry",
    description: "Birthday, corporate and private group inquiries.",
    titleField: "name",
    searchFields: ["name", "email", "company", "eventType"],
    sort: { createdAt: -1 },
    statusFilter: { field: "status", options: ["new", "contacted", "quoted", "booked", "closed"] },
    allowCreate: false,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "text", required: true, list: true },
      { name: "eventType", label: "Event type", type: "text", required: true, list: true },
      { name: "company", label: "Company", type: "text" },
      { name: "preferredDate", label: "Preferred date", type: "text", list: true },
      { name: "groupSize", label: "Group size", type: "number", list: true },
      { name: "requirements", label: "Requirements", type: "textarea", wide: true },
      { name: "status", label: "Status", type: "select", options: ["new", "contacted", "quoted", "booked", "closed"], list: true },
      { name: "internalNotes", label: "Internal notes", type: "textarea", wide: true },
    ],
  },
};

export type ResourceKey = keyof typeof RESOURCES;
