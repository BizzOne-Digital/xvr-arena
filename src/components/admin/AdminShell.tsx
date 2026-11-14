"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileSignature,
  FileText,
  Gamepad2,
  HelpCircle,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Star,
  Tag,
  UserCog,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { AdminProvider, roleAtLeast } from "./AdminContext";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "staff" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, role: "staff" },
  { href: "/admin/availability", label: "Availability", icon: CalendarClock, role: "staff" },
  { href: "/admin/waivers", label: "Waivers", icon: FileSignature, role: "staff" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, role: "manager" },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox, role: "staff" },
  { href: "/admin/games", label: "Games", icon: Gamepad2, role: "staff" },
  { href: "/admin/experiences", label: "Experiences", icon: Sparkles, role: "manager" },
  { href: "/admin/pricing", label: "Pricing", icon: Tag, role: "manager" },
  { href: "/admin/promotions", label: "Promotions", icon: BadgePercent, role: "manager" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, role: "staff" },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle, role: "staff" },
  { href: "/admin/gallery", label: "Gallery", icon: Images, role: "staff" },
  { href: "/admin/pages", label: "Page Content", icon: FileText, role: "manager" },
  { href: "/admin/settings", label: "Settings", icon: Settings, role: "manager" },
  { href: "/admin/users", label: "Team Accounts", icon: UserCog, role: "owner" },
] as const;

export function AdminShell({
  admin,
  children,
}: {
  admin: { csrfToken: string; role: "owner" | "manager" | "staff"; name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {NAV.filter((n) => roleAtLeast(admin.role, n.role)).map(({ href, label, icon: Ico }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-cyan/12 text-cyan shadow-[inset_3px_0_0_#00dfff]" : "text-muted hover:bg-white/5 hover:text-ink",
                )}
              >
                <Ico className="size-[18px]" aria-hidden="true" /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const footer = (
    <div className="border-t border-cyan/15 p-4">
      <p className="truncate text-sm font-semibold">{admin.name}</p>
      <p className="truncate text-xs text-muted">
        {admin.email} · <span className="capitalize">{admin.role}</span>
      </p>
      <div className="mt-3 flex gap-2">
        <Link href="/" target="_blank" className="btn btn-ghost btn-sm flex-1 px-2 text-xs">
          <ExternalLink className="size-4" aria-hidden="true" /> Site
        </Link>
        <button type="button" onClick={logout} className="btn btn-ghost btn-sm flex-1 px-2 text-xs">
          <LogOut className="size-4" aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <AdminProvider value={admin}>
      <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-cyan/15 bg-bg-2/70 lg:flex">
          <div className="px-5 py-5">
            <Link href="/admin/dashboard">
              <Logo compact />
            </Link>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Admin Portal</p>
          </div>
          {nav}
          {footer}
        </aside>

        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-cyan/15 bg-bg/90 px-4 backdrop-blur lg:hidden">
          <Logo compact />
          <button type="button" className="grid size-11 place-items-center rounded-lg border border-cyan/30 text-cyan" aria-label="Open admin menu" onClick={() => setOpen(true)}>
            <Menu className="size-6" />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-cyan/20 bg-bg-2">
              <div className="flex items-center justify-between p-4">
                <Logo compact />
                <button type="button" aria-label="Close menu" className="grid size-10 place-items-center text-cyan" onClick={() => setOpen(false)}>
                  <X className="size-6" />
                </button>
              </div>
              {nav}
              {footer}
            </div>
          </div>
        )}

        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </AdminProvider>
  );
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-cyan/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
