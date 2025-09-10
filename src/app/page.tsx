"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Upload,
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  User,
} from "lucide-react"

export default function HomePage() {
  const [hasReadTerms, setHasReadTerms] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleTermsScroll = () => {
    if (termsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsRef.current
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10
      if (isScrolledToBottom && !hasReadTerms) {
        setHasReadTerms(true)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="DNounce Logo"
                width={96}
                height={96}
                className="rounded-md"
                priority
              />
              <span className="text-4xl font-bold text-gray-900">DNounce</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <span className="text-gray-400 text-sm cursor-not-allowed">Search</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">How It Works</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">Voting</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">Guidelines</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">Legal</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">About</span>
            </nav>
            <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push('/login')} // Add this onClick handler
            >
              Login / Sign Up
            </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Evidence-Based Individual
            <br />
            Accountability
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            DNounce is a verified public accountability platform that exposes misconduct by individuals and small groups
            through community-driven investigation and AI-verified evidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              onClick={() => {
                const searchSection = document.getElementById("search-section")
                searchSection?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Search Defendants
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
              onClick={() => {
                const submitSection = document.getElementById("submit-case-section")
                submitSection?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Submit a Case
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>AI-Verified Evidence</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>72-Hour Verification Period</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Community Voting</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span>Defendant Response Portal</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How DNounce Works</h2>
            <p className="text-gray-600">
              A transparent, fair process that protects both plaintiffs and defendants while ensuring accountability
            </p>
          </div>

          <div className="border border-blue-300 rounded-lg p-6 mb-8 bg-blue-50">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-blue-700">1. Case Submission:</span>
                <span className="text-blue-600">User submits evidence of misconduct through our secure platform</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-blue-700">2. AI Verification (Up to 72 hours):</span>
                <span className="text-blue-600">AI analyzes evidence authenticity and classifies case</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-blue-700">3. Notification:</span>
                <div className="text-blue-600">
                  <div>Both parties notified immediately after AI verification is completed</div>
                  <div className="ml-4">• Plaintiff: Learns whether AI classified case as evidence-based or opinion-based</div>
                  <div className="ml-4">• Defendant: Receives case details, classification, and right to challenge</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-blue-700">4. Publication:</span>
                <span className="text-blue-600">Case published after verification. Remains public unless defendant requests deletion and joins debate</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-blue-700">5. Defendant Response & Debate:</span>
                <span className="text-blue-600">If deletion requested, both parties engage in 72-hour debate with evidence submission</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-blue-700">6. Community Voting:</span>
                <span className="text-blue-600">Community decides whether to grant deletion request based on evidence presented</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="search-section" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Search Defendants</h2>
            <p className="text-gray-600">Find accountability records and case information</p>
          </div>

          <Card className="p-6 bg-white">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <Input placeholder="Enter defendant name..." className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <Input placeholder="City or neighborhood..." className="w-full" />
                <p className="text-xs text-gray-500 mt-1">
                  Type city name to see neighborhoods, or neighborhood to see full location
                </p>
              </div>
            </div>
            <div className="text-center">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8" disabled>
                <Search className="mr-2 h-4 w-4" />
                Search Defendants
              </Button>
            </div>
          </Card>

          <div className="mt-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">EXAMPLE ONLY - NOT REAL DATA</p>
                  <p className="text-sm text-yellow-700">
                    This is a demonstration of how defendant profiles appear on DNounce
                  </p>
                </div>
              </div>
            </div>

            <Card className="p-6 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">John Example</h3>
                      <p className="text-sm text-gray-600">Software Manager at TechCorp Inc.</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <span>📍</span> San Francisco, CA
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-red-600">3.2</span>
                      </div>
                      <div className="text-xs text-gray-500 text-center mt-1">
                        DNounce Score
                        <br />
                        Based on 8 cases
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Case Breakdown</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">8</div>
                        <div className="text-sm text-gray-500">Total Cases</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">5</div>
                        <div className="text-sm text-gray-500">Evidence-Based</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">3</div>
                        <div className="text-sm text-gray-500">Opinion-Based</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Cases</h4>
                    <div className="space-y-4">
                      <div className="border-b border-gray-100 pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Workplace Harassment Documentation</h5>
                          <Badge className="bg-green-100 text-green-800 text-xs">EVIDENCE-BASED</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Verified email exchanges and documented incidents of inappropriate workplace behavior...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📅 Dec 15, 2024</span>
                          <span>💬 24 comments</span>
                          <span>✅ AI Verified</span>
                        </div>
                        <Button
                          variant="link"
                          className="text-gray-400 p-0 h-auto text-sm mt-2 cursor-not-allowed"
                          disabled
                        >
                          View Case
                        </Button>
                      </div>

                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Management Style Concerns</h5>
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">OPINION-BASED</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Personal account of micromanagement and team communication issues...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📅 Dec 10, 2024</span>
                          <span>💬 12 comments</span>
                          <span>👤 By: Sarah M.</span>
                        </div>
                        <Button
                          variant="link"
                          className="text-gray-400 p-0 h-auto text-sm mt-2 cursor-not-allowed"
                          disabled
                        >
                          View Case
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Community Voting</h2>
            <p className="text-gray-600">Fair and transparent community moderation through public voting</p>
          </div>

          <div className="border border-blue-300 rounded-lg p-6 mb-8 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-700">What Are You Voting On?</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Should this case be deleted?</h4>
              <p className="text-sm text-gray-600">
                The defendant has requested deletion of this published case and participated in the debate process.
                You're deciding whether to grant their deletion request.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-800">KEEP PUBLISHED</h4>
                </div>
                <p className="text-sm text-green-600 mb-3">Deny deletion request - case stays public</p>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Vote KEEP when:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>The evidence appears credible and substantial</li>
                    <li>The accusations deserve public accountability</li>
                    <li>The public has a right to know about this conduct</li>
                    <li>The case could protect others from similar harm</li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-800">GRANT DELETION</h4>
                </div>
                <p className="text-sm text-red-600 mb-3">Approve deletion request - remove case</p>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Vote GRANT DELETION when:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>The evidence is weak, questionable, or insufficient</li>
                    <li>The accusations appear frivolous or vindictive</li>
                    <li>The case violates community standards</li>
                    <li>Keeping it public would cause unjust harm</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-red-300 rounded-lg p-6 mb-8 bg-red-50">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-700">Voter Quality Badge System</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-red-700">5-Downvote Badge of Shame:</span>
                <span className="text-red-600"> Get 5+ downvotes on your explanation → automatic 1-year "</span>
                <span className="text-yellow-600">⚠ Low-Quality Voter</span>
                <span className="text-red-600">" badge</span>
              </div>

              <div>
                <span className="font-semibold text-red-700">33% Voter Trigger + Public Execution:</span>
                <span className="text-red-600"> If 33% of voters flag you + 50% public approval → permanent "</span>
                <span className="text-red-600 font-semibold">CONVICTED Low-Quality Voter</span>
                <span className="text-red-600">" badge</span>
              </div>

              <div className="text-red-600">
                <span className="font-medium">
                  Poor explanations damage your reputation permanently. Write thoughtful, detailed reasoning.
                </span>
              </div>
            </div>
          </div>

          <div className="border border-blue-300 rounded-lg p-6 mb-8 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-700">How Cases Enter Voting</h3>
            </div>

            <div className="text-sm text-blue-600">
              <p>
                Cases only proceed to community voting when a defendant requests deletion after their case has been published. 
                The voting process is triggered when a defendant exercises their right to challenge a published case, 
                participates in the 72-hour debate period to present counter-evidence.
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Community Standards</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Focus on behavior and conduct, not personal attacks</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Constructive discussion and fact-based commentary</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Respect defendant's right to response</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>No harassment, doxxing, or vigilante actions</span>
              </li>
            </ul>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900">Your Responsibility as a Voter</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-700">Voting Transparency</h4>
                </div>
                <p className="text-sm text-blue-600">
                  People can see how you voted, but you remain anonymous. However, your vote decision and explanation are always visible to maintain accountability.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  <h4 className="font-medium text-purple-700">Explain Your Decision (Effectively Required)</h4>
                </div>
                <p className="text-sm text-purple-600">
                  While technically optional, quality explanations are essential to avoid community downvotes. Poor or
                  missing explanations lead to shame badges that damage your reputation permanently.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">How This System Protects Defendants</h4>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-700 mb-2">Right to Respond</h5>
                  <p className="text-sm text-blue-600">
                    Defendants get 72 hours of debate to publicly defend themselves before voting begins. They can present
                    counter-evidence and challenge accusations directly.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-700 mb-2">Evidence-Only Cases</h5>
                  <p className="text-sm text-green-600">
                    No rumors or hearsay allowed. Cases require verifiable evidence, protecting defendants from baseless
                    accusations.
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h5 className="font-medium text-purple-700 mb-2">Community Filter</h5>
                  <p className="text-sm text-purple-600">
                    The community can vote to drop weak cases. Frivolous or vindictive accusations get filtered out by
                    public scrutiny.
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h5 className="font-medium text-orange-700 mb-2">Transparent Process</h5>
                  <p className="text-sm text-orange-600">
                    All votes and reasoning are public though anonymous.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Important:</span> The voting system is designed to be a check against weak
                accusations, not a guilt verdict. Defendants have multiple layers of protection including notification
                rights, response time, evidence requirements, and community oversight.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">The Impact of Your Vote</h3>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-3">You're helping to:</h4>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• Determine what information deserves public accountability</li>
                <li>• Protect people from false or malicious accusations</li>
                <li>• Ensure evidence-based truth rises above rumors</li>
                <li>• Build a community standard for what constitutes credible accusations</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Remember:</span> You're not deciding guilt or innocence - you're deciding
                whether this case deserves to remain in the public record.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Card className="p-8 mt-16" id="submit-case-section">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Submit a Case</h2>
          <p className="text-lg text-gray-600 mb-6">Report misconduct with evidence-based accountability</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Demonstration Only</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              This form shows what the case submission process looks like. You must be logged in to submit an actual
              case.
            </p>
          </div>
        </div>

        <form className="space-y-8">
          {/* Defendant Information */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Defendant Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input placeholder="" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Middle Initial</label>
                <Input placeholder="" className="w-full max-w-20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <Input placeholder="" className="w-full" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Info <span className="text-red-500">*</span>
                </label>
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <Input type="email" placeholder="" className="w-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 font-medium">or</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Contact Mobile Phone</label>
                      <Input type="tel" placeholder="" className="w-full" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  At least one contact method is required for defendant notification
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization/Company</label>
                <Input placeholder="" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship Type <span className="text-red-500">*</span>
                </label>
                <Select
                  onValueChange={(value) => {
                    const otherField = document.getElementById("other-relationship")
                    if (otherField) {
                      otherField.style.display = value === "other" ? "block" : "none"
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div id="other-relationship" style={{ display: "none" }} className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify relationship <span className="text-red-500">*</span>
                  </label>
                  <Input placeholder="Describe your relationship to the defendant" className="w-full" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (City) <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <Input placeholder="Enter primary location (e.e., Flushing, Queens, New York)" className="w-full" />
                <div className="flex items-start gap-2">
                  <Input placeholder="Add additional location identifier (optional)" className="w-full" />
                  <Button type="button" variant="outline" size="sm" className="whitespace-nowrap bg-transparent">
                    + Add More
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Add multiple location identifiers to help people find this case. For example: "Flushing" + "Queens" +
                "New York" or "Downtown" + "Manhattan" + "NYC"
              </p>
            </div>
          </div>

          {/* Case Details */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Case Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md resize-none"
                placeholder="Provide a clear summary of the misconduct..."
              />
            </div>
          </div>

          {/* Evidence Upload */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Evidence Upload</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-700 mb-2">Upload Evidence Files</h4>
              <p className="text-gray-500 mb-2">Drag and drop files or click to browse</p>
              <p className="text-sm text-gray-400">Supported: Images, PDFs, Audio, Video, Documents</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Evidence Quality Notice:</h4>
              <p className="text-sm text-gray-700">
                High-quality evidence (verified documents, communications, recordings) will be classified as
                "Evidence-Based" and may qualify for anonymous submission. Personal accounts without supporting
                documentation will be classified as "Opinion-Based" and require identification.
              </p>
            </div>
          </div>

          {/* Legal Acknowledgment Required */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-xl font-semibold text-red-800">Legal Acknowledgment Required</h3>
              <p className="text-red-700 mt-2">
                Please read and acknowledge these important legal notices before using DNounce
              </p>
            </div>

            {/* Scrollable Terms Container */}
            <div
              ref={termsRef}
              onScroll={handleTermsScroll}
              className="bg-white border border-red-200 rounded-lg p-6 max-h-96 overflow-y-auto mb-6"
            >
              <div className="space-y-6">
                {/* Legal Certification */}
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">Legal Certification</h4>
                  <p className="text-sm text-red-700 mb-2">I certify under penalty of perjury that:</p>
                  <ul className="space-y-1 text-sm text-red-700 ml-4">
                    <li>• All information provided is true and accurate to the best of my knowledge</li>
                    <li>• I have not exaggerated, omitted key facts, or made deliberate misrepresentations</li>
                    <li>• I understand that false accusations may result in legal action against me</li>
                    <li>• I have reviewed and agree to DNounce's Terms of Service and Content Policy</li>
                  </ul>
                </div>

                {/* Legal Consequences Warning */}
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">Legal Consequences Warning</h4>
                  <p className="text-sm text-red-700 mb-2">
                    I understand that false accusations may result in legal action for:
                  </p>
                  <ul className="space-y-1 text-sm text-red-700 ml-4">
                    <li>
                      • <strong>Defamation/Libel:</strong> Publishing false statements that damage reputation
                    </li>
                    <li>
                      • <strong>False Light Invasion of Privacy:</strong> Publicly portraying someone in a misleading way
                    </li>
                    <li>
                      • <strong>Intentional Infliction of Emotional Distress:</strong> Extreme and outrageous conduct
                      causing severe emotional harm
                    </li>
                    <li>
                      • <strong>Civil Harassment:</strong> Creating a credible threat to someone's safety or peace
                    </li>
                  </ul>
                </div>

                {/* Platform Rules */}
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">Platform Rules</h4>
                  <p className="text-sm text-red-700 mb-2">I understand and agree that:</p>
                  <ul className="space-y-1 text-sm text-red-700 ml-4">
                    <li>• DNounce is not responsible for the content I submit or its legal consequences</li>
                    <li>• I must have verifiable evidence for all claims made</li>
                    <li>• I will not submit rumors, hearsay, or unverified information</li>
                    <li>• The defendant will be notified and given opportunity to respond</li>
                    <li>• Cases may be removed if they violate platform policies or laws</li>
                  </ul>
                </div>

                {/* Privacy Notice */}
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">Privacy Notice</h4>
                  <p className="text-sm text-red-700 mb-2">
                    I understand that my information may be disclosed to:
                  </p>
                  <ul className="space-y-1 text-sm text-red-700 ml-4">
                    <li>• The defendant and their legal representatives</li>
                    <li>• Law enforcement or government agencies if required by law</li>
                    <li>• Third parties in response to valid legal process (subpoenas, court orders)</li>
                    <li>• The public if my case is published and I choose non-anonymous submission</li>
                  </ul>
                </div>

                {/* Jurisdiction Notice */}
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">Jurisdiction Notice</h4>
                  <p className="text-sm text-red-700">
                    I understand that legal disputes may be subject to the laws of the jurisdiction where the defendant
                    resides or where the alleged misconduct occurred, and that DNounce may be required to comply with
                    legal requests from various jurisdictions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={!hasReadTerms}
                className="h-4 w-4 text-red-600 border-red-300 rounded focus:ring-red-500"
              />
              <label htmlFor="agree-terms" className="text-sm font-medium text-red-700">
                I have read and understand these legal notices and accept full responsibility for my submission
              </label>
            </div>
            {!hasReadTerms && (
              <p className="text-xs text-red-600 mt-2">
                Please scroll through all legal notices to enable the agreement checkbox
              </p>
            )}
          </div>

          <div className="text-center">
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
              disabled={!agreedToTerms}
            >
              <Upload className="mr-2 h-5 w-5" />
              Submit Case for Review
            </Button>
          </div>
        </form>
      </Card>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">DNounce</h3>
              <p className="text-gray-400 text-sm">
                Evidence-based accountability through community-driven investigation and AI verification.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>How It Works</li>
                <li>Search Cases</li>
                <li>Submit Case</li>
                <li>Voting</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
                <li>Content Policy</li>
                <li>Legal FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Help Center</li>
                <li>Contact Support</li>
                <li>Community Guidelines</li>
                <li>Report Abuse</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">© 2024 DNounce. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}