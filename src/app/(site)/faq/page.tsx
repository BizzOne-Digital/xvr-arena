import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Accordion } from "@/components/ui/Accordion";
import { getFaqs } from "@/lib/data";
import { IMG } from "@/lib/defaults";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about free-roaming VR, bookings, waivers, groups and visiting XVR in Winnipeg.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = faqs.reduce<Record<string, typeof faqs>>((acc, f) => {
    (acc[f.category || "General"] ||= []).push(f);
    return acc;
  }, {});
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <PageHero eyebrow="Help Center" title="Frequently Asked" accent="Questions" image={IMG.headset} imageAlt="VR players at XVR" />
      <section className="container-x max-w-4xl pt-16">
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="mb-12">
            <h2 className="eyebrow mb-4 text-sm">{cat}</h2>
            <Accordion items={items} />
          </div>
        ))}
        <div className="card-neon mt-6 flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-2xl font-bold uppercase">Still have questions?</p>
            <p className="text-muted">Our team is happy to help.</p>
          </div>
          <Link href="/contact" className="btn btn-cyan">
            Contact Us
          </Link>
        </div>
      </section>
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
    </>
  );
}
