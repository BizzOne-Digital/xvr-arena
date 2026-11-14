"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ym(date: string) {
  return date.slice(0, 7);
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Accessible month calendar. Only dates in `openDates` are selectable. */
export function Calendar({
  today,
  maxDate,
  openDates,
  value,
  onChange,
}: {
  today: string;
  maxDate: string;
  openDates: Set<string>;
  value: string | null;
  onChange: (d: string) => void;
}) {
  const [month, setMonth] = useState(ym(value ?? today));
  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: (string | null)[] = Array(first).fill(null);
    for (let d = 1; d <= days; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);
  const label = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div className="card-neon mx-auto max-w-md p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= ym(today)}
          className="grid size-10 place-items-center rounded-lg border border-cyan/30 text-cyan disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-display text-xl font-bold uppercase tracking-wide" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= ym(maxDate)}
          className="grid size-10 place-items-center rounded-lg border border-cyan/30 text-cyan disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={label}>
        {WEEKDAYS.map((w) => (
          <div key={w} role="columnheader" className="pb-2 text-xs font-semibold uppercase text-muted">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const open = openDates.has(d);
          const selected = value === d;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-label={`${new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`))}${open ? "" : " – unavailable"}`}
              disabled={!open}
              onClick={() => onChange(d)}
              className={cn(
                "aspect-square rounded-lg text-sm font-semibold transition-all",
                open ? "text-ink hover:bg-cyan/15 hover:text-cyan" : "cursor-not-allowed text-muted/30 line-through",
                selected && "bg-cyan text-bg shadow-[0_0_18px_rgba(0,223,255,0.6)] hover:bg-cyan hover:text-bg",
                isToday && !selected && "ring-1 ring-cyan/50",
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
