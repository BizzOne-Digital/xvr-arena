import type { Metadata, Viewport } from "next";
import { Inter, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani", display: "swap" });
const orbitron = Orbitron({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-orbitron-face", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "XVR – Free-Roaming VR Arena in Winnipeg, Manitoba",
    template: "%s | XVR Free-Roaming VR Arena",
  },
  description:
    "Manitoba's largest free-roaming virtual reality arena. Wireless VR & Mixed Reality games, 360° motion simulator, VR treadmill, golf simulator and party room in Winnipeg.",
  applicationName: "XVR",
  openGraph: {
    type: "website",
    siteName: "XVR – Free-Roaming VR Arena",
    locale: "en_CA",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#03070D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${rajdhani.variable} ${orbitron.variable}`}>
      <body className="min-h-dvh bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
