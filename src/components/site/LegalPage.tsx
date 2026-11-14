import { FileWarning } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

/** Renders admin-managed legal text. Shows a clear notice until approved content is published. */
export function LegalPage({ title, body, email }: { title: string; body: string; email: string }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} />
      <section className="container-x max-w-3xl pt-14">
        {body.trim() ? (
          <div className="prose-xvr whitespace-pre-line">{body}</div>
        ) : (
          <div className="card-neon flex gap-4 p-8">
            <FileWarning className="size-8 shrink-0 text-cyan" aria-hidden="true" />
            <div>
              <h2 className="font-display text-2xl font-bold uppercase">Being finalized</h2>
              <p className="mt-2 text-muted">
                Our {title.toLowerCase()} is being finalized. For any questions in the meantime, please contact us at{" "}
                <a className="text-cyan underline" href={`mailto:${email}`}>
                  {email}
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
