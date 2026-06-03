import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

// Update this when you move to a bought domain (controls absolute OG image URLs).
const SITE_URL = "https://bettingapp-beta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Prime Picks — Bet smarter, not harder",
  description: "Upload your PrizePicks or Underdog picks and get an instant, easy-to-read grade: which bets are worth it, which to skip, and why.",
  manifest: "/manifest.json",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Prime Picks" },
  openGraph: {
    type: "website",
    siteName: "Prime Picks",
    title: "Prime Picks — Bet smarter, not harder",
    description: "Upload your picks and get an instant, easy-to-read grade: which to bet, which to skip, and why.",
    images: [{ url: "/logo-full.png", width: 1254, height: 1254, alt: "Prime Picks" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prime Picks — Bet smarter, not harder",
    description: "Upload your picks and get an instant, easy-to-read grade.",
    images: ["/logo-full.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
