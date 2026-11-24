export const GAME_CATEGORIES = [
  "Action",
  "Adventure",
  "Escape Room",
  "Family",
  "Multiplayer",
  "Horror",
  "Racing",
  "Kids",
  "Mixed Reality",
] as const;

export const GAME_PROVIDERS = [
  { name: "VR Arena Games", url: "https://vr-arena.games/" },
  { name: "VEX Play", url: "https://vex-play.com/games/" },
  { name: "Hero Zone VR", url: "https://www.herozonevr.com/games/" },
] as const;

export const UPLOAD_FOLDERS = ["products", "gallery", "pages", "misc"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/games", label: "Games" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/offers", label: "Special Offers" },
  { href: "/booking", label: "Booking" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const EVENT_TYPES = ["Birthday Party", "Corporate Team Building", "Private Group Event", "School / Youth Group", "Other"] as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  held: "Checkout in progress",
  pending_payment: "Awaiting payment",
  requested: "Requested – awaiting confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
  expired: "Expired",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  expired: "Checkout expired",
  pay_at_venue: "Pay at venue",
};

export const WAIVER_STATUS_LABELS: Record<string, string> = {
  not_required: "Not required",
  pending: "Pending",
  partial: "Partially signed",
  complete: "Complete",
  unavailable: "Waiver not yet published",
};
