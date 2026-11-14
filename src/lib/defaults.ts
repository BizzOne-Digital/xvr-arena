/**
 * Starter content used (a) as a fallback when the database is not yet configured and
 * (b) by the admin "Initialize starter content" action. Everything marked DRAFT must be
 * confirmed by the client before launch. No prices, game titles, hours or legal wording
 * are invented here.
 */

export const IMG = {
  hero: "/images/hero.webp",
  arena: "/images/vr-arena.webp",
  motion: "/images/motion-simulator.webp",
  treadmill: "/images/vr-treadmill.webp",
  golf: "/images/golf-simulator.webp",
  party: "/images/party-room.webp",
  neonRoom: "/images/banner-arena-showdown.webp",
  gaming: "/images/banner-wide-arena.webp",
  event: "/images/banner-team.webp",
  headset: "/images/banner-games.webp",
  family: "/images/banner-family.webp",
  birthday: "/images/banner-birthday.webp",
  partyBanner: "/images/banner-party.webp",
  action: "/images/banner-action.webp",
  arcade: "/images/banner-arcade.webp",
  offerBuyTwo: "/images/offer-buy-two-get-one.webp",
  offerBirthday: "/images/offer-birthday-free.webp",
} as const;

export const DEFAULT_SETTINGS = {
  key: "main" as const,
  businessName: "XVR – Free-Roaming VR Arena",
  phone: "+1 204-510-3188",
  email: "xtremetacticswpg@gmail.com",
  addressLine1: "551 Ferry Road, Unit 2",
  addressLine2: "",
  city: "Winnipeg",
  province: "Manitoba",
  postalCode: "",
  country: "Canada",
  entranceNote: "Rear entrance from St. Matthews Avenue",
  mapsQuery: "551 Ferry Road, Winnipeg, MB, Canada",
  hoursConfirmed: false,
  hoursNote: "Business hours are awaiting confirmation. Please call or email us before visiting.",
  social: {},
  logoUrl: "",
  notifyEmails: [] as string[],
  taxRatePercent: 0,
  taxLabel: "Taxes",
  bookingFeeCents: 0,
  holdMinutes: 30,
  minLeadMinutes: 60,
  maxAdvanceDays: 60,
  slotIntervalMin: 30,
  onlinePaymentsEnabled: true,
  waiverTiming: "before_arrival" as const,
  cancellationPolicy: "",
  cancellationCutoffHours: 24,
  allowSelfReschedule: false,
  arrivalInstructions:
    "Please arrive 15 minutes before your session. Use the rear entrance from St. Matthews Avenue.",
  reminderHoursBefore: 24,
};

export type SettingsShape = typeof DEFAULT_SETTINGS & {
  social: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string };
};

/** Weekly hours are a scheduling DRAFT until the client confirms (hoursConfirmed=false). */
export const DEFAULT_WEEKLY_HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: true,
  openTime: day === 0 || day === 6 ? "11:00" : "15:00",
  closeTime: day === 5 || day === 6 ? "23:00" : "21:00",
}));

export const DEFAULT_EXPERIENCES = [
  {
    slug: "vr-arena",
    name: "Free-Roaming VR & MR Arena",
    shortName: "VR & MR Arena",
    tagline: "Explore immersive worlds with your team.",
    description:
      "Explore immersive virtual worlds with your team in a wireless, free-roaming virtual reality arena.",
    longDescription:
      "Step into our wireless, free-roaming Virtual Reality (VR) and Mixed Reality (MR) arena. Move freely, work together, and play side by side with friends and family in a shared virtual world — no cables, no consoles, just you and your team inside the game.",
    icon: "Gamepad2",
    image: IMG.arena,
    featured: false,
    resourceKey: "arena",
    capacityMode: "players" as const,
    capacity: 8,
    minPlayers: 1,
    maxPlayers: 8,
    defaultDurationMin: 30,
    bufferMin: 10,
    bookable: true,
    isPrivateEvent: false,
    highlights: ["Wireless, free-roaming play", "Virtual Reality & Mixed Reality", "Team multiplayer adventures"],
    sortOrder: 1,
  },
  {
    slug: "motion-simulator",
    name: "360° Motion Simulator",
    shortName: "Motion Simulator",
    tagline: "Racing, flight, roller coasters and more.",
    description: "Experience thrilling racing, flight, roller coasters, and more with immersive motion simulation.",
    longDescription:
      "Buckle in for full-motion simulation. Feel every turn, climb and drop as racing, flight and roller-coaster experiences come to life around you.",
    icon: "Rotate3d",
    image: IMG.motion,
    featured: false,
    resourceKey: "motion-simulator",
    capacityMode: "private" as const,
    capacity: 1,
    minPlayers: 1,
    maxPlayers: 1,
    defaultDurationMin: 15,
    bufferMin: 5,
    bookable: true,
    isPrivateEvent: false,
    highlights: ["Racing, flight & roller coasters", "Full-motion seat", "Great for thrill seekers"],
    sortOrder: 2,
  },
  {
    slug: "vr-treadmill",
    name: "VR Treadmill",
    shortName: "VR Treadmill",
    tagline: "Move freely and be inside the game.",
    description: "Walk, run, and explore virtual environments using an immersive VR treadmill.",
    longDescription:
      "Our VR treadmill lets you walk and run naturally through virtual environments, so your own movement drives the adventure.",
    icon: "Footprints",
    image: IMG.treadmill,
    featured: false,
    resourceKey: "vr-treadmill",
    capacityMode: "private" as const,
    capacity: 1,
    minPlayers: 1,
    maxPlayers: 1,
    defaultDurationMin: 15,
    bufferMin: 5,
    bookable: true,
    isPrivateEvent: false,
    highlights: ["Natural walking & running", "Full-body immersion", "Solo adventures"],
    sortOrder: 3,
  },
  {
    slug: "golf-simulator",
    name: "Golf Simulator",
    shortName: "Golf Simulator",
    tagline: "Play world-class courses in a realistic setup.",
    description: "Practice your swing and play virtual golf courses in an immersive simulator environment.",
    longDescription:
      "Work on your swing or enjoy a round with friends on virtual courses in our indoor golf simulator — rain or shine, all year round.",
    icon: "Flag",
    image: IMG.golf,
    featured: false,
    resourceKey: "golf-simulator",
    capacityMode: "private" as const,
    capacity: 1,
    minPlayers: 1,
    maxPlayers: 4,
    defaultDurationMin: 60,
    bufferMin: 10,
    bookable: true,
    isPrivateEvent: false,
    highlights: ["Virtual golf courses", "Swing practice", "Year-round play"],
    sortOrder: 4,
  },
  {
    slug: "party-room",
    name: "Party Room",
    shortName: "Party Room",
    tagline: "Birthdays, group events and team celebrations.",
    description:
      "Celebrate birthdays, group gatherings, and unforgettable occasions in our dedicated party space.",
    longDescription:
      "Our dedicated party room gives your group its own space to celebrate before or after your VR adventure — perfect for birthdays, team events and group outings.",
    icon: "PartyPopper",
    image: IMG.party,
    featured: true,
    resourceKey: "party-room",
    capacityMode: "private" as const,
    capacity: 1,
    minPlayers: 1,
    maxPlayers: 30,
    defaultDurationMin: 120,
    bufferMin: 30,
    bookable: true,
    isPrivateEvent: true,
    highlights: ["Private celebration space", "Pairs with VR sessions", "Birthdays & team events"],
    sortOrder: 5,
  },
];

export type ExperienceShape = (typeof DEFAULT_EXPERIENCES)[number] & { _id?: string; gallery?: string[]; active?: boolean };

export const DEFAULT_HOME = {
  eyebrow: "Welcome to XVR",
  headlineTop: "Manitoba's Largest",
  headlineAccent: "Free-Roaming",
  headlineBottom: "Virtual Reality Arena",
  description:
    "Step into a next-level wireless VR and Mixed Reality experience with immersive games, motion simulators, and unforgettable adventures—perfect for families, friends, birthdays, and team events.",
  heroImage: IMG.hero,
  experiencesTitle: "Our Experiences",
  experiencesSubtitle: "Choose your adventure. Experience entertainment beyond reality.",
  ctaTitle: "Ready to enter the arena?",
  ctaText: "Pick your experience, choose a time and lock in your adventure online in minutes.",
};

export const DEFAULT_ABOUT = {
  heroTitle: "Built by the X-Team",
  heroSubtitle: "More than two decades of entertainment expertise, now inside virtual reality.",
  heroImage: IMG.family,
  intro:
    "Drawing on more than two decades of entertainment expertise, the X-Team brings you a brand-new, family-friendly adventure.",
  body:
    "Step into our wireless, free-roaming Virtual Reality (VR) and Mixed Reality (MR) arena—an immersive experience designed for nearly every age, ideal for bonding with family, energizing your team, or hanging out with friends.",
  vision:
    "To make immersive, next-generation entertainment something every family, friend group and team in Manitoba can enjoy together.",
  mission:
    "Deliver safe, welcoming and unforgettable VR and MR adventures backed by more than twenty years of entertainment experience.",
};

export const DEFAULT_PARTIES = {
  heroTitle: "VR Birthday Parties",
  heroSubtitle: "Give them a birthday they will talk about for years.",
  heroImage: IMG.birthday,
  intro:
    "Combine free-roaming VR adventures, simulators and our dedicated party room for a celebration your group won't forget.",
};

export const DEFAULT_CORPORATE = {
  heroTitle: "VR Team Building",
  heroSubtitle: "Energize your team with collaborative multiplayer adventures.",
  heroImage: IMG.event,
  intro:
    "Free-roaming VR puts your team in the same virtual world, working together to communicate, solve problems and win — a team outing people actually look forward to.",
};

export const DEFAULT_LEGAL = {
  privacy: "",
  terms: "",
};

/** FAQ answers that depend on client policies are flagged as drafts and hidden until confirmed. */
export const DEFAULT_FAQS = [
  {
    question: "What is free-roaming VR?",
    answer:
      "Free-roaming VR means you are not tied to a cable, console or a single spot. You wear a wireless headset and move around a large play space, so you can walk, explore and play together with your group inside the same virtual world.",
    category: "General",
    isDraft: false,
    published: true,
  },
  {
    question: "Do I need gaming experience?",
    answer:
      "No. Our experiences are designed for nearly every age and experience level. Our team will help you get set up and explain everything before you play.",
    category: "General",
    isDraft: false,
    published: true,
  },
  {
    question: "Is VR suitable for children?",
    answer: "DRAFT – Age guidance and requirements for children are being confirmed by XVR.",
    category: "General",
    isDraft: true,
    published: false,
  },
  {
    question: "How long are gaming sessions?",
    answer:
      "Session lengths vary by experience and game. The duration for each option is shown on our Pricing and Booking pages before you book.",
    category: "Booking",
    isDraft: false,
    published: true,
  },
  {
    question: "Can I book for a group?",
    answer:
      "Yes. You can choose the number of players when booking online. For larger groups, birthdays or corporate events, send us an event inquiry and our team will help you plan.",
    category: "Booking",
    isDraft: false,
    published: true,
  },
  {
    question: "Are birthday parties available?",
    answer:
      "Yes. We host birthday celebrations with VR experiences and our dedicated party room. Visit the Birthday Parties page to send an inquiry.",
    category: "Events",
    isDraft: false,
    published: true,
  },
  {
    question: "What should I wear?",
    answer: "DRAFT – Clothing and footwear guidance is being confirmed by XVR.",
    category: "Visit",
    isDraft: true,
    published: false,
  },
  {
    question: "Do I need to sign a waiver?",
    answer:
      "Yes. Every participant needs a signed waiver. You can sign online after booking from your confirmation page, and a parent or guardian signs for participants who are minors.",
    category: "Visit",
    isDraft: false,
    published: true,
  },
  {
    question: "Can I reschedule?",
    answer: "DRAFT – Rescheduling policy is being confirmed by XVR.",
    category: "Policies",
    isDraft: true,
    published: false,
  },
  {
    question: "What is the cancellation policy?",
    answer: "DRAFT – Cancellation policy is being confirmed by XVR.",
    category: "Policies",
    isDraft: true,
    published: false,
  },
  {
    question: "Can I pay online?",
    answer: "Yes. You can pay securely online when you book. Card details are processed by Stripe and never stored by XVR.",
    category: "Booking",
    isDraft: false,
    published: true,
  },
  {
    question: "Where is XVR located?",
    answer:
      "We are at 551 Ferry Road, Unit 2, Winnipeg, Manitoba. Please use the rear entrance from St. Matthews Avenue.",
    category: "Visit",
    isDraft: false,
    published: true,
  },
];

export const DEFAULT_PROMOTIONS = [
  {
    slug: "buy-two-get-one-free",
    title: "Buy Two, Get One Free",
    subtitle: "Bring the crew. One more player is on us.",
    description:
      "Grab two and the third is free. Eligible experiences, redemption details and stacking rules are confirmed at booking.",
    terms: "Restrictions apply. Full terms to be confirmed by XVR.",
    badge: "Hot Deal",
    image: IMG.offerBuyTwo,
    type: "buy_x_get_y" as const,
    buyQty: 2,
    freeQty: 1,
    autoApply: false,
    appliesTo: [] as string[],
    excludePrivateEvents: true,
    stackable: false,
    active: true, // shown publicly
    configured: false, // never applied to prices until admin configures rules
    sortOrder: 1,
  },
  {
    slug: "birthday-person-plays-free",
    title: "Birthday Person Plays Free",
    subtitle: "Celebrate your special day with an unforgettable VR adventure.",
    description: "Celebrating a birthday? The birthday person plays free.",
    terms: "Restrictions apply. Not valid for private events.",
    badge: "Birthday",
    image: IMG.offerBirthday,
    type: "birthday_free" as const,
    autoApply: false,
    appliesTo: [] as string[],
    excludePrivateEvents: true,
    stackable: false,
    active: true, // shown publicly
    configured: false, // never applied to prices until admin configures rules
    sortOrder: 2,
  },
];

export const WAIVER_DRAFT_BODY = `DRAFT WAIVER — NOT FOR PUBLICATION

This area holds the waiver text. XVR must paste the waiver wording approved by its legal advisor here before publishing.

Do not publish this placeholder.`;
