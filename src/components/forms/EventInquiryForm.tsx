"use client";

import { Loader2, Send } from "lucide-react";
import { EVENT_TYPES } from "@/lib/constants";
import { FormAlert, Honeypot, SelectField, TextArea, TextField } from "./Field";
import { useSubmit } from "./useSubmit";

export function EventInquiryForm({ defaultType = EVENT_TYPES[0] }: { defaultType?: string }) {
  const { status, error, fieldErrors, submit } = useSubmit("/api/events");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const res = await submit({ ...raw, groupSize: raw.groupSize ? Number(raw.groupSize) : undefined });
    if (res) form.reset();
  }

  if (status === "success") {
    return (
      <FormAlert kind="success">
        <strong className="block font-display text-lg">Inquiry received.</strong>
        Thank you. Our events team will contact you shortly to plan the details.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2" noValidate>
      <Honeypot />
      <TextField label="Full name" name="name" required autoComplete="name" error={fieldErrors.name} />
      <TextField label="Email" name="email" type="email" required autoComplete="email" error={fieldErrors.email} />
      <TextField label="Phone" name="phone" type="tel" required autoComplete="tel" error={fieldErrors.phone} />
      <SelectField label="Event type" name="eventType" required defaultValue={defaultType} options={[...EVENT_TYPES]} error={fieldErrors.eventType} />
      <TextField label="Preferred date" name="preferredDate" type="date" error={fieldErrors.preferredDate} />
      <TextField label="Approximate group size" name="groupSize" type="number" min={1} max={500} inputMode="numeric" error={fieldErrors.groupSize} />
      <TextField label="Company / organization (optional)" name="company" className="sm:col-span-2" error={fieldErrors.company} />
      <TextArea
        label="Additional requirements"
        name="requirements"
        className="sm:col-span-2"
        rows={4}
        placeholder="Ages, experiences you are interested in, food, timing…"
        error={fieldErrors.requirements}
      />
      {error && (
        <div className="sm:col-span-2">
          <FormAlert kind="error">{error}</FormAlert>
        </div>
      )}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-red w-full sm:w-auto" disabled={status === "loading"}>
          {status === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
          {status === "loading" ? "Sending…" : "Send Inquiry"}
        </button>
      </div>
    </form>
  );
}
