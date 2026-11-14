import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Inquiries" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdminPage("staff");
  const { tab } = await searchParams;
  const active = tab === "contact" ? "contact-inquiries" : "event-inquiries";
  return (
    <>
      <AdminPageHeader title="Inquiries" description="Event inquiries (birthdays, corporate, private groups) and contact form messages. Update the status as you follow up." />
      <div className="mb-5 flex gap-2" role="tablist">
        <a role="tab" aria-selected={active === "event-inquiries"} href="?tab=events" className={`btn btn-sm ${active === "event-inquiries" ? "btn-cyan" : "btn-ghost"}`}>Event inquiries</a>
        <a role="tab" aria-selected={active === "contact-inquiries"} href="?tab=contact" className={`btn btn-sm ${active === "contact-inquiries" ? "btn-cyan" : "btn-ghost"}`}>Contact messages</a>
      </div>
      <ResourceManager key={active} resource={active} />
    </>
  );
}
