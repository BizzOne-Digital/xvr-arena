import type { Metadata } from "next";
import { MessageSquareQuote, Star } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ReviewForm } from "@/components/forms/ReviewForm";
import { SmartImage } from "@/components/ui/SmartImage";
import { getApprovedReviews } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { IMG } from "@/lib/defaults";

export const metadata: Metadata = {
  title: "Testimonials & Reviews",
  description: "Read reviews from players who visited XVR, Winnipeg's free-roaming VR arena — and share your own experience.",
  alternates: { canonical: "/testimonials" },
};

export default async function TestimonialsPage() {
  const reviews = await getApprovedReviews();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <PageHero eyebrow="Testimonials" title="Player" accent="Reviews" subtitle="Real experiences from real players." image={IMG.family} imageAlt="Family playing VR at XVR" />
      <section className="container-x grid gap-10 pt-16 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {reviews.length ? (
            <>
              <p className="mb-6 flex items-center gap-3 text-muted">
                <span className="font-orbitron text-3xl text-cyan">{avg.toFixed(1)}</span> average from {reviews.length} review{reviews.length > 1 ? "s" : ""}
              </p>
              <ul className="grid gap-5 md:grid-cols-2">
                {reviews.map((r, i) => (
                  <Reveal as="li" key={r._id} delay={(i % 4) * 0.05} className="card-neon flex flex-col p-6">
                    <div className="flex items-center gap-3">
                      {r.image ? (
                        <span className="relative size-11 overflow-hidden rounded-full border border-cyan/40">
                          <SmartImage src={r.image} alt="" fill sizes="44px" className="object-cover" />
                        </span>
                      ) : (
                        <span className="grid size-11 place-items-center rounded-full border border-cyan/40 font-display text-lg font-bold text-cyan">
                          {r.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="font-display text-lg font-bold">{r.name}</p>
                        <p className="text-xs text-muted">{formatDate(r.visitDate || r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star key={k} className={`size-4 text-cyan ${k < r.rating ? "fill-cyan" : "opacity-30"}`} aria-hidden="true" />
                      ))}
                    </div>
                    <p className="mt-3 leading-relaxed text-ink/90">&ldquo;{r.text}&rdquo;</p>
                  </Reveal>
                ))}
              </ul>
            </>
          ) : (
            <Reveal className="card-neon flex flex-col items-center p-12 text-center">
              <MessageSquareQuote className="size-14 text-cyan" aria-hidden="true" />
              <h2 className="mt-4 font-display text-3xl font-bold uppercase">Be the first to review</h2>
              <p className="mt-3 max-w-md text-muted">
                We&apos;re just getting started. Visited XVR? Share your experience — reviews appear here once approved by our team.
              </p>
            </Reveal>
          )}
        </div>
        <aside className="card-neon h-fit p-6 sm:p-8 lg:sticky lg:top-28">
          <h2 className="section-title text-3xl">Share Your Experience</h2>
          <p className="mb-6 mt-2 text-sm text-muted">All reviews are moderated before they are published.</p>
          <ReviewForm />
        </aside>
      </section>
    </>
  );
}
