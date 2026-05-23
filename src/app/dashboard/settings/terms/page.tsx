"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
        <p className="text-gray-600 mb-8">Please review these terms carefully before using our services. Last updated: May 2026.</p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 leading-relaxed text-gray-700">
          {[
            {
              title: "1. Acceptance of Terms",
              body: "By using DNounce, you agree to comply with these Terms and Conditions and all applicable laws. By submitting a record, you further acknowledge that DNounce's AI classification system is a structural tool only — it does not represent DNounce's opinion, endorsement, or verification of any submitted content. If you do not agree to these terms, please stop using the service immediately."
            },
            {
              title: "2. Use of Service",
              body: "You agree to use the platform responsibly and truthfully. You may not submit fabricated, malicious, or defamatory content. You may not use the platform to harass, intimidate, or retaliate against any individual. You may not attempt unauthorized access to the platform or interfere with other users' experiences. Submitting a false record that causes harm to another person exposes you — not DNounce — to legal liability. DNounce is a neutral platform and bears no responsibility for the accuracy of user submissions."
            },
            {
              title: "3. User Accounts",
              body: "You are responsible for safeguarding your account credentials. We may suspend or terminate accounts that violate these Terms, submit knowingly false records, or exhibit abusive behavior toward subjects or other community members."
            },
            {
              title: "4. Intellectual Property",
              body: "All materials, branding, and content belong to their respective owners. You may not reproduce, redistribute, or modify any assets without prior written consent. You retain ownership of content you submit, and grant DNounce a license to display and distribute it on the platform."
            },
            {
              title: "5. Privacy & Anonymous Submissions",
              body: "We value your privacy. Our data collection and processing follow our Privacy Policy. For Anonymity Granted records submitted anonymously, DNounce applies a zero-knowledge architecture: your identity is converted into a one-way cryptographic hash at the time of submission, and the original identity is not stored. This process is irreversible. DNounce cannot recover or produce the identity of an anonymous Anonymity Granted contributor — not by policy choice, but by technical design."
            },
            {
              title: "6. AI Classification",
              body: "DNounce uses an automated system to evaluate submitted records and determine anonymity eligibility. Records are assigned either Anonymity Granted or Anonymity Not Granted. This classification is a structural analysis of language patterns only. It is not a determination of truth, accuracy, or credibility. It does not constitute DNounce taking a position on any record. All verdicts are determined solely by community vote. DNounce is not the publisher, editor, or endorser of any record on the platform."
            },
            {
              title: "7. Contributor Identity & Display Rules",
              body: "DNounce uses a contributor identity preference system. The following rules apply: Anonymity Granted records show your real name if you chose to display it, or an alias if you chose anonymity. Anonymity Not Granted records always show your real name regardless of preference. Records with an unclear classification always show an alias. If you explicitly chose to display your name, your real name is always shown. These rules exist to maintain community accountability while protecting contributors who come forward with documented evidence."
            },
            {
              title: "8. Limitation of Liability",
              body: "DNounce is protected under Section 230 of the Communications Decency Act (47 U.S.C. § 230) as a neutral platform. We are not liable for the content of user submissions, the outcome of community votes, or any damages arising from records posted on the platform. Community verdicts are user-generated decisions — not editorial decisions by DNounce. We are not liable for any indirect, incidental, or consequential damages arising from your use or inability to use the platform."
            },
            {
              title: "9. Legal Requests & Law Enforcement",
              body: "DNounce will comply with valid legal requests for user data to the extent required by law. We will notify affected users when legally permitted. For anonymous Anonymity Granted submissions, there is no identity data to produce — the architecture ensures this is a technical fact, not a policy choice. Any attempt to use legal process to silence contributors or suppress records rather than seek genuine redress will be treated as a potential SLAPP (Strategic Lawsuit Against Public Participation), and DNounce reserves the right to oppose such actions vigorously."
            },
            {
              title: "10. Updates to Terms",
              body: "We may modify these Terms at any time as the platform grows. We will notify you of major changes. Continued use of DNounce after updates indicates acceptance of the revised Terms."
            },
          ].map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Contact Us</h2>
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