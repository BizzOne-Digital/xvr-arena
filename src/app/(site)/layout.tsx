import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { getSettings, getWeeklyHours } from "@/lib/data";
import { siteUrl } from "@/lib/utils";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, hours] = await Promise.all([getSettings(), getWeeklyHours()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AmusementPark",
    "@id": `${siteUrl()}/#business`,
    name: settings.businessName,
    url: siteUrl(),
    telephone: settings.phone,
    email: settings.email,
    description: "Manitoba's largest free-roaming virtual reality arena in Winnipeg.",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.addressLine1,
      addressLocality: settings.city,
      addressRegion: "MB",
      postalCode: settings.postalCode || undefined,
      addressCountry: "CA",
    },
    ...(settings.hoursConfirmed && {
      openingHoursSpecification: hours
        .filter((h) => h.open)
        .map((h) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.day],
          opens: h.openTime,
          closes: h.closeTime,
        })),
    }),
  };
  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded-md bg-cyan px-4 py-2 font-semibold text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <SmoothScroll />
      <ScrollProgress />
      <Header logoUrl={settings.logoUrl || undefined} phone={settings.phone} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={settings} hours={hours} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
