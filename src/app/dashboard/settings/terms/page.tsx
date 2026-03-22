"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
        <p className="text-gray-600 mb-8">Please review these terms carefully before using our services.</p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 leading-relaxed text-gray-700">
          {[
            { title: "1. Acceptance of Terms", body: "By using our platform, you agree to comply with these Terms and Conditions and all applicable laws. If you do not agree, please stop using the service immediately." },
            { title: "2. Use of Service", body: "You agree to use the platform responsibly. Do not engage in activities that harm or disrupt our services, including distributing harmful content, attempting unauthorized access, or interfering with other users' experiences." },
            { title: "3. User Accounts", body: "You are responsible for safeguarding your account credentials. We may suspend or terminate accounts that violate these Terms or exhibit suspicious activity." },
            { title: "4. Intellectual Property", body: "All materials, branding, and content belong to their respective owners. You may not reproduce, redistribute, or modify any assets without prior written consent." },
            { title: "5. Privacy", body: "We value your privacy. Our data collection and processing follow our Privacy Policy, which you can review at any time." },
            { title: "6. Limitation of Liability", body: "We are not liable for any indirect, incidental, or consequential damages arising from your use or inability to use the platform. Use the service at your own risk." },
            { title: "7. Updates to Terms", body: "We may modify these Terms at any time. Changes take effect immediately when posted. Continued use of the platform after updates indicates acceptance of the revised Terms." },
          ].map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Contact Us</h2>
            <p>
              If you have questions about these Terms, reach out to{" "}
              <a href="mailto:support@dnounce.com" className="text-blue-600 hover:underline">
                support@dnounce.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <Link
            href="/dashboard/settings"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
          >
            I Understand
          </Link>
        </div>
      </div>
    </div>
  );
}
