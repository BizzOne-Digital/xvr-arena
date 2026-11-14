"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { GAME_CATEGORIES } from "@/lib/constants";
import type { GameDTO } from "@/lib/data";
import { GameCard } from "./GameCard";
import { cn } from "@/lib/utils";

const FILTERS = ["All Games", ...GAME_CATEGORIES] as const;

export function GamesCatalog({ games }: { games: GameDTO[] }) {
  const [filter, setFilter] = useState<string>("All Games");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => {
      if (filter !== "All Games" && !g.categories.includes(filter)) return false;
      if (!q) return true;
      return [g.name, g.description, g.provider, ...g.categories].some((v) => v?.toLowerCase().includes(q));
    });
  }, [games, filter, query]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter games by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-lg border px-4 py-2 font-display text-sm font-bold uppercase tracking-wider transition-all",
                filter === f
                  ? "border-cyan bg-cyan/15 text-cyan shadow-[0_0_16px_rgba(0,223,255,0.35)]"
                  : "border-white/10 text-muted hover:border-cyan/50 hover:text-ink",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <label htmlFor="game-search" className="sr-only">
            Search games
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="game-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            className="field pl-10 pr-10"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        Showing {visible.length} of {games.length} game{games.length === 1 ? "" : "s"}
      </p>

      {visible.length ? (
        <motion.ul layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {visible.map((g) => (
              <motion.li
                key={g.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <GameCard game={g} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <div className="card-neon mt-6 p-10 text-center">
          <p className="font-display text-xl font-bold uppercase">No games match</p>
          <p className="mt-1 text-muted">Try another category or clear your search.</p>
          <button type="button" className="btn btn-cyan btn-sm mt-5" onClick={() => { setFilter("All Games"); setQuery(""); }}>
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
