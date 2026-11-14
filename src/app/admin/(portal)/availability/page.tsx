import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { AvailabilityManager } from "@/components/admin/AvailabilityManager";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Availability" };

export default async function Page() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader
        title="Availability"
        description="Operating hours, holiday closures and special hours. Time-slot interval, booking lead time and advance window are in Settings; session length, buffers and capacity are set per experience."
        actions={
          <>
            <Link href="/admin/settings" className="btn btn-ghost btn-sm">
              Booking rules
            </Link>
            <Link href="/admin/experiences" className="btn btn-ghost btn-sm">
              Capacity per experience
            </Link>
          </>
        }
      />
      <AvailabilityManager />
    </>
  );
}
