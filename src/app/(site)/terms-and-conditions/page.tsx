import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getPageContent, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms-and-conditions" } };

export default async function TermsPage() {
  const [legal, s] = await Promise.all([getPageContent("legal"), getSettings()]);
  return <LegalPage title="Terms & Conditions" body={legal.terms} email={s.email} />;
}
