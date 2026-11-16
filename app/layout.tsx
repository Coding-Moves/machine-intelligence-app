import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
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
    default: "Machine Intelligence | NFC IET Multan",
    template: "%s | Machine Intelligence",
  },
  description:
    "AI news and research, carefully reviewed by student editors at NFC IET Multan.",
  applicationName: "Machine Intelligence",
  openGraph: {
    type: "website",
    siteName: "Machine Intelligence",
    title: "Machine Intelligence | NFC IET Multan",
    description:
      "AI news and research, carefully reviewed by student editors at NFC IET Multan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Machine Intelligence | NFC IET Multan",
    description:
      "AI news and research, carefully reviewed by student editors at NFC IET Multan.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable + " antialiased"}>{children}</body>
    </html>
  );
}
