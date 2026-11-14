import type { Metadata } from "next";
import { FileSignature } from "lucide-react";
import { WaiverForm } from "@/components/waiver/WaiverForm";
import { FormAlert } from "@/components/forms/Field";
import { getPublishedWaiver } from "@/lib/waiver";
import { isDbConfigured } from "@/lib/db";

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
          <div className="flex gap-4">
            <FileSignature className="size-8 shrink-0 text-cyan" aria-hidden="true" />
            <FormAlert kind="info">Our online waiver is being finalized. You will be able to sign on arrival in the meantime.</FormAlert>
          </div>
        )}
      </div>
    </section>
  );
}
