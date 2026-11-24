import type { Metadata } from "next";
import { WaiverForm } from "@/components/waiver/WaiverForm";
import { FormAlert } from "@/components/forms/Field";
import { getPublishedWaiver } from "@/lib/waiver";
import { isDbConfigured } from "@/lib/db";
import { CLIENT_WAIVER_BODY, CLIENT_WAIVER_TITLE } from "@/lib/waiver-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign Your Waiver Online",
  description: "Complete your XVR participant waiver online before your visit. Parents or guardians sign for minors.",
  alternates: { canonical: "/waiver" },
};

export default async function WaiverPage() {
  const template = isDbConfigured() ? await getPublishedWaiver().catch(() => null) : null;
  return (
    <section className="container-x max-w-3xl pb-8 pt-28 sm:pt-36">
      <p className="eyebrow mb-3 text-sm">Participant waiver</p>
      <h1 className="section-title text-4xl sm:text-5xl">
        Sign Your <span className="text-glow-cyan text-cyan">Waiver</span>
      </h1>
      <p className="mt-4 text-muted">
        Every participant needs a signed waiver. If you have a booking, use the waiver link in your confirmation email so your waiver is attached to your booking.
      </p>
      <div className="card-neon mt-8 p-5 sm:p-8">
        {template ? (
          <WaiverForm
            template={{
              version: template.version,
              title: template.title,
              body: template.body,
              acknowledgments: template.acknowledgments,
              requireDob: template.requireDob,
              minorAgeThreshold: template.minorAgeThreshold,
            }}
          />
        ) : (
          <div className="space-y-5">
            <FormAlert kind="info">Online signing is temporarily unavailable. You can read the waiver below and sign when you arrive.</FormAlert>
            <h2 className="font-display text-xl font-bold uppercase">{CLIENT_WAIVER_TITLE}</h2>
            <div className="whitespace-pre-line text-sm leading-relaxed text-ink/85">{CLIENT_WAIVER_BODY}</div>
          </div>
        )}
      </div>
    </section>
  );
}
