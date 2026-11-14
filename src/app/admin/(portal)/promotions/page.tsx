import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { RESOURCES } from "@/lib/admin/resource-config";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: RESOURCES["promotions"].title };

export default async function Page() {
  await requireAdminPage("manager");
  const def = RESOURCES["promotions"];
  return (
    <>
      <AdminPageHeader title={def.title} description={def.description} />
      <ResourceManager resource="promotions" />
    </>
  );
}
