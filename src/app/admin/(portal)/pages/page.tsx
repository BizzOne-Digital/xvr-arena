import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { PagesEditor } from "@/components/admin/PagesEditor";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Page Content" };

export default async function Page() {
  await requireAdminPage("manager");
  return (
    <>
      <AdminPageHeader
        title="Page Content"
        description="Edit headlines, descriptions and hero images. Experiences, FAQs, offers, gallery and contact details have their own sections."
        actions={
          <>
            <Link href="/admin/experiences" className="btn btn-ghost btn-sm">
              Service descriptions
            </Link>
            <Link href="/admin/promotions" className="btn btn-ghost btn-sm">
              Promotional banners
            </Link>
          </>
        }
      />
      <PagesEditor />
    </>
  );
}
