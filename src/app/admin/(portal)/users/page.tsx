import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { UsersManager } from "@/components/admin/UsersManager";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Team Accounts" };

export default async function Page() {
  await requireAdminPage("owner");
  return (
    <>
      <AdminPageHeader title="Team Accounts" description="Give each team member their own login. Deactivating an account or resetting its password signs it out everywhere." />
      <UsersManager />
    </>
  );
}
