"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Check, Lock, Zap, Star, AlertTriangle, CheckCircle2, XCircle, X } from "lucide-react";
import Link from "next/link";

type PlanId = "standard" | "insights" | "pro";

interface PopupState {
  type: "success" | "error" | "warning" | null;
  message: string;
  visible: boolean;
}

const PLANS = [
  {
    id: "standard" as PlanId,
    name: "Standard",
    price: 0,
    description: "Basic access to DNounce",
    icon: <Lock className="w-5 h-5" />,
    color: "gray",
    features: [
      "Submit and manage records",
      "Vote on disputes",
      "Full record history",
      "Citizen commenting",
      "No analytics access",
    ],
    locked: ["Analytics dashboard"],
  },
  {
    id: "insights" as PlanId,
    name: "Insights",
    price: 9.99,
    description: "Understand your reputation",
    icon: <Zap className="w-5 h-5" />,
    color: "blue",
    features: [
      "Everything in Standard",
      "Profile view counts",
      "Record impression tracking",
      "Credibility breakdown",
      "Stage timeline analytics",
      "Vote outcome history",
      "Score history chart",
      "Search appearance frequency",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    price: 24.99,
    description: "Know exactly who's engaging with you",
    icon: <Star className="w-5 h-5" />,
    color: "indigo",
    features: [
      "Everything in Insights",
      "Who viewed your profile",
      "Geographic viewer breakdown",
      "Contributor patterns",
      "Voter engagement trends",
      "Dispute resolution stats",
      "Comparison vs similar profiles",
      "Weekly email digest",
    ],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [planId, setPlanId] = useState<PlanId>("standard");
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [popup, setPopup] = useState<PopupState>({ type: null, message: "", visible: false });

  const triggerPopup = (type: "success" | "error" | "warning", message: string) => {
    setPopup({ type, message, visible: true });
    setTimeout(() => setPopup((p) => ({ ...p, visible: false })), 2400);
    setTimeout(() => setPopup({ type: null, message: "", visible: false }), 2800);
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) { router.replace(`/loginsignup?redirectTo=/dashboard/settings/billing`); return; }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .single();

      if (sub) {
        setSubscription(sub);
        setPlanId(sub.plan_id);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const handleUpgrade = async (targetPlan: PlanId) => {
    if (targetPlan === "standard") return;
    setUpgrading(targetPlan);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: targetPlan }),
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      triggerPopup("error", err?.message || "Failed to start checkout.");
    } finally {
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    setUpgrading("pro");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      triggerPopup("error", err?.message || "Failed to open billing portal.");
    } finally {
      setUpgrading(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6 sm:p-6 lg:p-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Billing & Plan</h1>
        <p className="text-gray-600 mb-8">Manage your subscription and unlock analytics features.</p>

        {/* Current plan summary */}
        {subscription && planId !== "standard" && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
                  planId === "pro"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${planId === "pro" ? "bg-indigo-500" : "bg-blue-500"}`} />
                  {planId === "pro" ? "Pro" : "Insights"} — ${planId === "pro" ? "24.99" : "9.99"}/mo
                </span>
              </div>
              {subscription.current_period_end && (
                <p className="text-xs text-gray-400 mt-2">
                  {subscription.status === "canceled" ? "Cancels" : "Renews"} on{" "}
                  {formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>
            <button
              onClick={handleManage}
              disabled={!!upgrading}
              className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm disabled:opacity-50"
            >
              Manage Billing
            </button>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = planId === plan.id;
            const isDowngrade = plan.id === "standard" && planId !== "standard";
            const isUpgradeFromInsights = plan.id === "pro" && planId === "insights";

            return (
              <div
                key={plan.id}
                className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-sm transition-all ${
                  isCurrent
                    ? plan.id === "pro"
                      ? "border-indigo-300 ring-1 ring-indigo-200"
                      : plan.id === "insights"
                      ? "border-blue-300 ring-1 ring-blue-200"
                      : "border-gray-300"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.id === "pro"
                        ? "bg-indigo-50 text-indigo-600"
                        : plan.id === "insights"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {plan.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{plan.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {plan.price === 0 ? (
                      <span className="text-xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-sm text-gray-400">/mo</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.locked?.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                      <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && !isDowngrade && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!upgrading}
                    className={`w-full inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm disabled:opacity-50 ${
                      plan.id === "pro"
                        ? "text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110"
                        : "text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110"
                    }`}
                  >
                    {upgrading === plan.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Redirecting…
                      </span>
                    ) : isUpgradeFromInsights ? (
                      "Upgrade to Pro"
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </button>
                )}

                {isCurrent && plan.id !== "standard" && (
                  <p className="text-center text-xs text-gray-400 pt-1">
                    You&apos;re on this plan.{" "}
                    <button onClick={handleManage} className="underline hover:text-gray-600">
                      Manage
                    </button>
                  </p>
                )}

                {isCurrent && plan.id === "standard" && (
                  <p className="text-center text-xs text-gray-400 pt-1">
                    Upgrade above to unlock analytics.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Payments processed securely by Stripe. Cancel anytime.{" "}
          <Link href="/legal" className="underline hover:text-gray-600">
            Terms apply.
          </Link>
        </p>
      </div>

      {/* Popup */}
      {popup.type && (
        <div className={[
          "fixed top-4 right-4 left-4 sm:left-auto z-[1000]",
          "transition-all duration-300",
          popup.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
        ].join(" ")}>
          <div className="w-full sm:w-[340px] rounded-2xl border bg-white shadow-xl overflow-hidden">
            <div className={`h-1 w-full ${popup.type === "success" ? "bg-green-500" : popup.type === "error" ? "bg-red-500" : "bg-yellow-500"}`} />
            <div className="p-4 flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
                popup.type === "success" ? "bg-green-50 text-green-600" : popup.type === "error" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-700"
              }`}>
                {popup.type === "success" && <CheckCircle2 className="h-5 w-5" />}
                {popup.type === "error" && <XCircle className="h-5 w-5" />}
                {popup.type === "warning" && <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {popup.type === "success" ? "Success" : popup.type === "error" ? "Something went wrong" : "Heads up"}
                </div>
                <div className="text-sm text-gray-600 break-words">{popup.message}</div>
              </div>
              <button onClick={() => setPopup({ type: null, message: "", visible: false })} className="ml-1 rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}