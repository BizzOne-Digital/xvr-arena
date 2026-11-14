"use client";

import { Send, Loader2 } from "lucide-react";
import { FormAlert, Honeypot, TextArea, TextField } from "./Field";
import { useSubmit } from "./useSubmit";

export function ContactForm() {
  const { status, error, fieldErrors, submit } = useSubmit("/api/contact");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const res = await submit(data);
    if (res) form.reset();
  }

  if (status === "success") {
    return (
      <FormAlert kind="success">
        <strong className="block font-display text-lg">Message sent.</strong>
        Thanks for reaching out. Our team will get back to you as soon as possible.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2" noValidate>
      <Honeypot />
      <TextField label="Full name" name="name" required autoComplete="name" error={fieldErrors.name} />
      <TextField label="Email" name="email" type="email" required autoComplete="email" error={fieldErrors.email} />
      <TextField label="Phone" name="phone" type="tel" autoComplete="tel" error={fieldErrors.phone} />
      <TextField label="Subject" name="subject" error={fieldErrors.subject} />
      <TextArea label="Message" name="message" required className="sm:col-span-2" rows={5} error={fieldErrors.message} />
      {error && (
        <div className="sm:col-span-2">
          <FormAlert kind="error">{error}</FormAlert>
        </div>
      )}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-red w-full sm:w-auto" disabled={status === "loading"}>
          {status === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
          {status === "loading" ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
