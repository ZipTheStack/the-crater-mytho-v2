import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-PRICES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user with Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData?.user) {
      logStep("Auth error", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Service role client for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      logStep("Admin check failed");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Admin verified");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { action, ...params } = await req.json();
    logStep("Action requested", { action });

    switch (action) {
      // List all prices from database
      case "list": {
        const { include_archived } = params;

        let query = adminClient
          .from("stripe_prices")
          .select("*")
          .order("sort_order", { ascending: true });

        if (!include_archived) {
          query = query.eq("is_active", true);
        }

        const { data: prices, error } = await query;

        if (error) throw error;

        logStep("Prices fetched", { count: prices?.length });
        return new Response(
          JSON.stringify({ prices }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new price (and product if needed)
      case "create": {
        const {
          price_key,
          display_name,
          description,
          amount_cents,
          price_type,
          billing_interval,
          tier,
          features
        } = params;

        if (!price_key || !display_name || !amount_cents || !price_type) {
          throw new Error("price_key, display_name, amount_cents, and price_type are required");
        }

        logStep("Creating new price", { price_key, amount_cents, price_type });

        // Create Stripe product first
        const product = await stripe.products.create({
          name: display_name,
          description: description || undefined,
          metadata: { price_key, tier: tier || "" },
        });
        logStep("Stripe product created", { productId: product.id });

        // Create Stripe price
        const priceParams: Stripe.PriceCreateParams = {
          product: product.id,
          unit_amount: amount_cents,
          currency: "usd",
        };

        if (price_type === "subscription" && billing_interval) {
          priceParams.recurring = { interval: billing_interval as "month" | "year" };
        }

        const stripePrice = await stripe.prices.create(priceParams);
        logStep("Stripe price created", { priceId: stripePrice.id });

        // Save to database
        const { data: newPrice, error } = await adminClient
          .from("stripe_prices")
          .insert({
            price_key,
            stripe_price_id: stripePrice.id,
            stripe_product_id: product.id,
            display_name,
            description,
            amount_cents,
            price_type,
            billing_interval: billing_interval || null,
            tier: tier || null,
            features: features || [],
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        logStep("Price saved to database", { id: newPrice.id });
        return new Response(
          JSON.stringify({ price: newPrice }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update display info only (no Stripe changes)
      case "update": {
        const { id, display_name, description, features, sort_order } = params;

        if (!id) {
          throw new Error("Price ID is required");
        }

        logStep("Updating price info", { id });

        const updateData: Record<string, any> = {};
        if (display_name !== undefined) updateData.display_name = display_name;
        if (description !== undefined) updateData.description = description;
        if (features !== undefined) updateData.features = features;
        if (sort_order !== undefined) updateData.sort_order = sort_order;

        const { data: updatedPrice, error } = await adminClient
          .from("stripe_prices")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        // Also update Stripe product name/description if changed
        if (display_name || description) {
          const productUpdate: Stripe.ProductUpdateParams = {};
          if (display_name) productUpdate.name = display_name;
          if (description !== undefined) productUpdate.description = description || "";

          await stripe.products.update(updatedPrice.stripe_product_id, productUpdate);
          logStep("Stripe product updated");
        }

        logStep("Price updated", { id: updatedPrice.id });
        return new Response(
          JSON.stringify({ price: updatedPrice }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update price amount (creates new Stripe price, archives old)
      case "update_amount": {
        const { id, amount_cents } = params;

        if (!id || amount_cents === undefined) {
          throw new Error("Price ID and amount_cents are required");
        }

        logStep("Updating price amount", { id, amount_cents });

        // Get current price
        const { data: currentPrice, error: fetchError } = await adminClient
          .from("stripe_prices")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError || !currentPrice) {
          throw new Error("Price not found");
        }

        // Create new Stripe price
        const priceParams: Stripe.PriceCreateParams = {
          product: currentPrice.stripe_product_id,
          unit_amount: amount_cents,
          currency: currentPrice.currency || "usd",
        };

        if (currentPrice.price_type === "subscription" && currentPrice.billing_interval) {
          priceParams.recurring = { interval: currentPrice.billing_interval as "month" | "year" };
        }

        const newStripePrice = await stripe.prices.create(priceParams);
        logStep("New Stripe price created", { priceId: newStripePrice.id });

        // Archive old Stripe price
        await stripe.prices.update(currentPrice.stripe_price_id, { active: false });
        logStep("Old Stripe price archived", { priceId: currentPrice.stripe_price_id });

        // Update database with new price ID
        const { data: updatedPrice, error: updateError } = await adminClient
          .from("stripe_prices")
          .update({
            stripe_price_id: newStripePrice.id,
            amount_cents,
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        logStep("Price amount updated", { id: updatedPrice.id, newPriceId: newStripePrice.id });
        return new Response(
          JSON.stringify({ price: updatedPrice }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Archive/deactivate a price
      case "archive": {
        const { id } = params;

        if (!id) {
          throw new Error("Price ID is required");
        }

        logStep("Archiving price", { id });

        // Get current price
        const { data: currentPrice, error: fetchError } = await adminClient
          .from("stripe_prices")
          .select("stripe_price_id")
          .eq("id", id)
          .single();

        if (fetchError || !currentPrice) {
          throw new Error("Price not found");
        }

        // Archive in Stripe
        await stripe.prices.update(currentPrice.stripe_price_id, { active: false });
        logStep("Stripe price archived");

        // Mark as inactive in database
        const { data: archivedPrice, error: updateError } = await adminClient
          .from("stripe_prices")
          .update({ is_active: false })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        logStep("Price archived in database", { id: archivedPrice.id });
        return new Response(
          JSON.stringify({ price: archivedPrice }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Restore an archived price
      case "restore": {
        const { id } = params;

        if (!id) {
          throw new Error("Price ID is required");
        }

        logStep("Restoring price", { id });

        // Get current price
        const { data: currentPrice, error: fetchError } = await adminClient
          .from("stripe_prices")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError || !currentPrice) {
          throw new Error("Price not found");
        }

        // Create new active Stripe price (can't reactivate archived prices)
        const priceParams: Stripe.PriceCreateParams = {
          product: currentPrice.stripe_product_id,
          unit_amount: currentPrice.amount_cents,
          currency: currentPrice.currency || "usd",
        };

        if (currentPrice.price_type === "subscription" && currentPrice.billing_interval) {
          priceParams.recurring = { interval: currentPrice.billing_interval as "month" | "year" };
        }

        const newStripePrice = await stripe.prices.create(priceParams);
        logStep("New Stripe price created for restore", { priceId: newStripePrice.id });

        // Update database
        const { data: restoredPrice, error: updateError } = await adminClient
          .from("stripe_prices")
          .update({
            is_active: true,
            stripe_price_id: newStripePrice.id,
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        logStep("Price restored", { id: restoredPrice.id });
        return new Response(
          JSON.stringify({ price: restoredPrice }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
