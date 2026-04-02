import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register"; // 👈 client component
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Metadata for SEO & PWA
export const metadata: Metadata = {
  title: "DNounce",
  description: "Review and Community feedback platform",
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
          <ServiceWorkerRegister /> {/* 👈 injects SW registration */}
          <Toaster /> {/* ✅ mount the toast system globally */}
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}