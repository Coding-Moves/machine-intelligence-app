import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: siteCopy.seo.title,
    template: "%s | " + magazine.name,
  },
  description:
    siteCopy.seo.description,
  applicationName: magazine.name,
  openGraph: {
    type: "website",
    siteName: magazine.name,
    title: siteCopy.seo.title,
    description:
      siteCopy.seo.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteCopy.seo.title,
    description:
      siteCopy.seo.description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable + " antialiased"}>{children}</body>
    </html>
  );
}
