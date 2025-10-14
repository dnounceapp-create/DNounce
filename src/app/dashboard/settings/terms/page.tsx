"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>

        {/* Page Title */}
        <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
        <p className="text-gray-600 mb-8">
          Please review these terms carefully before using our services.
        </p>

        {/* Main Content */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-6 leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By using our platform, you agree to comply with these Terms and Conditions and all
              applicable laws. If you do not agree, please stop using the service immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Use of Service</h2>
            <p>
              You agree to use the platform responsibly. Do not engage in activities that harm or
              disrupt our services, including distributing harmful content, attempting unauthorized
              access, or interfering with other users’ experiences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. User Accounts</h2>
            <p>
              You are responsible for safeguarding your account credentials. We may suspend or
              terminate accounts that violate these Terms or exhibit suspicious activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Intellectual Property</h2>
            <p>
              All materials, branding, and content belong to their respective owners. You may not
              reproduce, redistribute, or modify any assets without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Privacy</h2>
            <p>
              We value your privacy. Our data collection and processing follow our Privacy Policy,
              which you can review at any time to understand how we manage your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>
              We are not liable for any indirect, incidental, or consequential damages arising from
              your use or inability to use the platform. Use the service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Updates to Terms</h2>
            <p>
              We may modify these Terms at any time. Changes take effect immediately when posted.
              Continued use of the platform after updates indicates acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Contact Us</h2>
            <p>
              If you have questions about these Terms, reach out to{" "}
              <a
                href="mailto:support@dnounce.com"
                className="text-blue-600 hover:underline"
              >
                support@dnounce.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Action Button */}
        <div className="mt-10 flex justify-end">
          <button
            onClick={() => alert("Thanks for reviewing our Terms!")}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
