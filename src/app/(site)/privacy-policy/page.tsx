import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getPageContent, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

export default async function PrivacyPage() {
  const [legal, s] = await Promise.all([getPageContent("legal"), getSettings()]);
  return <LegalPage title="Privacy Policy" body={legal.privacy} email={s.email} />;
}
