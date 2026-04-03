import Link from "next/link";
import { Shield, FileText, Eye, Scale } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal | DNounce",
  description: "Terms of Service, Privacy Policy, and Legal Framework for DNounce.",
};

const sections = [
  { id: "terms", label: "Terms of Service", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: Eye },
  { id: "transparency", label: "Transparency", icon: Shield },
  { id: "framework", label: "Legal Framework", icon: Scale },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to DNounce</Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal</h1>
          <p className="text-gray-500">Last updated: April 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Nav */}
        <div className="flex flex-wrap gap-3 mb-10">
          {sections.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 transition shadow-sm">
              <Icon className="w-4 h-4" />
              {label}
            </a>
          ))}
        </div>

        <div className="space-y-12">

          {/* Terms of Service */}
          <section id="terms" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Terms of Service</h2>
            </div>

            <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Who can use DNounce</h3>
                <p>You must be at least 18 years old to create an account or submit records. By using DNounce, you agree to these terms. If you don't agree, don't use the platform.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What you can submit</h3>
                <p>You can submit records about real experiences you personally had with another person — professional, business, or service-related. Your submission must be truthful to the best of your knowledge. You cannot submit fabricated, malicious, or defamatory content.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">You own your content</h3>
                <p>You keep ownership of what you write. By submitting, you give DNounce a license to display and distribute it on the platform. We don't sell your content to third parties.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What we can do</h3>
                <p>We can remove content that violates these terms, suspend accounts, and cooperate with legal authorities when required. We're not obligated to keep content that causes harm or violates our guidelines.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What we're not responsible for</h3>
                <p>DNounce is a platform — we don't write the records, we host them. We're not responsible for the accuracy of user submissions. We provide tools for community review and dispute resolution, but we can't verify every claim. Use this information as one data point, not a verdict.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Consequences for violations</h3>
                <p>Submitting knowingly false records, harassing subjects, or abusing the platform can result in your account being permanently suspended. We reserve the right to take action without warning for serious violations.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Changes to these terms</h3>
                <p>We may update these terms as the platform grows. We'll let you know about major changes. Continuing to use DNounce after changes means you accept them.</p>
              </div>
            </div>
          </section>

          {/* Privacy Policy */}
          <section id="privacy" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
            </div>

            <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What we collect</h3>
                <p>When you sign up: your name, email, phone number, job title, location, and profile photo. When you submit a record: the content of your submission and any files you upload. When you use the platform: basic usage data like pages visited and actions taken.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Why we collect it</h3>
                <p>To run the platform, verify identities, notify subjects, enable community review, and improve the product. We don't sell your personal data. We don't run ads.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Who sees your information</h3>
                <p>Your public profile information (name, location, job title) is visible to other users. Your email and phone number are never displayed publicly — they're used only for account verification and to notify subjects of new records about them. Submitted records may be public depending on their status.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Third-party services</h3>
                <p>We use Supabase for database storage, Vercel for hosting, and Resend for email delivery. These services have their own privacy policies. We only share what's necessary for the platform to function.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Your rights</h3>
                <p>You can request to delete your account at any time from Settings. When you delete your account, your login and personal details are removed. However, records you submitted may remain on the platform as they involve other parties.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Cookies</h3>
                <p>We use minimal cookies — just enough to keep you logged in and remember your preferences. We don't use advertising or tracking cookies.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
                <p>Privacy questions? Email us at <a href="mailto:support@dnounce.com" className="text-blue-600 hover:underline">support@dnounce.com</a>.</p>
              </div>
            </div>
          </section>

          {/* Transparency */}
          <section id="transparency" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Transparency</h2>
            </div>

            <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How records are classified</h3>
                <p>Every submitted record goes through our language-based classification system. It analyzes the text and labels it as Evidence-Based, Opinion-Based, or Unable to Verify. This is automated — not a human judgment call. The label reflects the nature of the language used, not whether the claim is true or false.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How moderation works</h3>
                <p>Records that are disputed go through a structured process: a 72-hour debate between the contributor and subject, followed by a community vote. Admins can intervene when records violate guidelines. All admin actions are logged internally.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What we don't do</h3>
                <p>We don't editorialize records. We don't rank people based on their reputation score in search results. We don't promote or suppress specific records for commercial reasons. We don't accept payment to remove or alter records.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Law enforcement requests</h3>
                <p>If we receive a valid legal request for user data, we'll comply with it. We'll notify affected users when legally permitted to do so. We don't hand over data voluntarily without a proper legal process.</p>
              </div>
            </div>
          </section>

          {/* Legal Framework */}
          <section id="framework" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Scale className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Legal Framework</h2>
            </div>

            <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Section 230 (CDA)</h3>
                <p>DNounce is protected under Section 230 of the Communications Decency Act (47 U.S.C. § 230). This means we're not legally responsible for content that users submit. We're a platform, not the publisher of that content. Users who submit false or harmful records bear the legal responsibility for what they write.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">For contributors — your protections</h3>
                <p>Truthful statements are generally protected from defamation claims. Honest opinions based on real experiences are typically protected as fair comment. That said, if you knowingly submit false information about someone, you can be held liable. DNounce is not your legal shield — write truthfully.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">For subjects — your rights</h3>
                <p>You have the right to be notified when a record is submitted about you. You have the right to respond, dispute, and request deletion through our process. If a record is provably false and causes harm, you have the right to pursue legal action against the person who submitted it — not against DNounce.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Defamation</h3>
                <p>Defamation is a false statement of fact presented as true that damages someone's reputation. Opinions are generally not defamatory. Evidence-based records with factual support are generally protected. If you believe a record about you is defamatory, consult a lawyer — we can't give you legal advice, but we can provide information about a record through a proper legal process.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Disclaimer</h3>
                <p className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">Nothing on this page is legal advice. We're a platform, not a law firm. If you have a specific legal situation involving a record on DNounce, please consult a licensed attorney in your jurisdiction.</p>
              </div>
            </div>
          </section>

        </div>

        <div className="mt-10 text-center text-sm text-gray-400">
          Questions? Email us at{" "}
          <a href="mailto:support@dnounce.com" className="text-blue-600 hover:underline">support@dnounce.com</a>
        </div>
      </div>
    </div>
  );
}