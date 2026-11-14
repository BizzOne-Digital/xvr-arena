# XVR – Free-Roaming VR Arena (website + booking platform)

Production website for **XVR – Free-Roaming VR Arena**, 551 Ferry Road, Unit 2, Winnipeg, MB.
Public marketing site, online booking with live availability, Stripe payments, digital waivers, and a full Admin Portal.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Lucide · MongoDB Atlas + Mongoose · Zod · Stripe · Nodemailer (SMTP) · pdf-lib · Vercel

---

## 1. Run locally

```bash
npm install
cp .env.example .env.local      # fill in at least MONGODB_URI and ADMIN_SETUP_TOKEN
npm run dev                     # http://localhost:3000
```

Without `MONGODB_URI` the public pages still render using built-in starter content; booking, admin and waivers show a "being set up" notice.

## 2. First-time setup (after deploying)

1. Open **/admin**. While no admin exists, it shows **Set up Admin Portal**. Enter the `ADMIN_SETUP_TOKEN`, your name, email and a strong password. This creates the **Owner** account. Setup locks itself once an admin exists.
2. On the Dashboard, click **Initialize starter content**. This adds the 5 experiences, draft FAQs, the two offers (not yet applied to prices), draft weekly hours and a waiver placeholder. It never overwrites existing records.
3. Work through the **Launch checklist** on the Dashboard (see section 3).
4. Add team members in **Team Accounts** (Owner / Manager / Staff).

## 3. Client sign-off needed before launch

Nothing below was invented. The website shows neutral notices until each item is entered in the Admin Portal.

| Item | Where in Admin | Until then |
|---|---|---|
| Official XVR logo file | Settings → Branding | Temporary XVR wordmark is shown |
| Prices per experience/game (CAD) | Pricing (and per-game price in Games) | Pricing page shows "approx. $20–$40, being finalized"; online booking for that experience is disabled |
| Business hours | Availability, then tick "hours confirmed" in Settings | Draft hours drive booking slots; public site says "awaiting confirmation" |
| Game catalog (titles, durations, players, ages, licensed images) from VR Arena Games, VEX Play, Hero Zone VR | Games (save as Draft, then Publish) | Games page shows "coming soon" with provider links |
| Capacity per time slot (e.g. arena max players) | Experiences | Engineering defaults: arena 8 players; simulators/golf/party room one group per slot |
| Offer rules (Buy 2 Get 1, Birthday Person Plays Free) | Promotions → set rules, tick "Rules confirmed" | Offers are displayed but never applied to prices |
| Legal waiver wording | Waivers → Waiver versions → publish with approval note | Customers are told they can sign on arrival |
| Privacy Policy and Terms | Page Content → Privacy & Terms | Pages show "being finalized" |
| Cancellation policy, tax rate (GST/PST), booking fee | Settings | 0% tax, no fee, no policy text |
| FAQ answers marked DRAFT (children, clothing, reschedule, cancellation) | FAQs | Hidden from the public FAQ |
| Real arena photos | Experiences / Page Content / Gallery | Temporary Unsplash photos |

## 4. Environment variables

See `.env.example`. All secrets live in environment variables only. Nothing sensitive is stored in the database or sent to the browser.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URL, email links, Stripe redirects, sitemap |
| `MONGODB_URI` | Yes | MongoDB Atlas connection |
| `ADMIN_SETUP_TOKEN` | For first setup | Lets you create the first Owner account (16+ chars). Rotate it after setup. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | For online payments | Without them, bookings become requests that staff approve, and payment is recorded at the venue |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | For email | Without them, emails are logged as "skipped" |
| `ADMIN_NOTIFY_EMAILS` | Optional | Extra admin notification recipients |
| `CRON_SECRET` | Yes on Vercel | Protects `/api/cron` |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Optional | Google Maps Embed API (the map works without it) |

## 5. Deploy to Vercel

1. **MongoDB Atlas:** create a cluster and a database user, allow Vercel's IPs (or `0.0.0.0/0` with a strong password), and copy the connection string.
2. **Vercel:** import the repo, add the environment variables, and deploy.
3. **Stripe:** Developers → Webhooks → add endpoint `https://www.xvr.ca/api/stripe/webhook` with these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Cron:** `vercel.json` runs `/api/cron` daily at 14:00 UTC (8 AM Winnipeg). It expires abandoned checkouts, retries failed emails and sends reminders. On a Vercel Pro plan, change the schedule to `*/15 * * * *` for faster email retries. Expired checkout holds are also released automatically whenever availability is checked, so booking never depends on the cron.
5. Point the `xvr.ca` domain at Vercel, then submit `https://www.xvr.ca/sitemap.xml` in Google Search Console.

## 6. How the critical systems work

### Booking and capacity (no double bookings)
- Every experience has a **resource key** (experiences that share one also share capacity) and a **capacity mode**: `players` counts people (the arena), `private` means one group per slot (simulators, golf, party room).
- A booking occupies every slot covered by **session length + buffer**, rounded up to the slot interval.
- Capacity is enforced with one `SlotLedger` document per resource and slot. Each reservation is an **atomic conditional `$inc`** (`used <= capacity - units`), so simultaneous requests cannot oversell. If any covered slot is full, the slots already reserved are rolled back. In testing, 6 simultaneous 2-player requests on an 8-player slot produced exactly 4 bookings.
- **Checkout holds** last 30+ minutes, matching Stripe's minimum session length. Abandoned, expired or cancelled bookings release capacity exactly once, because `slotKeys` is cleared atomically.
- All prices, discounts, taxes, player limits and availability are recalculated **on the server**. Values sent from the browser are ignored.
- Dates and times use **America/Winnipeg**, including daylight saving.

### Payments (Stripe)
- Stripe Checkout handles card details; XVR never sees or stores them.
- A booking is marked **paid** only after Stripe confirms it: through the signed webhook, or a server-side session lookup when the customer returns. Webhooks are signature-verified and processed **idempotently** (each event ID is stored).
- Refunds are issued in the Stripe dashboard and sync back automatically.
- With online payments off or Stripe not configured, bookings become **requests**. Staff approve them, and payment can be recorded manually ("Record payment").

### Digital waivers
- Admins write versions, then **publish** one, which requires an approval note. Published text is locked; changes need a new version.
- Each signature stores a snapshot of the exact text, the version number, a SHA-256 hash of the template, the signature image, the timestamp, IP and user agent, plus a document hash covering all of it.
- Minors are detected from date of birth, using an admin-configurable age threshold. A parent or legal guardian must sign for them.
- Signed PDFs can be downloaded by signed-in staff (each download is logged) or by the signer through a private tokenized link.
- A digital signature alone does not establish legal compliance. Publish only wording the client has had approved.

### Image uploads
- `POST /api/upload` (admin only) accepts PNG, JPEG, WEBP or GIF up to 8 MB. The **actual file bytes** are checked, not just the MIME type. Files are stored in MongoDB (`StoredUpload`) under unique filenames.
- `GET /api/uploads/[folder]/[filename]` serves images with immutable caching. Missing files return a branded placeholder.
- When an image is replaced or a record is deleted, the old upload is removed only if no other content still references it.
- The reusable admin component is `LocalImageField` (`src/components/admin/LocalImageField.tsx`).

### Caching
- Public pages are statically generated and refreshed hourly. Data reads use tagged `unstable_cache`.
- Every admin change calls `revalidateTag(tag, { expire: 0 })`, so the next visitor sees new prices and content immediately, never a stale copy.
- Booking availability, quotes, confirmations and admin data are never cached.

### Security
- Admin sessions use random tokens stored **hashed** in MongoDB, in HTTP-only, `SameSite=Strict`, `Secure` cookies, and are validated on every request.
- Admin write requests require the session's **CSRF token** header. Login, setup and logout also check the request origin.
- Passwords are hashed with bcrypt (cost 12). Login is rate-limited per IP and per email. Public forms are rate-limited and include a hidden spam field.
- Roles: **Staff** handles bookings, waivers, inquiries, games, FAQs, gallery and reviews. **Manager** adds pricing, promotions, experiences, page content, settings and payments. **Owner** adds team accounts.
- Admin actions are recorded in `AuditLog`. Security headers are set globally. `/admin`, `/api`, confirmations and booking waiver links are excluded from search engines.

## 7. Project structure

```
src/app/(site)/        Public pages (home, about, games, services, pricing, offers, booking, waiver, …)
src/app/admin/         Admin login + portal (dashboard, bookings, availability, waivers, payments, …)
src/app/api/           Route handlers (public booking/forms, Stripe webhook, uploads, cron, admin APIs)
src/components/        UI (site, home, games, booking wizard, waiver/signature pad, admin)
src/lib/models/        Mongoose models (21 required + GalleryItem, SlotLedger, RateLimit, Notification, WebhookEvent)
src/lib/booking/       Availability, atomic reservations, pricing/promotions, booking lifecycle
src/lib/admin/         Admin resource config (drives both forms and server validation)
src/lib/data.ts        Cached public data access with safe fallbacks
```

## 8. Quality checks performed

- `npm run lint` and `tsc --noEmit`: clean. `next build`: succeeds with or without a database.
- End-to-end run against a real MongoDB instance: **99 checks passed**. They cover every public page; admin setup, login and logout; CSRF; roles; seeding; pricing; server-side quotes, tax and promotions; price-tampering protection; concurrency and capacity on shared and private resources; buffers; requests and approval; manual payment; cancel and reschedule capacity release; hold expiry via cron; waiver publish rules, version locking, guardian flow, progress tracking and PDF access control; image upload validation, serving, replace-cleanup and fallback; contact, event and review forms; review moderation; game publishing; and immediate cache refresh.
- Stripe webhook run with locally signed events: **11 checks passed**. They cover forged signatures, unpaid sessions, confirmation, idempotency, refund sync and expired-session capacity release.
- Mobile check at 390px: no horizontal overflow on any public page.

**Still to test with the client's live accounts:** a real Stripe Checkout payment in test mode (requires their Stripe keys) and real email delivery through their SMTP provider.
