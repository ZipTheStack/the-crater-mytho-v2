import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper to look up price info from database
async function getPriceInfo(supabaseAdmin: any, stripePriceId: string) {
  const { data, error } = await supabaseAdmin
    .from('stripe_prices')
    .select('tier, billing_interval, price_key, price_type')
    .eq('stripe_price_id', stripePriceId)
    .single();

  if (error) {
    logStep("Price lookup failed", { stripePriceId, error: error.message });
    return null;
  }

  return data;
}

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  
  // Create Supabase client with service role for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      logStep("Missing signature or webhook secret");
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, mode: session.mode });

        const userId = session.metadata?.user_id;
        const customerEmail = session.customer_email;

        if (!userId) {
          logStep("No user_id in metadata, skipping");
          break;
        }

        if (session.mode === 'subscription') {
          // Handle subscription purchase
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const priceInfo = await getPriceInfo(supabaseAdmin, priceId);

          if (priceInfo?.tier) {
            const { error } = await supabaseAdmin
              .from('profiles')
              .update({
                subscription_tier: priceInfo.tier,
                subscription_interval: priceInfo.billing_interval,
                subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
                stripe_customer_id: session.customer as string,
              })
              .eq('user_id', userId);

            if (error) {
              logStep("Error updating profile subscription", { error });
            } else {
              logStep("Profile updated with subscription", { tier: priceInfo.tier });
            }
          }
        } else if (session.mode === 'payment') {
          // Handle one-time book purchase
          const bookId = session.metadata?.book_id;
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          const priceInfo = priceId ? await getPriceInfo(supabaseAdmin, priceId) : null;
          // Check if this is an "extras" purchase by looking at price_key
          const hasExtras = priceInfo?.price_key?.includes('extras') ?? false;

          if (bookId) {
            const { error } = await supabaseAdmin
              .from('user_book_purchases')
              .insert({
                user_id: userId,
                book_id: bookId,
                has_extras: hasExtras,
                stripe_payment_id: session.payment_intent as string,
              });

            if (error) {
              logStep("Error recording book purchase", { error });
            } else {
              logStep("Book purchase recorded", { bookId, hasExtras });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        const priceId = subscription.items.data[0]?.price.id;
        const priceInfo = await getPriceInfo(supabaseAdmin, priceId);

        if (priceInfo?.tier && subscription.status === 'active') {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: priceInfo.tier,
              subscription_interval: priceInfo.billing_interval,
              subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('email', customer.email);

          if (error) {
            logStep("Error updating subscription", { error });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'none',
            subscription_interval: null,
            subscription_end: null,
          })
          .eq('email', customer.email);

        if (error) {
          logStep("Error clearing subscription", { error });
        } else {
          logStep("Subscription cleared for user");
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { invoiceId: invoice.id });

        // Check for referral credits to apply
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        // Get the referred user's profile
        const { data: referredProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', customer.email)
          .single();

        if (!referredProfile) break;

        // Find referral for this user that hasn't been applied yet
        const { data: referralData } = await supabaseAdmin
          .from('referrals')
          .select('*')
          .eq('applied', false)
          .eq('referred_id', referredProfile.user_id)
          .limit(1);

        const referral = referralData?.[0];

        if (referral) {
          // Mark referral as applied
          await supabaseAdmin
            .from('referrals')
            .update({ applied: true })
            .eq('id', referral.id);

          // Credit the referrer
          await supabaseAdmin.rpc('increment_referral_credits', {
            p_user_id: referral.referrer_id,
            p_amount: referral.credit_amount
          });

          logStep("Referral credit applied", { referrerId: referral.referrer_id, amount: referral.credit_amount });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
