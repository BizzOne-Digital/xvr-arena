import type Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { WebhookEvent, Payment, Booking } from "@/lib/models";
import { getStripe } from "@/lib/stripe";
import { markPaidFromSession, markPaymentFailed, markSessionExpired } from "@/lib/booking/service";

/** Stripe webhook: signature verified, each event processed once (idempotent). */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Stripe not configured", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[stripe] signature verification failed", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  await connectDB();
  if (await WebhookEvent.exists({ eventId: event.id })) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markPaidFromSession(session);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markPaymentFailed(session.id, "Asynchronous payment failed");
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markSessionExpired(session.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (piId) {
          const full = charge.amount_refunded >= charge.amount;
          const payment = await Payment.findOneAndUpdate(
            { stripePaymentIntentId: piId },
            { $set: { status: full ? "refunded" : "partially_refunded", refundedCents: charge.amount_refunded } },
            { new: true },
          );
          if (payment) {
            await Booking.updateOne({ _id: payment.booking }, { $set: { paymentStatus: full ? "refunded" : "partially_refunded" } });
          }
        }
        break;
      }
      default:
        break;
    }
    await WebhookEvent.create({ eventId: event.id, type: event.type }).catch(() => undefined);
  } catch (err) {
    console.error("[stripe] handler error", err);
    // Non-2xx so Stripe retries; handlers are idempotent.
    return new Response("Handler error", { status: 500 });
  }
  return Response.json({ received: true });
}
