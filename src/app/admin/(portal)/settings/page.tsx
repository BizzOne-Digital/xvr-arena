import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  await requireAdminPage("manager");
  return (
    <>
      <AdminPageHeader title="Business Settings" description="Contact details, branding, booking rules, cancellation policy and notification recipients." />
      <SettingsForm />
    </>
  );
}
