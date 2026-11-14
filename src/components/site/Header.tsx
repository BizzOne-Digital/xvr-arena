"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Menu, Phone, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export function Header({ logoUrl, phone }: { logoUrl?: string; phone: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300",
        scrolled ? "bg-bg/85 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl" : "bg-gradient-to-b from-bg/90 to-bg/0",
      )}
    >
      <div className="container-x flex h-[72px] items-center justify-between gap-4 lg:h-[84px]">
        <Link href="/" className="shrink-0" aria-label="XVR home">
          <Logo logoUrl={logoUrl} />
        </Link>

        <nav aria-label="Main navigation" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn(
                    "group relative block px-3 py-2 font-display text-[1.02rem] font-semibold tracking-wide transition-colors",
                    isActive(l.href) ? "text-cyan" : "text-ink/90 hover:text-cyan",
                  )}
                >
                  {l.label}
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-0.5 h-[2px] origin-left rounded-full bg-cyan shadow-[0_0_10px_#00dfff] transition-transform duration-300",
                      isActive(l.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/booking" className="btn btn-red btn-sm hidden sm:inline-flex">
            <CalendarDays className="size-4" aria-hidden="true" />
            Book Now
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-cyan/40 text-cyan xl:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-6" />
          </button>
        </div>
      </div>
      <div className="neon-divider opacity-60" />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 right-0 z-50 flex w-[min(88vw,380px)] flex-col border-l border-cyan/30 bg-bg-2/95 shadow-[-20px_0_60px_rgba(0,223,255,0.12)] backdrop-blur-xl xl:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
            >
              <div className="flex h-[72px] items-center justify-between px-5">
                <Logo logoUrl={logoUrl} compact />
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-cyan/40 text-cyan"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  autoFocus
                >
                  <X className="size-6" />
                </button>
              </div>
              <div className="neon-divider" />
              <nav aria-label="Mobile navigation" data-lenis-prevent className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                  {[...NAV_LINKS, { href: "/parties", label: "Birthday Parties" }, { href: "/corporate-events", label: "Corporate Events" }, { href: "/testimonials", label: "Testimonials" }].map((l, i) => (
                    <motion.li key={l.href} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                      <Link
                        href={l.href}
                        aria-current={isActive(l.href) ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-4 py-3 font-display text-lg font-semibold tracking-wide",
                          isActive(l.href) ? "bg-cyan/10 text-cyan" : "text-ink hover:bg-white/5",
                        )}
                      >
                        {l.label}
                        {isActive(l.href) && <span className="size-2 rounded-full bg-cyan shadow-[0_0_10px_#00dfff]" />}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>
              <div className="space-y-3 border-t border-cyan/20 p-5">
                <Link href="/booking" className="btn btn-red w-full">
                  <CalendarDays className="size-5" aria-hidden="true" />
                  Book Now
                </Link>
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="btn btn-cyan w-full">
                  <Phone className="size-5" aria-hidden="true" />
                  {phone}
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
