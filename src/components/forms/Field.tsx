import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Base = { label: string; error?: string[] | string; hint?: string; className?: string };

function Wrap({ id, label, error, hint, required, className, children }: Base & { id: string; required?: boolean; children: ReactNode }) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-red" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !msg && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {msg && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, error, hint, className, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const has = Array.isArray(error) ? error.length > 0 : !!error;
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={props.required} className={className}>
      <input id={id} className="field" aria-invalid={has} aria-describedby={has ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
    </Wrap>
  );
}

export function TextArea({ label, error, hint, className, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const has = Array.isArray(error) ? error.length > 0 : !!error;
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={props.required} className={className}>
      <textarea id={id} className="field" aria-invalid={has} aria-describedby={has ? `${id}-err` : undefined} {...props} />
    </Wrap>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  options,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) {
  const id = useId();
  const has = Array.isArray(error) ? error.length > 0 : !!error;
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={props.required} className={className}>
      <select id={id} className="field" aria-invalid={has} {...props}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </Wrap>
  );
}

export function FormAlert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        kind === "error" && "border-red/50 bg-red/10 text-ink",
        kind === "success" && "border-cyan/50 bg-cyan/10 text-ink",
        kind === "info" && "border-blue/40 bg-blue/10 text-ink",
      )}
    >
      {children}
    </div>
  );
}

/** Visually hidden honeypot field to catch bots. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
