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
          <p className="text-gray-500">Last updated: May 2026</p>
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
                <p>You can submit records about real experiences you personally had with another person — professional, business, or service-related. Your submission must be truthful to the best of your knowledge. You cannot submit fabricated, malicious, or defamatory content. By submitting a record, you acknowledge that you are solely responsible for the accuracy and legality of your submission. DNounce is not the author, editor, or endorser of any record.</p>
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
                <p>DNounce is a platform — we don't write the records, we host them. We are not responsible for the accuracy, truthfulness, or legality of user submissions. We provide tools for community review and dispute resolution, but we do not verify claims. All verdicts are determined solely by community vote — not by DNounce. Use information on this platform as one data point, not a definitive verdict.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Classification</h3>
                <p>DNounce uses an automated system to determine anonymity eligibility for submitted records. Submissions are evaluated and assigned either Anonymity Granted or Anonymity Not Granted. This classification is a structural analysis of language patterns only — it is not a determination of truth, accuracy, or credibility. A classification of "Anonymity Granted" means the submission contains structured documentation language. It does not mean DNounce has reviewed, verified, or endorsed the content. DNounce takes no editorial position on any record. By submitting a record, you acknowledge that the AI classification is a neutral structural tool and does not represent DNounce's opinion.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contributor Identity & Anonymity</h3>
                <p>DNounce supports a contributor identity preference system that determines how your name appears on records you submit. The display rules are as follows: if a record is classified as Anonymity Granted and you choose to display your name, your real name is shown. If a record is classified as Anonymity Granted and you choose to remain anonymous, your identity is structurally severed from the record using a one-way cryptographic process — your real identity is not stored and cannot be recovered, even by DNounce. If a record is classified as Anonymity Not Granted, your real name is always shown regardless of preference. If a record classification is unclear, an alias is shown regardless of preference. If you explicitly choose to display your name, your real name is always shown.</p>
                <p className="mt-2">The anonymous submission architecture exists to protect the integrity of the community review process, not to shield any individual from accountability. Anonymous records go through the same community scrutiny, debate, and voting process as named records. DNounce does not selectively protect contributors — the system is structurally incapable of revealing the identity of anonymous Anonymity Granted contributors because that identity is never stored.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Consequences for violations</h3>
                <p>Submitting knowingly false records, harassing subjects, or abusing the platform can result in your account being permanently suspended. If you submit a false record that causes harm, you — not DNounce — bear the legal liability. We reserve the right to take action without warning for serious violations.</p>
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
                <h3 className="font-semibold text-gray-900 mb-2">Anonymous submissions & zero-knowledge architecture</h3>
                <p>For Anonymity Granted records where a contributor chooses to remain anonymous, DNounce applies a zero-knowledge data architecture. Your user identity is converted into a one-way cryptographic hash before the record is stored. The original identity is not retained in the database. This process is irreversible — DNounce cannot reconstruct your identity from the hash, and no third party can compel us to produce data we do not have. Additionally, any files uploaded as part of an anonymous Anonymity Granted submission are processed to remove embedded metadata (including device information, GPS coordinates, and creation timestamps) before storage.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Third-party services</h3>
                <p>We use Supabase for database storage, Vercel for hosting, and Resend for email delivery. These services have their own privacy policies. We only share what's necessary for the platform to function. Note that third-party infrastructure providers may retain server-level logs (such as IP addresses and request timestamps) subject to their own data retention policies, which are outside DNounce's control.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Your rights</h3>
                <p>You can request to delete your account at any time from Settings. When you delete your account, your login and personal details are removed. However, records you submitted may remain on the platform as they involve other parties. For anonymous Anonymity Granted submissions, there is no identity data linked to the record to delete — the severing of identity occurred at the time of submission.</p>
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
                <p>Every submitted record goes through our automated language-based classification system. It analyzes the text and labels it as Anonymity Granted, Anonymity Not Granted, or Anonymity Granted. This is a structural pattern analysis — not a human judgment call, not an editorial decision, and not a determination of whether the claim is true or false. The label reflects the nature of the language used in the submission. DNounce does not take a position on any record through its classification system.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How contributor identity works</h3>
                <p>DNounce uses a contributor identity preference system that determines how a contributor's name appears on their submitted records. The rules are straightforward: Anonymity Not Granted records always show the contributor's real name. Anonymity Granted records show the contributor's real name if they chose to display it, or an alias if they chose anonymity. Records with an unclear classification always show an alias. This system exists to balance community accountability with contributor protection — it is not DNounce taking a side. The community, not DNounce, determines the outcome of every record through a structured vote.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How anonymous evidence submissions work</h3>
                <p>When a contributor submits an Anonymity Granted record anonymously, DNounce's system converts their identity into a one-way cryptographic hash at the moment of submission. The real identity is not stored anywhere in our database. This is not a policy decision that can be overridden — it is a structural property of the system. DNounce is architecturally incapable of identifying an anonymous Anonymity Granted contributor after the record is submitted. This design exists to protect the integrity of the community review process and to ensure that contributors who come forward with documented evidence can do so without fear of retaliation.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How moderation works</h3>
                <p>Records that are disputed go through a structured process: a debate period between the contributor and subject, followed by a community vote. Admins can intervene when records violate guidelines. All admin actions are logged internally. No record is removed or altered based on commercial interests or pressure from any party.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What we don't do</h3>
                <p>We don't editorialize records. We don't rank people based on their reputation score in search results. We don't promote or suppress specific records for commercial reasons. We don't accept payment to remove or alter records. We don't verify the truth of submitted content — that is the community's role.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Law enforcement requests</h3>
                <p>If we receive a valid legal request for user data, we will comply with it to the extent required by law. We will notify affected users when legally permitted to do so. We do not hand over data voluntarily without proper legal process. For anonymous Anonymity Granted submissions, there is no identity data to produce — the architecture ensures this is not a policy choice but a technical fact.</p>
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
                <h3 className="font-semibold text-gray-900 mb-2">Section 230 (CDA) — Platform Immunity</h3>
                <p>DNounce is protected under Section 230 of the Communications Decency Act (47 U.S.C. § 230). DNounce is a neutral platform — not a publisher, not an editor, and not an endorser of user-submitted content. We did not write the records. We do not verify the records. We do not determine the outcome of records — the community does. Users who submit false or harmful records bear full legal responsibility for what they write. DNounce cannot be held liable for the content of user submissions.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Anti-SLAPP Protection</h3>
                <p>DNounce actively opposes the use of litigation as a tool to silence community accountability. Any attempt to use legal process to unmask anonymous contributors, suppress records, or compel DNounce to act against its platform principles will be treated as a potential Strategic Lawsuit Against Public Participation (SLAPP). DNounce reserves the right to oppose such actions vigorously, including filing motions to quash subpoenas and seeking attorney's fees under applicable anti-SLAPP statutes. If you are attempting to use legal process to silence a contributor rather than seeking genuine redress, be advised that DNounce will not facilitate that effort.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Anonymous contributors cannot be unmasked</h3>
                <p>For Anonymity Granted records submitted anonymously, DNounce does not possess the identity of the contributor. This is not a policy that can be overridden by court order — it is a technical fact. A subpoena compelling DNounce to produce the identity of an anonymous Anonymity Granted contributor cannot be complied with because that data does not exist in our systems. The cryptographic process that severs identity from the record is irreversible. Any party seeking to identify an anonymous contributor through DNounce will not succeed.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">For contributors — your protections</h3>
                <p>Truthful statements are generally protected from defamation claims. Honest opinions based on real experiences are typically protected as fair comment. If you choose to submit anonymously under our Anonymity Granted anonymous architecture, your identity is structurally protected at the data level. That said, DNounce is not your legal shield — if you submit false information, you bear that liability. Write truthfully.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">For subjects — your rights</h3>
                <p>You have the right to be notified when a record is submitted about you. You have the right to respond, dispute, and request deletion through our structured process. If a record is provably false and causes harm, your legal remedy is against the person who submitted it — not against DNounce. DNounce is immune from defamation liability for user-submitted content under Section 230. If you believe a record is false, use our dispute process. The community will decide.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Defamation</h3>
                <p>Defamation is a false statement of fact presented as true that damages someone's reputation. Opinions are generally not defamatory. Records with Anonymity Granted status and factual support are generally protected. DNounce's AI classification of a record as "Anonymity Granted" is not a legal determination and does not constitute DNounce endorsing the record's truth. If you believe a record about you is defamatory, consult a lawyer — we cannot give legal advice, but we can provide information about a record through proper legal process.</p>
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