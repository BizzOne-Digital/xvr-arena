import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { BookingsManager } from "@/components/admin/BookingsManager";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Bookings" };

export default async function Page() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader
        title="Bookings"
        description="Search, approve, reschedule or cancel bookings. Cancelling or expiring a booking automatically releases its capacity."
      />
      <Suspense>
        <BookingsManager />
      </Suspense>
    </>
  );
}
