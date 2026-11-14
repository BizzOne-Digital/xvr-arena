"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { FormAlert, Honeypot, TextArea, TextField } from "./Field";
import { useSubmit } from "./useSubmit";
import { cn } from "@/lib/utils";

export function ReviewForm() {
  const { status, error, fieldErrors, submit } = useSubmit("/api/reviews");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    const res = await submit({ ...raw, rating });
    if (res) form.reset();
  }

  if (status === "success") {
    return (
      <FormAlert kind="success">
        <strong className="block font-display text-lg">Thank you for your review!</strong>
        Reviews are checked by our team before they appear on the website.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative grid gap-4" noValidate>
      <Honeypot />
      <fieldset>
        <legend className="label">
          Your rating <span className="text-red">*</span>
        </legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("size-8 text-cyan", (hover || rating) >= n ? "fill-cyan drop-shadow-[0_0_8px_#00dfff]" : "opacity-40")} aria-hidden="true" />
            </button>
          ))}
        </div>
        {fieldErrors.rating && <p className="mt-1 text-xs text-red">Please choose a rating.</p>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name to display" name="name" required error={fieldErrors.name} />
        <TextField label="Email (not published)" name="email" type="email" error={fieldErrors.email} />
      </div>
      <TextArea label="Your review" name="text" required rows={4} error={fieldErrors.text} />
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <div>
        <button type="submit" className="btn btn-red" disabled={status === "loading" || rating === 0}>
          {status === "loading" && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
          Submit Review
        </button>
      </div>
    </form>
  );
}
