import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register"; // 👈 client component

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
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8"
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

        {/* ✅ iOS specific PWA support */}
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/logoicon-120x120.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/logoicon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/logoicon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/logoicon-180x180.png" />
        <meta name="apple-mobile-web-app-title" content="DNounce" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ServiceWorkerRegister /> {/* 👈 injects SW registration */}
      </body>
    </html>
  );
}