"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { useAdminApi } from "./AdminContext";

export function SeedButton() {
  const api = useAdminApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn btn-cyan btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ created: string[] }>("/api/admin/seed", { method: "POST", body: {} });
            setResult(r.created.length ? `Added: ${r.created.join(", ")}` : "Everything was already set up.");
            router.refresh();
          } catch (e) {
            setResult((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Wand2 className="size-4" aria-hidden="true" />} Initialize starter content
      </button>
      {result && <p className="mt-2 text-xs text-muted">{result}</p>}
    </div>
  );
}
