import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Metadata for SEO, Open Graph & PWA
export const metadata: Metadata = {
  metadataBase: new URL("https://www.dnounce.com"),
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  title: {
    default: "DNounce | Community-Moderated Reviews for Real Experiences",
    template: "%s | DNounce",
  },

  description:
    "DNounce is a review platform where real experiences are shared, subjects are notified, and the community helps verify what's fair. Reviews that tell the whole story.",

  keywords: [
    "review platform",
    "community reviews",
    "reputation records",
    "verified reviews",
    "experience sharing",
    "community moderated",
    "individual reviews",
    "trust and transparency",
  ],

  authors: [{ name: "DNounce", url: "https://www.dnounce.com" }],

  creator: "DNounce",
  publisher: "DNounce",

  alternates: {
    canonical: "https://www.dnounce.com",
  },

  openGraph: {
    type: "website",
    url: "https://www.dnounce.com",
    siteName: "DNounce",
    title: "DNounce | Reviews that tell the whole story.",
    description:
      "A review platform where experiences are shared, subjects are notified, and the community helps verify what's fair.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DNounce — Community-moderated reviews",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@dnounce",
    creator: "@dnounce",
    title: "DNounce | Reviews that tell the whole story.",
    description:
      "A review platform where experiences are shared, subjects are notified, and the community helps verify what's fair.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* ✅ Universal mobile web app support */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* ✅ iOS-specific support */}
        <link rel="apple-touch-icon" href="/icons/logoicon-180x180.png" />
        <meta name="apple-mobile-web-app-title" content="DNounce" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          {children}
          <ServiceWorkerRegister />
          <Toaster />
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}