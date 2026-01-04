"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* --------------------------------------------------------- */}
      {/*                 TOP NAV — EXACT DNOUNCE CLONE             */}
      {/* --------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div
              className="flex items-center gap-2 sm:gap-4 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <Image
                src="/logo.png"
                alt="DNounce Logo"
                width={90}
                height={90}
                priority
              />
              <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                DNounce
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex flex-1 justify-center gap-12">
              <button
                onClick={() =>
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
              >
                How DNounce Works
              </button>

              <button
                onClick={() =>
                  document.getElementById("voting-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
              >
                Community Review
              </button>

              <button
                onClick={() =>
                  document.getElementById("guidelines-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
              >
                Guidelines
              </button>

              <button
                onClick={() =>
                  document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
              >
                Legal
              </button>
            </nav>

            {/* Login + Mobile Menu */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push("/loginsignup")}
              >
                Login / Sign Up
              </Button>

              {/* Mobile Hamburger */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col p-4 gap-4 text-sm">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-left"
              >
                How DNounce Works
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("voting-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-left"
              >
                Community Review
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("guidelines-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-left"
              >
                Guidelines
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-gray-700 font-medium hover:text-red-700 transition-colors text-left"
              >
                Legal
              </button>

              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                onClick={() => router.push("/loginsignup")}
              >
                Login / Sign Up
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
