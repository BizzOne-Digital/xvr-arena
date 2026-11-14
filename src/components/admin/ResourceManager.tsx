"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { RESOURCES, type FieldDef } from "@/lib/admin/resource-config";
import { useAdmin, useAdminApi, roleAtLeast, type ApiError } from "./AdminContext";
import { LocalImageField, LocalImagesField } from "./LocalImageField";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn, formatCAD, formatDateTime } from "@/lib/utils";

type Item = Record<string, unknown> & { _id: string };
type Opt = { value: string; label: string };

function toOptions(f: FieldDef, dynamic: Record<string, Opt[]>): Opt[] {
  if (f.optionsFrom) return dynamic[f.optionsFrom] ?? [];
  return (f.options ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

function toLocalDateTime(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function blankFor(fields: FieldDef[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.default !== undefined) out[f.name] = f.default;
    else if (f.type === "boolean") out[f.name] = false;
    else if (["multiselect", "tags", "images"].includes(f.type)) out[f.name] = [];
    else out[f.name] = "";
  }
  return out;
}

function cell(f: FieldDef, v: unknown, dynamic: Record<string, Opt[]>) {
  if (v == null || v === "") return <span className="text-muted/50">—</span>;
  switch (f.type) {
    case "money":
      return <span className="font-orbitron">{formatCAD(Number(v))}</span>;
    case "boolean":
      return v ? <span className="text-cyan">Yes</span> : <span className="text-muted">No</span>;
    case "image":
      return (
        <span className="relative block size-10 overflow-hidden rounded">
          <SmartImage src={String(v)} alt="" fill sizes="40px" className="object-cover" />
        </span>
      );
    case "select": {
      const o = toOptions(f, dynamic).find((x) => x.value === v);
      return o?.label ?? String(v);
    }
    case "textarea":
      return <span className="line-clamp-2 max-w-xs">{String(v)}</span>;
    case "datetime":
    case "date":
      return formatDateTime(String(v));
    default:
      return Array.isArray(v) ? v.join(", ") : String(v);
  }
}

export function ResourceManager({ resource }: { resource: string }) {
  const def = RESOURCES[resource];
  const api = useAdminApi();
  const { role } = useAdmin();
  const canEdit = roleAtLeast(role, def.minRole ?? "staff");
  const canDelete = roleAtLeast(role, def.deleteRole ?? def.minRole ?? "manager");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [dynamic, setDynamic] = useState<Record<string, Opt[]>>({});

  const listFields = useMemo(() => def.fields.filter((f) => f.list), [def]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), q, status });
      const d = await api<{ items: Item[]; total: number; pages: number }>(`/api/admin/r/${resource}?${qs}`);
      setItems(d.items);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, resource, page, q, status]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    if (def.fields.some((f) => f.optionsFrom === "experiences")) {
      api<{ experiences: Opt[] }>("/api/admin/options").then((d) => setDynamic({ experiences: d.experiences })).catch(() => {});
    }
  }, [api, def]);

  async function quickStatus(item: Item, value: string) {
    if (!def.statusFilter) return;
    try {
      await api(`/api/admin/r/${resource}/${item._id}`, { method: "PATCH", body: { [def.statusFilter.field]: value } });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function remove(item: Item) {
    if (!confirm(`Delete this ${def.singular.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/r/${resource}/${item._id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className="field pl-9"
            placeholder={`Search ${def.title.toLowerCase()}…`}
            aria-label={`Search ${def.title}`}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {def.statusFilter && (
          <select
            className="field sm:w-48"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {def.statusFilter.options.map((o) => (
              <option key={o} value={o}>
                {o.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
        {def.allowCreate !== false && canEdit && (
          <button type="button" className="btn btn-red btn-sm" onClick={() => setEditing(blankFor(def.fields))}>
            <Plus className="size-4" aria-hidden="true" /> New {def.singular}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red/40 bg-red/10 p-3 text-sm">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-cyan/15">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-bg-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              {listFields.map((f) => (
                <th key={f.name} scope="col" className="px-4 py-3 font-semibold">
                  {f.label}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={listFields.length + 1} className="px-4 py-10 text-center text-muted">
                  <Loader2 className="mx-auto size-5 animate-spin" aria-label="Loading" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={listFields.length + 1} className="px-4 py-10 text-center text-muted">
                  No {def.title.toLowerCase()} yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="hover:bg-white/[0.02]">
                  {listFields.map((f) => (
                    <td key={f.name} className="px-4 py-3 align-middle">
                      {def.statusFilter?.field === f.name && canEdit ? (
                        <select
                          className="rounded-md border border-cyan/25 bg-bg px-2 py-1 text-xs"
                          value={String(item[f.name] ?? "")}
                          onChange={(e) => quickStatus(item, e.target.value)}
                          aria-label={`Change ${f.label}`}
                        >
                          {def.statusFilter.options.map((o) => (
                            <option key={o} value={o}>
                              {o.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        cell(f, item[f.name], dynamic)
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" className="mr-1 rounded-md p-2 text-cyan hover:bg-cyan/10" aria-label="Edit" onClick={() => setEditing(item)}>
                      <Pencil className="size-4" />
                    </button>
                    {canDelete && (
                      <button type="button" className="rounded-md p-2 text-red hover:bg-red/10" aria-label="Delete" onClick={() => remove(item)}>
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{total} total</span>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border border-white/10 p-2 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className="rounded-md border border-white/10 p-2 disabled:opacity-30" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {editing && (
        <EditorPanel
          resource={resource}
          initial={editing}
          dynamic={dynamic}
          readOnly={!canEdit}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditorPanel({
  resource,
  initial,
  dynamic,
  readOnly,
  onClose,
  onSaved,
}: {
  resource: string;
  initial: Record<string, unknown>;
  dynamic: Record<string, Opt[]>;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const def = RESOURCES[resource];
  const api = useAdminApi();
  const isNew = !initial._id;
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = { ...blankFor(def.fields), ...initial };
    for (const f of def.fields) {
      if (f.type === "datetime") v[f.name] = toLocalDateTime(v[f.name]);
      if (f.type === "date" && v[f.name]) v[f.name] = String(v[f.name]).slice(0, 10);
      if (f.type === "money" && v[f.name] !== "" && v[f.name] != null) v[f.name] = (Number(v[f.name]) / 100).toFixed(2);
    }
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: string, v: unknown) => setValues((prev) => ({ ...prev, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body: Record<string, unknown> = {};
    for (const f of def.fields) {
      let v = values[f.name];
      if (f.type === "money") v = v === "" || v == null ? "" : Math.round(Number(v) * 100);
      if (f.type === "number") v = v === "" || v == null ? "" : Number(v);
      if (f.type === "datetime") v = v ? new Date(String(v)).toISOString() : "";
      body[f.name] = v;
    }
    try {
      if (isNew) await api(`/api/admin/r/${resource}`, { method: "POST", body });
      else await api(`/api/admin/r/${resource}/${initial._id}`, { method: "PATCH", body });
      onSaved();
    } catch (err) {
      const e2 = err as ApiError;
      setError(e2.message);
      setFieldErrors(e2.details ?? {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${isNew ? "New" : "Edit"} ${def.singular}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={save} className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-cyan/25 bg-bg-2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan/15 px-6 py-4">
          <h2 className="font-display text-2xl font-bold uppercase">
            {isNew ? "New" : "Edit"} {def.singular}
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-lg text-muted hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <fieldset disabled={readOnly} className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2">
          {def.fields.map((f) => (
            <FieldInput key={f.name} f={f} value={values[f.name]} onChange={(v) => set(f.name, v)} options={toOptions(f, dynamic)} error={fieldErrors[f.name]} />
          ))}
        </fieldset>
        <div className="flex items-center justify-between gap-3 border-t border-cyan/15 px-6 py-4">
          <p className="text-sm text-red" role="alert">
            {error}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            {!readOnly && (
              <button type="submit" className="btn btn-red btn-sm" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  f,
  value,
  onChange,
  options,
  error,
}: {
  f: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  options: Opt[];
  error?: string[];
}) {
  const id = `f-${f.name}`;
  const wide = f.wide || ["textarea", "images", "multiselect", "tags", "image"].includes(f.type);
  const wrap = (child: React.ReactNode, label = true) => (
    <div className={cn(wide && "sm:col-span-2")}>
      {label && (
        <label htmlFor={id} className="label">
          {f.label} {f.required && <span className="text-red">*</span>}
        </label>
      )}
      {child}
      {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
      {error?.[0] && <p className="mt-1 text-xs text-red">{error[0]}</p>}
    </div>
  );

  switch (f.type) {
    case "textarea":
      return wrap(<textarea id={id} className="field" rows={5} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={f.required} />);
    case "boolean":
      return (
        <label className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm">
          <input type="checkbox" className="size-5 accent-cyan" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {f.label}
        </label>
      );
    case "select":
      return wrap(
        <select id={id} className="field" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={f.required}>
          {!f.required && <option value="">—</option>}
          {f.required && !value && <option value="">Select…</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>,
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return wrap(
        <div className="flex flex-wrap gap-2" role="group" aria-label={f.label}>
          {options.map((o) => {
            const on = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                className={cn("rounded-md border px-3 py-1.5 text-xs font-semibold", on ? "border-cyan bg-cyan/15 text-cyan" : "border-white/15 text-muted")}
              >
                {o.label}
              </button>
            );
          })}
        </div>,
      );
    }
    case "tags":
      return wrap(
        <textarea
          id={id}
          className="field"
          rows={4}
          value={(Array.isArray(value) ? (value as string[]) : []).join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        />,
      );
    case "image":
      return wrap(<LocalImageField label={f.label} value={String(value ?? "")} onChange={onChange} folder={f.folder} />, false);
    case "images":
      return wrap(<LocalImagesField label={f.label} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} folder={f.folder} />, false);
    case "money":
      return wrap(
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input id={id} type="number" step="0.01" min="0" className="field pl-7" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={f.required} />
        </div>,
      );
    case "number":
      return wrap(<input id={id} type="number" className="field" min={f.min} max={f.max} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={f.required} />);
    case "date":
      return wrap(<input id={id} type="date" className="field" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />);
    case "datetime":
      return wrap(<input id={id} type="datetime-local" className="field" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />);
    default:
      return wrap(
        <input
          id={id}
          type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
          className="field"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={f.required}
        />,
      );
  }
}
