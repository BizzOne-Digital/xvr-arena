"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i} className={cn("card-neon overflow-hidden", isOpen && "border-cyan/80")}>
            <h3>
              <button
                type="button"
                id={`${base}-h-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-p-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-lg font-bold tracking-wide sm:px-6 sm:text-xl"
              >
                {item.question}
                <Plus className={cn("size-6 shrink-0 text-cyan transition-transform duration-300", isOpen && "rotate-45")} aria-hidden="true" />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${base}-p-${i}`}
                  role="region"
                  aria-labelledby={`${base}-h-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <p className="whitespace-pre-line px-5 pb-5 leading-relaxed text-muted sm:px-6">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
