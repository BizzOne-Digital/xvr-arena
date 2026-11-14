"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ShieldPlus } from "lucide-react";
import { FormAlert, TextField } from "@/components/forms/Field";
import { postJson, type FieldErrors } from "@/components/forms/useSubmit";

export function LoginForm({ mode }: { mode: "login" | "setup" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await postJson(mode === "login" ? "/api/admin/auth/login" : "/api/admin/auth/setup", data);
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err) {
      const e2 = err as Error & { details?: FieldErrors };
      setError(e2.message);
      setFieldErrors(e2.details ?? {});
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {mode === "setup" && (
        <>
          <TextField label="Setup token" name="setupToken" type="password" required autoComplete="off" hint="The ADMIN_SETUP_TOKEN value from the server environment." error={fieldErrors.setupToken} />
          <TextField label="Your name" name="name" required autoComplete="name" error={fieldErrors.name} />
        </>
      )}
      <TextField label="Email" name="email" type="email" required autoComplete="username" error={fieldErrors.email} />
      <TextField
        label="Password"
        name="password"
        type="password"
        required
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "setup" ? "At least 12 characters with upper and lower case letters and a number." : undefined}
        error={fieldErrors.password}
      />
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <button type="submit" className="btn btn-red w-full" disabled={busy}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : mode === "login" ? <LogIn className="size-5" aria-hidden="true" /> : <ShieldPlus className="size-5" aria-hidden="true" />}
        {mode === "login" ? "Sign in" : "Create owner account"}
      </button>
    </form>
  );
}
