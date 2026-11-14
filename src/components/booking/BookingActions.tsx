"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { postJson } from "@/components/forms/useSubmit";
import { FormAlert } from "@/components/forms/Field";

export function ResumePayment({ bookingNumber, token }: { bookingNumber: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn btn-red w-full sm:w-auto"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await postJson<{ redirectUrl: string }>("/api/booking/checkout", { bookingNumber, token });
            window.location.assign(r.redirectUrl);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <CreditCard className="size-5" aria-hidden="true" />} Complete payment
      </button>
      {error && <FormAlert kind="error">{error}</FormAlert>}
    </div>
  );
}

export function CancelBooking({ bookingNumber, token }: { bookingNumber: string; token: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
        <XCircle className="size-4" aria-hidden="true" /> Cancel booking
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-red/40 bg-red/5 p-4">
      <p className="text-sm">Are you sure you want to cancel this booking? Refunds, if applicable, are processed by our team according to our cancellation policy.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-red btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await postJson(`/api/booking/${bookingNumber}/cancel`, { token });
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Yes, cancel
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
          Keep booking
        </button>
      </div>
      {error && <FormAlert kind="error">{error}</FormAlert>}
    </div>
  );
}
