import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  switch (event.type) {
    case "checkout.session.completed": {
      const userId = session.metadata?.supabase_user_id;
      const planId = session.metadata?.plan_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (!userId || !planId) break;

      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as any;

      await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_id: planId,
          status: stripeSub.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          trial_started_at: stripeSub.trial_start
            ? new Date(stripeSub.trial_start * 1000).toISOString()
            : null,
          trial_ends_at: stripeSub.trial_end
            ? new Date(stripeSub.trial_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      break;
    }

    case "customer.subscription.updated": {
      const customerId = session.customer;
      const status = session.status;
      const priceId = session.items?.data?.[0]?.price?.id;

      const planId =
        priceId === process.env.STRIPE_PRO_PRICE_ID
          ? "pro"
          : priceId === process.env.STRIPE_INSIGHTS_PRICE_ID
          ? "insights"
          : "standard";

      await supabase
        .from("subscriptions")
        .update({
          plan_id: planId,
          status,
          current_period_start: new Date(session.current_period_start * 1000).toISOString(),
          current_period_end: new Date(session.current_period_end * 1000).toISOString(),
          trial_started_at: session.trial_start
            ? new Date(session.trial_start * 1000).toISOString()
            : null,
          trial_ends_at: session.trial_end
            ? new Date(session.trial_end * 1000).toISOString()
            : null,
          canceled_at: session.canceled_at
            ? new Date(session.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    case "customer.subscription.trial_will_end": {
      const customerId = session.customer;

      // Look up the user for this customer
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id, plan_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (sub?.user_id) {
        const planLabel = sub.plan_id === "pro" ? "Pro ($24.99/month)" : "Insights ($9.99/month)";
        const trialEnd = session.trial_end
          ? new Date(session.trial_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : "soon";

        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          title: "Your free trial ends in 3 days",
          body: `Your ${planLabel} free trial ends on ${trialEnd}. After that you'll be charged automatically. You can manage your subscription in your dashboard.`,
          type: "trial_ending",
          record_id: null,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const customerId = session.customer;

      await supabase
        .from("subscriptions")
        .update({
          plan_id: "standard",
          status: "canceled",
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}