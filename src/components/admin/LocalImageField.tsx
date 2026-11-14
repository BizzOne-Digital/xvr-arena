"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { useAdmin } from "./AdminContext";
import type { UploadFolder } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX = 8 * 1024 * 1024;

/**
 * Reusable admin image field. Uploads to POST /api/upload (MongoDB storage) with progress,
 * previews the result and supports replace/remove. The old image is cleaned up server-side
 * when the record is saved and nothing else references it.
 */
export function LocalImageField({
  label,
  value,
  onChange,
  folder = "misc",
  help,
  compact = false,
}: {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  folder?: UploadFolder;
  help?: string;
  compact?: boolean;
}) {
  const { csrfToken } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function upload(file: File) {
    setMessage(null);
    if (!ACCEPT.split(",").includes(file.type)) return setMessage({ kind: "err", text: "Use a PNG, JPEG, WEBP or GIF image." });
    if (file.size > MAX) return setMessage({ kind: "err", text: "Images must be 8 MB or smaller." });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("x-csrf-token", csrfToken);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        onChange(data.url);
        setMessage({ kind: "ok", text: "Uploaded. Save to apply the change." });
      } else setMessage({ kind: "err", text: data.error || "Upload failed." });
    };
    xhr.onerror = () => {
      setProgress(null);
      setMessage({ kind: "err", text: "Network error during upload." });
    };
    setProgress(0);
    xhr.send(fd);
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className={cn("flex gap-4", compact ? "items-center" : "flex-col sm:flex-row sm:items-start")}>
        <div className={cn("relative shrink-0 overflow-hidden rounded-lg border border-cyan/25 bg-bg", compact ? "size-16" : "aspect-video w-full sm:w-56")}>
          {value ? (
            <SmartImage src={value} alt={`${label} preview`} fill sizes="224px" className="object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted">
              <ImagePlus className="size-7" aria-hidden="true" />
            </div>
          )}
          {progress != null && (
            <div className="absolute inset-0 grid place-items-center bg-bg/80">
              <span className="flex items-center gap-2 text-sm text-cyan">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {progress}%
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label={`Upload ${label}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-cyan btn-sm" disabled={progress != null} onClick={() => input.current?.click()}>
            {value ? <RefreshCw className="size-4" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")} disabled={progress != null}>
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </button>
          )}
          {!compact && (
            <input
              type="url"
              className="field mt-1 text-xs"
              placeholder="…or paste an https:// image URL"
              value={value && value.startsWith("http") ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              aria-label={`${label} URL`}
            />
          )}
        </div>
      </div>
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
      {message && <p className={cn("mt-1 text-xs", message.kind === "ok" ? "text-cyan" : "text-red")} role={message.kind === "err" ? "alert" : "status"}>{message.text}</p>}
    </div>
  );
}

export function LocalImagesField({
  label,
  value,
  onChange,
  folder = "gallery",
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: UploadFolder;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <ul className="space-y-3">
        {value.map((url, i) => (
          <li key={url + i} className="flex items-center gap-3">
            <LocalImageField compact label={`Image ${i + 1}`} value={url} folder={folder} onChange={(u) => onChange(u ? value.map((v, k) => (k === i ? u : v)) : value.filter((_, k) => k !== i))} />
          </li>
        ))}
        <li>
          <LocalImageField compact label="Add image" value="" folder={folder} onChange={(u) => u && onChange([...value, u])} />
        </li>
      </ul>
    </div>
  );
}
