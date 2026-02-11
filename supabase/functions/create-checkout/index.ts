import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { priceType, bookId } = await req.json();
    logStep("Request params", { priceType, bookId });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch price from database by price_key
    const { data: priceData, error: priceError } = await supabaseClient
      .from('stripe_prices')
      .select('stripe_price_id, price_type')
      .eq('price_key', priceType)
      .eq('is_active', true)
      .single();

    if (priceError || !priceData) {
      logStep("Price lookup failed", { priceType, error: priceError?.message });
      throw new Error(`Invalid or inactive price type: ${priceType}`);
    }

    const priceId = priceData.stripe_price_id;
    logStep("Price ID resolved from DB", { priceType, priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    
    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Determine mode based on price_type from database
    const isSubscription = priceData.price_type === 'subscription';
    const mode = isSubscription ? 'subscription' : 'payment';
    logStep("Checkout mode", { mode, isSubscription });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Build metadata for tracking
    const metadata: Record<string, string> = { user_id: user.id };
    if (bookId) metadata.book_id = bookId;
    if (priceType.includes('extras')) metadata.has_extras = 'true';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode as 'subscription' | 'payment',
      success_url: `${origin}/dashboard?success=true&type=${mode}`,
      cancel_url: `${origin}/dashboard?canceled=true`,
      metadata,
    });
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
