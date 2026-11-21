"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, PenLine } from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { FormAlert, TextArea, TextField } from "@/components/forms/Field";
import { postJson, type FieldErrors } from "@/components/forms/useSubmit";

export type WaiverTemplateDTO = {
  version: number;
  title: string;
  body: string;
  acknowledgments: string[];
  requireDob: boolean;
  minorAgeThreshold: number;
};

type Result = { waiverNumber: string; downloadPath: string; waiverStatus?: string };

function ageFrom(dob: string) {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
  return a;
}

export function WaiverForm({
  template,
  bookingNumber,
  token,
  defaults,
  onSigned,
  compact = false,
}: {
  template: WaiverTemplateDTO;
  bookingNumber?: string;
  token?: string;
  defaults?: { name?: string; email?: string; phone?: string };
  onSigned?: (r: Result) => void;
  compact?: boolean;
}) {
  const pad = useRef<SignaturePadHandle>(null);
  const [dob, setDob] = useState("");
  const [minorManual, setMinorManual] = useState(false);
  const [acks, setAcks] = useState<boolean[]>(template.acknowledgments.map(() => false));
  const [accepted, setAccepted] = useState(false);
  const [sigEmpty, setSigEmpty] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState<Result | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [firstDefault, ...rest] = (defaults?.name ?? "").trim().split(/\s+/);
  const lastDefault = rest.join(" ");
  const age = ageFrom(dob);
  const isMinor = age != null ? age < template.minorAgeThreshold : minorManual;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const signature = pad.current?.toDataURL();
    if (!signature) return setError("Please draw a signature in the box.");
    if (!accepted || acks.some((a) => !a)) return setError("Please confirm all acknowledgments and accept the waiver.");
    setBusy(true);
    try {
      const res = await postJson<Result>("/api/waiver/sign", {
        bookingId: bookingNumber,
        token,
        firstName: f.firstName,
        lastName: f.lastName,
        participantDob: dob,
        email: f.email,
        phone: f.phone,
        emergencyPhone: f.emergencyPhone,
        address: { line1: f.addressLine1, city: f.city, province: f.province, postalCode: f.postalCode },
        mailingList: f.mailingList === "on",
        medicalNotes: f.medicalNotes,
        isMinor,
        guardian: isMinor ? { name: f.guardianName, relationship: f.guardianRelationship, email: f.guardianEmail, phone: f.guardianPhone } : undefined,
        acknowledgments: acks,
        accepted: true,
        signaturePng: signature,
        typedSignature: f.typedSignature,
      });
      setDone(res);
      onSigned?.(res);
    } catch (err) {
      const e2 = err as Error & { details?: FieldErrors };
      setError(e2.message);
      setFieldErrors(e2.details ?? {});
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card-neon p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-14 text-cyan" aria-hidden="true" />
        <h3 className="mt-3 font-display text-2xl font-bold uppercase">Waiver signed</h3>
        <p className="mt-1 text-muted">Reference {done.waiverNumber}. A copy has been emailed when email is available.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={done.downloadPath} className="btn btn-cyan btn-sm">
            <Download className="size-4" aria-hidden="true" /> Download signed copy
          </a>
          {bookingNumber && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDone(null);
                setAcks(template.acknowledgments.map(() => false));
                setAccepted(false);
                setDob("");
                setFormKey((k) => k + 1);
              }}
            >
              <PenLine className="size-4" aria-hidden="true" /> Sign for another participant
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <h3 className="font-display text-xl font-bold uppercase">
          {template.title} <span className="text-sm font-normal text-muted">(v{template.version})</span>
        </h3>
        <div
          className={`mt-3 overflow-y-auto whitespace-pre-line rounded-xl border border-cyan/25 bg-bg/70 p-4 text-sm leading-relaxed text-ink/85 ${compact ? "max-h-56" : "max-h-80"}`}
          tabIndex={0}
          aria-label="Waiver text"
        >
          {template.body}
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-bold uppercase">Participant</legend>
        <TextField label="First name" name="firstName" required autoComplete="given-name" defaultValue={firstDefault} error={fieldErrors.firstName} />
        <TextField label="Last name" name="lastName" required autoComplete="family-name" defaultValue={lastDefault} error={fieldErrors.lastName} />
        <TextField
          label="Date of birth"
          name="participantDob"
          type="date"
          required={template.requireDob}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          error={fieldErrors.participantDob}
        />
        <TextField label="Phone number" name="phone" type="tel" required autoComplete="tel" defaultValue={defaults?.phone} error={fieldErrors.phone} />
        <TextField label="Email address" name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} error={fieldErrors.email} />
        <TextField label="Emergency contact number" name="emergencyPhone" type="tel" required error={fieldErrors.emergencyPhone} />
        <TextField label="Home address" name="addressLine1" required autoComplete="street-address" className="sm:col-span-2" error={fieldErrors.address} />
        <TextField label="City" name="city" required autoComplete="address-level2" defaultValue="Winnipeg" />
        <TextField label="Province" name="province" required autoComplete="address-level1" defaultValue="Manitoba" />
        <TextField label="Postal code" name="postalCode" required autoComplete="postal-code" />
        <TextArea
          label="Medical conditions / allergies"
          name="medicalNotes"
          rows={2}
          className="sm:col-span-2"
          placeholder="Leave blank if none"
          error={fieldErrors.medicalNotes}
        />
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" name="mailingList" className="size-5 accent-cyan" />
          Yes, I&apos;d like to join the XVR mailing list for news and offers.
        </label>
        {!template.requireDob && (
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" checked={minorManual} onChange={(e) => setMinorManual(e.target.checked)} className="size-5 accent-cyan" />
            Participant is under {template.minorAgeThreshold}
          </label>
        )}
      </fieldset>

      {isMinor && (
        <fieldset className="grid gap-4 rounded-xl border border-red/40 bg-red/5 p-4 sm:grid-cols-2">
          <legend className="px-2 font-display text-lg font-bold uppercase text-red">Parent / legal guardian</legend>
          <p className="text-sm text-muted sm:col-span-2">
            This participant is under {template.minorAgeThreshold}. A parent or legal guardian must complete and sign this waiver.
          </p>
          <TextField label="Guardian full name" name="guardianName" required error={fieldErrors["guardian"]} />
          <TextField label="Relationship to participant (optional)" name="guardianRelationship" placeholder="e.g. Parent" />
          <TextField label="Guardian email" name="guardianEmail" type="email" />
          <TextField label="Guardian phone" name="guardianPhone" type="tel" />
        </fieldset>
      )}

      {template.acknowledgments.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-2 font-display text-lg font-bold uppercase">Acknowledgments</legend>
          {template.acknowledgments.map((a, i) => (
            <label key={i} className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-cyan"
                checked={acks[i]}
                onChange={(e) => setAcks((prev) => prev.map((v, k) => (k === i ? e.target.checked : v)))}
                required
              />
              <span>{a}</span>
            </label>
          ))}
        </fieldset>
      )}

      <SignaturePad ref={pad} onChange={setSigEmpty} label={isMinor ? "Parent / guardian signature" : "Participant signature"} />
      <TextField
        label="Type your full name to confirm (optional alternative for accessibility)"
        name="typedSignature"
        hint="Your drawn signature is still required. Ask staff for help on-site if you cannot sign digitally."
      />

      <label className="flex items-start gap-3 rounded-xl border border-cyan/30 bg-cyan/5 p-4 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-cyan" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
        <span>
          I have read and understand this waiver{isMinor ? " on behalf of the participant" : ""}, and I agree to its terms. I understand that my electronic signature is
          legally equivalent to my handwritten signature.
        </span>
      </label>

      {error && <FormAlert kind="error">{error}</FormAlert>}

      <button type="submit" className="btn btn-red w-full sm:w-auto" disabled={busy || sigEmpty || !accepted}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <PenLine className="size-5" aria-hidden="true" />}
        Submit signed waiver
      </button>
    </form>
  );
}
