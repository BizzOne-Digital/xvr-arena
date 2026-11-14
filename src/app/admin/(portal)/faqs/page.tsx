import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { RESOURCES } from "@/lib/admin/resource-config";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: RESOURCES["faqs"].title };

export default async function Page() {
  await requireAdminPage("staff");
  const def = RESOURCES["faqs"];
  return (
    <>
      <AdminPageHeader title={def.title} description={def.description} />
      <ResourceManager resource="faqs" />
    </>
  );
}
